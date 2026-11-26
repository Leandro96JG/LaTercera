import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import express from 'express';
import { app, albumRepository, promotionRepository, orderRepository } from '../src/index';
import { DeliveryService } from '../src/services/delivery.service';
import { OrderService } from '../src/services/order.service';
import { DownloadTokenService } from '../src/services/token.service';
import { MemoryStorageService } from '../src/services/storage.service';
import { MemoryAlbumRepository } from '../src/repositories/album.repository';
import { MemoryOrderRepository } from '../src/repositories/order.repository';

describe('Phase 5 Data Integrity & Logic Consistency', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
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

  it('debe rechazar en validate-coupon un cupón restringido por álbum si no se envía albumId', async () => {
    await promotionRepository.createCoupon({
      code: 'SOLOALBUM1',
      discountPercent: 25,
      isActive: true,
      albumId: 'album-1'
    });

    const resMissingAlbum = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SOLOALBUM1' })
    });
    const bodyMissing = await resMissingAlbum.json();
    expect(resMissingAlbum.status).toBe(200);
    expect(bodyMissing.valid).toBe(false);

    const resMatchingAlbum = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SOLOALBUM1', albumId: 'album-1' })
    });
    const bodyMatch = await resMatchingAlbum.json();
    expect(bodyMatch.valid).toBe(true);
  });

  it('debe bloquear álbumes en borrador o papelera en /api/albums/:id/photos y /api/checkout/preference', async () => {
    await albumRepository.createAlbum({
      id: 'draft-album-p5',
      title: 'Borrador Privado',
      category: 'futbol',
      photosCount: 1,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: '',
      isPublished: false
    });

    const photosRes = await fetch(`${baseUrl}/api/albums/draft-album-p5/photos`);
    expect(photosRes.status).toBe(404);

    const checkoutRes = await fetch(`${baseUrl}/api/checkout/preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        albumId: 'draft-album-p5',
        isFullAlbum: true,
        customer: { email: 'cliente@test.com' }
      })
    });
    expect(checkoutRes.status).toBe(404);
  });

  it('debe retornar 404 en descarga gratuita si el álbum tiene fotos y photoId no existe', async () => {
    await albumRepository.createAlbum({
      id: 'free-real-p5',
      title: 'Cortesía Real',
      category: 'futbol',
      photosCount: 1,
      unitPrice: 1000,
      fullAlbumPrice: 5000,
      coverUrl: '',
      isFreeDownload: true,
      isPublished: true
    });
    await albumRepository.addPhotosToAlbum('free-real-p5', [
      {
        id: 'real-photo-1',
        albumId: 'free-real-p5',
        filename: 'real.jpg',
        originalPath: 'free-real-p5/real-photo-1.jpg',
        previewUrl: '/uploads/previews/free-real-p5/real-photo-1.webp',
        isSampleHd: false
      }
    ]);

    const res = await fetch(`${baseUrl}/api/downloads/free/free-real-p5/photo/inexistente`);
    expect(res.status).toBe(404);
  });

  it('NO debe generar placeholders foto_1..15 en getDeliveryInfo ni autorizar cualquier ID en resolvePhotoFile si el álbum no tiene fotos', async () => {
    const tokenSvc = new DownloadTokenService('secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex');
    const localOrderRepo = new MemoryOrderRepository();
    const localAlbumRepo = new MemoryAlbumRepository();
    const localOrderSvc = new OrderService(tokenSvc, localOrderRepo, localAlbumRepo);
    const localStorage = new MemoryStorageService();
    const deliverySvc = new DeliveryService(localOrderSvc, tokenSvc, localStorage, localAlbumRepo);

    await localAlbumRepo.createAlbum({
      id: 'empty-p5',
      title: 'Álbum Vacío',
      category: 'futbol',
      photosCount: 0,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: '',
      isPublished: true
    });

    const order = await localOrderSvc.createOrderAsync({
      albumId: 'empty-p5',
      isFullAlbum: true,
      customer: { email: 'vacio@test.com' }
    });

    const tok = tokenSvc.generateToken(order.id, 'album_zip', 'empty-p5_completo.zip');
    await localOrderRepo.updateOrderStatus(order.id, 'PAID', 'pay_empty_1', tok);

    const infoRes = await deliverySvc.getDeliveryInfo(tok, 'http://localhost:4000');
    expect(infoRes.valid).toBe(true);
    expect(infoRes.info?.photos).toEqual([]);

    const fileRes = await deliverySvc.resolvePhotoFile(tok, 'arbitrary-photo-id');
    expect(fileRes.success).toBe(false);
  });
});
