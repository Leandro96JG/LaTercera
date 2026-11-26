import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { PhotographerAccount } from '../services/admin-auth.service';

export interface CreatePhotographerInput {
  email: string;
  passwordHash: string;
  name: string;
  role?: 'admin' | 'photographer';
  photographerId?: string;
  phone?: string;
}

export interface IPhotographerRepository {
  findByEmail(email: string): Promise<PhotographerAccount | null>;
  findById?(id: string): Promise<PhotographerAccount | null>;
  listPhotographers?(): Promise<PhotographerAccount[]>;
  setPhotographerActive?(id: string, isActive: boolean): Promise<PhotographerAccount | null>;
  createPhotographer(input: CreatePhotographerInput): Promise<PhotographerAccount>;
}

const DEFAULT_ADMIN_ACCOUNT: PhotographerAccount = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  email: 'fotografa@latercera.com.ar',
  name: 'Jenifer "Yuyo" Espeche',
  role: 'admin',
  photographerId: 'yuyo_espeche',
  passwordHash:
    'scrypt:026da31df149e9beca9264ae0f850bdf:9574bed7b95c19f8823f74534da4ef943d206d39e36a711ea391389cb526bbec22173f1d3940c21deebec6f8d3a9be234ed48b8205e752699b183b2849974f76',
  isActive: true,
  createdAt: new Date().toISOString()
};

/**
 * Implementación en memoria de IPhotographerRepository
 */
export class MemoryPhotographerRepository implements IPhotographerRepository {
  private photographers: Map<string, PhotographerAccount> = new Map();

  constructor() {
    this.photographers.set(DEFAULT_ADMIN_ACCOUNT.email.toLowerCase(), { ...DEFAULT_ADMIN_ACCOUNT });
  }

  async findByEmail(email: string): Promise<PhotographerAccount | null> {
    const account = this.photographers.get(email.trim().toLowerCase());
    return account ? { ...account } : null;
  }

  async createPhotographer(input: CreatePhotographerInput): Promise<PhotographerAccount> {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (this.photographers.has(normalizedEmail)) {
      throw new Error(`El fotógrafo con email ${normalizedEmail} ya existe`);
    }

    const newAccount: PhotographerAccount = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      email: normalizedEmail,
      name: input.name,
      role: input.role || 'photographer',
      photographerId: input.photographerId || `photo_${crypto.randomBytes(6).toString('hex')}`,
      passwordHash: input.passwordHash,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.photographers.set(normalizedEmail, newAccount);
    return { ...newAccount };
  }

  async findById(id: string): Promise<PhotographerAccount | null> {
    for (const acc of this.photographers.values()) {
      if (acc.id === id) return { ...acc };
    }
    return null;
  }

  async listPhotographers(): Promise<PhotographerAccount[]> {
    return Array.from(this.photographers.values()).map(p => ({ ...p }));
  }

  async setPhotographerActive(id: string, isActive: boolean): Promise<PhotographerAccount | null> {
    for (const [key, acc] of this.photographers.entries()) {
      if (acc.id === id) {
        const updated = { ...acc, isActive };
        this.photographers.set(key, updated);
        return { ...updated };
      }
    }
    return null;
  }
}

export interface SupabasePhotographerRow {
  id: string;
  email: string;
  password_hash: string;
  full_name?: string | null;
  display_name?: string | null;
  phone?: string | null;
  role: 'admin' | 'photographer';
  is_active?: boolean | null;
  created_at: string;
  updated_at?: string | null;
}

/**
 * Implementación PostgreSQL de IPhotographerRepository con Supabase
 */
export class SupabasePhotographerRepository implements IPhotographerRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private mapRowToPhotographer(row: SupabasePhotographerRow): PhotographerAccount {
    return {
      id: row.id,
      email: row.email,
      name: row.full_name || row.display_name || row.email,
      role: row.role,
      photographerId: row.id,
      passwordHash: row.password_hash,
      isActive: row.is_active ?? true,
      createdAt: row.created_at
    };
  }

  async findByEmail(email: string): Promise<PhotographerAccount | null> {
    const { data, error } = await this.supabase
      .from('photographers')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToPhotographer(data);
  }

  async createPhotographer(input: CreatePhotographerInput): Promise<PhotographerAccount> {
    const { data, error } = await this.supabase
      .from('photographers')
      .insert({
        email: input.email.trim().toLowerCase(),
        password_hash: input.passwordHash,
        full_name: input.name,
        display_name: input.name,
        phone: input.phone,
        role: input.role || 'photographer',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`[Supabase Error createPhotographer] ${error.message}`);
    }

    return this.mapRowToPhotographer(data);
  }

  async findById(id: string): Promise<PhotographerAccount | null> {
    const { data, error } = await this.supabase
      .from('photographers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToPhotographer(data);
  }

  async listPhotographers(): Promise<PhotographerAccount[]> {
    const { data, error } = await this.supabase
      .from('photographers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return (data as SupabasePhotographerRow[]).map(r => this.mapRowToPhotographer(r));
  }

  async setPhotographerActive(id: string, isActive: boolean): Promise<PhotographerAccount | null> {
    const { data, error } = await this.supabase
      .from('photographers')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToPhotographer(data);
  }
}
