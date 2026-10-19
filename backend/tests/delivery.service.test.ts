import { describe, it, expect, beforeEach } from 'vitest';
import { PassThrough } from 'stream';
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

  it('debe empaquetar un archivo ZIP con formatos mixtos (.png, .jpg, .webp) preservando las extensiones correctas', async () => {
    const albumRepo = new MemoryAlbumRepository();
    const album = await albumRepo.createAlbum({
      id: 'album-mix',
      title: 'Torneo Multiformato La Rioja',
      category: 'futbol',
      photosCount: 3,
      unitPrice: 1000,
      fullAlbumPrice: 8000,
      coverUrl: '/cover.webp'
    });

    // Guardar 3 fotos con extensiones mixtas en el repositorio
    await albumRepo.addPhotosToAlbum(album.id, [
      { id: 'foto-png', albumId: album.id, filename: 'jugada_gol.png', previewUrl: '/p1.webp', isSampleHd: false },
      { id: 'foto-jpg', albumId: album.id, filename: 'festejo.jpg', previewUrl: '/p2.webp', isSampleHd: true },
      { id: 'foto-webp', albumId: album.id, filename: 'equipo_completo.webp', previewUrl: '/p3.webp', isSampleHd: false }
    ]);

    // Guardar los buffers correspondientes en storageService con sus extensiones reales
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const jpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
    const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    await storageService.saveOriginal(album.id, 'foto-png', '.png', pngBuffer);
    await storageService.saveOriginal(album.id, 'foto-jpg', '.jpg', jpgBuffer);
    await storageService.saveOriginal(album.id, 'foto-webp', '.webp', webpBuffer);

    const deliveryWithRepo = new DeliveryService(orderService, tokenService, storageService, albumRepo);

    const order = orderService.createOrder({
      albumId: album.id,
      photoIds: ['foto-png', 'foto-jpg', 'foto-webp'],
      customer: { email: 'comprador@mix.com', name: 'Marcos' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-mix-123',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;
    const token = paidOrder.downloadToken!;

    // Usamos PassThrough como mock de Response de Express
    const chunks: Buffer[] = [];
    const headers: Record<string, string> = {};
    const mockRes: any = new PassThrough();
    mockRes.setHeader = (name: string, val: string) => {
      headers[name] = val;
    };
    mockRes.status = () => mockRes;
    mockRes.json = () => {};

    mockRes.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    const streamPromise = new Promise<void>((resolve, reject) => {
      mockRes.on('finish', resolve);
      mockRes.on('error', reject);
    });

    await deliveryWithRepo.streamOrderZip(token, mockRes);
    await streamPromise;

    expect(headers['Content-Type']).toBe('application/zip');
    expect(headers['Content-Disposition']).toContain('LA_TERCERA_album-mix_FOTOS_HD.zip');

    const zipBuffer = Buffer.concat(chunks);
    expect(zipBuffer.length).toBeGreaterThan(0);

    const zipString = zipBuffer.toString('latin1');
    // Verificar que los nombres de archivo dentro del ZIP preservaron las extensiones reales
    expect(zipString).toContain('LA_TERCERA_album-mix_foto-png.png');
    expect(zipString).toContain('LA_TERCERA_album-mix_foto-jpg.jpg');
    expect(zipString).toContain('LA_TERCERA_album-mix_foto-webp.webp');

    // Verificar que NO se incluyó ningún placeholder de texto plano
    expect(zipString).not.toContain('LA_TERCERA_HD_IMAGE_');
  });

  it('debe generar un buffer JPEG válido con Sharp en lugar de texto plano cuando el archivo no se encuentra en storage', async () => {
    const order = orderService.createOrder({
      albumId: 'album-1',
      photoIds: ['foto-sin-archivo-fisico'],
      customer: { email: 'nofile@test.com' }
    });

    orderService.verifyAndCompletePayment(order.id, {
      paymentId: 'pay-no-phys-file',
      status: 'approved',
      currencyId: 'ARS',
      transactionAmount: order.totalAmount
    });

    const paidOrder = orderService.getOrder(order.id)!;
    const token = paidOrder.downloadToken!;

    const chunks: Buffer[] = [];
    const mockRes: any = new PassThrough();
    mockRes.setHeader = () => {};
    mockRes.status = () => mockRes;
    mockRes.json = () => {};

    mockRes.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    const streamPromise = new Promise<void>((resolve, reject) => {
      mockRes.on('finish', resolve);
      mockRes.on('error', reject);
    });

    await deliveryService.streamOrderZip(token, mockRes);
    await streamPromise;

    const zipBuffer = Buffer.concat(chunks);
    const zipString = zipBuffer.toString('latin1');

    // Debe contener el archivo como .jpg
    expect(zipString).toContain('LA_TERCERA_album-1_foto-sin-archivo-fisico.jpg');
    // Nunca debe contener texto plano que corrompa la estructura
    expect(zipString).not.toContain('LA_TERCERA_HD_IMAGE_');
  });
});
