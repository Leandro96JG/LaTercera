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

export interface IAlbumRepository {
  listAlbums(category?: string): Promise<AlbumDTO[]>;
  getAlbumById(id: string): Promise<AlbumDTO | null>;
  createAlbum(album: AlbumDTO): Promise<AlbumDTO>;
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
    const list = Array.from(this.albums.values());
    if (!category || category === 'all') {
      return list;
    }
    return list.filter(a => a.category === category);
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

  async updatePhotosCount(id: string, count: number): Promise<void> {
    const album = this.albums.get(id);
    if (album) {
      album.photosCount = count;
    }
  }
}

/**
 * Implementación PostgreSQL de IAlbumRepository con Supabase
 */
export class SupabaseAlbumRepository implements IAlbumRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private mapRowToAlbum(row: any): AlbumDTO {
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

  async updatePhotosCount(id: string, count: number): Promise<void> {
    await this.supabase
      .from('albums')
      .update({ photos_count: count, updated_at: new Date().toISOString() })
      .eq('id', id);
  }
}
