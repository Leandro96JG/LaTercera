import dotenv from 'dotenv';
import path from 'path';

process.env.FORCE_SUPABASE_LIVE = 'true';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

async function syncSupabaseSchemaLive() {
  console.log('================================================================');
  console.log('🔄 INICIANDO SINCRONIZACIÓN Y LIMPIEZA EN SUPABASE LIVE');
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

  // --------------------------------------------------------------------------
  // 1. PURGA DE ÓRDENES DE TEST EN SUPABASE LIVE
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Limpieza de Órdenes de Test en Supabase Live ---');
  const { data: allOrders, error: ordersErr } = await client
    .from('orders')
    .select('id, customer_email, album_id, status, total_amount');

  if (ordersErr) {
    console.error('❌ Error al consultar órdenes:', ordersErr.message);
  } else {
    console.log(`📊 Total de órdenes en BD: ${allOrders?.length || 0}`);

    const TEST_EMAIL_REGEX = /test|correo|example|@test\.com|paid@test\.com|pending@test\.com|dedup@test\.com/i;
    const testOrders = (allOrders || []).filter(o => TEST_EMAIL_REGEX.test(o.customer_email || ''));
    console.log(`🧹 Órdenes de prueba detectadas para purgar: ${testOrders.length}`);

    if (testOrders.length > 0) {
      const testOrderIds = testOrders.map(o => o.id);

      // Eliminar tokens de descarga asociados a órdenes de test
      const { error: tokensErr } = await client
        .from('download_tokens')
        .delete()
        .in('order_id', testOrderIds);
      if (tokensErr) {
        console.warn('⚠️ Aviso al eliminar download_tokens:', tokensErr.message);
      } else {
        console.log('✅ Tokens de descarga de órdenes de test eliminados');
      }

      // Eliminar items de órdenes de test
      const { error: itemsErr } = await client
        .from('order_items')
        .delete()
        .in('order_id', testOrderIds);
      if (itemsErr) {
        console.warn('⚠️ Aviso al eliminar order_items:', itemsErr.message);
      } else {
        console.log('✅ Items de órdenes de test eliminados');
      }

      // Eliminar órdenes de test
      const { error: delOrdersErr } = await client
        .from('orders')
        .delete()
        .in('id', testOrderIds);
      if (delOrdersErr) {
        console.error('❌ Error al eliminar órdenes de test:', delOrdersErr.message);
      } else {
        console.log(`✅ ${testOrders.length} órdenes de test eliminadas con éxito`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. DESVINCULAR ÓRDENES HISTÓRICAS DE ÁLBUMES SEMILLA DEMO
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Desvincular Órdenes Históricas de Álbumes Semilla ---');
  const DEMO_ALBUM_IDS = ['album-1', 'album-2', 'album-3', 'album-4'];

  // Intentar primero desvincular a null (si la columna lo permite) o reasignar a fotos-de-motos-2026
  let { error: unlinkErr } = await client
    .from('orders')
    .update({ album_id: null })
    .in('album_id', DEMO_ALBUM_IDS);

  if (unlinkErr && unlinkErr.message.includes('not-null constraint')) {
    console.log('ℹ️ orders.album_id es NOT NULL en este entorno. Reasignando órdenes restantes al álbum legítimo "fotos-de-motos-2026"...');
    const { error: reassignErr } = await client
      .from('orders')
      .update({ album_id: 'fotos-de-motos-2026' })
      .in('album_id', DEMO_ALBUM_IDS);
    
    if (reassignErr) {
      console.warn('⚠️ Error al reasignar orders a fotos-de-motos-2026:', reassignErr.message);
    } else {
      console.log('✅ Órdenes históricas reasignadas a "fotos-de-motos-2026" exitosamente');
    }
  } else if (!unlinkErr) {
    console.log('✅ Órdenes históricas desvinculadas de álbumes demo (album_id = null)');
  }

  // --------------------------------------------------------------------------
  // 3. ELIMINAR FOTOS Y ÁLBUMES SEMILLA DEMO (album-1..album-4)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Eliminación de Álbumes Semilla Hardcodeados en Supabase Live ---');

  // Eliminar fotos asociadas a los álbumes demo
  const { error: delDemoPhotosErr } = await client
    .from('photos')
    .delete()
    .in('album_id', DEMO_ALBUM_IDS);

  if (delDemoPhotosErr) {
    console.warn('⚠️ Aviso al eliminar fotos demo:', delDemoPhotosErr.message);
  } else {
    console.log('✅ Fotos demo de album-1 a album-4 eliminadas');
  }

  // Eliminar álbumes demo de la tabla albums
  const { error: delDemoAlbumsErr } = await client
    .from('albums')
    .delete()
    .in('id', DEMO_ALBUM_IDS);

  if (delDemoAlbumsErr) {
    console.error('❌ Error al eliminar álbumes demo:', delDemoAlbumsErr.message);
  } else {
    console.log('✅ Álbumes semilla album-1 a album-4 eliminados de Supabase Live');
  }

  // --------------------------------------------------------------------------
  // 4. VERIFICAR ÁLBUMES ACTIVOS RESTANTES
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Verificación de Álbumes Restantes en Supabase Live ---');
  const { data: remainingAlbums, error: remainingErr } = await client
    .from('albums')
    .select('id, title, category, is_published');

  if (remainingErr) {
    console.error('❌ Error al consultar álbumes restantes:', remainingErr.message);
  } else {
    console.log(`📊 Álbumes legítimos en Supabase (${remainingAlbums?.length || 0}):`);
    remainingAlbums?.forEach(a => console.log(`   • [${a.id}] "${a.title}" (Categoría: ${a.category}, Publicado: ${a.is_published})`));
  }

  // --------------------------------------------------------------------------
  // 5. COMPROBAR TABLAS PROMOTIONS_CONFIG Y COUPONS EN SUPABASE
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Comprobación de Tablas de Promociones y Cupones ---');
  const { data: promoData, error: promoErr } = await client
    .from('promotions_config')
    .select('*')
    .limit(1);

  if (promoErr) {
    console.log('ℹ️ promotions_config aún no existe en schema cache de Supabase:', promoErr.message);
    console.log('   -> El backend operará con respaldo persistente en backend/data/promotions.json');
  } else {
    console.log('✅ promotions_config detectada en Supabase Live. Filas:', promoData);
    // Asegurar fila id = 1
    await client.from('promotions_config').upsert({
      id: 1,
      enable_tier_discounts: true,
      tier3_discount_percent: 20,
      tier5_discount_percent: 30,
      cap_at_full_album_price: true
    }, { onConflict: 'id' });
    console.log('✅ Configuración id=1 asegurada en promotions_config');
  }

  const { data: couponData, error: couponErr } = await client
    .from('coupons')
    .select('*')
    .eq('code', 'YUYO10')
    .limit(1);

  if (couponErr) {
    console.log('ℹ️ coupons aún no existe en schema cache de Supabase:', couponErr.message);
    console.log('   -> El backend operará con respaldo persistente en backend/data/promotions.json');
  } else {
    console.log('✅ coupons detectada en Supabase Live. Cupón YUYO10:', couponData);
    if (!couponData || couponData.length === 0) {
      await client.from('coupons').insert({
        code: 'YUYO10',
        discount_percent: 10,
        is_active: true,
        album_id: null,
        used_count: 0
      });
      console.log('✅ Cupón YUYO10 insertado en coupons');
    }
  }

  // --------------------------------------------------------------------------
  // 6. COMPROBAR TABLA CATEGORIES EN SUPABASE
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Comprobación de Tabla categories en Supabase ---');
  const { data: catData, error: catErr } = await client
    .from('categories')
    .select('*')
    .limit(5);

  if (catErr) {
    console.log('ℹ️ categories aún no existe en schema cache de Supabase:', catErr.message);
    console.log('   -> El backend operará con respaldo persistente en backend/data/categories.json');
  } else {
    console.log('✅ Tabla categories detectada en Supabase Live:', catData);
  }

  console.log('\n================================================================');
  console.log('✨ SINCRONIZACIÓN Y LIMPIEZA FINALIZADA');
  console.log('================================================================\n');
}

syncSupabaseSchemaLive().catch(err => {
  console.error('Fatal error en syncSupabaseSchemaLive:', err);
  process.exit(1);
});
