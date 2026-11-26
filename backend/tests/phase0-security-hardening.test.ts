import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'http';
import crypto from 'crypto';
import {
  app,
  orderService,
  orderRepository,
  tokenService,
  adminAuthService
} from '../src/index';
import { validateMercadoPagoWebhook } from '../src/services/mercadopago-webhook.service';

describe('Fase 0: Blindaje Crítico de Seguridad (Pagos, Tokens, Webhooks y RBAC)', () => {
  let server: Server;
  let baseUrl: string;
  let photographerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    photographerToken = adminAuthService.createJwt({
      id: 'colab_1',
      email: 'colab@latercera.com.ar',
      name: 'Colaborador',
      role: 'photographer',
      photographerId: 'photo_colab_1'
    });

    adminToken = adminAuthService.createJwt({
      id: 'admin_1',
      email: 'fotografa@latercera.com.ar',
      name: 'Jenifer Espeche',
      role: 'admin',
      photographerId: 'yuyo_espeche'
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('debe rechazar confusión de tipo de token (album_access no sirve para descargas y /verify exige orden PAID)', async () => {
    const albumToken = tokenService.generateAlbumAccessToken('album-1', 3600);
    const verifyRes = await fetch(`${baseUrl}/api/downloads/verify/${encodeURIComponent(albumToken)}`);
    expect(verifyRes.status).toBe(401);

    // Un download token de una orden inexistente tampoco debe devolver valid: true
    const orphanDownloadToken = tokenService.generateToken('orden-inexistente-999', 'photo', 'p1.jpg');
    const orphanRes = await fetch(`${baseUrl}/api/downloads/verify/${encodeURIComponent(orphanDownloadToken)}`);
    expect(orphanRes.status).toBe(403);
  });

  it('debe rechazar JWT sin campo exp en AdminAuthService.verifyJwt', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'usr_1',
        email: 'a@b.com',
        name: 'Test',
        role: 'admin',
        photographerId: 'p1',
        iss: 'la-tercera-api',
        iat: Math.floor(Date.now() / 1000)
      })
    ).toString('base64url');
    const secret = process.env.JWT_SECRET || 'secreto_para_autenticacion_jwt_admin_la_tercera_32c';
    const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

    const res = adminAuthService.verifyJwt(`${header}.${payload}.${sig}`);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('expirado');
  });

  it('debe normalizar data.id alfanumérico a minúsculas en manifest HMAC v2 de Mercado Pago', () => {
    const secret = 'mi_secreto_de_webhook_de_mercado_pago_super_seguro';
    const dataId = 'ABC123DEF';
    const requestId = 'req-lower-1';
    const ts = Math.floor(Date.now() / 1000);
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    const res = validateMercadoPagoWebhook({
      xSignature: `ts=${ts},v1=${hash}`,
      xRequestId: requestId,
      dataId,
      secretKey: secret
    });
    expect(res.isValid).toBe(true);
  });

  it('no debe revocar una orden PAID si llega webhook cancelled de un paymentId previo distinto', async () => {
    const order = await orderService.createOrderAsync({
      albumId: 'album-1',
      photoIds: ['p1'],
      isFullAlbum: false,
      customer: { email: 'norevoke@test.com' }
    });

    const paidRes = await orderService.processWebhookPaymentAsync({
      eventId: `evt-paid-${Date.now()}`,
      orderId: order.id,
      paymentId: 'mp_pay_valid_2',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });
    expect(paidRes.success).toBe(true);

    // Llega tarde la cancelación de un intento fallido previo (mp_pay_old_1)
    const lateCancel = await orderService.processWebhookPaymentAsync({
      eventId: `evt-cancel-old-${Date.now()}`,
      orderId: order.id,
      paymentId: 'mp_pay_old_1',
      status: 'cancelled',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });
    expect(lateCancel.success).toBe(true);

    const after = await orderService.getOrderAsync(order.id);
    expect(after?.status).toBe('PAID');
    expect(after?.downloadToken).toBeDefined();
  });

  it('debe bloquear reutilización de un mismo paymentId en otra orden distinta (anti-replay)', async () => {
    const orderA = await orderService.createOrderAsync({
      albumId: 'album-1',
      photoIds: ['p1'],
      customer: { email: 'a@test.com' }
    });
    const orderB = await orderService.createOrderAsync({
      albumId: 'album-1',
      photoIds: ['p2'],
      customer: { email: 'b@test.com' }
    });

    const sharedPayId = `mp_shared_${Date.now()}`;
    const resA = await orderService.verifyAndCompletePaymentAsync(orderA.id, {
      paymentId: sharedPayId,
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: orderA.totalAmount
    });
    expect(resA.success).toBe(true);

    const resB = await orderService.verifyAndCompletePaymentAsync(orderB.id, {
      paymentId: sharedPayId,
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: orderB.totalAmount
    });
    expect(resB.success).toBe(false);
    expect(resB.fraudAlert).toBe(true);
  });

  it('debe aplicar RBAC: rol photographer recibe 403 en rutas exclusivas de admin, mientras admin recibe 200', async () => {
    const endpoints = ['/api/admin/stats', '/api/admin/orders', '/api/admin/promotions', '/api/admin/categories'];

    for (const ep of endpoints) {
      const resColab = await fetch(`${baseUrl}${ep}`, {
        headers: { Authorization: `Bearer ${photographerToken}` }
      });
      expect(resColab.status).toBe(403);

      const resAdmin = await fetch(`${baseUrl}${ep}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(resAdmin.status).toBe(200);
    }
  });

  it('debe rechazar subida de archivo SVG en /api/admin/albums/upload-watermark-logo', async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const formData = new FormData();
    formData.append('logo', new Blob([svgContent], { type: 'image/svg+xml' }), 'evil.svg');

    const res = await fetch(`${baseUrl}/api/admin/albums/upload-watermark-logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toContain('Formato no admitido');
  });
});
