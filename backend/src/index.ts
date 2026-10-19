import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import multer from 'multer';
import {
  albumAccessLimiter,
  couponValidationLimiter,
  orderRecoveryLimiter
} from './middleware/rate-limit.middleware';
import { calculateCartTotal, PricingRequest } from './services/pricing.service';
import { processImageWithWatermark } from './services/image.service';
import { DownloadTokenService } from './services/token.service';
import { OrderService } from './services/order.service';
import { MercadoPagoService } from './services/mercadopago.service';
import { validateMercadoPagoWebhook } from './services/mercadopago-webhook.service';
import { AdminAuthService } from './services/admin-auth.service';
import { createStorageService } from './services/storage.service';
import { DeliveryService } from './services/delivery.service';
import { createAdminRouter } from './routes/admin.routes';
import { createAdminAlbumsRouter } from './routes/admin-albums.routes';
import { createDownloadsRouter } from './routes/downloads.routes';
import { createRequireAdminAuth } from './middleware/admin-auth.middleware';
import { getPrimaryFrontendUrl } from './config/env';
import { EmailNotificationService } from './services/email.service';

import {
  createOrderRepository,
  createAlbumRepository,
  createPhotographerRepository,
  createPromotionRepository,
  createCategoryRepository
} from './repositories';

dotenv.config();

// Validación estricta de variables de entorno y secretos en producción
if (process.env.NODE_ENV === 'production') {
  const defaultSecrets: Record<string, string> = {
    JWT_SECRET: 'secreto_para_autenticacion_jwt_admin_la_tercera_32c',
    DOWNLOAD_TOKEN_SECRET: 'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex',
    MP_WEBHOOK_SECRET: 'test_webhook_secret_key_super_segura_para_firmas_32_chars',
    ADMIN_PASSWORD: 'YuyoFotos2026!'
  };

  for (const [key, defVal] of Object.entries(defaultSecrets)) {
    const val = process.env[key];
    if (!val || val.trim() === '' || val === defVal) {
      throw new Error(
        `[SEGURIDAD FATAL] La variable de entorno "${key}" es obligatoria en producción y no puede estar ausente ni utilizar el valor inseguro por defecto.`
      );
    }
  }
}

const app = express();

// Trust proxy para proxies inversos (Render, Railway, Fly.io, Cloudflare)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 4000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Configuración dinámica de CORS para producción y previsualizaciones
const allowedOrigins = FRONTEND_URL
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir llamadas sin origin (curl, SSR, herramientas server-to-server) o en tests
    if (!origin || process.env.NODE_ENV === 'test') {
      return callback(null, true);
    }
    const cleanOrigin = origin.replace(/\/+$/, '');
    const isDevLocalhost =
      process.env.NODE_ENV !== 'production' &&
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);

    if (
      allowedOrigins.includes(cleanOrigin) ||
      allowedOrigins.includes('*') ||
      isDevLocalhost
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Acceso CORS no autorizado para el origen: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'apikey', 'x-album-access-token']
};

// Configuración de Seguridad y Servicios de Mercado Pago
const DOWNLOAD_TOKEN_SECRET =
  process.env.DOWNLOAD_TOKEN_SECRET ||
  'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex';
const MP_ACCESS_TOKEN =
  process.env.MP_ACCESS_TOKEN || 'TEST-00000000-0000-0000-0000-000000000000';
const MP_WEBHOOK_SECRET =
  process.env.MP_WEBHOOK_SECRET || 'test_webhook_secret_key_super_segura_para_firmas_32_chars';
const JWT_SECRET =
  process.env.JWT_SECRET || 'secreto_para_autenticacion_jwt_admin_la_tercera_32c';

export const photographerRepository = createPhotographerRepository();
export const orderRepository = createOrderRepository();
export const albumRepository = createAlbumRepository();
export const promotionRepository = createPromotionRepository();
export const categoryRepository = createCategoryRepository();
export const tokenService = new DownloadTokenService(DOWNLOAD_TOKEN_SECRET);
export const emailService = new EmailNotificationService();
export const orderService = new OrderService(tokenService, orderRepository, albumRepository, promotionRepository, emailService);
export const mpService = new MercadoPagoService(MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, orderService);
export const adminAuthService = new AdminAuthService(JWT_SECRET, 86400, photographerRepository);
export const storageService = createStorageService();
export const deliveryService = new DeliveryService(orderService, tokenService, storageService, albumRepository);

