import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer, Server } from 'http';
import { app, orderService, albumRepository, orderRepository, mpService, tokenService, adminAuthService } from '../src/index';

describe('Checkout & Orders API Hardening (Zero-Trust & Persistencia)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.spyOn(mpService, 'createCheckoutPreference').mockImplementation(async (orderId: string) => {
      return {
        preferenceId: 'pref-mock-999',
        initPoint: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-mock-999`,
        sandboxInitPoint: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-mock-999`,
        orderId
      };
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('POST /api/checkout/preference - Validaciones de Entrada y Blindaje', () => {
    it('debe rechazar la creación de preferencia si no es full album y no se seleccionan fotos (evita órdenes de $0)', async () => {
      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: 'album-1',
          photoIds: [],
          isFullAlbum: false,
          customer: { email: 'zero@test.com' }
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Debes seleccionar al menos una foto o el álbum completo');
    });

    it('debe rechazar la compra si el álbum es de descarga gratuita de cortesía', async () => {
      // 1. Crear álbum de cortesía gratuito con ID único
      const freeAlbumId = `album-free-${Date.now()}`;
      const freeAlbum = await albumRepository.create({
        id: freeAlbumId,
        title: 'Torneo Escolar Gratuito',
        category: 'futbol',
        date: '2026-10-15',
        photosCount: 20,
        unitPrice: 0,
        fullAlbumPrice: 0,
        coverUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
        isPublished: true,
        isFreeDownload: true
      });

      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: freeAlbum.id,
          photoIds: ['photo-1'],
          isFullAlbum: false,
          customer: { email: 'gratis@test.com' }
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('descarga gratuita');
    });

    it('debe rechazar con 403 Forbidden la compra en un álbum privado si no se envía token de acceso ni PIN', async () => {
      const privateAlbumId = `album-priv-${Date.now()}`;
      await albumRepository.create({
        id: privateAlbumId,
        title: 'Cumpleaños 15 Privado',
        category: 'sociales',
        date: '2026-10-18',
        photosCount: 15,
        unitPrice: 2000,
        fullAlbumPrice: 25000,
        coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552',
        isPublished: true,
        isPrivate: true,
        accessCode: '9876'
      });

      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: privateAlbumId,
          photoIds: ['photo-p1'],
          isFullAlbum: false,
          customer: { email: 'invitado@test.com' }
        })
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Este álbum es privado. Debes desbloquearlo con su código PIN antes de realizar la compra.');
    });

    it('debe permitir la compra en álbum privado enviando token de acceso válido en header x-album-access-token', async () => {
      const privateAlbumId = `album-priv-header-${Date.now()}`;
      await albumRepository.create({
        id: privateAlbumId,
        title: 'Fiesta Privada VIP',
        category: 'sociales',
        date: '2026-10-19',
        photosCount: 10,
        unitPrice: 2500,
        fullAlbumPrice: 30000,
        coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552',
        isPublished: true,
        isPrivate: true,
        accessCode: '5555'
      });

      const token = tokenService.generateToken('pin_access', 'album_zip', privateAlbumId, 3600);

      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-album-access-token': token
        },
        body: JSON.stringify({
          albumId: privateAlbumId,
          photoIds: ['photo-vip-1'],
          isFullAlbum: false,
          customer: { email: 'vip@test.com' }
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.orderId).toBeDefined();
    });

    it('debe permitir la compra en álbum privado enviando token de acceso válido en req.body.accessToken', async () => {
      const privateAlbumId = `album-priv-body-${Date.now()}`;
      await albumRepository.create({
        id: privateAlbumId,
        title: 'Gala Privada',
        category: 'sociales',
        date: '2026-10-20',
        photosCount: 8,
        unitPrice: 3000,
        fullAlbumPrice: 35000,
        coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552',
        isPublished: true,
        isPrivate: true,
        accessCode: '7777'
      });

      const token = tokenService.generateToken('pin_access', 'album_zip', privateAlbumId, 3600);

      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: privateAlbumId,
          photoIds: ['photo-gala-1'],
          isFullAlbum: false,
          accessToken: token,
          customer: { email: 'gala@test.com' }
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.orderId).toBeDefined();
    });

    it('debe permitir la compra en álbum privado enviando cabecera Bearer de Admin', async () => {
      const privateAlbumId = `album-priv-admin-${Date.now()}`;
      await albumRepository.create({
        id: privateAlbumId,
        title: 'Sesión Privada Admin',
        category: 'sociales',
        date: '2026-10-21',
        photosCount: 5,
        unitPrice: 2000,
        fullAlbumPrice: 20000,
        coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552',
        isPublished: true,
        isPrivate: true,
        accessCode: '1111'
      });

      const adminToken = adminAuthService.createJwt({
        id: 'admin-tester',
        email: 'fotografa@latercera.com.ar',
        name: 'Jenifer Espeche',
        role: 'admin',
        photographerId: 'photo_jenifer'
      });

      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          albumId: privateAlbumId,
          photoIds: ['photo-adm-1'],
          isFullAlbum: false,
          customer: { email: 'admin-buy@test.com' }
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('debe rechazar con 403 Forbidden si el token de acceso pertenece a otro álbum', async () => {
      const privateAlbumId = `album-priv-wrong-${Date.now()}`;
      await albumRepository.create({
        id: privateAlbumId,
        title: 'Álbum A Privado',
        category: 'sociales',
        date: '2026-10-21',
        photosCount: 5,
        unitPrice: 2000,
        fullAlbumPrice: 20000,
        coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552',
        isPublished: true,
        isPrivate: true,
        accessCode: '2222'
      });

      const wrongToken = tokenService.generateToken('pin_access', 'album_zip', 'otro-album-distinto', 3600);

      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-album-access-token': wrongToken
        },
        body: JSON.stringify({
          albumId: privateAlbumId,
          photoIds: ['photo-w-1'],
          isFullAlbum: false,
          customer: { email: 'attacker@test.com' }
        })
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Este álbum es privado. Debes desbloquearlo con su código PIN antes de realizar la compra.');
    });

    it('debe deduplicar photoIds repetidos antes de calcular totales y generar preferencia', async () => {
      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: 'album-1',
          photoIds: ['photo-dup-1', 'photo-dup-1', 'photo-dup-2'], // 2 únicas
          isFullAlbum: false,
          customer: { email: 'dedup@test.com' }
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.photoCount).toBe(2); // Se deduplicó photo-dup-1
      expect(data.orderId).toBeDefined();
    });

    it('debe rechazar con 400 Bad Request si un photoId intenta inyección de rutas (.. o /)', async () => {
      const resTraversal = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: 'album-1',
          photoIds: ['../../etc/passwd'],
          isFullAlbum: false,
          customer: { email: 'hacker@test.com' }
        })
      });

      expect(resTraversal.status).toBe(400);
      const dataTraversal = await resTraversal.json();
      expect(dataTraversal.error).toContain('inyección de ruta');

      const resSlash = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: 'album-1',
          photoIds: ['subfolder/photo.jpg'],
          isFullAlbum: false,
          customer: { email: 'hacker@test.com' }
        })
      });

      expect(resSlash.status).toBe(400);
      const dataSlash = await resSlash.json();
      expect(dataSlash.error).toContain('inyección de ruta');
    });

    it('debe rechazar con 400 Bad Request si un photoId no pertenece al álbum cuando tiene fotos registradas', async () => {
      const albumWithPhotosId = `album-real-photos-${Date.now()}`;
      await albumRepository.create({
        id: albumWithPhotosId,
        title: 'Álbum con Fotos Reales',
        category: 'futbol',
        photosCount: 2,
        unitPrice: 1200,
        fullAlbumPrice: 9500,
        coverUrl: 'https://images.unsplash.com/photo-1',
        isPublished: true
      });

      // Agregar fotos explícitas (no mockups de demo autogeneradas)
      await albumRepository.addPhotosToAlbum(albumWithPhotosId, [
        {
          id: 'real-photo-1',
          albumId: albumWithPhotosId,
          filename: 'foto1.jpg',
          originalPath: 'originals/foto1.jpg',
          previewUrl: 'https://images.unsplash.com/preview1.webp',
          isSampleHd: false,
          sizeBytes: 1500000
        },
        {
          id: 'real-photo-2',
          albumId: albumWithPhotosId,
          filename: 'foto2.jpg',
          originalPath: 'originals/foto2.jpg',
          previewUrl: 'https://images.unsplash.com/preview2.webp',
          isSampleHd: false,
          sizeBytes: 1600000
        }
      ]);

      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: albumWithPhotosId,
          photoIds: ['foto-que-no-pertenece'],
          isFullAlbum: false,
          customer: { email: 'comprador@test.com' }
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('no pertenecen al álbum seleccionado');
    });
  });

  describe('GET /api/orders/:orderId - Recuperación Asíncrona y Protección de DownloadToken', () => {
    it('debe recuperar la orden de forma asíncrona y NO exponer downloadToken si el status es PENDING', async () => {
      // 1. Crear una orden directamente en OrderService
      const order = await orderService.createOrderAsync({
        albumId: 'album-1',
        photoIds: ['photo-pending-1'],
        isFullAlbum: false,
        customer: { email: 'pending@test.com' }
      });

      // 2. Simular reinicio de servidor limpiando la caché en memoria RAM
      orderService.clearMemoryCache();
      expect(orderService.getOrder(order.id)).toBeUndefined();

      // 3. Consultar vía HTTP GET /api/orders/:orderId
      const res = await fetch(`${baseUrl}/api/orders/${order.id}`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe(order.id);
      expect(data.status).toBe('PENDING');
      expect(data.hasDownloadToken).toBe(false);
      expect(data.downloadToken).toBeUndefined(); // Protegido contra filtraciones
    });

    it('debe entregar downloadToken solo cuando la orden fue efectivamente pagada (PAID)', async () => {
      const order = await orderService.createOrderAsync({
        albumId: 'album-1',
        photoIds: ['photo-paid-1'],
        isFullAlbum: false,
        customer: { email: 'paid@test.com' }
      });

      // Acreditar pago
      const completeRes = await orderService.verifyAndCompletePaymentAsync(order.id, {
        paymentId: 'pay-verif-999',
        status: 'approved',
        currencyId: 'ARS',
        transactionAmount: order.totalAmount
      });
      expect(completeRes.success).toBe(true);

      // Simular reinicio de servidor limpiando memoria RAM
      orderService.clearMemoryCache();
      expect(orderService.getOrder(order.id)).toBeUndefined();

      // Consultar endpoint tras el reinicio
      const res = await fetch(`${baseUrl}/api/orders/${order.id}`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe(order.id);
      expect(data.status).toBe('PAID');
      expect(data.hasDownloadToken).toBe(true);
      expect(typeof data.downloadToken).toBe('string');
      expect(data.downloadToken.length).toBeGreaterThan(10);
    });

    it('debe responder 404 si la orden no existe en memoria ni en la base de datos', async () => {
      const res = await fetch(`${baseUrl}/api/orders/orden-inexistente-123456`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Orden no encontrada');
    });
  });
});
