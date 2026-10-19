import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import express, { Express } from 'express';
import { AdminAuthService } from '../src/services/admin-auth.service';
import { MemoryOrderRepository } from '../src/repositories/order.repository';
import { MemoryAlbumRepository } from '../src/repositories/album.repository';
import { MemoryPromotionRepository } from '../src/repositories/promotion.repository';
import { DownloadTokenService } from '../src/services/token.service';
import { OrderService } from '../src/services/order.service';
import { createAdminRouter } from '../src/routes/admin.routes';
import { calculateCartTotal } from '../src/services/pricing.service';

describe('Promotions & Dynamic Pricing API Suite', () => {
  const TEST_JWT_SECRET = 'clave_secreta_super_segura_jwt_admin_minimo_32_caracteres_hex';
  const TEST_DOWNLOAD_SECRET = 'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex';

  let server: Server;
  let baseUrl: string;
  let authService: AdminAuthService;
  let orderRepository: MemoryOrderRepository;
  let albumRepository: MemoryAlbumRepository;
  let promoRepository: MemoryPromotionRepository;
  let tokenService: DownloadTokenService;
  let orderService: OrderService;
  let adminToken: string;

  beforeAll(async () => {
    authService = new AdminAuthService(TEST_JWT_SECRET, 3600);
    orderRepository = new MemoryOrderRepository();
    albumRepository = new MemoryAlbumRepository();
    promoRepository = new MemoryPromotionRepository();
    tokenService = new DownloadTokenService(TEST_DOWNLOAD_SECRET);
    orderService = new OrderService(tokenService, orderRepository, albumRepository, promoRepository);

    const app: Express = express();
    app.use(express.json());

    // Public endpoints
    app.post('/api/pricing/validate-coupon', async (req, res) => {
      try {
        const { code, albumId } = req.body;
        if (!code || typeof code !== 'string') {
          return res.status(400).json({ valid: false, message: 'Código de cupón requerido' });
        }
        const coupon = await promoRepository.getCouponByCode(code.trim());
        if (!coupon || !coupon.isActive) {
          return res.status(200).json({ valid: false, message: 'Cupón inválido o inactivo' });
        }
        if (coupon.albumId && albumId && coupon.albumId !== albumId) {
          return res.status(200).json({ valid: false, message: 'Este cupón no es válido para este álbum' });
        }
        if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
          return res.status(200).json({ valid: false, message: 'Este cupón ha alcanzado el límite de usos' });
        }
        return res.status(200).json({
          valid: true,
          code: coupon.code,
          discountPercentage: coupon.discountPercent,
          message: `¡Cupón ${coupon.code} aplicado con éxito!`
        });
      } catch (err: any) {
        return res.status(500).json({ valid: false, message: err.message });
      }
    });

    app.get('/api/pricing/config', async (_req, res) => {
      const config = await promoRepository.getConfig();
      return res.status(200).json({
        enableTierDiscounts: config.enableTierDiscounts,
        tier3DiscountPercent: config.tier3DiscountPercent,
        tier5DiscountPercent: config.tier5DiscountPercent,
        capAtFullAlbumPrice: config.capAtFullAlbumPrice
      });
    });

    app.post('/api/pricing/calculate', async (req, res) => {
      try {
        const config = await promoRepository.getConfig();
        let coupon = null;
        if (req.body.couponCode) {
          const found = await promoRepository.getCouponByCode(req.body.couponCode);
          if (found && found.isActive) coupon = found;
        }
        const result = calculateCartTotal({
          ...req.body,
          config,
          coupon
        });
        return res.json(result);
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    });

    // Admin routes
    app.use(
      '/api/admin',
      createAdminRouter(
        authService,
        orderRepository,
        albumRepository,
        tokenService,
        orderService,
        promoRepository
      )
    );

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

  describe('Public Endpoints (Zero-Trust Validation)', () => {
    it('POST /api/pricing/validate-coupon valida exitosamente YUYO10 por defecto', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'yuyo10' })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(true);
      expect(data.code).toBe('YUYO10');
      expect(data.discountPercentage).toBe(10);
    });

    it('POST /api/pricing/validate-coupon rechaza cupones inexistentes sin revelar otros cupones', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'INEXISTENTE99' })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.code).toBeUndefined();
    });

    it('GET /api/pricing/config devuelve configuración de descuentos sin exponer códigos de cupón', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/config`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.enableTierDiscounts).toBe(true);
      expect(data.tier3DiscountPercent).toBe(20);
      expect(data.tier5DiscountPercent).toBe(30);
      expect(data.capAtFullAlbumPrice).toBe(true);
      expect(data.coupons).toBeUndefined();
    });

    it('POST /api/pricing/calculate aplica descuentos por volumen y cupón dinámico con tope de álbum completo', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoCount: 4,
          unitPrice: 1000,
          fullAlbumPrice: 5000,
          isFullAlbum: false,
          couponCode: 'YUYO10'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      // 4 fotos * $1000 = $4000
      // 3+ fotos = 20% descuento -> $4000 * 0.8 = $3200
      // Cupón YUYO10 = 10% adicional -> $3200 * 0.9 = $2880
      expect(data.subtotal).toBe(4000);
      expect(data.discount).toBe(1120);
      expect(data.total).toBe(2880);
      expect(data.couponApplied).toBe('YUYO10');
    });
  });

  describe('Admin Endpoints (/api/admin/promotions)', () => {
    it('rechaza accesos sin token JWT con 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/promotions`);
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/promotions devuelve la lista de cupones y configuración para el admin', async () => {
      const res = await fetch(`${baseUrl}/api/admin/promotions`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.config.enableTierDiscounts).toBe(true);
      expect(Array.isArray(data.coupons)).toBe(true);
      expect(data.coupons.some((c: any) => c.code === 'YUYO10')).toBe(true);
    });

    it('PUT /api/admin/promotions/config actualiza porcentajes y topes', async () => {
      const res = await fetch(`${baseUrl}/api/admin/promotions/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          tier3DiscountPercent: 25,
          tier5DiscountPercent: 35
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.config.tier3DiscountPercent).toBe(25);
      expect(data.config.tier5DiscountPercent).toBe(35);
    });

    it('POST /api/admin/promotions/coupons crea un nuevo cupón y rechaza duplicados', async () => {
      const createRes = await fetch(`${baseUrl}/api/admin/promotions/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          code: 'FIESTA20',
          discountPercent: 20,
          maxUses: 10
        })
      });

      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      expect(created.coupon.code).toBe('FIESTA20');
      expect(created.coupon.discountPercent).toBe(20);

      // Intento de duplicado
      const dupRes = await fetch(`${baseUrl}/api/admin/promotions/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          code: 'fiesta20',
          discountPercent: 15
        })
      });

      expect(dupRes.status).toBe(400);
    });

    it('PATCH /api/admin/promotions/coupons/:code permite desactivar o modificar un cupón', async () => {
      const res = await fetch(`${baseUrl}/api/admin/promotions/coupons/FIESTA20`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          isActive: false
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.coupon.isActive).toBe(false);

      // Al estar inactivo, validate-coupon debe rechazarlo
      const valRes = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'FIESTA20' })
      });
      const valData = await valRes.json();
      expect(valData.valid).toBe(false);
    });

    it('DELETE /api/admin/promotions/coupons/:code elimina el cupón', async () => {
      const delRes = await fetch(`${baseUrl}/api/admin/promotions/coupons/FIESTA20`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(delRes.status).toBe(200);

      const valRes = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'FIESTA20' })
      });
      const valData = await valRes.json();
      expect(valData.valid).toBe(false);
    });
  });
});
