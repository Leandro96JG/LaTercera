import { SupabaseClient } from '@supabase/supabase-js';

export interface AlbumDTO {
  id: string;
  category: 'futbol' | 'hockey' | 'basquet' | 'sociales' | 'otros';
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
  photosCount: number;
  unitPrice: number;
  fullAlbumPrice: number;
  coverUrl: string;
  badge?: string;
  isPublished?: boolean;
}

export function generateAlbumSlug(title: string, dateStr?: string): string {
  let base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const yearMatch = dateStr?.match(/20\d{2}/);
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

  base = base
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!base.includes(year)) {
    base = `${base}-${year}`;
  }

  return base.slice(0, 80);
}

export interface IAlbumRepository {
  listAlbums(category?: string): Promise<AlbumDTO[]>;
  listAllAdmin(category?: string): Promise<AlbumDTO[]>;
  getAlbumById(id: string): Promise<AlbumDTO | null>;
  createAlbum(album: AlbumDTO): Promise<AlbumDTO>;
  updateAlbum(id: string, updates: Partial<AlbumDTO>): Promise<AlbumDTO | null>;
  updatePhotosCount(id: string, count: number): Promise<void>;
  
  // Métodos de conveniencia / retrocompatibilidad
  findAll(category?: string): Promise<AlbumDTO[]>;
  findById(id: string): Promise<AlbumDTO | null>;
  create(album: AlbumDTO): Promise<AlbumDTO>;
}

const INITIAL_OFFICIAL_ALBUMS: AlbumDTO[] = [
  {
    id: 'album-1',
    category: 'futbol',
    title: 'Atlético Tesorieri vs Andino SC',
    subtitle: 'Liga Riojana de Fútbol • Fecha 7',
    date: '12 Octubre, 2026',
    photosCount: 48,
    unitPrice: 1200,
    fullAlbumPrice: 9500,
    coverUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    badge: '⚽ Fútbol',
    isPublished: true
  },
  {
    id: 'album-2',
    category: 'hockey',
    title: 'Torneo Provincial de Hockey Femenino',
    subtitle: 'Polideportivo Evita • Semifinales',
    date: '5 Octubre, 2026',
    photosCount: 36,
    unitPrice: 1200,
    fullAlbumPrice: 9500,
    coverUrl: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=800&q=80',
    badge: '🏑 Hockey',
    isPublished: true
  },
  {
    id: 'album-3',
    category: 'basquet',
    title: 'Facundo vs Banco Rioja (Primera Básquet)',
    subtitle: 'Torneo Clausura de Básquetbol',
    date: '28 Septiembre, 2026',
    photosCount: 42,
    unitPrice: 1200,
    fullAlbumPrice: 9500,
    coverUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
    badge: '🏀 Básquet',
    isPublished: true
  },
  {
    id: 'album-4',
    category: 'sociales',
    title: 'Cumpleaños de 15 de Martina',
    subtitle: 'Salón Las Retamas • Festejo & Baile',
    date: '20 Septiembre, 2026',
    photosCount: 85,
    unitPrice: 1200,
    fullAlbumPrice: 9500,
    coverUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
    badge: '🎉 Cumpleaños & Social',
    isPublished: true
  }
];

/**
 * Implementación en memoria de IAlbumRepository
 */
export class MemoryAlbumRepository implements IAlbumRepository {
  private albums: Map<string, AlbumDTO> = new Map();

  constructor() {
    for (const a of INITIAL_OFFICIAL_ALBUMS) {
      this.albums.set(a.id, { ...a });
    }
  }

  async listAlbums(category?: string): Promise<AlbumDTO[]> {
    const list = Array.from(this.albums.values()).filter(a => a.isPublished !== false);
    if (!category || category === 'all') {
      return list.map(a => ({ ...a }));
    }
    return list.filter(a => a.category === category).map(a => ({ ...a }));
  }

  async findAll(category?: string): Promise<AlbumDTO[]> {
    return this.listAlbums(category);
  }

  async getAlbumById(id: string): Promise<AlbumDTO | null> {
    const album = this.albums.get(id);
    return album ? { ...album } : null;
  }

  async findById(id: string): Promise<AlbumDTO | null> {
    return this.getAlbumById(id);
  }

  async createAlbum(album: AlbumDTO): Promise<AlbumDTO> {
    const clone = { ...album };
    this.albums.set(clone.id, clone);
    return clone;
  }

  async create(album: AlbumDTO): Promise<AlbumDTO> {
    return this.createAlbum(album);
  }

  async listAllAdmin(category?: string): Promise<AlbumDTO[]> {
    const list = Array.from(this.albums.values());
    if (!category || category === 'all') return list.map(a => ({ ...a }));
    return list.filter(a => a.category === category).map(a => ({ ...a }));
  }

