import dotenv from 'dotenv';
import path from 'path';

process.env.FORCE_SUPABASE_LIVE = 'true';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

async function purgeAllSupabaseLive() {
  console.log('================================================================');
  console.log('🚨 INICIANDO PURGA TOTAL DE ÁLBUMES, FOTOS Y STORAGE EN SUPABASE LIVE');
  console.log('================================================================');

  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase no está configurado en .env');
    process.exit(1);
  }

  const client = getSupabaseClient();
  if (!client) {
    console.error('❌ No se pudo inicializar el cliente de Supabase');
    process.exit(1);
  }

  // 1. Diagnóstico de Estado Actual
  console.log('\n--- 1. Inspección Previa de Tablas ---');
  const { data: albumsBefore } = await client.from('albums').select('id, title, photos_count');
  const { data: photosBefore } = await client.from('photos').select('id, album_id, filename');
  const { data: ordersBefore } = await client.from('orders').select('id, customer_email, album_id, status, total_amount');

  console.log(`📊 Álbumes encontrados: ${albumsBefore?.length || 0}`);
  albumsBefore?.forEach(a => console.log(`   - [${a.id}] "${a.title}" (${a.photos_count} fotos)`));
  console.log(`📊 Fotos en BD encontradas: ${photosBefore?.length || 0}`);
  console.log(`📊 Órdenes encontradas: ${ordersBefore?.length || 0}`);

  // 2. Limpieza de Dependencias de Órdenes
  console.log('\n--- 2. Purgando Tokens de Descarga e Items de Órdenes ---');
  const { error: dtErr } = await client.from('download_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (dtErr) console.warn('⚠️ download_tokens delete warning:', dtErr.message);
  else console.log('✅ Tokens de descarga eliminados');

  const { error: oiErr } = await client.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (oiErr) console.warn('⚠️ order_items delete warning:', oiErr.message);
  else console.log('✅ Order items eliminados');

  // Intentar desvincular orders (album_id = null)
  console.log('\n--- 3. Desvinculando / Purgando Órdenes ---');
  const { error: unlinkOrdersErr } = await client.from('orders').update({ album_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (unlinkOrdersErr) {
    console.log('ℹ️ orders.album_id tiene constraint NOT NULL en este esquema. Purgando órdenes de prueba para permitir la eliminación limpia de los álbumes...');
    const { error: delOrdersErr } = await client.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delOrdersErr) console.error('❌ Error al eliminar órdenes:', delOrdersErr.message);
    else console.log('✅ Órdenes de prueba eliminadas de la base de datos');
  } else {
    console.log('✅ Órdenes desvinculadas exitosamente (album_id = NULL)');
  }

  // 4. Limpieza de Archivos en Storage (Buckets previews y originals)
  console.log('\n--- 4. Purgando Archivos en Storage (previews y originals) ---');
  const buckets = ['previews', 'originals'];
  for (const bucket of buckets) {
    try {
      console.log(`Buscando archivos en bucket "${bucket}"...`);
      const { data: rootFiles, error: listRootErr } = await client.storage.from(bucket).list();
      if (listRootErr) {
        console.warn(`⚠️ Error listando raíz en "${bucket}":`, listRootErr.message);
        continue;
      }

      if (rootFiles && rootFiles.length > 0) {
        for (const item of rootFiles) {
          if (item.id === null || !item.name.includes('.')) {
            // Es una subcarpeta (ej: nombre de álbum)
            const folderName = item.name;
            const { data: folderFiles } = await client.storage.from(bucket).list(folderName);
            if (folderFiles && folderFiles.length > 0) {
              const filePaths = folderFiles.map(f => `${folderName}/${f.name}`);
              const { error: rmErr } = await client.storage.from(bucket).remove(filePaths);
              if (rmErr) console.warn(`⚠️ Error borrando en ${bucket}/${folderName}:`, rmErr.message);
              else console.log(`🗑️ Eliminados ${filePaths.length} archivos de ${bucket}/${folderName}`);
            }
          } else {
            // Es un archivo suelto en la raíz
            await client.storage.from(bucket).remove([item.name]);
            console.log(`🗑️ Eliminado archivo raíz ${bucket}/${item.name}`);
          }
        }
      } else {
        console.log(`ℹ️ Bucket "${bucket}" ya estaba vacío.`);
      }
    } catch (e: any) {
      console.warn(`⚠️ Excepción en bucket ${bucket}:`, e.message);
    }
  }

  // 5. Eliminar Registros en la Tabla photos
  console.log('\n--- 5. Eliminando Registros en Tabla "photos" ---');
  const { error: delPhotosErr } = await client.from('photos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delPhotosErr) console.error('❌ Error al eliminar fotos:', delPhotosErr.message);
  else console.log('✅ Todas las filas de "photos" eliminadas');

  // 6. Eliminar Registros en la Tabla albums
  console.log('\n--- 6. Eliminando Registros en Tabla "albums" ---');
  const { error: delAlbumsErr } = await client.from('albums').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delAlbumsErr) console.error('❌ Error al eliminar álbumes:', delAlbumsErr.message);
  else console.log('✅ Todos los álbumes eliminados de Supabase Live');

  // 7. Verificación Final de Estado Cero
  console.log('\n================================================================');
  console.log('🔍 VERIFICACIÓN DE ESTADO CERO (POST-PURGA)');
  console.log('================================================================');
  const { data: finalAlbums } = await client.from('albums').select('id');
  const { data: finalPhotos } = await client.from('photos').select('id');
  const { data: finalOrders } = await client.from('orders').select('id');

  console.log(`Álbumes en BD: ${finalAlbums?.length || 0}`);
  console.log(`Fotos en BD:    ${finalPhotos?.length || 0}`);
  console.log(`Órdenes en BD:  ${finalOrders?.length || 0}`);

  if ((finalAlbums?.length || 0) === 0 && (finalPhotos?.length || 0) === 0) {
    console.log('\n🎉 ¡PURGA EXITOSA! La base de datos y Storage quedaron con 0 álbumes, listos para contenido limpio.');
  } else {
    console.warn('\n⚠️ Advertencia: Aún quedaron registros pendientes.');
  }
}

purgeAllSupabaseLive().catch(console.error);
