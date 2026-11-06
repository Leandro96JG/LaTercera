import dotenv from 'dotenv';
import path from 'path';

process.env.FORCE_SUPABASE_LIVE = 'true';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('Supabase no está configurado');
    return;
  }
  const client = getSupabaseClient();
  if (!client) {
    console.error('No se pudo conectar a Supabase');
    return;
  }

  const defaultCategories = [
    { id: 'futbol', name: 'Fútbol', icon: '⚽', badge_label: '⚽ Fútbol', display_order: 1, is_active: true },
    { id: 'motos', name: 'Motos & Enduro', icon: '🏍️', badge_label: '🏍️ Motos', display_order: 2, is_active: true },
    { id: 'hockey', name: 'Hockey', icon: '🏑', badge_label: '🏑 Hockey', display_order: 3, is_active: true },
    { id: 'basquet', name: 'Básquet', icon: '🏀', badge_label: '🏀 Básquet', display_order: 4, is_active: true },
    { id: 'sociales', name: 'Cumpleaños & 15s', icon: '🎉', badge_label: '🎉 Cumpleaños & Social', display_order: 5, is_active: true },
    { id: 'otros', name: 'Otros Eventos', icon: '📸', badge_label: '📸 General', display_order: 6, is_active: true }
  ];

  console.log('Insertando / actualizando categorías base en Supabase...');
  const { data, error } = await client.from('categories').upsert(defaultCategories, { onConflict: 'id' }).select();
  if (error) {
    console.error('Error al insertar categorías:', error);
  } else {
    console.log('✅ Categorías sincronizadas con éxito en Supabase:', data?.length);
  }
}

main().catch(console.error);
