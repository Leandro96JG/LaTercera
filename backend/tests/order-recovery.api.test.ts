import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'http';
import { app, orderRepository, tokenService } from '../src/index';
import { Order } from '../src/services/order.service';

describe('POST /api/orders/recover (TDD)', () => {
  const customerEmail = 'comprador.feliz@gmail.com';
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
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

  it('debe responder 400 si el email no es enviado o es una cadena vacía', async () => {
    const res = await fetch(`${baseUrl}/api/orders/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' })
    });

    const data = await res.json() as any;
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Debes ingresar un correo electrónico válido');
  });

  it('debe responder genéricamente con sentToEmail: true sin filtrar si el correo tiene compras cuando no se envía paymentId', async () => {
    const res = await fetch(`${baseUrl}/api/orders/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inexistente@correo.com' })
    });

    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sentToEmail).toBe(true);
    expect(data.orders).toBeUndefined();
    expect(data.message).toContain('enviamos los enlaces de descarga');
  });

  it('cuando solo se envía email, debe enviar el correo en segundo plano pero NO exponer downloadToken ni redirectUrl en el JSON HTTP', async () => {
    const now = new Date();
    const token = tokenService.generateToken('ord_rec_1', 'album_zip', 'alb_1_completo.zip', 72 * 3600);

    const testOrder: Order = {
      id: 'ord_rec_1',
      albumId: 'alb_1',
      albumTitleSnapshot: 'Semifinal Riojana 2026',
      photoIds: [],
      isFullAlbum: true,
      photoCount: 0,
      unitPrice: 1200,
      subtotal: 9500,
      discount: 0,
      discountPercentage: 0,
      totalAmount: 9500,
      currency: 'ARS',
      customer: { email: customerEmail, name: 'Lucas' },
      status: 'PAID',
      paymentId: 'MP_PAY_12345',
      downloadToken: token,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await orderRepository.createOrder(testOrder);

    const res = await fetch(`${baseUrl}/api/orders/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '  COMPRADOR.FELIZ@GMAIL.COM ' })
    });

    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sentToEmail).toBe(true);
    expect(data.orders).toBeUndefined();
  });

  it('debe ignorar órdenes con estado distinto a PAID (ej. PENDING o REJECTED) incluso enviando paymentId', async () => {
    const pendingOrder: Order = {
      id: 'ord_pending_test',
      albumId: 'alb_1',
      albumTitleSnapshot: 'Partido No Pagado',
      photoIds: ['p1.jpg'],
      isFullAlbum: false,
      photoCount: 1,
      unitPrice: 1200,
      subtotal: 1200,
      discount: 0,
      discountPercentage: 0,
      totalAmount: 1200,
      currency: 'ARS',
      customer: { email: 'otro.cliente@gmail.com' },
      status: 'PENDING',
      paymentId: 'MP_PENDING_999',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await orderRepository.createOrder(pendingOrder);

    const res = await fetch(`${baseUrl}/api/orders/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'otro.cliente@gmail.com', paymentId: 'MP_PENDING_999' })
    });

    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.message).toContain('No se encontraron compras vigentes');
  });

  it('debe filtrar por paymentId si este parámetro es enviado', async () => {
    const order1: Order = {
      id: 'ord_pay_filter_1',
      albumId: 'alb_1',
      albumTitleSnapshot: 'Álbum 1',
      photoIds: ['f1.jpg'],
      isFullAlbum: false,
      photoCount: 1,
      unitPrice: 1200,
      subtotal: 1200,
      discount: 0,
      discountPercentage: 0,
      totalAmount: 1200,
      currency: 'ARS',
      customer: { email: 'multiples.compras@gmail.com' },
      status: 'PAID',
      paymentId: 'MP_PAGO_A',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const order2: Order = {
      id: 'ord_pay_filter_2',
      albumId: 'alb_2',
      albumTitleSnapshot: 'Álbum 2',
      photoIds: ['f2.jpg'],
      isFullAlbum: false,
      photoCount: 1,
      unitPrice: 1200,
      subtotal: 1200,
      discount: 0,
      discountPercentage: 0,
      totalAmount: 1200,
      currency: 'ARS',
      customer: { email: 'multiples.compras@gmail.com' },
      status: 'PAID',
      paymentId: 'MP_PAGO_B',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await orderRepository.createOrder(order1);
    await orderRepository.createOrder(order2);

    const res = await fetch(`${baseUrl}/api/orders/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'multiples.compras@gmail.com',
        paymentId: 'MP_PAGO_B'
      })
    });

    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.orders.length).toBe(1);
    expect(data.orders[0].orderId).toBe('ord_pay_filter_2');
  });
});
