import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryOrderRepository } from '../src/repositories/order.repository';
import { Order } from '../src/services/order.service';

describe('OrderRepository (TDD)', () => {
  let repo: MemoryOrderRepository;

  const sampleOrder: Order = {
    id: 'ord-test-1',
    albumId: 'album-1',
    photoIds: ['photo-1', 'photo-2'],
    isFullAlbum: false,
    photoCount: 2,
    unitPrice: 1200,
    subtotal: 2400,
    discount: 0,
    discountPercentage: 0,
    totalAmount: 2400,
    currency: 'ARS',
    customer: {
      email: 'juan@gmail.com',
      name: 'Juan Pérez'
    },
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    repo = new MemoryOrderRepository();
  });

  it('debe crear y persistir una orden', async () => {
    const created = await repo.create(sampleOrder);
    expect(created.id).toBe('ord-test-1');

    const found = await repo.findById('ord-test-1');
    expect(found).not.toBeNull();
    expect(found?.customer.email).toBe('juan@gmail.com');
    expect(found?.totalAmount).toBe(2400);
  });

  it('debe actualizar el estado de una orden a PAID y registrar el token', async () => {
    await repo.create(sampleOrder);

    const updated = await repo.updateStatus(
      'ord-test-1',
      'PAID',
      'pay-mp-999',
      'token.descarga.72h'
    );

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('PAID');
    expect(updated?.paymentId).toBe('pay-mp-999');
    expect(updated?.downloadToken).toBe('token.descarga.72h');

    const retrieved = await repo.findById('ord-test-1');
    expect(retrieved?.status).toBe('PAID');
  });

  it('debe buscar una orden por paymentId', async () => {
    await repo.create(sampleOrder);
    await repo.updateStatus('ord-test-1', 'PAID', 'pay-mp-999');

    const found = await repo.findByPaymentId('pay-mp-999');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('ord-test-1');
  });

  it('debe registrar y consultar eventos de webhook procesados para idempotencia', async () => {
    expect(await repo.isEventProcessed('evt-001')).toBe(false);

    await repo.markEventProcessed('evt-001', 'ord-test-1');
    expect(await repo.isEventProcessed('evt-001')).toBe(true);
  });

  it('debe soportar la interfaz explícita IOrderRepository (createOrder, getOrderById, updateOrderStatus)', async () => {
    const created = await repo.createOrder(sampleOrder);
    expect(created.id).toBe('ord-test-1');

    const found = await repo.getOrderById('ord-test-1');
    expect(found).not.toBeNull();
    expect(found?.totalAmount).toBe(2400);

    const updated = await repo.updateOrderStatus('ord-test-1', 'PAID', 'pay-mp-123', 'tok-456');
    expect(updated?.status).toBe('PAID');
    expect(updated?.downloadToken).toBe('tok-456');
  });
});
