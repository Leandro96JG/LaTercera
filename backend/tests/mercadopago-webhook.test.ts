import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { validateMercadoPagoWebhook } from '../src/services/mercadopago-webhook.service';

describe('Mercado Pago Webhook - Validación Criptográfica y Anti-Replay', () => {
  const SECRET_KEY = 'mi_secreto_de_webhook_de_mercado_pago_super_seguro';

  function createValidSignature(dataId: string, requestId: string, timestampSec: number, secret: string) {
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestampSec};`;
    const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return `ts=${timestampSec},v1=${hash}`;
  }

  it('debe validar exitosamente una notificación con firma auténtica y dentro del tiempo', () => {
    const dataId = 'payment_987654321';
    const requestId = 'req-uuid-1234';
    const nowSec = Math.floor(Date.now() / 1000);
    const signature = createValidSignature(dataId, requestId, nowSec, SECRET_KEY);

    const result = validateMercadoPagoWebhook({
      xSignature: signature,
      xRequestId: requestId,
      dataId: dataId,
      secretKey: SECRET_KEY
    });

    expect(result.isValid).toBe(true);
    expect(result.dataId).toBe(dataId);
  });

  it('debe rechazar una notificación si la firma v1 fue alterada en un solo carácter', () => {
    const dataId = 'payment_987654321';
    const requestId = 'req-uuid-1234';
    const nowSec = Math.floor(Date.now() / 1000);
    const signature = createValidSignature(dataId, requestId, nowSec, SECRET_KEY);

    // Alteramos el hash v1
    const tamperedSignature = signature.slice(0, -1) + (signature.endsWith('0') ? '1' : '0');

    const result = validateMercadoPagoWebhook({
      xSignature: tamperedSignature,
      xRequestId: requestId,
      dataId: dataId,
      secretKey: SECRET_KEY
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/firma criptográfica inválida/i);
  });

  it('debe rechazar si la firma fue generada con un secreto diferente', () => {
    const dataId = 'payment_987654321';
    const requestId = 'req-uuid-1234';
    const nowSec = Math.floor(Date.now() / 1000);
    const fakeSecret = 'otro_secreto_totalmente_distinto_no_autorizado';
    const signature = createValidSignature(dataId, requestId, nowSec, fakeSecret);

    const result = validateMercadoPagoWebhook({
      xSignature: signature,
      xRequestId: requestId,
      dataId: dataId,
      secretKey: SECRET_KEY
    });

    expect(result.isValid).toBe(false);
  });

  it('debe rechazar un ataque de repetición (Replay Attack) con timestamp de hace 10 minutos', () => {
    const dataId = 'payment_987654321';
    const requestId = 'req-uuid-1234';
    const pastTenMinutes = Math.floor(Date.now() / 1000) - 600; // 600s en el pasado
    const signature = createValidSignature(dataId, requestId, pastTenMinutes, SECRET_KEY);

    const result = validateMercadoPagoWebhook({
      xSignature: signature,
      xRequestId: requestId,
      dataId: dataId,
      secretKey: SECRET_KEY,
      toleranceSeconds: 300 // 5 minutos máximo
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/anti-replay|tolerancia/i);
  });

  it('debe rechazar timestamp en el futuro más allá de la tolerancia', () => {
    const dataId = 'payment_987654321';
    const requestId = 'req-uuid-1234';
    const futureTime = Math.floor(Date.now() / 1000) + 400; // 400s en el futuro
    const signature = createValidSignature(dataId, requestId, futureTime, SECRET_KEY);

    const result = validateMercadoPagoWebhook({
      xSignature: signature,
      xRequestId: requestId,
      dataId: dataId,
      secretKey: SECRET_KEY,
      toleranceSeconds: 300
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/anti-replay|tolerancia/i);
  });

  it('debe rechazar peticiones con cabeceras o dataId faltantes', () => {
    const resultNoSig = validateMercadoPagoWebhook({
      xSignature: undefined,
      xRequestId: 'req-1',
      dataId: 'pay-1',
      secretKey: SECRET_KEY
    });
    expect(resultNoSig.isValid).toBe(false);

    const resultNoReqId = validateMercadoPagoWebhook({
      xSignature: 'ts=1,v1=abc',
      xRequestId: undefined,
      dataId: 'pay-1',
      secretKey: SECRET_KEY
    });
    expect(resultNoReqId.isValid).toBe(false);

    const resultNoDataId = validateMercadoPagoWebhook({
      xSignature: 'ts=1,v1=abc',
      xRequestId: 'req-1',
      dataId: undefined,
      secretKey: SECRET_KEY
    });
    expect(resultNoDataId.isValid).toBe(false);
  });

  it('debe tolerar timestamps provistos en milisegundos convirtiéndolos a segundos', () => {
    const dataId = 'payment_ms_123';
    const requestId = 'req-ms-123';
    const nowMs = Date.now();
    const signature = createValidSignature(dataId, requestId, nowMs, SECRET_KEY);

    const result = validateMercadoPagoWebhook({
      xSignature: signature,
      xRequestId: requestId,
      dataId: dataId,
      secretKey: SECRET_KEY
    });

    expect(result.isValid).toBe(true);
  });

  it('debe manejar discrepancias de longitud de buffers sin lanzar excepción fatal de Node.js', () => {
    const result = validateMercadoPagoWebhook({
      xSignature: `ts=${Math.floor(Date.now() / 1000)},v1=corta`,
      xRequestId: 'req-1',
      dataId: 'data-1',
      secretKey: SECRET_KEY
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/longitud/i);
  });
});
