import { describe, it, expect, beforeEach } from 'vitest';
import { DownloadTokenService } from '../src/services/token.service';
import { OrderService } from '../src/services/order.service';
import { DeliveryService } from '../src/services/delivery.service';
import { MemoryStorageService } from '../src/services/storage.service';
import { MemoryAlbumRepository } from '../src/repositories/album.repository';

describe('DeliveryService (TDD)', () => {
  const SECRET = 'clave_secreta_super_segura_de_al_menos_32_caracteres_12345';
  let tokenService: DownloadTokenService;
  let orderService: OrderService;
  let storageService: MemoryStorageService;
  let deliveryService: DeliveryService;

  beforeEach(() => {
    tokenService = new DownloadTokenService(SECRET);
    orderService = new OrderService(tokenService);
    storageService = new MemoryStorageService();
    deliveryService = new DeliveryService(orderService, tokenService, storageService);
  });

  it('debe rechazar la consulta de entrega con un token inválido o alterado', async () => {
    const result = await deliveryService.getDeliveryInfo('token.invalido.o.manipulado', 'http://localhost:4000');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Firma de token|Formato de token/i);
  });

  it('debe rechazar la consulta si la orden vinculada al token no está pagada', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['photo-1', 'photo-2'],
      customer: { email: 'cliente@test.com', name: 'Carlos Test' }
    });

    const token = tokenService.generateToken(order.id, 'photo', 'photo-1');
    const result = await deliveryService.getDeliveryInfo(token, 'http://localhost:4000');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/no se encuentra activa|no está pagada/i);
  });

  it('debe generar OrderDeliveryInfo completo para una orden de fotos individuales pagada', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['photo-1', 'photo-2', 'photo-3'],
      customer: { email: 'cliente@test.com', name: 'Laura Gómez' }
    });

    // Simulamos pago aprobado en Mercado Pago
    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-123',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;
    expect(paidOrder.downloadToken).toBeDefined();

    const result = await deliveryService.getDeliveryInfo(paidOrder.downloadToken!, 'http://localhost:4000');
    expect(result.valid).toBe(true);
    expect(result.info).toBeDefined();

    const info = result.info!;
    expect(info.orderId).toBe(order.id);
    expect(info.albumId).toBe('album-1');
    expect(info.customerEmail).toBe('cliente@test.com');
    expect(info.customerName).toBe('Laura Gómez');
    expect(info.totalPhotos).toBe(3);
    expect(info.photos.length).toBe(3);
    expect(info.isFullAlbum).toBe(false);
    expect(info.isExpired).toBe(false);
    expect(info.expiresInSeconds).toBeGreaterThan(70 * 3600); // Casi 72h
    expect(info.zipDownloadUrl).toContain(`/api/downloads/${paidOrder.downloadToken}/zip`);
    expect(info.whatsappSupportUrl).toContain('wa.me/5493804868714');
    expect(info.whatsappSupportUrl).toContain(encodeURIComponent(order.id));

    // Validar URLs individuales
    expect(info.photos[0].downloadUrl).toContain(`photoId=photo-1`);
    expect(info.photos[1].downloadUrl).toContain(`photoId=photo-2`);
    expect(info.photos[2].downloadUrl).toContain(`photoId=photo-3`);
  });

  it('debe generar OrderDeliveryInfo correcto para un álbum completo pagado', async () => {
    const order = orderService.createOrder({
      albumId: 'album-2',
      isFullAlbum: true,
      customer: { email: 'album@test.com', name: 'Federico' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-456',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;
    const result = await deliveryService.getDeliveryInfo(paidOrder.downloadToken!, 'http://localhost:4000');

    expect(result.valid).toBe(true);
    const info = result.info!;
    expect(info.isFullAlbum).toBe(true);
    expect(info.albumId).toBe('album-2');
    expect(info.zipDownloadUrl).toBeDefined();
  });

  it('debe detectar token expirado correctamente', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['photo-1'],
      customer: { email: 'exp@test.com' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-999',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    // Token con duración -1 segundo (ya expirado)
    const expiredToken = tokenService.generateToken(order.id, 'photo', 'photo-1', -1);
    const result = await deliveryService.getDeliveryInfo(expiredToken, 'http://localhost:4000');

    expect(result.valid).toBe(false);
    expect(result.isExpired).toBe(true);
    expect(result.error).toMatch(/expirado/i);
  });

  it('debe prevenir Path Traversal y verificar pertenencia de foto al solicitar descarga individual', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['photo-permitted-1'],
      customer: { email: 'seguridad@test.com' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-sec',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;

    // Intento de Path Traversal
    const hackResult = await deliveryService.resolvePhotoFile(
      paidOrder.downloadToken!,
      '../../etc/passwd'
    );
    expect(hackResult.success).toBe(false);
    expect(hackResult.error).toMatch(/no pertenece|inválido/i);

    // Intento de acceder a una foto que no compró
    const unpurchasedResult = await deliveryService.resolvePhotoFile(
      paidOrder.downloadToken!,
      'photo-de-otro-usuario'
    );
    expect(unpurchasedResult.success).toBe(false);
    expect(unpurchasedResult.error).toMatch(/no pertenece a esta orden/i);
  });

  it('debe obtener título y fecha real del álbum desde IAlbumRepository en lugar del catálogo estático', async () => {
    const albumRepo = new MemoryAlbumRepository();
    // Creamos un nuevo álbum con datos personalizados en el repositorio
    const customAlbum = await albumRepo.createAlbum({
      id: 'album-custom',
      title: 'Final Provincial de Básquet La Rioja 2026',
      category: 'basquet',
      photosCount: 2,
      unitPrice: 1500,
      fullAlbumPrice: 12000,
      coverUrl: '/uploads/previews/album-custom/cover.webp',
      eventDate: '2026-10-14',
      eventTime: '21:30'
    });

    const deliveryWithRepo = new DeliveryService(orderService, tokenService, storageService, albumRepo);

    const order = orderService.createOrder({
      albumId: customAlbum.id,
      photoIds: ['p-10', 'p-20'],
      customer: { email: 'hincha@basquet.com', name: 'Facundo Gómez' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-custom-album',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;
    const result = await deliveryWithRepo.getDeliveryInfo(paidOrder.downloadToken!, 'http://localhost:4000');

    expect(result.valid).toBe(true);
    expect(result.info).toBeDefined();
    expect(result.info!.albumTitle).toBe('Final Provincial de Básquet La Rioja 2026');
    expect(result.info!.albumDate).toBe('2026-10-14');
  });

  it('debe consultar fotos reales desde IAlbumRepository para órdenes de álbum completo', async () => {
    const albumRepo = new MemoryAlbumRepository();
    const album = await albumRepo.createAlbum({
      id: 'album-social',
      title: 'Torneo Social Juvenil',
      category: 'sociales',
      photosCount: 3,
      unitPrice: 1000,
      fullAlbumPrice: 8000,
      coverUrl: '/cover.webp'
    });

    // Guardar 3 fotos reales en el álbum
    await albumRepo.addPhotosToAlbum(album.id, [
      { id: 'real-photo-1', albumId: album.id, filename: 'p1.jpg', previewUrl: '/p1.webp', isSampleHd: false },
      { id: 'real-photo-2', albumId: album.id, filename: 'p2.jpg', previewUrl: '/p2.webp', isSampleHd: true },
      { id: 'real-photo-3', albumId: album.id, filename: 'p3.jpg', previewUrl: '/p3.webp', isSampleHd: false }
    ]);

    const deliveryWithRepo = new DeliveryService(orderService, tokenService, storageService, albumRepo);

    const order = orderService.createOrder({
      albumId: album.id,
      isFullAlbum: true,
      customer: { email: 'comprador@completo.com', name: 'Florencia' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-full-real',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;
    const result = await deliveryWithRepo.getDeliveryInfo(paidOrder.downloadToken!, 'http://localhost:4000');

    expect(result.valid).toBe(true);
    expect(result.info!.totalPhotos).toBe(3);
    expect(result.info!.photos.map(p => p.id)).toEqual(['real-photo-1', 'real-photo-2', 'real-photo-3']);

    // Resolver una foto real del álbum
    const fileResult = await deliveryWithRepo.resolvePhotoFile(paidOrder.downloadToken!, 'real-photo-2');
    expect(fileResult.success).toBe(true);
    expect(fileResult.photoId).toBe('real-photo-2');

    // Foto que no pertenece al álbum debe fallar
    const foreignResult = await deliveryWithRepo.resolvePhotoFile(paidOrder.downloadToken!, 'foto-ajena');
    expect(foreignResult.success).toBe(false);
  });

  it('debe resolver orden persistida en repositorio tras reinicio del servidor (getOrderAsync)', async () => {
    const albumRepo = new MemoryAlbumRepository();
    const deliveryWithRepo = new DeliveryService(orderService, tokenService, storageService, albumRepo);

    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['photo-1'],
      customer: { email: 'reboot@test.com' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-reboot',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;
    const token = paidOrder.downloadToken!;

    // Simulamos reinicio de servidor limpiando la caché en memoria interna de orderService
    (orderService as any).orders.clear();
    expect(orderService.getOrder(order.id)).toBeUndefined();

    // getDeliveryInfo y resolvePhotoFile deben recurrir a getOrderAsync y encontrarla en repositorio
    const result = await deliveryWithRepo.getDeliveryInfo(token, 'http://localhost:4000');
    expect(result.valid).toBe(true);
    expect(result.info!.orderId).toBe(order.id);

    const fileResult = await deliveryWithRepo.resolvePhotoFile(token, 'photo-1');
    expect(fileResult.success).toBe(true);
    expect(fileResult.photoId).toBe('photo-1');
  });
});
