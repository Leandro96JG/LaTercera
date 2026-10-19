import { v4 as uuidv4 } from 'uuid';
import { calculateCartTotal } from './pricing.service';
import { DownloadTokenService } from './token.service';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FRAUD_ALERT_PRICE_MISMATCH'
  | 'REJECTED'
  | 'CANCELLED';

export interface CustomerInfo {
  email: string;
  name?: string;
  phone?: string;
}

export interface CreateOrderInput {
  albumId: string;
  photoIds?: string[];
  isFullAlbum?: boolean;
  couponCode?: string;
  customer: CustomerInfo;
}

export interface Order {
  id: string;
  albumId: string;
  albumTitle?: string;
  albumTitleSnapshot?: string;
  photoIds: string[];
  isFullAlbum: boolean;
  photoCount: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  discountPercentage: number;
  totalAmount: number;
  currency: 'ARS';
  customer: CustomerInfo;
  couponApplied?: string;
  status: OrderStatus;
  preferenceId?: string;
  paymentId?: string;
  downloadToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentVerificationInput {
  paymentId: string;
  status: string;
  currencyId: string;
  transactionAmount: number;
}

import { IOrderRepository, MemoryOrderRepository } from '../repositories/order.repository';
import { IAlbumRepository, MemoryAlbumRepository } from '../repositories/album.repository';
import {
  IPromotionRepository,
  MemoryPromotionRepository,
  CouponDTO
} from '../repositories/promotion.repository';
import {
  IEmailNotificationService,
  EmailNotificationService
} from './email.service';

export interface ProcessWebhookPaymentInput extends PaymentVerificationInput {
  eventId: string;
  orderId: string;
}

export interface PricingOverrides {
  unitPrice?: number;
  fullAlbumPrice?: number;
  albumTitle?: string;
}

export class OrderService {
  private orders: Map<string, Order> = new Map();
  private processedEventIds: Set<string> = new Set();
  private tokenService: DownloadTokenService;
  private repository: IOrderRepository;
  private albumRepository: IAlbumRepository;
  private promotionRepository: IPromotionRepository;
  private emailService: IEmailNotificationService;

  public static readonly DEFAULT_UNIT_PRICE = 1200;
  public static readonly DEFAULT_FULL_ALBUM_PRICE = 9500;

  constructor(
    tokenService: DownloadTokenService,
    repository?: IOrderRepository,
    albumRepository?: IAlbumRepository,
    promotionRepository?: IPromotionRepository,
    emailService?: IEmailNotificationService
  ) {
    this.tokenService = tokenService;
    this.repository = repository || new MemoryOrderRepository();
    this.albumRepository = albumRepository || new MemoryAlbumRepository();
    this.promotionRepository = promotionRepository || new MemoryPromotionRepository();
    this.emailService = emailService || new EmailNotificationService();
  }


