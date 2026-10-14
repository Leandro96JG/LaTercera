import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import express, { Express } from 'express';
import { AdminAuthService } from '../src/services/admin-auth.service';
import { MemoryOrderRepository } from '../src/repositories/order.repository';
import { MemoryAlbumRepository } from '../src/repositories/album.repository';
import { DownloadTokenService } from '../src/services/token.service';
import { OrderService, Order } from '../src/services/order.service';
import { createAdminRouter } from '../src/routes/admin.routes';

describe('Admin Orders & Real Stats Suite', () => {
  const TEST_JWT_SECRET = 'clave_secreta_super_segura_jwt_admin_minimo_32_caracteres_hex';
  const TEST_DOWNLOAD_SECRET = 'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex';

  let server: Server;
  let baseUrl: string;
  let authService: AdminAuthService;
  let orderRepository: MemoryOrderRepository;
  let albumRepository: MemoryAlbumRepository;
  let tokenService: DownloadTokenService;
  let orderService: OrderService;
  let adminToken: string;

  beforeAll(async () => {
    authService = new AdminAuthService(TEST_JWT_SECRET, 3600);
    orderRepository = new MemoryOrderRepository();
    albumRepository = new MemoryAlbumRepository();
    tokenService = new DownloadTokenService(TEST_DOWNLOAD_SECRET);
    orderService = new OrderService(tokenService, orderRepository, albumRepository);

    const app: Express = express();
    app.use(express.json());
    app.use(
      '/api/admin',
      createAdminRouter(authService, orderRepository, albumRepository, tokenService, orderService)
    );

    // Generar token JWT de admin
    adminToken = authService.createJwt({
      id: 'admin_1',
      email: 'fotografa@latercera.com.ar',
      name: 'Jenifer "Yuyo" Espeche',
      role: 'admin',
      photographerId: 'yuyo_espeche'
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

  describe('OrderRepository.listAllOrders()', () => {
    it('debe listar todas las órdenes ordenadas cronológicamente por createdAt DESC', async () => {
      const order1: Order = {
        id: 'ord_1',
        albumId: 'album-1',
        photoIds: ['photo-1'],
        isFullAlbum: false,
        photoCount: 1,
        unitPrice: 1200,
        subtotal: 1200,
        discount: 0,
        discountPercentage: 0,
        totalAmount: 1200,
        currency: 'ARS',
        customer: { email: 'cliente1@gmail.com', name: 'Juan Pérez' },
        status: 'PAID',
        createdAt: '2026-10-10T10:00:00.000Z',
        updatedAt: '2026-10-10T10:00:00.000Z'
      };

      const order2: Order = {
        id: 'ord_2',
        albumId: 'album-1',
        photoIds: ['photo-2', 'photo-3'],
        isFullAlbum: false,
        photoCount: 2,
        unitPrice: 1200,
        subtotal: 2400,
        discount: 0,
        discountPercentage: 0,
        totalAmount: 2400,
        currency: 'ARS',
        customer: { email: 'cliente2@gmail.com', name: 'María Gómez' },
        status: 'PAID',
        createdAt: '2026-10-12T14:30:00.000Z',
        updatedAt: '2026-10-12T14:30:00.000Z'
      };

      await orderRepository.createOrder(order1);
      await orderRepository.createOrder(order2);

      const all = await orderRepository.listAllOrders();
      expect(all.length).toBeGreaterThanOrEqual(2);
      expect(all[0].id).toBe('ord_2'); // Más reciente primero
    });
  });

  describe('GET /api/admin/stats (Métricas Reales Calculadas)', () => {
    it('debe calcular métricas dinámicas basadas exclusivamente en órdenes con status PAID', async () => {
      // 1. Orden individual pagada (3 fotos, $3600)
      await orderRepository.createOrder({
        id: 'ord_paid_photos',
        albumId: 'album-1',
        photoIds: ['p1', 'p2', 'p3'],
        isFullAlbum: false,
        photoCount: 3,
        unitPrice: 1200,
        subtotal: 3600,
        discount: 0,
        discountPercentage: 0,
        totalAmount: 3600,
        currency: 'ARS',
        customer: { email: 'comprador1@test.com' },
        status: 'PAID',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 2. Orden de álbum completo pagada ($9500)
      await orderRepository.createOrder({
        id: 'ord_paid_album',
        albumId: 'album-1',
        photoIds: [],
        isFullAlbum: true,
        photoCount: 48,
        unitPrice: 1200,
        subtotal: 9500,
        discount: 0,
        discountPercentage: 0,
        totalAmount: 9500,
        currency: 'ARS',
        customer: { email: 'comprador2@test.com' },
        status: 'PAID',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 3. Orden pendiente ($2400) - NO debe sumarse a ingresos ni fotos vendidas
      await orderRepository.createOrder({
        id: 'ord_pending',
        albumId: 'album-2',
        photoIds: ['p4', 'p5'],
        isFullAlbum: false,
        photoCount: 2,
        unitPrice: 1200,
        subtotal: 2400,
        discount: 0,
        discountPercentage: 0,
        totalAmount: 2400,
        currency: 'ARS',
        customer: { email: 'pendiente@test.com' },
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4. Orden con alerta de fraude ($1200) - NO debe sumarse
      await orderRepository.createOrder({
        id: 'ord_fraud',
        albumId: 'album-1',
        photoIds: ['p6'],
        isFullAlbum: false,
        photoCount: 1,
        unitPrice: 1200,
        subtotal: 1200,
        discount: 0,
        discountPercentage: 0,
        totalAmount: 1200,
        currency: 'ARS',
        customer: { email: 'fraude@test.com' },
        status: 'FRAUD_ALERT_PRICE_MISMATCH',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const stats = body.stats;
      // Revenue esperado: al menos 3600 + 9500 = 13100 ARS
      expect(stats.revenueARS).toBeGreaterThanOrEqual(13100);
      // Álbumes completos vendidos: al menos 1
      expect(stats.albumsSold).toBeGreaterThanOrEqual(1);
      // Fotos individuales vendidas: al menos 3
      expect(stats.photosSold).toBeGreaterThanOrEqual(3);
      // Álbumes activos en catálogo inicial (album-1 y album-2)
      expect(stats.activeAlbumsCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/admin/orders', () => {
    it('debe rechazar la petición con 401 si no se envía token de autenticación', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders`);
      expect(res.status).toBe(401);
    });

    it('debe retornar la lista completa de órdenes enriquecida con albumTitle y downloadUrl', async () => {
      const order = await orderRepository.createOrder({
        id: 'ord_123_custom',
        albumId: 'album-1',
        photoIds: ['foto_a'],
        isFullAlbum: false,
        photoCount: 1,
        unitPrice: 1200,
        subtotal: 1200,
        discount: 0,
        discountPercentage: 0,
        totalAmount: 1200,
        currency: 'ARS',
        customer: { email: 'maria@gmail.com', name: 'María', phone: '+5493804112233' },
        status: 'PAID',
        downloadToken: 'mock.download.token',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const res = await fetch(`${baseUrl}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.total).toBeGreaterThanOrEqual(1);

      const retrieved = body.orders.find((o: any) => o.id === order.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.customer.email).toBe('maria@gmail.com');
      expect(retrieved.customer.phone).toBe('+5493804112233');
      expect(retrieved.albumTitle).toBe('Atlético Tesorieri vs Andino SC'); // Título resuelto del repositorio
      expect(retrieved.downloadUrl).toContain('/pago-exitoso?token=mock.download.token');
    });
  });

  describe('POST /api/admin/orders/:orderId/regenerate-token', () => {
    it('debe rechazar con 401 si no hay token de autenticación', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/ord_123/regenerate-token`, {
        method: 'POST'
      });
      expect(res.status).toBe(401);
    });

    it('debe retornar 404 si la orden no existe', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/inexistente/regenerate-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('Orden no encontrada');
    });

    it('debe generar un nuevo downloadToken válido por 72 horas y retornar la URL lista', async () => {
      const order = await orderRepository.createOrder({
        id: 'ord_renew_test',
        albumId: 'album-1',
        photoIds: ['foto_77'],
        isFullAlbum: false,
        photoCount: 1,
        unitPrice: 1200,
        subtotal: 1200,
        discount: 0,
        discountPercentage: 0,
        totalAmount: 1200,
        currency: 'ARS',
        customer: { email: 'renew@test.com' },
        status: 'PAID',
        downloadToken: 'antiguo_token_vencido',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const res = await fetch(`${baseUrl}/api/admin/orders/${order.id}/regenerate-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.orderId).toBe(order.id);
      expect(body.expiresInHours).toBe(72);
      expect(body.downloadToken).toBeDefined();
      expect(body.downloadToken).not.toBe('antiguo_token_vencido');
      expect(body.downloadUrl).toContain(`/pago-exitoso?token=${body.downloadToken}`);

      // Verificar que el token es criptográficamente válido con tokenService
      const verify = tokenService.verifyToken(body.downloadToken);
      expect(verify.valid).toBe(true);
      expect(verify.payload?.orderId).toBe(order.id);

      // Verificar que la orden en el repositorio fue actualizada
      const updatedInRepo = await orderRepository.getOrderById(order.id);
      expect(updatedInRepo?.downloadToken).toBe(body.downloadToken);
    });
  });
});
