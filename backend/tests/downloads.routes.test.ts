import { describe, it, expect } from 'vitest';
import express from 'express';
import { DownloadTokenService } from '../src/services/token.service';
import { OrderService } from '../src/services/order.service';
import { MemoryStorageService } from '../src/services/storage.service';
import { DeliveryService } from '../src/services/delivery.service';
import { createDownloadsRouter } from '../src/routes/downloads.routes';
import { MemoryAlbumRepository } from '../src/repositories/album.repository';

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

  it('debe servir el buffer binario real de la foto desde storageService en GET /api/downloads/:token/file', async () => {
    const realBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    await storageService.saveOriginal('album-1', 'photo-hd-real', '.jpg', realBuffer);

    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['photo-hd-real'],
      customer: { email: 'hd@test.com' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-hd-1',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;
    const token = paidOrder.downloadToken!;

    const router = createDownloadsRouter(deliveryService, orderService, storageService);
    const handler = (router as any).stack.find((s: any) => s.route?.path === '/:token/file')?.route?.stack[0]?.handle;

    let sentBuffer: any = null;
    let headers: Record<string, string> = {};
    const req: any = {
      params: { token },
      query: { photoId: 'photo-hd-real' }
    };
    const res: any = {
      setHeader: (name: string, val: string) => {
        headers[name] = val;
      },
      status: () => res,
      send: (data: any) => {
        sentBuffer = data;
      }
    };

    await handler(req, res);

    expect(headers['Content-Type']).toBe('image/jpeg');
    expect(headers['Content-Disposition']).toContain('LA_TERCERA_album-1_photo-hd-real.jpg');
    expect(Buffer.isBuffer(sentBuffer)).toBe(true);
    expect(sentBuffer.equals(realBuffer)).toBe(true);
  });

  it('debe recurrir al fallback dummy si el archivo no existe físicamente en storageService', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['photo-no-fisica'],
      customer: { email: 'nofisica@test.com' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-no-file',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;
    const token = paidOrder.downloadToken!;

    const router = createDownloadsRouter(deliveryService, orderService, storageService);
    const handler = (router as any).stack.find((s: any) => s.route?.path === '/:token/file')?.route?.stack[0]?.handle;

    let sentBuffer: any = null;
    const req: any = {
      params: { token },
      query: { photoId: 'photo-no-fisica' }
    };
    const res: any = {
      setHeader: () => {},
      status: () => res,
      send: (data: any) => {
        sentBuffer = data;
      }
    };

    await handler(req, res);

    expect(Buffer.isBuffer(sentBuffer)).toBe(true);
    expect(sentBuffer.toString()).toBe('LA_TERCERA_HD_ORIGINAL_photo-no-fisica');
  });

  describe('GET /api/downloads/free/:albumId/photo/:photoId (Descarga Individual Gratuita)', () => {
    it('debe responder 404 si el álbum no existe o está eliminado', async () => {
      const albumRepo = new MemoryAlbumRepository();
      const router = createDownloadsRouter(deliveryService, orderService, storageService, albumRepo);
      const handler = (router as any).stack.find((s: any) => s.route?.path === '/free/:albumId/photo/:photoId')?.route?.stack[0]?.handle;

      let statusCode = 200;
      let jsonResult: any = null;
      const req: any = { params: { albumId: 'inexistente', photoId: 'p1' }, headers: {}, query: {} };
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
      expect(statusCode).toBe(404);
      expect(jsonResult.error).toContain('Álbum no encontrado');
    });

    it('debe responder 403 si el álbum no tiene isFreeDownload habilitado', async () => {
      const albumRepo = new MemoryAlbumRepository();
      await albumRepo.createAlbum({
        id: 'alb-pago',
        title: 'Álbum Pago',
        category: 'futbol',
        unitPrice: 1200,
        fullAlbumPrice: 8000,
        coverUrl: 'https://example.com/cover.jpg',
        photosCount: 1,
        isFreeDownload: false
      });

      const router = createDownloadsRouter(deliveryService, orderService, storageService, albumRepo);
      const handler = (router as any).stack.find((s: any) => s.route?.path === '/free/:albumId/photo/:photoId')?.route?.stack[0]?.handle;

      let statusCode = 200;
      let jsonResult: any = null;
      const req: any = { params: { albumId: 'alb-pago', photoId: 'p1' }, headers: {}, query: {} };
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
      expect(statusCode).toBe(403);
      expect(jsonResult.error).toContain('no tiene habilitada la descarga gratuita');
    });

    it('debe responder 200 con el buffer HD y cabeceras de adjunto cuando el álbum es gratuito', async () => {
      const albumRepo = new MemoryAlbumRepository();
      await albumRepo.createAlbum({
        id: 'alb-gratis',
        title: 'Álbum Cortesía Fin de Año',
        category: 'sociales',
        unitPrice: 1200,
        fullAlbumPrice: 8000,
        coverUrl: 'https://example.com/cover.jpg',
        photosCount: 1,
        isFreeDownload: true
      });

      const realBuffer = Buffer.from('CONTENIDO_FOTO_HD_GRATIS_REAL');
      await storageService.saveOriginal('alb-gratis', 'foto-libre', '.jpg', realBuffer);

      const router = createDownloadsRouter(deliveryService, orderService, storageService, albumRepo);
      const handler = (router as any).stack.find((s: any) => s.route?.path === '/free/:albumId/photo/:photoId')?.route?.stack[0]?.handle;

      let sentBuffer: any = null;
      let headers: Record<string, string> = {};
      const req: any = { params: { albumId: 'alb-gratis', photoId: 'foto-libre' }, headers: {}, query: {} };
      const res: any = {
        setHeader: (name: string, val: string) => {
          headers[name] = val;
        },
        status: () => res,
        send: (data: any) => {
          sentBuffer = data;
        }
      };

      await handler(req, res);
      expect(headers['Content-Type']).toBe('image/jpeg');
      expect(headers['Content-Disposition']).toContain('attachment; filename="LA_TERCERA_alb-gratis_foto-libre.jpg"');
      expect(Buffer.isBuffer(sentBuffer)).toBe(true);
      expect(sentBuffer.equals(realBuffer)).toBe(true);
    });
  });
});
