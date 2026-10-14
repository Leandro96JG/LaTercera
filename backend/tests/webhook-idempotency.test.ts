import { describe, it, expect } from 'vitest';
import { OrderService } from '../src/services/order.service';
import { DownloadTokenService } from '../src/services/token.service';

describe('Webhook Idempotency & Concurrency - Protección contra Duplicados', () => {
  const TEST_SECRET = 'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex';
  const tokenService = new DownloadTokenService(TEST_SECRET);
  const orderService = new OrderService(tokenService);

  it('debe procesar exitosamente la primera notificación de pago', () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1'],
      isFullAlbum: false,
      customer: { email: 'test@correo.com' }
    });

    const eventId = 'evt-unique-001';
    const result = orderService.processWebhookPayment({
      eventId,
      orderId: order.id,
      paymentId: 'pay-001',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: 1200
    });

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(false);
    expect(orderService.getOrder(order.id)?.status).toBe('PAID');
  });

  it('debe retornar alreadyProcessed: true sin duplicar la lógica si llega la misma notificación', () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p2'],
      isFullAlbum: false,
      customer: { email: 'test2@correo.com' }
    });

    const eventId = 'evt-unique-002';

    // Primer intento
    const firstResult = orderService.processWebhookPayment({
      eventId,
      orderId: order.id,
      paymentId: 'pay-002',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: 1200
    });
    expect(firstResult.success).toBe(true);
    expect(firstResult.alreadyProcessed).toBe(false);

    const initialToken = orderService.getOrder(order.id)?.downloadToken;

    // Segundo intento idéntico (reintento automático de Mercado Pago)
    const secondResult = orderService.processWebhookPayment({
      eventId,
      orderId: order.id,
      paymentId: 'pay-002',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: 1200
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.alreadyProcessed).toBe(true);

    // El token no debe haber sido recreado ni mutado
    expect(orderService.getOrder(order.id)?.downloadToken).toBe(initialToken);
  });

  it('debe ignorar notificaciones posteriores si la orden ya está en estado PAID', () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p3'],
      isFullAlbum: false,
      customer: { email: 'test3@correo.com' }
    });

    // Procesar evento inicial
    orderService.processWebhookPayment({
      eventId: 'evt-unique-003a',
      orderId: order.id,
      paymentId: 'pay-003',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: 1200
    });

    // Llega otro evento con distinto eventId pero para la misma orden ya pagada
    const result = orderService.processWebhookPayment({
      eventId: 'evt-unique-003b',
      orderId: order.id,
      paymentId: 'pay-003',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: 1200
    });

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(true);
  });
});