  /**
   * Crea una orden de forma asíncrona recuperando los precios reales configurados en el álbum (Supabase).
   * Aplica principio Zero-Trust: ningún precio es aceptado desde el cliente frontend.
   */
  public async createOrderAsync(input: CreateOrderInput): Promise<Order> {
    const isFullAlbum = Boolean(input.isFullAlbum);
    const photoIds = input.photoIds || [];
    const photoCount = isFullAlbum ? 0 : photoIds.length;

    // Obtención de precios dinámicos desde Supabase con fallback defensivo
    let unitPrice = OrderService.DEFAULT_UNIT_PRICE;
    let fullAlbumPrice = OrderService.DEFAULT_FULL_ALBUM_PRICE;
    let albumTitleSnapshot: string | undefined = undefined;

    try {
      const album = await this.albumRepository.getAlbumById(input.albumId);
      if (album) {
        albumTitleSnapshot = album.title;
        unitPrice = typeof album.unitPrice === 'number' && album.unitPrice > 0
          ? album.unitPrice
          : OrderService.DEFAULT_UNIT_PRICE;
        fullAlbumPrice = typeof album.fullAlbumPrice === 'number' && album.fullAlbumPrice > 0
          ? album.fullAlbumPrice
          : OrderService.DEFAULT_FULL_ALBUM_PRICE;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[OrderService] Fallback a precios default para álbum ${input.albumId}: ${message}`);
    }

    // Obtención de configuración dinámica de promociones y cupones desde promotionRepository
    let config = undefined;
    let coupon: CouponDTO | null = null;
    try {
      config = await this.promotionRepository.getConfig();
      if (input.couponCode) {
        const found = await this.promotionRepository.getCouponByCode(input.couponCode);
        if (found) {
          if (!found.isActive) {
            throw new Error(`El cupón "${input.couponCode}" está pausado o inactivo`);
          }
          if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
            throw new Error(`El cupón "${input.couponCode}" ha expirado`);
          }
          if (found.maxUses != null && found.usedCount >= found.maxUses) {
            throw new Error(`El cupón "${input.couponCode}" ha alcanzado su límite de usos`);
          }
          if (found.albumId && found.albumId !== input.albumId) {
            throw new Error(`El cupón "${input.couponCode}" solo es válido para otro álbum`);
          }
          if (found.maxPhotos != null && (isFullAlbum || photoCount > found.maxPhotos)) {
            throw new Error(`El cupón "${input.couponCode}" solo permite hasta ${found.maxPhotos} fotos individuales`);
          }
          coupon = found;
        } else {
          throw new Error(`El cupón "${input.couponCode}" no existe`);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('cupón')) {
        throw err;
      }
      console.warn(`[OrderService] Error recuperando promociones/cupones: ${err}`);
    }

    const pricing = calculateCartTotal({
      photoCount,
      unitPrice,
      fullAlbumPrice,
      isFullAlbum,
      couponCode: input.couponCode,
      config,
      coupon
    });

    const now = new Date().toISOString();
    const order: Order = {
      id: uuidv4(),
      albumId: input.albumId,
      albumTitle: albumTitleSnapshot,
      albumTitleSnapshot,
      photoIds: [...photoIds],
      isFullAlbum,
      photoCount: pricing.photoCount,
      unitPrice: pricing.unitPrice,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      discountPercentage: pricing.discountPercentage,
      totalAmount: pricing.total,
      currency: 'ARS',
      customer: {
        email: input.customer.email,
        name: input.customer.name,
        phone: input.customer.phone
      },
      couponApplied: pricing.couponApplied,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };

    this.orders.set(order.id, order);
    await this.repository.createOrder(order).catch(err => {
      console.warn(`[Persistencia Warning] Error guardando orden en Supabase: ${err.message}`);
    });

    return order;
  }

  /**
   * Crea una orden aplicando el principio Zero-Trust.
   * Método síncrono preservado para retrocompatibilidad con tests unitarios.
   */
  public createOrder(input: CreateOrderInput, overrides?: PricingOverrides): Order {
    const isFullAlbum = Boolean(input.isFullAlbum);
    const photoIds = input.photoIds || [];
    const photoCount = isFullAlbum ? 0 : photoIds.length;

    const unitPrice = overrides?.unitPrice ?? OrderService.DEFAULT_UNIT_PRICE;
    const fullAlbumPrice = overrides?.fullAlbumPrice ?? OrderService.DEFAULT_FULL_ALBUM_PRICE;

    const pricing = calculateCartTotal({
      photoCount,
      unitPrice,
      fullAlbumPrice,
      isFullAlbum,
      couponCode: input.couponCode
    });

    const now = new Date().toISOString();
    const order: Order = {
      id: uuidv4(),
      albumId: input.albumId,
      albumTitle: overrides?.albumTitle,
      albumTitleSnapshot: overrides?.albumTitle,
      photoIds: [...photoIds],
      isFullAlbum,
      photoCount: pricing.photoCount,
      unitPrice: pricing.unitPrice,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      discountPercentage: pricing.discountPercentage,
      totalAmount: pricing.total,
      currency: 'ARS',
      customer: {
        email: input.customer.email,
        name: input.customer.name,
        phone: input.customer.phone
      },
      couponApplied: pricing.couponApplied,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };

    this.orders.set(order.id, order);
    this.repository.createOrder(order).catch(err => {
      console.warn(`[Persistencia Warning] Error guardando orden en repositorio: ${err.message}`);
    });
    return order;
  }

  public getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  public async getOrderAsync(id: string): Promise<Order | null> {
    const cached = this.orders.get(id);
    if (cached) return cached;

    const fromDb = await this.repository.findById(id);
    if (fromDb) {
      this.orders.set(fromDb.id, fromDb);
      return fromDb;
    }
    return null;
  }

  public updateOrderPreferenceId(orderId: string, preferenceId: string): void {
    const order = this.orders.get(orderId);
    if (order) {
      order.preferenceId = preferenceId;
      order.updatedAt = new Date().toISOString();
      this.repository.update(order).catch(err => {
        console.warn(`[Persistencia Warning] Error actualizando preferencia: ${err.message}`);
      });
    }
  }

  /**
   * Verifica los datos del pago recibidos desde la API de Mercado Pago y completa la orden
   */
  public verifyAndCompletePayment(
    orderId: string,
    payment: PaymentVerificationInput
  ): { success: boolean; fraudAlert?: boolean; error?: string } {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, error: 'Orden no encontrada' };
    }

    if (order.status === 'PAID') {
      return { success: true };
    }

    // Validación estricta de Moneda
    if (payment.currencyId !== 'ARS') {
      return {
        success: false,
        error: `Moneda inválida: esperada ARS, recibida ${payment.currencyId}`
      };
    }

    // Validación de Estado en Mercado Pago
    if (payment.status !== 'approved') {
      order.status = payment.status === 'rejected' ? 'REJECTED' : 'PENDING';
      order.updatedAt = new Date().toISOString();
      return {
        success: false,
        error: `El estado del pago es '${payment.status}' (requerido: 'approved')`
      };
    }

    // Detección de Fraude por Discrepancia de Monto (Zero-Trust)
    if (payment.transactionAmount < order.totalAmount) {
      order.status = 'FRAUD_ALERT_PRICE_MISMATCH';
      order.paymentId = payment.paymentId;
      order.updatedAt = new Date().toISOString();
      return {
        success: false,
        fraudAlert: true,
        error: `Alerta de Fraude: Monto pagado ($${payment.transactionAmount} ARS) es inferior al requerido ($${order.totalAmount} ARS)`
      };
    }

    // Transición a PAID y generación de token criptográfico de descarga (72h)
    const resourceType = order.isFullAlbum ? 'album_zip' : 'photo';
    const resourceId = order.isFullAlbum
      ? `${order.albumId}_completo.zip`
      : order.photoIds[0] || 'foto_seleccionada.jpg';

    const downloadToken = this.tokenService.generateToken(order.id, resourceType, resourceId);

    order.status = 'PAID';
    order.paymentId = payment.paymentId;
    order.downloadToken = downloadToken;
    order.updatedAt = new Date().toISOString();

    this.repository.updateStatus(order.id, 'PAID', payment.paymentId, downloadToken).catch(err => {
      console.warn(`[Persistencia Warning] Error actualizando estado de pago: ${err.message}`);
    });

    this.emailService.sendOrderReadyEmail(order, downloadToken).catch(err => {
      console.warn(`[Email Warning] Error enviando correo tras pago completado: ${err?.message || err}`);
    });

    return { success: true };
  }

  /**
   * Limpia la memoria RAM para simular reinicios de servidor en tests unitarios
   */
  public clearMemoryCache(): void {
    this.orders.clear();
    this.processedEventIds.clear();
  }

  /**
   * Completa de forma inmediata una orden acreditada sin cobro (Canje 100% OFF por cupón o sorteo).
   */
  public async completeFreeOrderAsync(
    orderId: string,
    paymentId: string,
    downloadToken: string
  ): Promise<Order | null> {
    const order = await this.getOrderAsync(orderId);
    if (!order) return null;

    order.status = 'PAID';
    order.paymentId = paymentId;
    order.downloadToken = downloadToken;
    order.updatedAt = new Date().toISOString();
    this.orders.set(order.id, order);

    await this.repository.updateStatus(order.id, 'PAID', paymentId, downloadToken).catch(err => {
      console.warn(`[Persistencia Warning] Error actualizando orden gratuita: ${err.message}`);
    });

    this.emailService.sendOrderReadyEmail(order, downloadToken).catch(err => {
      console.warn(`[Email Warning] Error enviando correo tras orden gratuita: ${err?.message || err}`);
    });

    return order;
  }


  /**
   * Verifica los datos del pago recibidos desde la API de Mercado Pago y completa la orden
   * con recuperación asíncrona de persistencia (Supabase / IOrderRepository).
   */
  public async verifyAndCompletePaymentAsync(
    orderId: string,
    payment: PaymentVerificationInput
  ): Promise<{ success: boolean; fraudAlert?: boolean; error?: string }> {
    const order = await this.getOrderAsync(orderId);
    if (!order) {
      return { success: false, error: 'Orden no encontrada' };
    }

    if (order.status === 'PAID') {
      return { success: true };
    }

    // Validación estricta de Moneda
    if (payment.currencyId !== 'ARS') {
      return {
        success: false,
        error: `Moneda inválida: esperada ARS, recibida ${payment.currencyId}`
      };
    }

    // Validación de Estado en Mercado Pago
    if (payment.status !== 'approved') {
      order.status = payment.status === 'rejected' ? 'REJECTED' : 'PENDING';
      order.updatedAt = new Date().toISOString();
      this.orders.set(order.id, order);
      await this.repository.updateStatus(order.id, order.status, payment.paymentId).catch(err => {
        console.warn(`[Persistencia Warning] Error actualizando estado de pago: ${err.message}`);
      });
      return {
        success: false,
        error: `El estado del pago es '${payment.status}' (requerido: 'approved')`
      };
    }

    // Detección de Fraude por Discrepancia de Monto (Zero-Trust)
    if (payment.transactionAmount < order.totalAmount) {
      order.status = 'FRAUD_ALERT_PRICE_MISMATCH';
      order.paymentId = payment.paymentId;
      order.updatedAt = new Date().toISOString();
      this.orders.set(order.id, order);
      await this.repository.updateStatus(order.id, 'FRAUD_ALERT_PRICE_MISMATCH', payment.paymentId).catch(err => {
        console.warn(`[Persistencia Warning] Error registrando alerta de fraude: ${err.message}`);
      });
      return {
        success: false,
        fraudAlert: true,
        error: `Alerta de Fraude: Monto pagado ($${payment.transactionAmount} ARS) es inferior al requerido ($${order.totalAmount} ARS)`
      };
    }

    // Transición a PAID y generación de token criptográfico de descarga (72h)
    const resourceType = order.isFullAlbum ? 'album_zip' : 'photo';
    const resourceId = order.isFullAlbum
      ? `${order.albumId}_completo.zip`
      : order.photoIds[0] || 'foto_seleccionada.jpg';

    const downloadToken = this.tokenService.generateToken(order.id, resourceType, resourceId);

    order.status = 'PAID';
    order.paymentId = payment.paymentId;
    order.downloadToken = downloadToken;
    order.updatedAt = new Date().toISOString();
    this.orders.set(order.id, order);

    await this.repository.updateStatus(order.id, 'PAID', payment.paymentId, downloadToken).catch(err => {
      console.warn(`[Persistencia Warning] Error actualizando estado de pago: ${err.message}`);
    });

    if (order.couponApplied) {
      await this.promotionRepository.incrementCouponUsage(order.couponApplied).catch(() => {});
    }

    this.emailService.sendOrderReadyEmail(order, downloadToken).catch(err => {
      console.warn(`[Email Warning] Error enviando correo tras pago completado: ${err?.message || err}`);
    });

    return { success: true };
  }


  /**
   * Procesa el evento de webhook con protección contra duplicados (Idempotencia)
   * consultando la base de datos (Supabase) tanto para idempotencia como para recuperar la orden.
   */
  public async processWebhookPaymentAsync(
    input: ProcessWebhookPaymentInput
  ): Promise<{ success: boolean; alreadyProcessed: boolean; fraudAlert?: boolean; error?: string }> {
    // 1. Verificar idempotencia en memoria local
    if (this.processedEventIds.has(input.eventId)) {
      return { success: true, alreadyProcessed: true };
    }

    // 2. Verificar idempotencia en base de datos remota
    const isProcessedInDb = await this.repository.isEventProcessed(input.eventId);
    if (isProcessedInDb) {
      this.processedEventIds.add(input.eventId);
      return { success: true, alreadyProcessed: true };
    }

    // 3. Cargar la orden asíncronamente (desde memoria o Supabase tras reinicio de servidor)
    const order = await this.getOrderAsync(input.orderId);
    if (!order) {
      return { success: false, alreadyProcessed: false, error: 'Orden no encontrada' };
    }

    // 4. Si la orden ya está pagada (por una notificación previa concurrente)
    if (order.status === 'PAID') {
      this.processedEventIds.add(input.eventId);
      await this.repository.markEventProcessed(input.eventId, input.orderId).catch(() => {});
      return { success: true, alreadyProcessed: true };
    }

    // 5. Verificar y completar el pago asíncronamente
    const result = await this.verifyAndCompletePaymentAsync(input.orderId, input);

    if (result.success || result.fraudAlert) {
      this.processedEventIds.add(input.eventId);
      await this.repository.markEventProcessed(input.eventId, input.orderId).catch(() => {});
    }

    return {
      success: result.success,
      alreadyProcessed: false,
      fraudAlert: result.fraudAlert,
      error: result.error
    };
  }

  /**
   * Procesa el evento de webhook con protección contra duplicados (Idempotencia)
   */
  public processWebhookPayment(
    input: ProcessWebhookPaymentInput
  ): { success: boolean; alreadyProcessed: boolean; fraudAlert?: boolean; error?: string } {
    // Si ya procesamos este ID de evento exacto, responder de inmediato
    if (this.processedEventIds.has(input.eventId)) {
      return { success: true, alreadyProcessed: true };
    }

    const order = this.orders.get(input.orderId);
    if (!order) {
      return { success: false, alreadyProcessed: false, error: 'Orden no encontrada' };
    }

    // Si la orden ya está pagada (por una notificación previa concurrente)
    if (order.status === 'PAID') {
      this.processedEventIds.add(input.eventId);
      this.repository.markEventProcessed(input.eventId, input.orderId).catch(() => {});
      return { success: true, alreadyProcessed: true };
    }

    const result = this.verifyAndCompletePayment(input.orderId, input);

    if (result.success || result.fraudAlert) {
      this.processedEventIds.add(input.eventId);
      this.repository.markEventProcessed(input.eventId, input.orderId).catch(() => {});
    }

    return {
      success: result.success,
      alreadyProcessed: false,
      fraudAlert: result.fraudAlert,
      error: result.error
    };
  }

  /**
   * Obtiene todas las órdenes combinando persistencia y memoria local
   */
  public async listAllOrdersAsync(): Promise<Order[]> {
    const fromRepo = await this.repository.listAllOrders();
    for (const ord of fromRepo) {
      this.orders.set(ord.id, ord);
    }
    return fromRepo;
  }

  /**
   * Regenera un nuevo token criptográfico de descarga válido por 72 horas para una orden
   */
  public async regenerateDownloadTokenAsync(
    orderId: string
  ): Promise<{ order: Order; downloadToken: string; expiresAt: string } | null> {
    const order = await this.getOrderAsync(orderId);
    if (!order) {
      return null;
    }

    const resourceType = order.isFullAlbum ? 'album_zip' : 'photo';
    const resourceId = order.isFullAlbum
      ? `${order.albumId}_completo.zip`
      : order.photoIds[0] || 'foto_seleccionada.jpg';

    const downloadToken = this.tokenService.generateToken(order.id, resourceType, resourceId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 72 * 3600 * 1000).toISOString();

    order.downloadToken = downloadToken;
    order.updatedAt = now.toISOString();
    this.orders.set(order.id, order);

    await this.repository.updateStatus(order.id, order.status, order.paymentId, downloadToken);

    return {
      order,
      downloadToken,
      expiresAt
    };
  }
}
