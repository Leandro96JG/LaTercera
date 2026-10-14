import dotenv from 'dotenv';
import path from 'path';

// Cargar .env de backend explícitamente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

async function testConnection() {
  console.log('--- Comprobando Conexión en Vivo con Supabase ---');
  console.log('¿Supabase Configurado?:', isSupabaseConfigured());
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);

  const client = getSupabaseClient();
  if (!client) {
    console.error('❌ Error: No se pudo instanciar el cliente de Supabase.');
    process.exit(1);
  }

  const results: Record<string, string> = {};

  // 1. Probar tabla photographers
  try {
    const { data, error } = await client.from('photographers').select('id, email, full_name, role').limit(5);
    if (error) {
      results['photographers'] = `❌ Error: ${error.message} (Código: ${error.code})`;
    } else {
      results['photographers'] = `✅ OK (${data?.length || 0} registros encontrados: ${JSON.stringify(data)})`;
    }
  } catch (err: unknown) {
    results['photographers'] = `❌ Excepción: ${err instanceof Error ? err.message : String(err)}`;
  }

  // 2. Probar tabla albums
  try {
    const { data, error } = await client.from('albums').select('id, title, category, photos_count').limit(5);
    if (error) {
      results['albums'] = `❌ Error: ${error.message} (Código: ${error.code})`;
    } else {
      results['albums'] = `✅ OK (${data?.length || 0} álbumes encontrados)`;
    }
  } catch (err: unknown) {
    results['albums'] = `❌ Excepción: ${err instanceof Error ? err.message : String(err)}`;
  }

  // 3. Probar tabla orders
  try {
    const { data, error } = await client.from('orders').select('id, status, total_amount').limit(5);
    if (error) {
      results['orders'] = `❌ Error: ${error.message} (Código: ${error.code})`;
    } else {
      results['orders'] = `✅ OK (${data?.length || 0} órdenes encontradas)`;
    }
  } catch (err: unknown) {
    results['orders'] = `❌ Excepción: ${err instanceof Error ? err.message : String(err)}`;
  }

  // 4. Probar tabla photos
  try {
    const { data, error } = await client.from('photos').select('id, filename').limit(5);
    if (error) {
      results['photos'] = `❌ Error: ${error.message} (Código: ${error.code})`;
    } else {
      results['photos'] = `✅ OK (${data?.length || 0} fotos encontradas)`;
    }
  } catch (err: unknown) {
    results['photos'] = `❌ Excepción: ${err instanceof Error ? err.message : String(err)}`;
  }

  // 5. Probar vista pública public_photographers
  try {
    const { data, error } = await client.from('public_photographers').select('id, full_name, role').limit(5);
    if (error) {
      results['public_photographers'] = `❌ Error: ${error.message} (Código: ${error.code})`;
    } else {
      results['public_photographers'] = `✅ OK (${data?.length || 0} registros)`;
    }
  } catch (err: unknown) {
    results['public_photographers'] = `❌ Excepción: ${err instanceof Error ? err.message : String(err)}`;
  }

  console.log('\n--- Resultados de Verificación de Base de Datos ---');
  for (const [table, status] of Object.entries(results)) {
    console.log(`• ${table.padEnd(22)}: ${status}`);
  }

  const hasErrors = Object.values(results).some(s => s.startsWith('❌'));
  if (hasErrors) {
    console.error('\n⚠️ Se detectaron errores. Es posible que el script schema.sql aún no se haya ejecutado en el SQL Editor de Supabase.');
    process.exit(1);
  } else {
    console.log('\n🎉 ¡Conexión y tablas de Supabase verificadas exitosamente!');
    process.exit(0);
  }
}

testConnection();
