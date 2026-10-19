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

  it('debe responder success: false si no existen órdenes pagadas para ese correo en las últimas 72 horas', async () => {
    const res = await fetch(`${baseUrl}/api/orders/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inexistente@correo.com' })
    });

    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.message).toContain('No se encontraron compras vigentes asociadas a este correo en las últimas 72 horas.');
  });

  it('debe recuperar órdenes pagadas vigentes con coincidencia case-insensitive y generar URL directa a /pago-exitoso', async () => {
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

    // Búsqueda con mayúsculas y espacios para verificar case-insensitivity y trim
    const res = await fetch(`${baseUrl}/api/orders/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '  COMPRADOR.FELIZ@GMAIL.COM ' })
    });

    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.orders)).toBe(true);
    expect(data.orders.length).toBeGreaterThanOrEqual(1);

    const found = data.orders.find((o: any) => o.orderId === 'ord_rec_1');
    expect(found).toBeDefined();
    expect(found.albumTitle).toBe('Semifinal Riojana 2026');
    expect(found.isFullAlbum).toBe(true);
    expect(found.downloadToken).toBe(token);
    expect(found.redirectUrl).toContain('/pago-exitoso?token=');
  });

  it('debe ignorar órdenes con estado distinto a PAID (ej. PENDING o REJECTED)', async () => {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await orderRepository.createOrder(pendingOrder);

    const res = await fetch(`${baseUrl}/api/orders/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'otro.cliente@gmail.com' })
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
