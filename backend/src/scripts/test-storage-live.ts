import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseClient } from '../config/supabase';
import { SupabaseStorageService } from '../services/storage.service';

async function testLiveStorage() {
  console.log('--- Probando Subida y Lectura en Vivo con Supabase Storage ---');
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Cliente Supabase no configurado');
  }

  const storageService = new SupabaseStorageService(client);

  const testAlbumId = 'album-1';
  const testPhotoId = 'test_sample_live';
  const dummyPreviewBuffer = Buffer.from('TEST_SAMPLE_PREVIEW_WEBP_DATA');
  const dummyOriginalBuffer = Buffer.from('TEST_SAMPLE_ORIGINAL_HD_DATA');

  // 1. Subir Preview
  console.log('Subiendo preview a bucket "previews"...');
  const previewResult = await storageService.savePreview(testAlbumId, testPhotoId, dummyPreviewBuffer);
  console.log('✅ Preview subida con éxito:');
  console.log('   Public URL:', previewResult.publicUrl);
  console.log('   Relative Path:', previewResult.relativePath);

  // 2. Subir Original (Zero-Trust)
  console.log('\nSubiendo original a bucket "originals"...');
  const originalResult = await storageService.saveOriginal(testAlbumId, testPhotoId, '.jpg', dummyOriginalBuffer);
  console.log('✅ Original subida con éxito:');
  console.log('   Relative Path:', originalResult.relativePath);

  // 3. Obtener Buffer Original
  console.log('\nDescargando buffer original...');
  const downloadedBuffer = await storageService.getOriginalBuffer(testAlbumId, testPhotoId, '.jpg');
  console.log('✅ Buffer descargado:', downloadedBuffer?.toString());

  // 4. Generar URL firmada de 72 horas
  console.log('\nGenerando Signed URL temporal de 72 horas...');
  const signedUrl = await storageService.createSignedDownloadUrl(testAlbumId, testPhotoId, '.jpg', 72 * 3600);
  console.log('✅ Signed URL generada:', signedUrl);

  // 5. Limpieza de archivos de prueba
  console.log('\nLimpiando archivos de prueba...');
  await client.storage.from('previews').remove([`${testAlbumId}/${testPhotoId}.webp`]);
  await client.storage.from('originals').remove([`${testAlbumId}/${testPhotoId}.jpg`]);
  console.log('✅ Archivos de prueba removidos de Supabase Storage.');

  console.log('\n🎉 ¡Supabase Storage funciona de manera sobresaliente y en tiempo real!');
}

testLiveStorage().catch(err => {
  console.error('❌ Error en test de storage:', err);
  process.exit(1);
});
