import { Router, Response } from 'express';
import { AdminAuthService } from '../services/admin-auth.service';
import {
  createRequireAdminAuth,
  AuthenticatedAdminRequest
} from '../middleware/admin-auth.middleware';
import { IOrderRepository, MemoryOrderRepository } from '../repositories/order.repository';
import { IAlbumRepository, MemoryAlbumRepository } from '../repositories/album.repository';
import { DownloadTokenService } from '../services/token.service';
import { OrderService } from '../services/order.service';
import {
  IPromotionRepository,
  MemoryPromotionRepository
} from '../repositories/promotion.repository';
import {
  ICategoryRepository,
  MemoryCategoryRepository
} from '../repositories/category.repository';

import { adminLoginLimiter } from '../middleware/rate-limit.middleware';
import { getPrimaryFrontendUrl } from '../config/env';

export function createAdminRouter(
  authService: AdminAuthService,
  orderRepository?: IOrderRepository,
  albumRepository?: IAlbumRepository,
  tokenService?: DownloadTokenService,
  orderService?: OrderService,
  promotionRepository?: IPromotionRepository,
  categoryRepository?: ICategoryRepository
): Router {
  const router = Router();
  const requireAdminAuth = createRequireAdminAuth(authService);
  const orderRepo = orderRepository || new MemoryOrderRepository();
  const albumRepo = albumRepository || new MemoryAlbumRepository();
  const promoRepo = promotionRepository || new MemoryPromotionRepository();
  const catRepo = categoryRepository || new MemoryCategoryRepository();
  const tokenSvc =
    tokenService ||
    new DownloadTokenService(
      process.env.DOWNLOAD_TOKEN_SECRET ||
        'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex'
    );

  // 1. Endpoint público de autenticación
  router.post('/login', adminLoginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await authService.loginAsync(email, password);

      if (!result.success) {
        return res.status(401).json({
          error: result.error || 'Credenciales inválidas'
        });
      }

      return res.status(200).json({
        success: true,
        token: result.token,
        user: result.user
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 2. Perfil del fotógrafo/admin autenticado
  router.get('/me', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
    return res.status(200).json({
      success: true,
      user: req.adminUser
    });
  });

  // 3. Métricas y estadísticas administrativas calculadas en vivo
  router.get('/stats', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const orders = await orderRepo.listAllOrders();
      const paidOrders = orders.filter(o => o.status === 'PAID');

      const revenueARS = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const albumsSold = paidOrders.filter(o => o.isFullAlbum === true).length;
      const photosSold = paidOrders
        .filter(o => !o.isFullAlbum)
        .reduce((sum, o) => sum + (o.photoCount || 0), 0);

      const activeAlbums = await albumRepo.listAlbums();
      const activeAlbumsCount = activeAlbums.length;

      const totalStorageBytes = typeof albumRepo.getTotalStorageBytes === 'function'
        ? await albumRepo.getTotalStorageBytes()
        : 0;
      const storageUsedGB = Number((totalStorageBytes / (1024 ** 3)).toFixed(2));

      return res.status(200).json({
        success: true,
        stats: {
          photosSold,
          albumsSold,
          revenueARS,
          storageUsedGB,
          storageLimitGB: 10,
          activeAlbumsCount,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 4. Lista de órdenes y ventas administrativas
  router.get('/orders', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const orders = await orderRepo.listAllOrders();
      const allAlbums = await albumRepo.listAllAdmin();
      const albumMap = new Map(allAlbums.map(a => [a.id, a.title]));

      const frontendUrl = getPrimaryFrontendUrl();

      const enrichedOrders = orders.map(order => ({
        id: order.id,
        albumId: order.albumId,
        albumTitle: albumMap.get(order.albumId) || order.albumId,
        photoIds: order.photoIds,
        isFullAlbum: order.isFullAlbum,
        photoCount: order.photoCount,
        unitPrice: order.unitPrice,
        subtotal: order.subtotal,
        discount: order.discount,
        discountPercentage: order.discountPercentage,
        totalAmount: order.totalAmount,
        currency: order.currency,
        customer: {
          email: order.customer.email,
          name: order.customer.name,
          phone: order.customer.phone
        },
        couponApplied: order.couponApplied,
        status: order.status,
        preferenceId: order.preferenceId,
        paymentId: order.paymentId,
        downloadToken: order.downloadToken,
        downloadUrl: order.downloadToken ? `${frontendUrl}/pago-exitoso?token=${order.downloadToken}` : null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }));

      return res.status(200).json({
        success: true,
        total: enrichedOrders.length,
        orders: enrichedOrders
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 5. Regeneración de link criptográfico de descarga (72 horas)
  router.post('/orders/:orderId/regenerate-token', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const rawOrderId = req.params.orderId;
      const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

      let order = await orderRepo.getOrderById(orderId);
      if (!order && orderService) {
        order = await orderService.getOrderAsync(orderId);
      }

      if (!order) {
        return res.status(404).json({
          error: 'Orden no encontrada'
        });
      }

      const resourceType = order.isFullAlbum ? 'album_zip' : 'photo';
      const resourceId = order.isFullAlbum
        ? `${order.albumId}_completo.zip`
        : (order.photoIds && order.photoIds.length > 0 ? order.photoIds[0] : 'foto_seleccionada.jpg');

      const downloadToken = tokenSvc.generateToken(order.id, resourceType, resourceId);

      const updatedOrder = await orderRepo.updateOrderStatus(
        order.id,
        order.status,
        order.paymentId,
        downloadToken
      );

      if (orderService) {
        const memOrder = orderService.getOrder(order.id);
        if (memOrder) {
          memOrder.downloadToken = downloadToken;
          memOrder.updatedAt = new Date().toISOString();
        }
      }

      const frontendUrl = getPrimaryFrontendUrl();
      const downloadUrl = `${frontendUrl}/pago-exitoso?token=${downloadToken}`;

      return res.status(200).json({
        success: true,
        orderId: order.id,
        downloadToken,
        downloadUrl,
        expiresInHours: 72,
        order: updatedOrder || { ...order, downloadToken }
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 4. Registro de fotógrafos colaboradores (Escalabilidad multi-fotógrafo)
  router.post('/photographers', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      // Solo el rol admin puede registrar nuevos fotógrafos
      if (req.adminUser?.role !== 'admin') {
        return res.status(403).json({
          error: 'Acceso restringido: Solo administradores pueden registrar nuevos fotógrafos'
        });
      }

      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({
          error: 'Parámetros obligatorios: email, password, name'
        });
      }

      const newPhotographer = await authService.registerPhotographerAsync({
        email,
        password,
        name,
        role: role || 'photographer'
      });

      return res.status(201).json({
        success: true,
        photographer: {
          id: newPhotographer.id,
          email: newPhotographer.email,
          name: newPhotographer.name,
          role: newPhotographer.role,
          photographerId: newPhotographer.photographerId,
          createdAt: newPhotographer.createdAt
        }
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // 7. Gestión de Promociones y Cupones (Protegido por Admin Auth)
  router.get('/promotions', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const config = await promoRepo.getConfig();
      const coupons = await promoRepo.listCoupons();
      return res.status(200).json({
        success: true,
        config,
        coupons
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.put('/promotions/config', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { enableTierDiscounts, tier3DiscountPercent, tier5DiscountPercent, capAtFullAlbumPrice } = req.body;
      const updates: any = {};
      if (typeof enableTierDiscounts === 'boolean') updates.enableTierDiscounts = enableTierDiscounts;
      if (typeof tier3DiscountPercent === 'number' && tier3DiscountPercent >= 0 && tier3DiscountPercent <= 100) {
        updates.tier3DiscountPercent = tier3DiscountPercent;
      }
      if (typeof tier5DiscountPercent === 'number' && tier5DiscountPercent >= 0 && tier5DiscountPercent <= 100) {
        updates.tier5DiscountPercent = tier5DiscountPercent;
      }
      if (typeof capAtFullAlbumPrice === 'boolean') updates.capAtFullAlbumPrice = capAtFullAlbumPrice;

      const config = await promoRepo.updateConfig(updates);
      return res.status(200).json({
        success: true,
        config
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.post('/promotions/coupons', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { code, discountPercent, albumId, maxUses, maxPhotos, expiresAt } = req.body;
      if (!code || typeof code !== 'string' || code.trim().length < 2) {
        return res.status(400).json({ error: 'El código del cupón es obligatorio (mínimo 2 caracteres)' });
      }
      const discount = Number(discountPercent);
      if (isNaN(discount) || discount < 1 || discount > 100) {
        return res.status(400).json({ error: 'El porcentaje de descuento debe ser un número entre 1 y 100' });
      }

      const cleanAlbumId = albumId && typeof albumId === 'string' && albumId.trim() !== '' ? albumId.trim() : null;
      const cleanMaxUses = maxUses !== undefined && maxUses !== null && maxUses !== '' ? Number(maxUses) : null;
      const cleanMaxPhotos = maxPhotos !== undefined && maxPhotos !== null && maxPhotos !== '' ? Number(maxPhotos) : null;

      const coupon = await promoRepo.createCoupon({
        code: code.trim().toUpperCase(),
        discountPercent: discount,
        isActive: true,
        albumId: cleanAlbumId,
        maxUses: cleanMaxUses,
        maxPhotos: cleanMaxPhotos,
        expiresAt: expiresAt || null
      });

      return res.status(201).json({
        success: true,
        coupon
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.patch('/promotions/coupons/:code', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const rawCode = req.params.code;
      const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
      const { isActive, discountPercent, maxUses, albumId, maxPhotos, expiresAt } = req.body;

      const updates: any = {};
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (typeof discountPercent === 'number' && discountPercent >= 1 && discountPercent <= 100) {
        updates.discountPercent = discountPercent;
      }
      if (maxUses !== undefined) updates.maxUses = maxUses === null ? null : Number(maxUses);
      if (albumId !== undefined) updates.albumId = albumId === null ? null : String(albumId);
      if (maxPhotos !== undefined) updates.maxPhotos = maxPhotos === null ? null : Number(maxPhotos);
      if (expiresAt !== undefined) updates.expiresAt = expiresAt === null ? null : String(expiresAt);

      const updated = await promoRepo.updateCoupon(code, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Cupón no encontrado' });
      }

      return res.status(200).json({
        success: true,
        coupon: updated
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.delete('/promotions/coupons/:code', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const rawCode = req.params.code;
      const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
      const deleted = await promoRepo.deleteCoupon(code);
      if (!deleted) {
        return res.status(404).json({ error: 'Cupón no encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Cupón eliminado correctamente'
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 12. Rutas de Gestión de Categorías Dinámicas (CRUD Admin)
  router.get('/categories', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const categories = await catRepo.listAllCategoriesAdmin();
      return res.status(200).json(categories);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/categories', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { id, name, icon, badgeLabel, order, isActive } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
      }

      const category = await catRepo.createCategory({
        id: id && typeof id === 'string' && id.trim() ? id.trim() : undefined,
        name: name.trim(),
        icon: icon && typeof icon === 'string' && icon.trim() ? icon.trim() : '📸',
        badgeLabel: badgeLabel && typeof badgeLabel === 'string' && badgeLabel.trim() ? badgeLabel.trim() : undefined,
        order: order !== undefined ? Number(order) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      });

      return res.status(201).json({
        success: true,
        category
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.put('/categories/:id', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const updates = req.body;

      const updated = await catRepo.updateCategory(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      return res.status(200).json({
        success: true,
        category: updated
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.delete('/categories/:id', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      const deleted = await catRepo.deleteCategory(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Categoría eliminada correctamente'
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  return router;
}
