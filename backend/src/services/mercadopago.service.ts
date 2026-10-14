import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { OrderService, Order } from './order.service';

export interface PreferenceResult {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  orderId: string;
}

export class MercadoPagoService {
  private client: MercadoPagoConfig;
  private preferenceClient: Preference;
  private paymentClient: Payment;
  private orderService: OrderService;
  private webhookSecret: string;

  constructor(accessToken: string, webhookSecret: string, orderService: OrderService) {
    this.client = new MercadoPagoConfig({ accessToken });
    this.preferenceClient = new Preference(this.client);
    this.paymentClient = new Payment(this.client);
    this.orderService = orderService;
    this.webhookSecret = webhookSecret;
  }

  /**
   * Crea una preferencia oficial en Mercado Pago Checkout Pro
   * Enlaza la orden con external_reference y activa binary_mode
   */
  public async createCheckoutPreference(orderId: string, baseUrl: string): Promise<PreferenceResult> {
    const order = this.orderService.getOrder(orderId);
    if (!order) {
      throw new Error(`Orden no encontrada: ${orderId}`);
    }

    const title = order.isFullAlbum
      ? `LA TERCERA • Álbum Completo (${order.albumId})`
      : `LA TERCERA • Pack ${order.photoCount} Foto(s)`;

    const appUrl = baseUrl || process.env.APP_URL || 'http://localhost:4000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    const preferenceData = {
      body: {
        items: [
          {
            id: order.id,
            title,
            description: `Fotografía Profesional - Jenifer "Yuyo" Espeche`,
            quantity: 1,
            unit_price: order.totalAmount,
            currency_id: 'ARS'
          }
        ],
        payer: {
          email: order.customer.email,
          name: order.customer.name,
          phone: order.customer.phone ? { number: order.customer.phone } : undefined
        },
        external_reference: order.id,
        binary_mode: true, // Forzar solo approved o rejected (evita estados intermedios pendientes prolongados)
        back_urls: {
          success: `${frontendUrl}/pago-exitoso`,
          failure: `${frontendUrl}/pago-exitoso`,
          pending: `${frontendUrl}/pago-exitoso`
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
        metadata: {
          order_id: order.id,
          album_id: order.albumId,
          photo_count: order.photoCount,
          is_full_album: order.isFullAlbum
        }
      }
    };

    const response = await this.preferenceClient.create(preferenceData as any);

    if (!response.id || !response.init_point) {
      throw new Error('Mercado Pago no devolvió un preferenceId válido');
    }

    this.orderService.updateOrderPreferenceId(order.id, response.id);

    return {
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      orderId: order.id
    };
  }

  /**
   * Consulta directamente la API oficial de Mercado Pago para verificar el pago
   * y garantizar que no se confía ciegamente en el payload del webhook.
   */
  public async verifyAndProcessPaymentFromAPI(
    paymentId: string,
    eventId: string
  ): Promise<{ success: boolean; alreadyProcessed?: boolean; fraudAlert?: boolean; error?: string }> {
    try {
      const payment = await this.paymentClient.get({ id: paymentId });

      if (!payment || !payment.external_reference) {
        return {
          success: false,
          error: `No se pudo obtener información de la referencia externa para el pago ${paymentId}`
        };
      }

      const orderId = payment.external_reference;
      const status = payment.status || 'unknown';
      const currencyId = payment.currency_id || 'ARS';
      const transactionAmount = payment.transaction_amount || 0;

      return this.orderService.processWebhookPayment({
        eventId,
        orderId,
        paymentId,
        status,
        currencyId,
        transactionAmount
      });
    } catch (error: any) {
      return {
        success: false,
        error: `Error consultando API de Mercado Pago: ${error.message}`
      };
    }
  }
}
