import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MercadoPagoService } from '../src/services/mercadopago.service';
import { OrderService, Order } from '../src/services/order.service';
import { DownloadTokenService } from '../src/services/token.service';

const mockPreferenceCreate = vi.fn().mockResolvedValue({
  id: 'pref-mock-12345',
  init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-mock-12345',
  sandbox_init_point: 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-mock-12345'
});

// Mock del SDK oficial de Mercado Pago
vi.mock('mercadopago', () => {
  return {
    default: class MockMercadoPagoConfig {
      constructor(public options: any) {}
    },
    MercadoPagoConfig: class MockMercadoPagoConfig {
      constructor(public options: any) {}
    },
    Preference: class MockPreference {
      create = mockPreferenceCreate;
    },
    Payment: class MockPayment {
      get = vi.fn().mockImplementation(({ id }: { id: string }) => {
        if (id === 'pay-approved-123') {
          return Promise.resolve({
            id: 'pay-approved-123',
            status: 'approved',
            currency_id: 'ARS',
            transaction_amount: 2880,
            external_reference: 'order-test-123'
          });
        }
        if (id === 'pay-mismatch-456') {
          return Promise.resolve({
            id: 'pay-mismatch-456',
            status: 'approved',
            currency_id: 'ARS',
            transaction_amount: 500, // Menor al esperado
            external_reference: 'order-test-123'
          });
        }
        return Promise.reject(new Error('Pago no encontrado'));
      });
    }
  };
});

describe('MercadoPagoService - Integración de Preferencias y Consulta de Pagos', () => {
  const TEST_SECRET = 'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex';
  let tokenService: DownloadTokenService;
  let orderService: OrderService;
  let mpService: MercadoPagoService;

  beforeEach(() => {
    tokenService = new DownloadTokenService(TEST_SECRET);
    orderService = new OrderService(tokenService);
    mpService = new MercadoPagoService('TEST-TOKEN-123', 'TEST-SECRET-123', orderService);
  });

  it('debe crear una preferencia de Checkout Pro con binary_mode y external_reference', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1', 'p2', 'p3'],
      isFullAlbum: false,
      customer: { email: 'juan@latercera.com', name: 'Juan Pérez' }
    });

    const result = await mpService.createCheckoutPreference(order.id, 'https://latercera.com.ar');

    expect(result.preferenceId).toBe('pref-mock-12345');
    expect(result.initPoint).toContain('pref-mock-12345');
    expect(result.orderId).toBe(order.id);
    expect(orderService.getOrder(order.id)?.preferenceId).toBe('pref-mock-12345');

    expect(mockPreferenceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          back_urls: {
            success: 'http://localhost:4200/pago-exitoso',
            failure: 'http://localhost:4200/pago-exitoso',
            pending: 'http://localhost:4200/pago-exitoso'
          },
          notification_url: 'https://latercera.com.ar/api/webhooks/mercadopago'
        })
      })
    );
  });

  it('debe respetar la variable de entorno FRONTEND_URL si está configurada', async () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://custom-domain.com';
    try {
      const order = orderService.createOrder({
        albumId: 'album-1',
        photoIds: ['p1'],
        isFullAlbum: false,
        customer: { email: 'custom@latercera.com' }
      });

      await mpService.createCheckoutPreference(order.id, 'https://api.custom-domain.com');

      expect(mockPreferenceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            back_urls: {
              success: 'https://custom-domain.com/pago-exitoso',
              failure: 'https://custom-domain.com/pago-exitoso',
              pending: 'https://custom-domain.com/pago-exitoso'
            },
            notification_url: 'https://api.custom-domain.com/api/webhooks/mercadopago'
          })
        })
      );
    } finally {
      if (originalFrontendUrl !== undefined) {
        process.env.FRONTEND_URL = originalFrontendUrl;
      } else {
        delete process.env.FRONTEND_URL;
      }
    }
  });

  it('debe consultar la API oficial y procesar pago aprobado legítimo', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1', 'p2', 'p3'],
      isFullAlbum: false,
      customer: { email: 'juan@latercera.com' }
    });
    // Forzamos el id para que coincida con el mock
    (order as any).id = 'order-test-123';
    (orderService as any).orders.set('order-test-123', order);

    const processResult = await mpService.verifyAndProcessPaymentFromAPI('pay-approved-123', 'evt-100');

    expect(processResult.success).toBe(true);
    const updated = orderService.getOrder('order-test-123');
    expect(updated?.status).toBe('PAID');
    expect(updated?.paymentId).toBe('pay-approved-123');
    expect(typeof updated?.downloadToken).toBe('string');
  });

  it('debe detectar discrepancia de precio al consultar la API de Mercado Pago', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1', 'p2', 'p3'],
      isFullAlbum: false,
      customer: { email: 'juan@latercera.com' }
    });
    (order as any).id = 'order-test-123';
    (orderService as any).orders.set('order-test-123', order);

    const processResult = await mpService.verifyAndProcessPaymentFromAPI('pay-mismatch-456', 'evt-101');

    expect(processResult.success).toBe(false);
    expect(processResult.fraudAlert).toBe(true);
    expect(orderService.getOrder('order-test-123')?.status).toBe('FRAUD_ALERT_PRICE_MISMATCH');
  });
});
