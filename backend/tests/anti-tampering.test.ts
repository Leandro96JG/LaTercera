import { describe, it, expect } from 'vitest';
import { OrderService } from '../src/services/order.service';
import { DownloadTokenService } from '../src/services/token.service';

describe('Order Service & Anti-Tampering - Zero-Trust de Precios', () => {
  const TEST_SECRET = 'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex';
  const tokenService = new DownloadTokenService(TEST_SECRET);
  const orderService = new OrderService(tokenService);

  it('debe ignorar cualquier precio o total manipulado enviado por el cliente', () => {
    const maliciousPayload = {
      albumId: 'album-1',
      photoIds: ['photo-1', 'photo-2', 'photo-3'],
      isFullAlbum: false,
      customer: { email: 'hacker@test.com' },
      // Intentos de inyección de precio
      price: 10,
      unitPrice: 1,
      total: 10,
      totalAmount: 10
    };

    const order = orderService.createOrder(maliciousPayload as any);

    // 3 fotos con precio unitario 1200 = 3600 -> 20% descuento = 2880
    expect(order.totalAmount).toBe(2880);
    expect(order.subtotal).toBe(3600);
    expect(order.discount).toBe(720);
    expect(order.discountPercentage).toBe(20);
    expect(order.status).toBe('PENDING');
  });

  it('debe aplicar 30% de descuento automático en pack de 5 fotos', () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
      isFullAlbum: false,
      customer: { email: 'cliente@test.com' }
    });

    // 5 * 1200 = 6000 -> 30% desc = 1800 -> total = 4200
    expect(order.subtotal).toBe(6000);
    expect(order.discount).toBe(1800);
    expect(order.totalAmount).toBe(4200);
  });

  it('debe cobrar tarifa plana de $9.500 ARS para álbum completo', () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1', 'p2', 'p3'], // Aunque envíe pocas fotos, si pide álbum completo se factura el pack completo
      isFullAlbum: true,
      customer: { email: 'cliente@test.com' }
    });

    expect(order.totalAmount).toBe(9500);
    expect(order.isFullAlbum).toBe(true);
  });

  it('debe aplicar cupón de descuento oficial si es válido', () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1'],
      isFullAlbum: false,
      couponCode: 'YUYO10',
      customer: { email: 'cliente@test.com' }
    });

    // 1200 - 10% = 1080
    expect(order.totalAmount).toBe(1080);
    expect(order.couponApplied).toBe('YUYO10');
  });

  it('debe detectar fraude si el monto pagado en Mercado Pago es menor al monto de la orden', () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1', 'p2', 'p3'],
      isFullAlbum: false,
      customer: { email: 'comprador@test.com' }
    });

    expect(order.totalAmount).toBe(2880);

    // Simulamos respuesta de Mercado Pago con monto insuficiente
    const result = orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-fake-123',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: 500 // Pagó 500 en lugar de 2880
    });

    expect(result.success).toBe(false);
    expect(result.fraudAlert).toBe(true);
    expect(orderService.getOrder(order.id)?.status).toBe('FRAUD_ALERT_PRICE_MISMATCH');
    expect(orderService.getOrder(order.id)?.downloadToken).toBeUndefined();
  });

  it('debe rechazar pago si la moneda no es ARS', () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1'],
      isFullAlbum: false,
      customer: { email: 'comprador@test.com' }
    });

    const result = orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-fake-456',
      status: 'approved',
      currencyId: 'USD',
      transactionAmount: 1200
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/moneda/i);
  });

  it('debe completar pago exitosamente y generar token de descarga de 72h si todo coincide', () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1', 'p2', 'p3'],
      isFullAlbum: false,
      customer: { email: 'comprador@test.com' }
    });

    const result = orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-legit-789',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: 2880
    });

    expect(result.success).toBe(true);
    const updatedOrder = orderService.getOrder(order.id);
    expect(updatedOrder?.status).toBe('PAID');
    expect(updatedOrder?.paymentId).toBe('pay-legit-789');
    expect(typeof updatedOrder?.downloadToken).toBe('string');

    // Verificar que el token sea válido con el tokenService
    const verification = tokenService.verifyToken(updatedOrder!.downloadToken!);
    expect(verification.valid).toBe(true);
    expect(verification.payload?.orderId).toBe(order.id);
  });
});
