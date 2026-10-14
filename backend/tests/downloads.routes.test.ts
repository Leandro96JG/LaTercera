import { describe, it, expect } from 'vitest';
import express from 'express';
import { DownloadTokenService } from '../src/services/token.service';
import { OrderService } from '../src/services/order.service';
import { MemoryStorageService } from '../src/services/storage.service';
import { DeliveryService } from '../src/services/delivery.service';
import { createDownloadsRouter } from '../src/routes/downloads.routes';

describe('Downloads API Routes (TDD)', () => {
  const SECRET = 'clave_secreta_super_segura_de_al_menos_32_caracteres_12345';
  const tokenService = new DownloadTokenService(SECRET);
  const orderService = new OrderService(tokenService);
  const storageService = new MemoryStorageService();
  const deliveryService = new DeliveryService(orderService, tokenService, storageService);

  const app = express();
  app.use(express.json());
  app.use('/api/downloads', createDownloadsRouter(deliveryService, orderService));

  it('debe responder 401 si el token es inválido en /api/downloads/:token/info', async () => {
    // Invocamos el router directamente con mock req/res
    const req: any = { params: { token: 'invalido' }, protocol: 'http', get: () => 'localhost:4000' };
    let statusCode = 200;
    let jsonResult: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonResult = data;
      }
    };

    const router = createDownloadsRouter(deliveryService, orderService);
    // Ejecutar handler directamente
    const handler = (router as any).stack.find((s: any) => s.route?.path === '/:token/info')?.route?.stack[0]?.handle;
    await handler(req, res);

    expect(statusCode).toBe(401);
    expect(jsonResult.error).toBeDefined();
  });

  it('debe responder status y downloadToken en /api/downloads/order/:orderId/status', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['p1'],
      customer: { email: 'test@status.com' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-st',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const router = createDownloadsRouter(deliveryService, orderService);
    const handler = (router as any).stack.find((s: any) => s.route?.path === '/order/:orderId/status')?.route?.stack[0]?.handle;

    let statusCode = 200;
    let jsonResult: any = null;
    const req: any = { params: { orderId: order.id } };
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonResult = data;
      }
    };

    await handler(req, res);
    expect(statusCode).toBe(200);
    expect(jsonResult.status).toBe('PAID');
    expect(jsonResult.downloadToken).toBeDefined();
    expect(jsonResult.deliveryInfoUrl).toContain(`/api/downloads/${jsonResult.downloadToken}/info`);
  });
});
