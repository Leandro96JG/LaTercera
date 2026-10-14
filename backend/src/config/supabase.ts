import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
// En el backend preferimos SERVICE_ROLE_KEY para operaciones transaccionales y bypass de RLS, con fallback a ANON_KEY
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function normalizeSupabaseUrl(url: string): string {
  const clean = url.trim().replace(/\/+$/, '');
  const dashboardMatch = clean.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  return clean;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }

  const normalizedUrl = normalizeSupabaseUrl(SUPABASE_URL);

  return createClient(normalizedUrl, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
};
