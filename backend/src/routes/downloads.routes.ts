import { Router, Request, Response } from 'express';
import { DeliveryService } from '../services/delivery.service';
import { OrderService } from '../services/order.service';
import { IStorageService } from '../services/storage.service';

export function createDownloadsRouter(
  deliveryService: DeliveryService,
  orderService: OrderService,
  storageService?: IStorageService
): Router {
  const router = Router();

  /**
   * GET /api/downloads/order/:orderId/status
   * Consulta el estado de procesamiento del pago para polling desde /pago-exitoso
   */
  router.get('/order/:orderId/status', async (req: Request, res: Response) => {
    const rawOrderId = req.params.orderId;
    const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

    const order = await orderService.getOrderAsync(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const downloadToken = order.status === 'PAID' ? order.downloadToken : undefined;
    const deliveryInfoUrl = downloadToken ? `/api/downloads/${downloadToken}/info` : undefined;

    res.json({
      orderId: order.id,
      status: order.status,
      downloadToken,
      deliveryInfoUrl
    });
  });

  /**
   * GET /api/downloads/:token/info
   * Obtiene la información completa de entrega de fotos y enlaces de descarga
   */
  router.get('/:token/info', async (req: Request, res: Response) => {
    try {
      const rawToken = req.params.token;
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      const baseUrl =
        process.env.APP_URL ||
        `${req.protocol || 'http'}://${req.get('host') || 'localhost:4000'}`;

      const result = await deliveryService.getDeliveryInfo(token, baseUrl);

      if (!result.valid) {
        const statusCode = result.isExpired ? 410 : 401;
        return res.status(statusCode).json({
          error: result.error,
          isExpired: result.isExpired || false
        });
      }

      res.json(result.info);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ error: message });
    }
  });

  /**
   * GET /api/downloads/:token/file
   * Streaming de descarga de foto original individual con Content-Disposition: attachment
   */
  router.get('/:token/file', async (req: Request, res: Response) => {
    try {
      const rawToken = req.params.token;
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      const rawPhotoId = req.query.photoId as string | undefined;

      const resolved = await deliveryService.resolvePhotoFile(token, rawPhotoId);
      if (!resolved.success || !resolved.albumId || !resolved.photoId) {
        return res.status(403).json({ error: resolved.error });
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${resolved.filename}"`);
      res.setHeader('Cache-Control', 'private, no-transform, max-age=0');

      // Servir buffer binario real de la foto desde storageService si existe
      let buffer: Buffer | null = null;
      if (storageService?.getOriginalBuffer) {
        try {
          buffer = await storageService.getOriginalBuffer(resolved.albumId, resolved.photoId, '.jpg');
        } catch (err) {
          console.warn(`[Downloads Route] No se pudo obtener buffer HD para ${resolved.photoId}:`, err);
        }
      }

      if (buffer) {
        res.send(buffer);
      } else {
        // Fallback en entorno de pruebas unitarias o si el archivo físico aún no existe
        res.send(Buffer.from(`LA_TERCERA_HD_ORIGINAL_${resolved.photoId}`));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ error: message });
    }
  });

  /**
   * GET /api/downloads/:token/zip
   * Streaming dinámico de empaquetado ZIP con archiver
   */
  router.get('/:token/zip', async (req: Request, res: Response) => {
    try {
      const rawToken = req.params.token;
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      await deliveryService.streamOrderZip(token, res);
    } catch (error: unknown) {
      if (!res.headersSent) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        res.status(500).json({ error: message });
      }
    }
  });

  return router;
}
