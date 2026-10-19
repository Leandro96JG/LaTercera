import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailNotificationService } from '../src/services/email.service';
import { Order } from '../src/services/order.service';

describe('EmailNotificationService (TDD)', () => {
  const dummyOrder: Order = {
    id: 'ord_test_email_123',
    albumId: 'alb_test_1',
    albumTitleSnapshot: 'Torneo Apertura 2026 - Final',
    photoIds: ['photo_1.jpg', 'photo_2.jpg'],
    isFullAlbum: false,
    photoCount: 2,
    unitPrice: 1200,
    subtotal: 2400,
    discount: 0,
    discountPercentage: 0,
    totalAmount: 2400,
    currency: 'ARS',
    customer: {
      email: 'cliente@test.com',
      name: 'Carlos Pérez',
      phone: '+5493804123456'
    },
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const dummyToken = 'header.payload.signature_test_token';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('debe simular el envío y hacer fallback a log estructurado si no hay RESEND_API_KEY', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const service = new EmailNotificationService('');

    const result = await service.sendOrderReadyEmail(dummyOrder, dummyToken);

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EmailService Fallback]'),
      expect.objectContaining({
        to: 'cliente@test.com',
        orderId: 'ord_test_email_123'
      })
    );
  });

  it('debe devolver error si el cliente no tiene email definido', async () => {
    const service = new EmailNotificationService('test_key');
    const orderWithoutEmail = {
      ...dummyOrder,
      customer: { email: '' }
    };

    const result = await service.sendOrderReadyEmail(orderWithoutEmail, dummyToken);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Email del cliente no provisto');
  });

  it('debe invocar la API de Resend vía fetch cuando RESEND_API_KEY está configurada', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'resend_email_id_999' })
    });
    vi.stubGlobal('fetch', fakeFetch);

    const service = new EmailNotificationService('re_test_api_key_12345', 'La Tercera <fotos@latercera.com.ar>');

    const result = await service.sendOrderReadyEmail(dummyOrder, dummyToken, 'https://latercera.com.ar');

    expect(result.success).toBe(true);
    expect(result.id).toBe('resend_email_id_999');
    expect(fakeFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test_api_key_12345',
          'Content-Type': 'application/json'
        }
      })
    );

    const callBody = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(callBody.to).toEqual(['cliente@test.com']);
    expect(callBody.subject).toContain('Torneo Apertura 2026 - Final');
    expect(callBody.html).toContain('https://latercera.com.ar/pago-exitoso?token=');
  });

  it('debe manejar errores de respuesta HTTP de Resend sin lanzar excepciones fatales', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Domain not verified'
    });
    vi.stubGlobal('fetch', fakeFetch);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = new EmailNotificationService('re_test_key_invalid');

    const result = await service.sendOrderReadyEmail(dummyOrder, dummyToken);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Resend status 422');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