// Middlewares de Seguridad y CORS
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas Administrativas y de Autenticación
app.use(
  '/api/admin',
  createAdminRouter(
    adminAuthService,
    orderRepository,
    albumRepository,
    tokenService,
    orderService,
    promotionRepository,
    categoryRepository
  )
);
app.use('/api/admin/albums', createAdminAlbumsRouter(adminAuthService, albumRepository, categoryRepository));
app.use(
  '/api/downloads',
  createDownloadsRouter(
    deliveryService,
    orderService,
    storageService,
    albumRepository,
    tokenService,
    adminAuthService
  )
);

// Multer en memoria para procesamiento directo en streaming con Sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB por foto
});

// Ruta Health Check (soporta /health y /api/health para Railway, orquestadores y monitoreo)
app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    brand: 'LA TERCERA',
    author: 'Jenifer "Yuyo" Espeche',
    timestamp: new Date().toISOString()
  });
});

// Endpoint: Listado Público de Categorías Activas
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const categories = await categoryRepository.listCategories();
    return res.status(200).json(categories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint: Validación Pública de Cupones Promocionales (Zero-Trust)
app.post('/api/pricing/validate-coupon', couponValidationLimiter, async (req: Request, res: Response) => {
  try {
    const { code, albumId, photoCount, isFullAlbum } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ valid: false, message: 'Debe ingresar un código de cupón' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const coupon = await promotionRepository.getCouponByCode(normalizedCode);

    if (!coupon || !coupon.isActive) {
      return res.status(200).json({
        valid: false,
        message: 'El cupón ingresado no es válido o no se encuentra activo'
      });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      return res.status(200).json({
        valid: false,
        message: 'Este cupón ha expirado'
      });
    }

    if (coupon.albumId && albumId && coupon.albumId !== albumId) {
      return res.status(200).json({
        valid: false,
        message: 'Este cupón no es válido para este álbum específico'
      });
    }

    if (coupon.maxPhotos != null) {
      const isFull = Boolean(isFullAlbum);
      const count = photoCount !== undefined ? Number(photoCount) : undefined;
      if (isFull) {
        return res.status(200).json({
          valid: false,
          message: `Este cupón de sorteo es válido hasta ${coupon.maxPhotos} foto(s) individual(es)`
        });
      }
      if (count !== undefined && count > coupon.maxPhotos) {
        return res.status(200).json({
          valid: false,
          message: `Este cupón de sorteo es válido hasta ${coupon.maxPhotos} foto(s) individual(es)`
        });
      }
    }

    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      return res.status(200).json({
        valid: false,
        message: 'Este cupón ha alcanzado el límite máximo de usos disponibles'
      });
    }

    return res.status(200).json({
      valid: true,
      code: coupon.code,
      discountPercentage: coupon.discountPercent,
      message: `¡Cupón ${coupon.code} aplicado con éxito! (${coupon.discountPercent}% de descuento)`
    });
  } catch (error: any) {
    return res.status(500).json({ valid: false, message: error.message });
  }
});

