import dotenv from 'dotenv';
import path from 'path';

process.env.FORCE_SUPABASE_LIVE = 'true';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseClient } from '../config/supabase';

async function main() {
  const client = getSupabaseClient();
  if (!client) {
    console.error('No client');
    return;
  }

  // 1. Promotions config
  const { data: promoConfig, error: promoConfigErr } = await client.from('promotions_config').select('*');
  console.log('--- PROMOTIONS CONFIG ---');
  if (promoConfigErr) console.log('Error:', promoConfigErr.message);
  else console.log('Data:', promoConfig);

  // 2. Coupons
  const { data: coupons, error: couponsErr } = await client.from('coupons').select('*');
  console.log('\n--- COUPONS ---');
  if (couponsErr) console.log('Error:', couponsErr.message);
  else console.log('Count:', coupons?.length, 'Data:', coupons);

  // 3. Albums
  const { data: albums, error: albumsErr } = await client.from('albums').select('id, title, category, is_published');
  console.log('\n--- ALBUMS ---');
  if (albumsErr) console.log('Error:', albumsErr.message);
  else console.log('Count:', albums?.length, 'Data:', albums);

  // 4. Orders
  const { data: orders, error: ordersErr } = await client.from('orders').select('id, customer_email, status, total_amount, album_id, created_at');
  console.log('\n--- ORDERS ---');
  if (ordersErr) console.log('Error:', ordersErr.message);
  else {
    console.log('Total Orders Count:', orders?.length);
    const testOrders = orders?.filter(o => /test|example|correo/i.test(o.customer_email || ''));
    console.log('Test orders matching pattern:', testOrders?.length);
    const nonTest = orders?.filter(o => !/test|example|correo/i.test(o.customer_email || ''));
    console.log('Non-test orders:', nonTest);
  }

  // 5. Categories table check
  const { data: categories, error: categoriesErr } = await client.from('categories').select('*');
  console.log('\n--- CATEGORIES TABLE ---');
  if (categoriesErr) console.log('Categories table exists?: No / Error:', categoriesErr.message);
  else console.log('Categories count:', categories?.length, 'Data:', categories);
}

main().catch(console.error);
