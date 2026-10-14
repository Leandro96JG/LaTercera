import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseClient } from '../config/supabase';
import { SupabaseStorageService } from '../services/storage.service';

async function setupStorage() {
  console.log('--- Inicializando Buckets de Supabase Storage ---');
  const client = getSupabaseClient();
  if (!client) {
    console.error('❌ Error: Cliente de Supabase no configurado.');
    process.exit(1);
  }

  const storageService = new SupabaseStorageService(client);
  await storageService.ensureBucketsExist();

  const { data: buckets, error } = await client.storage.listBuckets();
  if (error) {
    console.error('❌ Error al listar buckets:', error.message);
    process.exit(1);
  }

  console.log('Buckets existentes en Supabase:');
  for (const b of buckets || []) {
    console.log(` • [${b.public ? 'PÚBLICO' : 'PRIVADO'}] id: ${b.id}, name: ${b.name}`);
  }

  const hasPreviews = buckets?.some(b => b.name === 'previews');
  const hasOriginals = buckets?.some(b => b.name === 'originals');

  if (hasPreviews && hasOriginals) {
    console.log('\n🎉 ¡Buckets "previews" y "originals" configurados exitosamente en Supabase!');
  } else {
    console.warn('\n⚠️ Faltan buckets por configurar.');
  }
}

setupStorage().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
