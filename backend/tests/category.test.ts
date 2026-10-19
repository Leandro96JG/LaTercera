import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import express, { Express } from 'express';
import { AdminAuthService } from '../src/services/admin-auth.service';
import { MemoryOrderRepository } from '../src/repositories/order.repository';
import { MemoryAlbumRepository } from '../src/repositories/album.repository';
import { MemoryPromotionRepository } from '../src/repositories/promotion.repository';
import { MemoryCategoryRepository } from '../src/repositories/category.repository';
import { DownloadTokenService } from '../src/services/token.service';
import { OrderService } from '../src/services/order.service';
import { createAdminRouter } from '../src/routes/admin.routes';

describe('Categories Management & Dynamic Badge Suite', () => {
  const TEST_JWT_SECRET = 'clave_secreta_super_segura_jwt_admin_minimo_32_caracteres_hex';
  const TEST_DOWNLOAD_SECRET = 'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex';

  let server: Server;
  let baseUrl: string;
  let authService: AdminAuthService;
  let orderRepository: MemoryOrderRepository;
  let albumRepository: MemoryAlbumRepository;
  let promoRepository: MemoryPromotionRepository;
  let categoryRepository: MemoryCategoryRepository;
  let tokenService: DownloadTokenService;
  let orderService: OrderService;
  let adminToken: string;

  beforeAll(async () => {
    authService = new AdminAuthService(TEST_JWT_SECRET, 3600);
    orderRepository = new MemoryOrderRepository();
    albumRepository = new MemoryAlbumRepository();
    promoRepository = new MemoryPromotionRepository();
    categoryRepository = new MemoryCategoryRepository(false); // don't persist to file in tests
    tokenService = new DownloadTokenService(TEST_DOWNLOAD_SECRET);
    orderService = new OrderService(tokenService, orderRepository, albumRepository, promoRepository);

    const app: Express = express();
    app.use(express.json());

    // Public categories
    app.get('/api/categories', async (_req, res) => {
      try {
        const categories = await categoryRepository.listCategories();
        return res.status(200).json(categories);
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    });

    // Admin router
    app.use(
      '/api/admin',
      createAdminRouter(
        authService,
        orderRepository,
        albumRepository,
        tokenService,
        orderService,
        promoRepository,
        categoryRepository
      )
    );

    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });

    adminToken = authService.createJwt({
      id: 'admin_1',
      email: 'fotografa@latercera.com.ar',
      name: 'Jenifer "Yuyo" Espeche',
      role: 'admin',
      photographerId: 'yuyo_espeche'
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('debe listar las categorías públicas activas ordenadas por display_order', async () => {
    const res = await fetch(`${baseUrl}/api/categories`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(5);

    // Debe contener fútbol y motos
    const futbol = list.find((c: any) => c.id === 'futbol');
    expect(futbol).toBeDefined();
    expect(futbol.name).toBe('Fútbol');
    expect(futbol.icon).toBe('⚽');

    const motos = list.find((c: any) => c.id === 'motos');
    expect(motos).toBeDefined();
    expect(motos.name).toBe('Motos & Enduro');
    expect(motos.icon).toBe('🏍️');
  });

  it('debe listar todas las categorías desde el panel de administración con token', async () => {
    const res = await fetch(`${baseUrl}/api/admin/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.some((c: any) => c.id === 'otros')).toBe(true);
  });

  it('debe rechazar solicitudes no autenticadas a /api/admin/categories', async () => {
    const res = await fetch(`${baseUrl}/api/admin/categories`);
    expect(res.status).toBe(401);
  });

  it('debe crear una nueva categoría dinámica con slug automático y badge', async () => {
    const res = await fetch(`${baseUrl}/api/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Automovilismo & Karting',
        icon: '🏎️'
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.category.id).toBe('automovilismo-karting');
    expect(data.category.name).toBe('Automovilismo & Karting');
    expect(data.category.icon).toBe('🏎️');
    expect(data.category.badgeLabel).toBe('🏎️ Automovilismo & Karting');
    expect(data.category.isActive).toBe(true);
  });

  it('debe actualizar una categoría existente', async () => {
    const res = await fetch(`${baseUrl}/api/admin/categories/automovilismo-karting`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Turismo Carretera & TC2000',
        badgeLabel: '🏁 TC & TC2000'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.category.name).toBe('Turismo Carretera & TC2000');
    expect(data.category.badgeLabel).toBe('🏁 TC & TC2000');
  });

  it('debe eliminar una categoría creada', async () => {
    const res = await fetch(`${baseUrl}/api/admin/categories/automovilismo-karting`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verificar que ya no existe
    const check = await fetch(`${baseUrl}/api/admin/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const list = await check.json();
    expect(list.some((c: any) => c.id === 'automovilismo-karting')).toBe(false);
  });

  it('debe impedir eliminar la categoría default "otros"', async () => {
    const res = await fetch(`${baseUrl}/api/admin/categories/otros`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('otros');
  });
});
