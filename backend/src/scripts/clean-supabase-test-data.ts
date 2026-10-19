import dotenv from 'dotenv';
import path from 'path';

// Forzar conexión con Supabase Live
process.env.FORCE_SUPABASE_LIVE = 'true';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseClient } from '../config/supabase';

async function cleanTestData() {
  console.log('--- Iniciando Limpieza de Datos de Prueba en Supabase Live ---');
  const client = getSupabaseClient();
  if (!client) {
    console.error('❌ Error: No se pudo conectar a Supabase Live.');
    process.exit(1);
  }

  // 1. Obtener todos los álbumes actuales
  const { data: allAlbums, error: albumsError } = await client
    .from('albums')
    .select('id, title, category, created_at');

  if (albumsError) {
    console.error('❌ Error al consultar álbumes:', albumsError);
    process.exit(1);
  }

  console.log(`📊 Total de álbumes encontrados en Supabase: ${allAlbums?.length || 0}`);

  // Álbumes oficiales protegidos que NUNCA deben borrarse
  const OFFICIAL_ALBUM_IDS = new Set(['album-1', 'album-2', 'album-3', 'album-4']);

  // Patrones que identifican registros de tests automatizados
  const TEST_PATTERNS = [
    /test/i,
    /prueba/i,
    /defensores/i,
    /cortes[ií]a/i,
    /martina 15/i,
    /escolar gratuito/i,
    /cl[aá]sico/i,
    /evento con todo/i,
    /alb_test/i,
    /alb_hockey/i,
    /alb_trash/i,
    /alb_priv/i,
    /sorteo/i
  ];

  const albumsToDelete = (allAlbums || []).filter(album => {
    if (OFFICIAL_ALBUM_IDS.has(album.id)) {
      return false; // Conservar oficial
    }
    const matchesPattern = TEST_PATTERNS.some(p => p.test(album.title) || p.test(album.id));
    return matchesPattern;
  });

  console.log(`🧹 Álbumes basura de test identificados para eliminar: ${albumsToDelete.length}`);
  albumsToDelete.forEach(a => console.log(`   - [${a.id}] "${a.title}"`));

  if (albumsToDelete.length > 0) {
    const deleteIds = albumsToDelete.map(a => a.id);

    // Borrar fotos vinculadas a estos álbumes de prueba primero
    const { error: deletePhotosErr } = await client
      .from('photos')
      .delete()
      .in('album_id', deleteIds);
    if (deletePhotosErr) {
      console.warn('⚠️ Advertencia al eliminar fotos de prueba:', deletePhotosErr.message);
    } else {
      console.log('✅ Fotos asociadas a álbumes de prueba eliminadas.');
    }

    // Borrar order_items vinculados si existieran
    const { error: deleteItemsErr } = await client
      .from('order_items')
      .delete()
      .in('album_id', deleteIds);
    if (deleteItemsErr) {
      console.warn('⚠️ Advertencia al eliminar order_items de prueba:', deleteItemsErr.message);
    }

    // Borrar los álbumes
    const { error: deleteAlbumsErr } = await client
      .from('albums')
      .delete()
      .in('id', deleteIds);

    if (deleteAlbumsErr) {
      console.error('❌ Error al eliminar álbumes de prueba:', deleteAlbumsErr.message);
    } else {
      console.log(`✅ ${albumsToDelete.length} álbumes de prueba eliminados correctamente.`);
    }
  }

  // 2. Preservar álbumes reales de la fotógrafa (evitar re-inyección de semillas hardcodeadas)
  console.log('ℹ️ Omitiendo re-inyección de álbumes semilla demo. Se conservan únicamente álbumes reales creados por la fotógrafa.');

  // 3. Limpieza de órdenes de prueba en la tabla orders
  const { data: allOrders } = await client
    .from('orders')
    .select('id, buyer_email, buyer_phone');

  const testOrders = (allOrders || []).filter(o => 
    (o.buyer_email && /test|prueba|fake|mock|example/i.test(o.buyer_email)) ||
    (o.buyer_phone && /11111111|12345678|00000000/i.test(o.buyer_phone))
  );

  if (testOrders.length > 0) {
    const orderIds = testOrders.map(o => o.id);
    await client.from('order_items').delete().in('order_id', orderIds);
    const { error: deleteOrdersErr } = await client.from('orders').delete().in('id', orderIds);
    if (!deleteOrdersErr) {
      console.log(`✅ ${testOrders.length} órdenes de prueba eliminadas de Supabase.`);
    }
  }

  // 4. Verificación final de álbumes remanentes
  const { data: remainingAlbums } = await client
    .from('albums')
    .select('id, title, category, is_published, photos_count')
    .order('created_at', { ascending: true });

  console.log(`\n🎉 Limpieza completada. Álbumes legítimos conservados en Supabase (${remainingAlbums?.length || 0}):`);
  remainingAlbums?.forEach(a => {
    console.log(`   • [${a.id}] ${a.title} (${a.category}) - ${a.photos_count || 0} fotos - Publicado: ${a.is_published}`);
  });
}

cleanTestData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
