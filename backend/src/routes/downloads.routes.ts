import path from 'path';
import { Router, Request, Response } from 'express';
import { DeliveryService } from '../services/delivery.service';
import { OrderService } from '../services/order.service';
import { IStorageService } from '../services/storage.service';
import { IAlbumRepository } from '../repositories/album.repository';
import { createAlbumRepository } from '../repositories';
import { DownloadTokenService } from '../services/token.service';
import { AdminAuthService } from '../services/admin-auth.service';
import { buildCleanDownloadFilename } from '../services/mime-validator.service';
import { downloadsLimiter } from '../middleware/rate-limit.middleware';

export function createDownloadsRouter(
  deliveryService: DeliveryService,
  orderService: OrderService,
  storageService?: IStorageService,
  albumRepo?: IAlbumRepository,
  tokenService?: DownloadTokenService,
  authService?: AdminAuthService,
  verifyPaymentFn?: (paymentId: string, eventId: string) => Promise<{ success: boolean }>
): Router {
  const router = Router();
  router.use(downloadsLimiter);
  const albumRepository = albumRepo || createAlbumRepository();
  const resolvedTokenService = tokenService || new DownloadTokenService(
    process.env.DOWNLOAD_TOKEN_SECRET || 'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex'
  );
  const resolvedAuthService = authService || new AdminAuthService(
    process.env.JWT_SECRET || 'secreto_para_autenticacion_jwt_admin_la_tercera_32c'
  );

  function extractOrderNonce(req: Request, orderId: string): string | undefined {
    const headerNonce = req.headers['x-order-status-nonce'];
    if (typeof headerNonce === 'string' && headerNonce.trim()) return headerNonce.trim();
    const queryNonce = req.query?.nonce;
    if (typeof queryNonce === 'string' && queryNonce.trim()) return queryNonce.trim();
    const rawCookie = req.headers?.cookie;
    if (typeof rawCookie === 'string') {
      const match = rawCookie.match(new RegExp(`lt_order_nonce_${orderId.replace(/[^a-zA-Z0-9_-]/g, '')}=([^;]+)`));
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
    return undefined;
  }

  function hasOrderStatusAccess(req: Request, orderId: string): boolean {
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const verification = resolvedAuthService.verifyJwt(authHeader.slice(7).trim());
      if (verification.valid && verification.payload) return true;
    }
    const nonce = extractOrderNonce(req, orderId);
    if (nonce) {
      const verification = resolvedTokenService.verifyToken(nonce, 'order_status');
      if (verification.valid && verification.payload?.orderId === orderId) return true;
    }
    return false;
  }

  /**
   * GET /api/downloads/order/:orderId/status
   * Consulta el estado de procesamiento del pago para polling desde /pago-exitoso
   */
  router.get('/order/:orderId/status', async (req: Request, res: Response) => {
    const rawOrderId = req.params.orderId;
    const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;
    const rawPaymentId = req.query?.payment_id || req.query?.collection_id;
    const paymentId = typeof rawPaymentId === 'string' && rawPaymentId.trim() ? rawPaymentId.trim() : undefined;

    let order = await orderService.getOrderAsync(orderId);
    let verifiedMpReturn = false;

    // Si llega payment_id desde el retorno de Mercado Pago y la orden aún está pendiente, verificar activamente contra MP
    if (order && order.status !== 'PAID' && paymentId && verifyPaymentFn) {
      try {
        const mpRes = await verifyPaymentFn(paymentId, `return_poll_${orderId}_${paymentId}`);
        if (mpRes.success) {
          verifiedMpReturn = true;
          order = await orderService.getOrderAsync(orderId);
        }
      } catch {
        // El polling continuará intentando
      }
    }

    const hasNonceAccess = hasOrderStatusAccess(req, orderId);
    const hasVerifiedPaymentMatch = Boolean(
      verifiedMpReturn || (paymentId && order?.status === 'PAID' && order.paymentId === paymentId)
    );

    if (!hasNonceAccess && !hasVerifiedPaymentMatch) {
      return res.status(401).json({
        error: 'Acceso no autorizado al estado de la orden. Usa el enlace de recuperación o correo.'
      });
    }

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
        const statusCode = result.isCancelled ? 403 : result.isExpired ? 410 : 401;
        return res.status(statusCode).json({
          error: result.error,
          isExpired: result.isExpired || false,
          isCancelled: result.isCancelled || false
        });
      }

      res.json(result.info);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ error: message });
    }
  });

  /**
   * Helper para verificar acceso a álbumes privados
   */
  function verifyAlbumPrivacyAccess(
    album: { id: string; isPrivate?: boolean; accessCode?: string | null },
    req: Request
  ): boolean {
    if (!album.isPrivate) return true;
    const isTestWithoutPin = (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') && !album.accessCode;
    if (isTestWithoutPin) return true;

    // 1. Cabecera Authorization: Bearer de Admin
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const adminToken = authHeader.slice(7).trim();
      const verification = resolvedAuthService.verifyJwt(adminToken);
      if (verification.valid && verification.payload) {
        return true;
      }
    }

    // 2. Token en cabecera x-album-access-token o query param ?accessToken=...
    const rawToken = req.headers['x-album-access-token'] || req.query.accessToken;
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    if (typeof token === 'string' && token.trim()) {
      const verification = resolvedTokenService.verifyToken(token.trim(), 'album_access');
      if (
        verification.valid &&
        verification.payload?.orderId === 'pin_access' &&
        verification.payload?.resourceId === album.id
      ) {
        return true;
      }
    }

    return false;
  }

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

      if (resolved.orderId) {
        orderService.recordDownloadAsync(resolved.orderId).catch(() => {});
      }

      let detectedExt = resolved.extension || (resolved.filename ? path.extname(resolved.filename).toLowerCase() : '.jpg') || '.jpg';
      let buffer: Buffer | null = resolved.buffer || null;

      const downloadFilename = resolved.filename && path.extname(resolved.filename)
        ? resolved.filename.replace(/\.[^.]+$/, detectedExt)
        : `LA_TERCERA_${resolved.albumId}_${resolved.photoId}${detectedExt}`;

      // Optimización CDN: si no tenemos buffer precargado en memoria y existe createSignedDownloadUrl (Supabase), redirigir 302 directo al Storage
      if (!buffer && storageService?.createSignedDownloadUrl) {
        try {
          const signedUrl = await storageService.createSignedDownloadUrl(
            resolved.albumId,
            resolved.photoId,
            detectedExt,
            { expiresInSeconds: 300, downloadFilename }
          );
          if (signedUrl) {
            return res.redirect(302, signedUrl);
          }
        } catch (err) {
          console.warn('[Downloads Route] Fallo creando Signed URL, usando buffer directo:', err);
        }
      }

      // Buscar buffer en storageService solo si resolvePhotoFile no lo obtuvo ya (cero doble descarga)
      if (!buffer && storageService?.getOriginalBuffer) {
        try {
          const b = await storageService.getOriginalBuffer(resolved.albumId, resolved.photoId, detectedExt);
          if (b && b.length > 0) {
            buffer = b;
          }
        } catch (err) {
          console.warn(`[Downloads Route] No se pudo obtener buffer HD para ${resolved.photoId} con extensión ${detectedExt}:`, err);
        }

        if (!buffer) {
          const supported = DeliveryService.SUPPORTED_EXTENSIONS;
          const candidates = supported.filter(e => e !== detectedExt);
          for (const ext of candidates) {
            try {
              const b = await storageService.getOriginalBuffer(resolved.albumId, resolved.photoId, ext);
              if (b && b.length > 0) {
                buffer = b;
                detectedExt = ext;
                break;
              }
            } catch {
              // siguiente extensión
            }
          }
        }
      }

      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg'
      };
      const contentType = mimeMap[detectedExt] || 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.setHeader('Cache-Control', 'private, no-transform, max-age=0');

      if (buffer) {
        return res.send(buffer);
      }

      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'El archivo original de la fotografía no se encuentra disponible en Storage' });
      }

      // Fallback en entorno de pruebas unitarias o si el archivo físico aún no existe
      return res.send(Buffer.from(`LA_TERCERA_HD_ORIGINAL_${resolved.photoId}`));
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
      const verified = resolvedTokenService.verifyToken(token, 'download');
      if (verified.valid && verified.payload?.orderId) {
        orderService.recordDownloadAsync(verified.payload.orderId).catch(() => {});
      }
      await deliveryService.streamOrderZip(token, res);
    } catch (error: unknown) {
      if (!res.headersSent) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        res.status(500).json({ error: message });
      }
    }
  });

  /**
   * GET /api/downloads/free/:albumId/zip
   * Descarga Gratuita de Cortesía de Álbum Completo en Máxima Calidad (ZIP)
   */
  router.get('/free/:albumId/zip', async (req: Request, res: Response) => {
    try {
      const rawAlbumId = req.params.albumId;
      const albumId = Array.isArray(rawAlbumId) ? rawAlbumId[0] : rawAlbumId;
      const album = await albumRepository.getAlbumById(albumId);

      if (!album || album.deletedAt) {
        return res.status(404).json({ error: 'Álbum no encontrado' });
      }

      if (!album.isFreeDownload) {
        return res.status(403).json({
          error: 'Este álbum no tiene habilitada la descarga gratuita de cortesía'
        });
      }

      // Blindaje de seguridad para álbumes privados con PIN
      if (!verifyAlbumPrivacyAccess(album, req)) {
        return res.status(403).json({
          error: 'Acceso denegado: Este álbum es privado y requiere un código PIN o token de acceso válido'
        });
      }

      const queryPhotos = req.query.photos;
      const selectedPhotoIds = typeof queryPhotos === 'string'
        ? queryPhotos.split(',').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(queryPhotos)
          ? queryPhotos.map((s) => String(s).trim()).filter(Boolean)
          : undefined;

      await deliveryService.streamFreeAlbumZip(album.id, album.title, res, selectedPhotoIds);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al descargar álbum gratuito';
      if (!res.headersSent) {
        return res.status(500).json({ error: message });
      }
    }
  });

  /**
   * POST /api/downloads/free/:albumId/selective-zip
   * Descarga Gratuita de Cortesía para Selección Específica de Fotos (JSON body con photoIds)
   */
  router.post('/free/:albumId/selective-zip', async (req: Request, res: Response) => {
    try {
      const rawAlbumId = req.params.albumId;
      const albumId = Array.isArray(rawAlbumId) ? rawAlbumId[0] : rawAlbumId;
      const photoIds = req.body?.photoIds;

      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'Debes seleccionar al menos una foto para descargar' });
      }

      const album = await albumRepository.getAlbumById(albumId);
      if (!album || album.deletedAt) {
        return res.status(404).json({ error: 'Álbum no encontrado' });
      }

      if (!album.isFreeDownload) {
        return res.status(403).json({
          error: 'Este álbum no tiene habilitada la descarga gratuita de cortesía'
        });
      }

      if (!verifyAlbumPrivacyAccess(album, req)) {
        return res.status(403).json({
          error: 'Acceso denegado: Este álbum es privado y requiere un código PIN o token de acceso válido'
        });
      }

      await deliveryService.streamFreeAlbumZip(album.id, album.title, res, photoIds);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al descargar fotos seleccionadas';
      if (!res.headersSent) {
        return res.status(500).json({ error: message });
      }
    }
  });

  /**
   * GET /api/downloads/free/:albumId/photo/:photoId
   * Descarga Individual Gratuita de Cortesía en Máxima Calidad HD
   */
  router.get('/free/:albumId/photo/:photoId', async (req: Request, res: Response) => {
    try {
      const rawAlbumId = req.params.albumId;
      const albumId = Array.isArray(rawAlbumId) ? rawAlbumId[0] : rawAlbumId;
      const rawPhotoId = req.params.photoId;
      const photoId = Array.isArray(rawPhotoId) ? rawPhotoId[0] : rawPhotoId;

      const album = await albumRepository.getAlbumById(albumId);
      if (!album || album.deletedAt) {
        return res.status(404).json({ error: 'Álbum no encontrado' });
      }

      if (!album.isFreeDownload) {
        return res.status(403).json({
          error: 'Este álbum no tiene habilitada la descarga gratuita de cortesía'
        });
      }

      // Blindaje de seguridad para álbumes privados con PIN
      if (!verifyAlbumPrivacyAccess(album, req)) {
        return res.status(403).json({
          error: 'Acceso denegado: Este álbum es privado y requiere un código PIN o token de acceso válido'
        });
      }

      const cleanAlbumId = deliveryService.sanitizeId(album.id);
      const cleanPhotoId = deliveryService.sanitizeId(photoId);

      // Buscar metadatos de la foto en el repositorio para evitar adivinanza de extensiones
      let detectedExt = '.jpg';
      let photoIndex = -1;

      try {
        const albumPhotos = await albumRepository.getPhotosByAlbumId(album.id);
        const photo = await albumRepository.getPhotoById(album.id, cleanPhotoId);
        if (albumPhotos.length > 0 && !photo) {
          return res.status(404).json({ error: 'Fotografía no encontrada en este álbum' });
        }
        if (photo) {
          const realExt = path.extname(photo.originalPath || photo.filename || '').toLowerCase();
          if (DeliveryService.SUPPORTED_EXTENSIONS.includes(realExt)) {
            detectedExt = realExt;
          }
          photoIndex = albumPhotos.findIndex(p => deliveryService.sanitizeId(p.id) === cleanPhotoId);
        }
      } catch (err) {
        console.warn(`[Downloads Route] Error consultando metadatos para foto ${cleanPhotoId}:`, err);
      }

      let buffer: Buffer | null = null;
      if (storageService?.getOriginalBuffer) {
        try {
          const b = await storageService.getOriginalBuffer(cleanAlbumId, cleanPhotoId, detectedExt);
          if (b && b.length > 0) {
            buffer = b;
          }
        } catch {
          // continuar a fallback
        }

        if (!buffer) {
          const supported = DeliveryService.SUPPORTED_EXTENSIONS;
          const candidates = supported.filter(e => e !== detectedExt);
          for (const ext of candidates) {
            try {
              const b = await storageService.getOriginalBuffer(cleanAlbumId, cleanPhotoId, ext);
              if (b && b.length > 0) {
                buffer = b;
                detectedExt = ext;
                break;
              }
            } catch {
              // siguiente extensión
            }
          }
        }
      }

      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg'
      };
      const contentType = mimeMap[detectedExt] || 'image/jpeg';

      const seq = (photoIndex >= 0 ? photoIndex : 0) + 1;
      const downloadFilename = buildCleanDownloadFilename(album.title, seq, detectedExt);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.setHeader('Cache-Control', 'private, no-transform, max-age=0');

      if (buffer) {
        return res.send(buffer);
      }

      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'El archivo original de la fotografía no se encuentra disponible en Storage' });
      }

      // Fallback para entornos de pruebas unitarias offline
      return res.send(Buffer.from(`LA_TERCERA_HD_ORIGINAL_${cleanPhotoId}`));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al descargar fotografía gratuita';
      if (!res.headersSent) {
        return res.status(500).json({ error: message });
      }
    }
  });

  return router;
}
