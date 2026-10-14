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

export interface ProcessWebhookPaymentInput extends PaymentVerificationInput {
  eventId: string;
  orderId: string;
}

export class OrderService {
  private orders: Map<string, Order> = new Map();
  private processedEventIds: Set<string> = new Set();
  private tokenService: DownloadTokenService;

  constructor(tokenService: DownloadTokenService) {
    this.tokenService = tokenService;
  }

  /**
   * Crea una orden aplicando el principio Zero-Trust:
   * Todos los montos, subtotales y descuentos son calculados estrictamente por el backend.
   */
  public createOrder(input: CreateOrderInput): Order {
    const isFullAlbum = Boolean(input.isFullAlbum);
    const photoIds = input.photoIds || [];
    const photoCount = isFullAlbum ? 0 : photoIds.length;

    // Precios oficiales vigentes
    const UNIT_PRICE = 1200;
    const FULL_ALBUM_PRICE = 9500;

    const pricing = calculateCartTotal({
      photoCount,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
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
    return order;
  }

  public getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  public updateOrderPreferenceId(orderId: string, preferenceId: string): void {
    const order = this.orders.get(orderId);
    if (order) {
      order.preferenceId = preferenceId;
      order.updatedAt = new Date().toISOString();
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
      return { success: true, alreadyProcessed: true };
    }

    const result = this.verifyAndCompletePayment(input.orderId, input);

    if (result.success || result.fraudAlert) {
      this.processedEventIds.add(input.eventId);
    }

    return {
      success: result.success,
      alreadyProcessed: false,
      fraudAlert: result.fraudAlert,
      error: result.error
    };
  }
}
