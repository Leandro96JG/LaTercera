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

export function createAdminRouter(
  authService: AdminAuthService,
  orderRepository?: IOrderRepository,
  albumRepository?: IAlbumRepository,
  tokenService?: DownloadTokenService,
  orderService?: OrderService
): Router {
  const router = Router();
  const requireAdminAuth = createRequireAdminAuth(authService);
  const orderRepo = orderRepository || new MemoryOrderRepository();
  const albumRepo = albumRepository || new MemoryAlbumRepository();
  const tokenSvc =
    tokenService ||
    new DownloadTokenService(
      process.env.DOWNLOAD_TOKEN_SECRET ||
        'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex'
    );

  // 1. Endpoint público de autenticación
  router.post('/login', async (req, res) => {
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

      return res.status(200).json({
        success: true,
        stats: {
          photosSold,
          albumsSold,
          revenueARS,
          storageUsedGB: 1.8,
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

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

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

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
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

  return router;
}