  async updateAlbum(id: string, updates: Partial<AlbumDTO>): Promise<AlbumDTO | null> {
    const existing = this.albums.get(id);
    if (!existing) return null;

    const updated: AlbumDTO = {
      ...existing,
      ...updates,
      id: existing.id // Inmutable
    };

    this.albums.set(id, updated);
    return { ...updated };
  }

  async updatePhotosCount(id: string, count: number): Promise<void> {
    const album = this.albums.get(id);
    if (album) {
      album.photosCount = count;
    }
  }
}

export interface SupabaseAlbumRow {
  id: string;
  category: 'futbol' | 'hockey' | 'basquet' | 'sociales' | 'otros';
  title: string;
  subtitle?: string | null;
  event_date?: string | null;
  location?: string | null;
  photos_count?: number | null;
  unit_price?: number | string | null;
  full_album_price?: number | string | null;
  cover_url: string;
  badge?: string | null;
  is_published?: boolean | null;
}

/**
 * Implementación PostgreSQL de IAlbumRepository con Supabase
 */
export class SupabaseAlbumRepository implements IAlbumRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private mapRowToAlbum(row: SupabaseAlbumRow): AlbumDTO {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      subtitle: row.subtitle || undefined,
      date: row.event_date || undefined,
      location: row.location || undefined,
      photosCount: row.photos_count || 0,
      unitPrice: Number(row.unit_price) || 1200,
      fullAlbumPrice: Number(row.full_album_price) || 9500,
      coverUrl: row.cover_url,
      badge: row.badge || undefined,
      isPublished: row.is_published ?? true
    };
  }

  async listAlbums(category?: string): Promise<AlbumDTO[]> {
    let query = this.supabase
      .from('albums')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error || !data) {
      // Fallback a los oficiales si la tabla aún no fue poblada
      return INITIAL_OFFICIAL_ALBUMS;
    }

    return data.map(this.mapRowToAlbum);
  }

  async findAll(category?: string): Promise<AlbumDTO[]> {
    return this.listAlbums(category);
  }

  async getAlbumById(id: string): Promise<AlbumDTO | null> {
    const { data, error } = await this.supabase
      .from('albums')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      const fallback = INITIAL_OFFICIAL_ALBUMS.find(a => a.id === id);
      return fallback || null;
    }

    return this.mapRowToAlbum(data);
  }

  async findById(id: string): Promise<AlbumDTO | null> {
    return this.getAlbumById(id);
  }

  async createAlbum(album: AlbumDTO): Promise<AlbumDTO> {
    const { data, error } = await this.supabase
      .from('albums')
      .insert({
        id: album.id,
        category: album.category,
        title: album.title,
        subtitle: album.subtitle,
        event_date: album.date,
        location: album.location,
        photos_count: album.photosCount,
        unit_price: album.unitPrice,
        full_album_price: album.fullAlbumPrice,
        cover_url: album.coverUrl,
        badge: album.badge,
        is_published: album.isPublished ?? true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`[Supabase Error createAlbum] ${error.message}`);
    }

    return this.mapRowToAlbum(data);
  }

  async create(album: AlbumDTO): Promise<AlbumDTO> {
    return this.createAlbum(album);
  }

  async listAllAdmin(category?: string): Promise<AlbumDTO[]> {
    let query = this.supabase
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error || !data) {
      return INITIAL_OFFICIAL_ALBUMS;
    }

    return data.map((row: SupabaseAlbumRow) => this.mapRowToAlbum(row));
  }

  async updateAlbum(id: string, updates: Partial<AlbumDTO>): Promise<AlbumDTO | null> {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.category !== undefined) updatePayload.category = updates.category;
    if (updates.subtitle !== undefined) updatePayload.subtitle = updates.subtitle;
    if (updates.date !== undefined) updatePayload.event_date = updates.date;
    if (updates.location !== undefined) updatePayload.location = updates.location;
    if (updates.coverUrl !== undefined) updatePayload.cover_url = updates.coverUrl;
    if (updates.badge !== undefined) updatePayload.badge = updates.badge;
    if (updates.isPublished !== undefined) updatePayload.is_published = updates.isPublished;
    if (updates.unitPrice !== undefined) updatePayload.unit_price = updates.unitPrice;
    if (updates.fullAlbumPrice !== undefined) updatePayload.full_album_price = updates.fullAlbumPrice;
    if (updates.photosCount !== undefined) updatePayload.photos_count = updates.photosCount;

    const { data, error } = await this.supabase
      .from('albums')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToAlbum(data as SupabaseAlbumRow);
  }

  async updatePhotosCount(id: string, count: number): Promise<void> {
    await this.supabase
      .from('albums')
      .update({ photos_count: count, updated_at: new Date().toISOString() })
      .eq('id', id);
  }
}
