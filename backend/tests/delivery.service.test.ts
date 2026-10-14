import { describe, it, expect, beforeEach } from 'vitest';
import { DownloadTokenService } from '../src/services/token.service';
import { OrderService } from '../src/services/order.service';
import { DeliveryService } from '../src/services/delivery.service';
import { MemoryStorageService } from '../src/services/storage.service';

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
});