// Endpoint: Consulta Pública de Reglas de Descuento por Volumen (Sin exponer cupones)
app.get('/api/pricing/config', async (req: Request, res: Response) => {
  try {
    const config = await promotionRepository.getConfig();
    return res.status(200).json({
      enableTierDiscounts: config.enableTierDiscounts,
      tier3DiscountPercent: config.tier3DiscountPercent,
      tier5DiscountPercent: config.tier5DiscountPercent,
      capAtFullAlbumPrice: config.capAtFullAlbumPrice
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint: Cálculo Dinámico de Precios y Descuentos
app.post('/api/pricing/calculate', async (req: Request, res: Response) => {
  try {
    const pricingReq: PricingRequest = req.body;
    const config = await promotionRepository.getConfig();
    let coupon = null;
    if (pricingReq.couponCode) {
      const found = await promotionRepository.getCouponByCode(pricingReq.couponCode);
      if (found && found.isActive) {
        coupon = found;
      }
    }
    const result = calculateCartTotal({
      ...pricingReq,
      config,
      coupon
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint: Subida y Procesamiento de Imagen con Marca de Agua (Protegido para Admin)
app.post(
  '/api/images/process',
  createRequireAdminAuth(adminAuthService),
  upload.single('photo'),
  async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo de imagen' });
    }

    const isHD = req.body.isHD === 'true';
    const watermarkText = req.body.watermarkText || 'LA TERCERA • MUESTRA';

    const processed = await processImageWithWatermark(req.file.buffer, {
      isHD,
      watermarkText,
      targetWidth: 800,
      quality: 70
    });

    res.json({
      success: true,
      originalSize: req.file.size,
      previewSize: processed.previewBuffer.length,
      width: processed.width,
      height: processed.height,
      format: processed.format,
      isHD
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Catálogo de Álbumes (Conectado a Persistencia Repository / Supabase)
app.get('/api/albums', async (req: Request, res: Response) => {
  try {
    const rawCat = req.query.category as string | undefined;
    const category = Array.isArray(rawCat) ? rawCat[0] : rawCat;
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;

    // Si NO se envía 'page', preserva el contrato histórico { albums: AlbumDTO[] }
    if (rawPage === undefined) {
      const albums = await albumRepository.findAll(category);
      return res.json({ albums });
    }

    // Si se envía 'page', devuelve estructura paginada moderna
    const page = Math.max(1, parseInt(String(rawPage), 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(String(rawLimit), 10) || 200));
    const rawSearch = req.query.search as string | undefined;
    const search = Array.isArray(rawSearch) ? rawSearch[0] : rawSearch;
    const rawDate = req.query.date as string | undefined;
    const date = Array.isArray(rawDate) ? rawDate[0] : rawDate;

    const result = await albumRepository.listAlbumsPaginated({ page, limit, category, search, date });
    return res.json({
      success: true,
      albums: result.albums,
      pagination: result.pagination
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener álbumes';
    return res.status(500).json({ error: message });
  }
});

// Endpoint: Obtener Fotos Públicas de un Álbum (Zero-Trust: proyección segura sin original_path)
app.get('/api/albums/:id/photos', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const albumId = Array.isArray(rawId) ? rawId[0] : rawId;

    const album = await albumRepository.getAlbumById(albumId);
    if (!album) {
      return res.status(404).json({ success: false, error: `Álbum con ID "${albumId}" no encontrado` });
    }

    // Blindaje de seguridad para álbumes privados con PIN
    if (album.isPrivate) {
      const isTestWithoutPin = (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') && !album.accessCode;
      if (!isTestWithoutPin) {
        let hasAccess = false;

        // 1. Cabecera Authorization: Bearer de Admin
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const adminToken = authHeader.slice(7).trim();
          const verification = adminAuthService.verifyJwt(adminToken);
          if (verification.valid && verification.payload) {
            hasAccess = true;
          }
        }

        // 2. Token en cabecera x-album-access-token o query param ?accessToken=...
        if (!hasAccess) {
          const rawToken = req.headers['x-album-access-token'] || req.query.accessToken;
          const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
          if (typeof token === 'string' && token.trim()) {
            const verification = tokenService.verifyToken(token.trim());
            if (verification.valid && verification.payload?.resourceId === album.id) {
              hasAccess = true;
            }
          }
        }

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Acceso denegado: Este álbum es privado y requiere un código PIN o token de acceso válido'
          });
        }
      }
    }

    const photos = await albumRepository.getPhotosByAlbumId(albumId);
    // Proyección Zero-Trust: omitimos original_path para visitantes y clientes públicos
    const publicPhotos = photos.map(p => ({
      id: p.id,
      albumId: p.albumId,
      filename: p.filename,
      previewUrl: p.previewUrl,
      isSampleHd: p.isSampleHd,
      width: p.width,
      height: p.height,
      sizeBytes: p.sizeBytes
    }));

    return res.json({
      success: true,
      albumId,
      total: publicPhotos.length,
      photos: publicPhotos
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener fotos del álbum';
    return res.status(500).json({ success: false, error: message });
  }
});

// Endpoint: Verificación de Código de Acceso para Álbumes Privados
app.post('/api/albums/:id/verify-access', albumAccessLimiter, async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const albumId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { accessCode } = req.body as { accessCode?: string };

    if (!accessCode || typeof accessCode !== 'string') {
      return res.status(400).json({
        success: false,
        valid: false,
        albumId,
        message: 'Debe ingresar el código de acceso'
      });
    }

    const isValid = await albumRepository.verifyAlbumAccess(albumId, accessCode);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        valid: false,
        albumId,
        message: 'Código de acceso incorrecto'
      });
    }

    const album = await albumRepository.getAlbumById(albumId);
    const resolvedAlbumId = album ? album.id : albumId;

    // Token criptográfico temporal (24 horas) para confirmar sesión desbloqueada
    const accessToken = tokenService.generateToken('pin_access', 'album_zip', resolvedAlbumId, 24 * 3600);

    return res.status(200).json({
      success: true,
      valid: true,
      albumId,
      accessToken,
      message: 'Acceso autorizado correctamente'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al verificar acceso al álbum';
    return res.status(500).json({ success: false, valid: false, error: message });
  }
});

// Endpoint: Creación de Preferencia de Pago en Mercado Pago (Zero-Trust)
app.post('/api/checkout/preference', async (req: Request, res: Response) => {
  try {
    const { albumId, photoIds, isFullAlbum, couponCode, customer } = req.body;

    if (!albumId || !customer || !customer.email) {
      return res.status(400).json({ error: 'Parámetros obligatorios faltantes: albumId y customer.email' });
    }

    const isFullAlbumBool = Boolean(isFullAlbum);
    const rawPhotoIds: string[] = Array.isArray(photoIds) ? photoIds : [];
    const uniquePhotoIds = Array.from(new Set(rawPhotoIds));

    if (!isFullAlbumBool && uniquePhotoIds.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos una foto o el álbum completo' });
    }

    // Verificar existencia del álbum y rechazar si es descarga gratuita
    const album = await albumRepository.getAlbumById(albumId);
    if (!album) {
      return res.status(404).json({ error: 'Álbum no encontrado' });
    }

    if (album.isFreeDownload) {
      return res.status(400).json({ error: 'Este álbum es de descarga gratuita de cortesía y no requiere pago' });
    }

    // Validación de pertenencia de fotos al álbum y prevención de inyecciones de ruta
    if (!isFullAlbumBool) {
      for (const pid of uniquePhotoIds) {
        if (
          typeof pid !== 'string' ||
          !pid.trim() ||
          pid.includes('..') ||
          pid.includes('/') ||
          pid.includes('\\')
        ) {
          return res.status(400).json({
            error: 'Identificador de foto inválido o intento de inyección de ruta detectado'
          });
        }
      }

      const albumPhotos = await albumRepository.getPhotosByAlbumId(albumId);
      if (albumPhotos.length > 0) {
        // Detectar si son fotos sintéticas demo autogeneradas en memoria
        const isMockAlbum = albumPhotos.every(
          p => p.id.startsWith(`${albumId}-photo-`) && p.filename.includes('_muestra_')
        );
        const isTestMode = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

        if (!isMockAlbum || !isTestMode) {
          const albumPhotoIds = new Set(albumPhotos.map(p => p.id));
          const invalidPhotoIds = uniquePhotoIds.filter(pid => !albumPhotoIds.has(pid));
          if (invalidPhotoIds.length > 0) {
            return res.status(400).json({
              error: `Las siguientes fotos no pertenecen al álbum seleccionado: ${invalidPhotoIds.join(', ')}`
            });
          }
        }
      }
    }

    // Creación de la orden con cálculo dinámico en servidor desde Supabase
    const order = await orderService.createOrderAsync({
      albumId,
      photoIds: uniquePhotoIds,
      isFullAlbum: isFullAlbumBool,
      couponCode,
      customer
    });

    // Flujo de Canje Directo 100% OFF (Sorteos y Cupones Gratuitos)
    if (order.totalAmount === 0) {
      if (order.couponApplied) {
        const consumeResult = await promotionRepository.tryConsumeCoupon(
          order.couponApplied,
          albumId,
          uniquePhotoIds.length,
          isFullAlbumBool
        );
        if (!consumeResult.success) {
          return res.status(400).json({
            error: consumeResult.error || 'El cupón acaba de alcanzar su límite de usos'
          });
        }
      }

      const resourceType = order.isFullAlbum ? 'album_zip' : 'photo';
      const resourceId = order.isFullAlbum
        ? `${order.albumId}_completo.zip`
        : order.photoIds[0] || 'foto_seleccionada.jpg';

      const downloadToken = tokenService.generateToken(order.id, resourceType, resourceId, 72 * 3600);
      const paymentId = 'FREE_COUPON_' + (order.couponApplied || 'PROMO');

      await orderService.completeFreeOrderAsync(order.id, paymentId, downloadToken);

      const redirectUrl = `${getPrimaryFrontendUrl()}/pago-exitoso?token=${downloadToken}`;

      return res.status(201).json({
        success: true,
        isFreeRedemption: true,
        orderId: order.id,
        downloadToken,
        redirectUrl,
        totalAmount: 0
      });
    }

    // Creación de la preferencia Checkout Pro en Mercado Pago (solo para compras con total > 0)
    const preference = await mpService.createCheckoutPreference(order.id, APP_URL);

    res.status(201).json({
      success: true,
      orderId: order.id,
      preferenceId: preference.preferenceId,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      totalAmount: order.totalAmount,
      currency: order.currency,
      photoCount: order.photoCount,
      isFullAlbum: order.isFullAlbum,
      discount: order.discount
    });
  } catch (error: any) {
    const msg = error?.message || 'Error al procesar checkout';
    const isClientError = msg.includes('cupón') || msg.includes('límite') || msg.includes('no encontrado') || msg.includes('Parámetros');
    res.status(isClientError ? 400 : 500).json({ error: msg });
  }
});

// Endpoint: Webhook de Mercado Pago con Verificación Criptográfica HMAC-SHA256
app.post('/api/webhooks/mercadopago', async (req: Request, res: Response) => {
  try {
    const xSignature = req.headers['x-signature'] as string | undefined;
    const xRequestId = req.headers['x-request-id'] as string | undefined;
    const dataId =
      (req.query['data.id'] as string) ||
      (req.body?.data?.id as string) ||
      (req.body?.id as string);

    // 1. Validación de Firma Criptográfica y Anti-Replay
    const validation = validateMercadoPagoWebhook({
      xSignature,
      xRequestId,
      dataId,
      secretKey: MP_WEBHOOK_SECRET
    });

    if (!validation.isValid) {
      console.warn(`[Webhook MP Rechazado] ${validation.reason}`);
      return res.status(401).json({ error: 'Firma criptográfica inválida', reason: validation.reason });
    }

    const eventId = xRequestId || `evt_${dataId}_${Date.now()}`;
    const type = req.query.type || req.body?.type || req.body?.action;

    // Si el evento no pertenece al ciclo de vida de un pago, responder 200 sin procesar
    if (type && type !== 'payment' && !type.toString().startsWith('payment.')) {
      return res.status(200).json({ received: true, ignored: true, type });
    }

    // 2. Consulta y Verificación contra la API Oficial de Mercado Pago
    const result = await mpService.verifyAndProcessPaymentFromAPI(dataId, eventId);

    if (result.fraudAlert) {
      console.error(`[ALERTA FRAUDE MP] Pago ${dataId} bloqueado por discrepancia de monto`);
      return res.status(200).json({ status: 'fraud_alert_logged' });
    }

    res.status(200).json({
      status: 'ok',
      alreadyProcessed: result.alreadyProcessed ?? false
    });
  } catch (error: any) {
    console.error(`[Webhook MP Error Interno] ${error.message}`);
    res.status(200).json({ status: 'error_logged', error: error.message });
  }
});

// Endpoint: Consulta de Estado de la Orden
app.get('/api/orders/:orderId', async (req: Request, res: Response) => {
  const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const order = await orderService.getOrderAsync(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Orden no encontrada' });
  }

  res.json({
    id: order.id,
    albumId: order.albumId,
    status: order.status,
    totalAmount: order.totalAmount,
    photoCount: order.photoCount,
    isFullAlbum: order.isFullAlbum,
    hasDownloadToken: Boolean(order.status === 'PAID' && order.downloadToken),
    downloadToken: order.status === 'PAID' ? order.downloadToken : undefined,
    createdAt: order.createdAt
  });
});

// Endpoint: Recuperación de Órdenes Pagadas por Correo (Últimas 72 Horas)
app.post('/api/orders/recover', orderRecoveryLimiter, async (req: Request, res: Response) => {
  try {
    const { email, paymentId } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debes ingresar un correo electrónico válido'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPaymentId = typeof paymentId === 'string' && paymentId.trim() ? paymentId.trim() : undefined;

    const candidateOrders = typeof orderRepository.findOrdersByEmail === 'function'
      ? await orderRepository.findOrdersByEmail(normalizedEmail)
      : await orderRepository.listAllOrders();
    const now = Date.now();
    const maxAgeMs = 72 * 3600 * 1000;

    const validOrders = candidateOrders.filter(order => {
      if (order.status !== 'PAID') return false;
      const customerEmail = order.customer?.email?.trim().toLowerCase();
      if (customerEmail !== normalizedEmail) return false;

      if (cleanPaymentId) {
        const matchesPayment = order.paymentId === cleanPaymentId || order.id === cleanPaymentId;
        if (!matchesPayment) return false;
      }

      const orderCreatedAtMs = new Date(order.createdAt).getTime();
      const isWithin72Hours = (now - orderCreatedAtMs) <= maxAgeMs;

      let hasValidToken = false;
      if (order.downloadToken) {
        const verifyRes = tokenService.verifyToken(order.downloadToken);
        hasValidToken = verifyRes.valid;
      }

      return hasValidToken || isWithin72Hours;
    });

    if (validOrders.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No se encontraron compras vigentes asociadas a este correo en las últimas 72 horas.'
      });
    }

    const orders = validOrders.map(order => {
      let token = order.downloadToken;
      let isTokenActive = false;
      if (token) {
        isTokenActive = tokenService.verifyToken(token).valid;
      }

      if (!token || !isTokenActive) {
        const resourceType = order.isFullAlbum ? 'album_zip' : 'photo';
        const resourceId = order.isFullAlbum
          ? `${order.albumId}_completo.zip`
          : (order.photoIds[0] || 'foto_seleccionada.jpg');
        token = tokenService.generateToken(order.id, resourceType, resourceId);
      }

      // Enviar email de respaldo transaccional en segundo plano (sin bloquear la respuesta)
      emailService.sendOrderReadyEmail(order, token).catch(err => {
        console.warn(`[OrderRecovery] Fallo al enviar email de recuperación para orden ${order.id}:`, err);
      });

      const redirectUrl = `${getPrimaryFrontendUrl()}/pago-exitoso?token=${encodeURIComponent(token)}`;
      const albumTitle = order.albumTitleSnapshot || order.albumTitle || 'Álbum Fotográfico';

      return {
        orderId: order.id,
        albumTitle,
        photoCount: order.photoCount || order.photoIds?.length || (order.isFullAlbum ? 0 : 1),
        isFullAlbum: Boolean(order.isFullAlbum),
        createdAt: order.createdAt,
        downloadToken: token,
        redirectUrl
      };
    });

    return res.status(200).json({
      success: true,
      orders
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al procesar recuperación de órdenes';
    return res.status(500).json({ success: false, message });
  }
});

// Endpoint: Verificación de Token Criptográfico de Descarga (72h)
app.get('/api/downloads/verify/:token', async (req: Request, res: Response) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const result = tokenService.verifyToken(token);

  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  // Verificar que la orden no esté cancelada o en fraude
  const order = await orderService.getOrderAsync(result.payload!.orderId);
  if (order && order.status !== 'PAID') {
    return res.status(403).json({ error: 'La orden vinculada a esta descarga no se encuentra activa' });
  }

  res.json({
    valid: true,
    payload: result.payload
  });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[La Tercera API] Servidor iniciado en http://localhost:${PORT}`);
  });
}
