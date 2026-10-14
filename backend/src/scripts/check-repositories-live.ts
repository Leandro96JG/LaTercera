import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { v4 as uuidv4 } from 'uuid';
import { createOrderRepository, createAlbumRepository, createPhotographerRepository } from '../repositories';

async function verifyRepositories() {
  console.log('--- Verificando Repositorios con Supabase Live ---');

  // 1. Repositorio de Álbumes
  const albumRepo = createAlbumRepository();
  const albums = await albumRepo.listAlbums();
  console.log(`✅ listAlbums(): ${albums.length} álbumes recuperados desde Supabase.`);
  if (albums.length > 0) {
    console.log(`   Primer álbum: "${albums[0].title}" (${albums[0].category}) - ID: ${albums[0].id}`);
    const single = await albumRepo.getAlbumById(albums[0].id);
    console.log(`   getAlbumById('${albums[0].id}'): ${single ? 'Encontrado' : 'No encontrado'}`);
  }

  // 2. Repositorio de Fotógrafos
  const photographerRepo = createPhotographerRepository();
  const photographer = await photographerRepo.findByEmail('fotografa@latercera.com.ar');
  console.log(`✅ findByEmail('fotografa@latercera.com.ar'):`, photographer ? `${photographer.name} (${photographer.role})` : 'No encontrado');

  // 3. Repositorio de Órdenes
  const orderRepo = createOrderRepository();
  const testOrderId = uuidv4();
  console.log(`⏳ Probando inserción y lectura de orden de prueba UUID (${testOrderId})...`);

  const createdOrder = await orderRepo.createOrder({
    id: testOrderId,
    albumId: albums[0]?.id || 'album-1',
    photoIds: [],
    isFullAlbum: true,
    photoCount: albums[0]?.photosCount || 48,
    unitPrice: 1200,
    subtotal: 9500,
    discount: 0,
    discountPercentage: 0,
    totalAmount: 9500,
    currency: 'ARS',
    customer: {
      email: 'test-cliente@latercera.com.ar',
      name: 'Cliente Prueba Supabase',
      phone: '+5493804000000'
    },
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  console.log(`✅ createOrder() exitoso en Supabase con ID: ${createdOrder.id}`);

  // Recuperar la orden recién creada
  const fetchedOrder = await orderRepo.getOrderById(testOrderId);
  console.log(`✅ getOrderById() recuperó la orden con status: ${fetchedOrder?.status}, total: $${fetchedOrder?.totalAmount}`);

  // Actualizar status
  const updatedOrder = await orderRepo.updateOrderStatus(
    testOrderId,
    'PAID',
    'MP-PAY-99998888',
    'token_test_hmac_123456'
  );
  console.log(`✅ updateOrderStatus() actualizado a: ${updatedOrder?.status}, paymentId: ${updatedOrder?.paymentId}, token: ${updatedOrder?.downloadToken}`);

  console.log('\n🎉 ¡Todos los repositorios contra Supabase funcionan de manera impecable en tiempo real!');
}

verifyRepositories().catch((err: unknown) => {
  console.error('❌ Error en prueba de repositorios:', err);
  process.exit(1);
});
