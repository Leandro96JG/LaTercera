import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
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
import { createAdminAlbumsRouter, adminAlbumsRouter } from './routes/admin-albums.routes';
import { createDownloadsRouter } from './routes/downloads.routes';

import { createOrderRepository, createAlbumRepository } from './repositories';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

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

export const orderRepository = createOrderRepository();
export const albumRepository = createAlbumRepository();
export const tokenService = new DownloadTokenService(DOWNLOAD_TOKEN_SECRET);
export const orderService = new OrderService(tokenService, orderRepository);
export const mpService = new MercadoPagoService(MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, orderService);
export const adminAuthService = new AdminAuthService(JWT_SECRET);
export const storageService = createStorageService();
export const deliveryService = new DeliveryService(orderService, tokenService, storageService);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas Administrativas y de Autenticación
app.use('/api/admin', createAdminRouter(adminAuthService));
app.use('/api/admin/albums', createAdminAlbumsRouter(adminAuthService, albumRepository));
app.use('/api/downloads', createDownloadsRouter(deliveryService, orderService));

// Multer en memoria para procesamiento directo en streaming con Sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB por foto
});

// Ruta Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    brand: 'LA TERCERA',
    author: 'Jenifer "Yuyo" Espeche',
    timestamp: new Date().toISOString()
  });
});

// Endpoint: Cálculo de Precios y Descuentos
app.post('/api/pricing/calculate', (req: Request, res: Response) => {
  try {
    const pricingReq: PricingRequest = req.body;
    const result = calculateCartTotal(pricingReq);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint: Subida y Procesamiento de Imagen con Marca de Agua
app.post('/api/images/process', upload.single('photo'), async (req: Request, res: Response) => {
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
    const limit = Math.max(1, Math.min(50, parseInt(String(rawLimit), 10) || 8));

    const result = await albumRepository.listAlbumsPaginated({ page, limit, category });
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

// Endpoint: Creación de Preferencia de Pago en Mercado Pago (Zero-Trust)
app.post('/api/checkout/preference', async (req: Request, res: Response) => {
  try {
    const { albumId, photoIds, isFullAlbum, couponCode, customer } = req.body;

    if (!albumId || !customer || !customer.email) {
      return res.status(400).json({ error: 'Parámetros obligatorios faltantes: albumId y customer.email' });
    }

    // Creación de la orden con cálculo determinista en servidor
    const order = orderService.createOrder({
      albumId,
      photoIds,
      isFullAlbum,
      couponCode,
      customer
    });

    // Creación de la preferencia Checkout Pro en Mercado Pago
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
    res.status(500).json({ error: error.message });
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
app.get('/api/orders/:orderId', (req: Request, res: Response) => {
  const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const order = orderService.getOrder(orderId);
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
    hasDownloadToken: Boolean(order.downloadToken),
    downloadToken: order.downloadToken, // Solo se entrega si el estado es 'PAID'
    createdAt: order.createdAt
  });
});

// Endpoint: Verificación de Token Criptográfico de Descarga (72h)
app.get('/api/downloads/verify/:token', (req: Request, res: Response) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const result = tokenService.verifyToken(token);

  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  // Verificar que la orden no esté cancelada o en fraude
  const order = orderService.getOrder(result.payload!.orderId);
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
