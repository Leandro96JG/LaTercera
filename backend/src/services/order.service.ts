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

export interface ProcessWebhookPaymentInput extends PaymentVerificationInput {
  eventId: string;
  orderId: string;
}

export interface PricingOverrides {
  unitPrice?: number;
  fullAlbumPrice?: number;
}

export class OrderService {
  private orders: Map<string, Order> = new Map();
  private processedEventIds: Set<string> = new Set();
  private tokenService: DownloadTokenService;
  private repository: IOrderRepository;
  private albumRepository: IAlbumRepository;

  public static readonly DEFAULT_UNIT_PRICE = 1200;
  public static readonly DEFAULT_FULL_ALBUM_PRICE = 9500;

  constructor(
    tokenService: DownloadTokenService,
    repository?: IOrderRepository,
    albumRepository?: IAlbumRepository
  ) {
    this.tokenService = tokenService;
    this.repository = repository || new MemoryOrderRepository();
    this.albumRepository = albumRepository || new MemoryAlbumRepository();
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

    try {
      const album = await this.albumRepository.getAlbumById(input.albumId);
      if (album) {
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

    return { success: true };
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
