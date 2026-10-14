import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface AlbumDTO {
  id: string;
  category: 'futbol' | 'hockey' | 'basquet' | 'sociales' | 'otros';
  title: string;
  subtitle?: string;
  date?: string;
  eventDate?: string;
  eventTime?: string;
  eventDateTime?: string;
  location?: string;
  photosCount: number;
  unitPrice: number;
  fullAlbumPrice: number;
  coverUrl: string;
  badge?: string;
  isPublished?: boolean;
  // Campos de Papelera, Cortesía y Privacidad
  deletedAt?: string | null;
  isFreeDownload?: boolean;
  freeDownloadUnlockedAt?: string | null;
  isPrivate?: boolean;
  accessCode?: string | null;
}

export interface TrashAlbumDTO extends AlbumDTO {
  daysRemaining: number;
}

export interface PhotoDTO {
  id: string;
  albumId: string;
  filename: string;
  originalPath: string;
  previewUrl: string;
  isSampleHd: boolean;
  width?: number;
  height?: number;
  sizeBytes?: number;
  createdAt?: string;
}

export interface PublicPhotoDTO {
  id: string;
  albumId: string;
  filename: string;
  previewUrl: string;
  isSampleHd: boolean;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export function calculateDaysRemaining(deletedAtIso: string): number {
  const deletedTime = new Date(deletedAtIso).getTime();
  const now = Date.now();
  const msInDay = 1000 * 60 * 60 * 24;
  const elapsedDays = (now - deletedTime) / msInDay;
  return Math.max(0, Math.ceil(30 - elapsedDays));
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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AlbumPaginationOptions {
  page?: number;
  limit?: number;
  category?: string;
  date?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface PaginatedAlbumsResult {
  albums: AlbumDTO[];
  pagination: PaginationMeta;
}

export interface IAlbumRepository {
  listAlbums(category?: string): Promise<AlbumDTO[]>;
  listAllAdmin(category?: string): Promise<AlbumDTO[]>;
  getAlbumById(id: string): Promise<AlbumDTO | null>;
  createAlbum(album: AlbumDTO): Promise<AlbumDTO>;
  updateAlbum(id: string, updates: Partial<AlbumDTO>): Promise<AlbumDTO | null>;
  updatePhotosCount(id: string, count: number): Promise<void>;
  listAlbumsPaginated(options?: AlbumPaginationOptions): Promise<PaginatedAlbumsResult>;
  listAllAdminPaginated(options?: AlbumPaginationOptions): Promise<PaginatedAlbumsResult>;

  // Métodos de Papelera y Privacidad
  moveToTrash(id: string): Promise<boolean>;
  restoreFromTrash(id: string): Promise<AlbumDTO | null>;
  permanentDeleteAlbum(id: string): Promise<boolean>;
  listTrashAlbums(): Promise<TrashAlbumDTO[]>;
  verifyAlbumAccess(id: string, code: string): Promise<boolean>;

  // Métodos de Fotos del Álbum
  addPhotosToAlbum(albumId: string, photos: PhotoDTO[]): Promise<void>;
  getPhotosByAlbumId(albumId: string): Promise<PhotoDTO[]>;
  getPhotoById(albumId: string, photoId: string): Promise<PhotoDTO | null>;
  updatePhoto(albumId: string, photoId: string, updates: Partial<PhotoDTO>): Promise<PhotoDTO | null>;
  deletePhoto(albumId: string, photoId: string): Promise<boolean>;
  
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
  private photos: Map<string, PhotoDTO[]> = new Map();

  constructor() {
    for (const a of INITIAL_OFFICIAL_ALBUMS) {
      this.albums.set(a.id, {
        ...a,
        deletedAt: null,
        isFreeDownload: false,
        freeDownloadUnlockedAt: null,
        isPrivate: false,
        accessCode: null
      });

      // Muestra inicial de fotos para los álbumes oficiales
      const mockPhotos: PhotoDTO[] = Array.from({ length: Math.min(a.photosCount, 12) }, (_, i) => ({
        id: `${a.id}-photo-${i + 1}`,
        albumId: a.id,
        filename: `${a.id}_muestra_${i + 1}.webp`,
        originalPath: `originals/${a.id}/${a.id}_muestra_${i + 1}.jpg`,
        previewUrl: a.coverUrl,
        isSampleHd: i < 2,
        width: 4000,
        height: 3000,
        sizeBytes: 3500000,
        createdAt: new Date().toISOString()
      }));
      this.photos.set(a.id, mockPhotos);
    }
  }

  async listAlbums(category?: string): Promise<AlbumDTO[]> {
    const list = Array.from(this.albums.values())
      .filter(a => a.isPublished !== false && !a.deletedAt);
    const filtered = (!category || category === 'all')
      ? list
      : list.filter(a => a.category === category);

    return filtered.map(a => ({
      ...a,
      accessCode: a.accessCode ? '********' : undefined
    }));
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
    const clone: AlbumDTO = {
      ...album,
      deletedAt: album.deletedAt || null,
      isFreeDownload: album.isFreeDownload ?? false,
      freeDownloadUnlockedAt: album.freeDownloadUnlockedAt || null,
      isPrivate: album.isPrivate ?? false,
      accessCode: album.accessCode || null
    };
    this.albums.set(clone.id, clone);
    return clone;
  }

  async create(album: AlbumDTO): Promise<AlbumDTO> {
    return this.createAlbum(album);
  }

  async listAllAdmin(category?: string): Promise<AlbumDTO[]> {
    const list = Array.from(this.albums.values()).filter(a => !a.deletedAt);
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

    if (updates.isFreeDownload === true && !existing.isFreeDownload) {
      updated.freeDownloadUnlockedAt = new Date().toISOString();
    } else if (updates.isFreeDownload === false) {
      updated.freeDownloadUnlockedAt = null;
    }

    this.albums.set(id, updated);
    return { ...updated };
  }

  async updatePhotosCount(id: string, count: number): Promise<void> {
    const album = this.albums.get(id);
    if (album) {
      album.photosCount = count;
    }
  }

  // --- Métodos de Papelera y Privacidad ---

  async moveToTrash(id: string): Promise<boolean> {
    const album = this.albums.get(id);
    if (!album) return false;
    album.deletedAt = new Date().toISOString();
    album.isPublished = false;
    return true;
  }

  async restoreFromTrash(id: string): Promise<AlbumDTO | null> {
    const album = this.albums.get(id);
    if (!album || !album.deletedAt) return null;
    album.deletedAt = null;
    return { ...album };
  }

  async permanentDeleteAlbum(id: string): Promise<boolean> {
    return this.albums.delete(id);
  }

  async listTrashAlbums(): Promise<TrashAlbumDTO[]> {
    const trashList = Array.from(this.albums.values())
      .filter(a => Boolean(a.deletedAt))
      .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());

    return trashList.map(a => ({
      ...a,
      daysRemaining: calculateDaysRemaining(a.deletedAt!)
    }));
  }

  async verifyAlbumAccess(id: string, code: string): Promise<boolean> {
    const album = this.albums.get(id);
    if (!album) return false;
    if (!album.isPrivate) return true;
    if (!album.accessCode) return true;

    const expected = album.accessCode.trim().toUpperCase();
    const provided = (code || '').trim().toUpperCase();

    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  }

  // --- Métodos de Fotos del Álbum ---

  async addPhotosToAlbum(albumId: string, newPhotos: PhotoDTO[]): Promise<void> {
    const current = this.photos.get(albumId) || [];
    const existingIds = new Set(current.map(p => p.id));
    const filtered = newPhotos.filter(p => !existingIds.has(p.id));
    this.photos.set(albumId, [...current, ...filtered]);
  }

  async getPhotosByAlbumId(albumId: string): Promise<PhotoDTO[]> {
    const list = this.photos.get(albumId) || [];
    return list.map(p => ({ ...p }));
  }

  async getPhotoById(albumId: string, photoId: string): Promise<PhotoDTO | null> {
    const list = this.photos.get(albumId) || [];
    const photo = list.find(p => p.id === photoId);
    return photo ? { ...photo } : null;
  }

  async updatePhoto(albumId: string, photoId: string, updates: Partial<PhotoDTO>): Promise<PhotoDTO | null> {
    const list = this.photos.get(albumId) || [];
    const index = list.findIndex(p => p.id === photoId);
    if (index === -1) return null;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    this.photos.set(albumId, list);
    return { ...updated };
  }

  async deletePhoto(albumId: string, photoId: string): Promise<boolean> {
    const list = this.photos.get(albumId) || [];
    const initialLen = list.length;
    const filtered = list.filter(p => p.id !== photoId);
    if (filtered.length === initialLen) return false;

    this.photos.set(albumId, filtered);

    const album = this.albums.get(albumId);
    if (album) {
      album.photosCount = Math.max(0, (album.photosCount || 1) - 1);
      const deletedPhoto = list.find(p => p.id === photoId);
      if (deletedPhoto && album.coverUrl === deletedPhoto.previewUrl) {
        album.coverUrl = filtered[0]?.previewUrl || '';
      }
    }
    return true;
  }

  private filterAlbumList(list: AlbumDTO[], options: AlbumPaginationOptions): AlbumDTO[] {
    let result = list;
    if (options.category && options.category !== 'all') {
      result = result.filter(a => a.category === options.category);
    }
    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
        (a.location && a.location.toLowerCase().includes(q)) ||
        (a.badge && a.badge.toLowerCase().includes(q))
      );
    }
    if (options.date) {
      const targetDate = options.date;
      result = result.filter(a =>
        a.eventDate === targetDate || (a.date && a.date.includes(targetDate))
      );
    }
    if (options.from) {
      const fromDate = options.from;
      result = result.filter(a => (a.eventDate || a.date || '') >= fromDate);
    }
    if (options.to) {
      const toDate = options.to;
      result = result.filter(a => (a.eventDate || a.date || '') <= toDate);
    }
    return result;
  }

  async listAlbumsPaginated(options: AlbumPaginationOptions = {}): Promise<PaginatedAlbumsResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(options.limit) || 8));

    let list = Array.from(this.albums.values()).filter(a => a.isPublished !== false && !a.deletedAt);
    list = this.filterAlbumList(list, options);

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const from = (page - 1) * limit;
    const paginated = list.slice(from, from + limit).map(a => ({
      ...a,
      accessCode: a.accessCode ? '********' : undefined
    }));

    return {
      albums: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async listAllAdminPaginated(options: AlbumPaginationOptions = {}): Promise<PaginatedAlbumsResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(options.limit) || 10));

    let list = Array.from(this.albums.values()).filter(a => !a.deletedAt);
    list = this.filterAlbumList(list, options);

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const from = (page - 1) * limit;
    const paginated = list.slice(from, from + limit).map(a => ({ ...a }));

    return {
      albums: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}

export interface SupabaseAlbumRow {
  id: string;
  category: 'futbol' | 'hockey' | 'basquet' | 'sociales' | 'otros';
  title: string;
  subtitle?: string | null;
  event_date?: string | null;
  event_date_iso?: string | null;
  event_time?: string | null;
  event_datetime?: string | null;
  event_date_display?: string | null;
  location?: string | null;
  photos_count?: number | null;
  unit_price?: number | string | null;
  full_album_price?: number | string | null;
  cover_url: string;
  badge?: string | null;
  is_published?: boolean | null;
  deleted_at?: string | null;
  is_free_download?: boolean | null;
  free_download_unlocked_at?: string | null;
  is_private?: boolean | null;
  access_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Implementación PostgreSQL de IAlbumRepository con Supabase
 */
export class SupabaseAlbumRepository implements IAlbumRepository {
  private supabase: SupabaseClient;

  // Cache fallback defensivo si columnas opcionales aún no se migraron en el PostgreSQL remoto
  private localTrashSet = new Set<string>();
  private localTrashTimestamps = new Map<string, string>();
  private localFreeDownloadMap = new Map<string, boolean>();
  private localPrivacyMap = new Map<string, { isPrivate: boolean; accessCode: string | null }>();
  private localPhotosMap = new Map<string, PhotoDTO[]>();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private mapRowToAlbum(row: SupabaseAlbumRow): AlbumDTO {
    const rawDate = row.event_date_display || row.event_date || undefined;
    let eventDate = row.event_date_iso || undefined;
    if (!eventDate && row.event_date && /^\d{4}-\d{2}-\d{2}$/.test(row.event_date)) {
      eventDate = row.event_date;
    }

    const isTrashed = this.localTrashSet.has(row.id);
    const localDeletedAt = this.localTrashTimestamps.get(row.id);
    const localFree = this.localFreeDownloadMap.get(row.id);
    const localPrivacy = this.localPrivacyMap.get(row.id);

    return {
      id: row.id,
      category: row.category,
      title: row.title,
      subtitle: row.subtitle || undefined,
      date: rawDate,
      eventDate,
      eventTime: row.event_time || undefined,
      eventDateTime: row.event_datetime || undefined,
      location: row.location || undefined,
      photosCount: row.photos_count || 0,
      unitPrice: Number(row.unit_price) || 1200,
      fullAlbumPrice: Number(row.full_album_price) || 9500,
      coverUrl: row.cover_url,
      badge: row.badge || undefined,
      isPublished: isTrashed ? false : (row.is_published ?? true),
      deletedAt: row.deleted_at || (isTrashed ? localDeletedAt : null),
      isFreeDownload: localFree !== undefined ? localFree : (row.is_free_download ?? false),
      freeDownloadUnlockedAt: row.free_download_unlocked_at || (localFree ? new Date().toISOString() : null),
      isPrivate: localPrivacy !== undefined ? localPrivacy.isPrivate : (row.is_private ?? false),
      accessCode: localPrivacy !== undefined ? localPrivacy.accessCode : (row.access_code || null)
    };
  }

  async listAlbums(category?: string): Promise<AlbumDTO[]> {
    let query = this.supabase
      .from('albums')
      .select('*')
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    let { data, error } = await query;
    if (error && (error.code === '42703' || error.message?.includes('deleted_at'))) {
      let retryQuery = this.supabase
        .from('albums')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (category && category !== 'all') {
        retryQuery = retryQuery.eq('category', category);
      }
      const retryRes = await retryQuery;
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error || !data) {
      // Fallback a los oficiales si la tabla aún no fue poblada
      return INITIAL_OFFICIAL_ALBUMS;
    }

    return data
      .filter((r: SupabaseAlbumRow) => !this.localTrashSet.has(r.id))
      .map((r: SupabaseAlbumRow) => {
        const dto = this.mapRowToAlbum(r);
        if (dto.accessCode) dto.accessCode = '********';
        return dto;
      });
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
    const basePayload: Record<string, unknown> = {
      id: album.id,
      category: album.category,
      title: album.title,
      subtitle: album.subtitle,
      event_date: album.date || album.eventDate,
      location: album.location,
      photos_count: album.photosCount,
      unit_price: album.unitPrice,
      full_album_price: album.fullAlbumPrice,
      cover_url: album.coverUrl,
      badge: album.badge,
      is_published: album.isPublished ?? true
    };

    const fullPayload = { ...basePayload };
    if (album.eventDate) fullPayload.event_date_iso = album.eventDate;
    if (album.eventTime) fullPayload.event_time = album.eventTime;
    if (album.date) fullPayload.event_date_display = album.date;
    if (album.isFreeDownload !== undefined) fullPayload.is_free_download = album.isFreeDownload;
    if (album.isPrivate !== undefined) fullPayload.is_private = album.isPrivate;
    if (album.accessCode !== undefined) fullPayload.access_code = album.accessCode;

    let { data, error } = await this.supabase
      .from('albums')
      .insert(fullPayload)
      .select()
      .single();

    // Fallback defensivo: si las columnas estructuradas de fecha o privacidad aún no se aplicaron
    if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
      const retry = await this.supabase
        .from('albums')
        .insert(basePayload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(`[Supabase Error createAlbum] ${error.message}`);
    }

    if (album.isFreeDownload !== undefined) {
      this.localFreeDownloadMap.set(album.id, album.isFreeDownload);
    }
    if (album.isPrivate !== undefined) {
      this.localPrivacyMap.set(album.id, {
        isPrivate: album.isPrivate,
        accessCode: album.accessCode || null
      });
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
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    let { data, error } = await query;
    if (error && (error.code === '42703' || error.message?.includes('deleted_at'))) {
      let retryQuery = this.supabase
        .from('albums')
        .select('*')
        .order('created_at', { ascending: false });
      if (category && category !== 'all') {
        retryQuery = retryQuery.eq('category', category);
      }
      const retryRes = await retryQuery;
      data = retryRes.data;
      error = retryRes.error;
    }
    if (error || !data) {
      return INITIAL_OFFICIAL_ALBUMS;
    }

    return data
      .filter((row: SupabaseAlbumRow) => !this.localTrashSet.has(row.id))
      .map((row: SupabaseAlbumRow) => this.mapRowToAlbum(row));
  }

  async updateAlbum(id: string, updates: Partial<AlbumDTO>): Promise<AlbumDTO | null> {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.category !== undefined) updatePayload.category = updates.category;
    if (updates.subtitle !== undefined) updatePayload.subtitle = updates.subtitle;
    if (updates.date !== undefined) {
      updatePayload.event_date = updates.date;
      updatePayload.event_date_display = updates.date;
    }
    if (updates.eventDate !== undefined) {
      updatePayload.event_date_iso = updates.eventDate;
      if (!updates.date) updatePayload.event_date = updates.eventDate;
    }
    if (updates.eventTime !== undefined) updatePayload.event_time = updates.eventTime;
    if (updates.location !== undefined) updatePayload.location = updates.location;
    if (updates.coverUrl !== undefined) updatePayload.cover_url = updates.coverUrl;
    if (updates.badge !== undefined) updatePayload.badge = updates.badge;
    if (updates.isPublished !== undefined) updatePayload.is_published = updates.isPublished;
    if (updates.unitPrice !== undefined) updatePayload.unit_price = updates.unitPrice;
    if (updates.fullAlbumPrice !== undefined) updatePayload.full_album_price = updates.fullAlbumPrice;
    if (updates.photosCount !== undefined) updatePayload.photos_count = updates.photosCount;

    // Campos de Papelera, Cortesía y Privacidad
    if (updates.deletedAt !== undefined) updatePayload.deleted_at = updates.deletedAt;
    if (updates.isFreeDownload !== undefined) {
      updatePayload.is_free_download = updates.isFreeDownload;
      updatePayload.free_download_unlocked_at = updates.isFreeDownload ? new Date().toISOString() : null;
    }
    if (updates.isPrivate !== undefined) updatePayload.is_private = updates.isPrivate;
    if (updates.accessCode !== undefined) updatePayload.access_code = updates.accessCode;

    let { data, error } = await this.supabase
      .from('albums')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    // Fallback defensivo si columnas opcionales aún no existen en el schema remoto
    if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
      delete updatePayload.event_date_iso;
      delete updatePayload.event_time;
      delete updatePayload.event_date_display;
      delete updatePayload.is_free_download;
      delete updatePayload.free_download_unlocked_at;
      delete updatePayload.is_private;
      delete updatePayload.access_code;
      delete updatePayload.deleted_at;

      const retry = await this.supabase
        .from('albums')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      return null;
    }

    if (updates.isFreeDownload !== undefined) {
      this.localFreeDownloadMap.set(id, updates.isFreeDownload);
    }
    if (updates.isPrivate !== undefined || updates.accessCode !== undefined) {
      const existingPriv = this.localPrivacyMap.get(id) || { isPrivate: false, accessCode: null };
      this.localPrivacyMap.set(id, {
        isPrivate: updates.isPrivate !== undefined ? updates.isPrivate : existingPriv.isPrivate,
        accessCode: updates.accessCode !== undefined ? updates.accessCode : existingPriv.accessCode
      });
    }

    return this.mapRowToAlbum(data as SupabaseAlbumRow);
  }

  async updatePhotosCount(id: string, count: number): Promise<void> {
    await this.supabase
      .from('albums')
      .update({ photos_count: count, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  // --- Implementación de Papelera y Privacidad en Supabase con Resiliencia Defensiva ---

  async moveToTrash(id: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    this.localTrashSet.add(id);
    this.localTrashTimestamps.set(id, timestamp);

    const { error } = await this.supabase
      .from('albums')
      .update({
        deleted_at: timestamp,
        is_published: false,
        updated_at: timestamp
      })
      .eq('id', id);

    if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
      const retry = await this.supabase
        .from('albums')
        .update({
          is_published: false,
          updated_at: timestamp
        })
        .eq('id', id);
      return !retry.error;
    }

    return !error;
  }

  async restoreFromTrash(id: string): Promise<AlbumDTO | null> {
    this.localTrashSet.delete(id);
    this.localTrashTimestamps.delete(id);

    let { data, error } = await this.supabase
      .from('albums')
      .update({
        deleted_at: null,
        is_published: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
      const retry = await this.supabase
        .from('albums')
        .update({
          is_published: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) return null;
    return this.mapRowToAlbum(data as SupabaseAlbumRow);
  }

  async permanentDeleteAlbum(id: string): Promise<boolean> {
    this.localTrashSet.delete(id);
    this.localTrashTimestamps.delete(id);
    this.localFreeDownloadMap.delete(id);
    this.localPrivacyMap.delete(id);

    const { error } = await this.supabase
      .from('albums')
      .delete()
      .eq('id', id);

    return !error;
  }

  async listTrashAlbums(): Promise<TrashAlbumDTO[]> {
    let albumsFromDb: SupabaseAlbumRow[] = [];
    const { data, error } = await this.supabase
      .from('albums')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (!error && data) {
      albumsFromDb = data;
    }

    if (this.localTrashSet.size > 0) {
      const { data: allAlbums } = await this.supabase.from('albums').select('*');
      if (allAlbums) {
        const localTrashed = allAlbums.filter((r: SupabaseAlbumRow) => this.localTrashSet.has(r.id));
        const combinedMap = new Map<string, SupabaseAlbumRow>();
        for (const row of [...albumsFromDb, ...localTrashed]) {
          combinedMap.set(row.id, row);
        }
        albumsFromDb = Array.from(combinedMap.values());
      }
    }

    return albumsFromDb.map((row: SupabaseAlbumRow) => {
      const album = this.mapRowToAlbum(row);
      const deletedAtIso = album.deletedAt || this.localTrashTimestamps.get(album.id) || new Date().toISOString();
      return {
        ...album,
        deletedAt: deletedAtIso,
        daysRemaining: calculateDaysRemaining(deletedAtIso)
      };
    });
  }

  async verifyAlbumAccess(id: string, code: string): Promise<boolean> {
    const localPrivacy = this.localPrivacyMap.get(id);

    const { data, error } = await this.supabase
      .from('albums')
      .select('is_private, access_code')
      .eq('id', id)
      .maybeSingle();

    if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
      if (localPrivacy) {
        if (!localPrivacy.isPrivate || !localPrivacy.accessCode) return true;
        const expected = localPrivacy.accessCode.trim().toUpperCase();
        const provided = (code || '').trim().toUpperCase();
        if (expected.length !== provided.length) return false;
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
      }
      return true;
    }

    if (error || !data) {
      if (localPrivacy) {
        if (!localPrivacy.isPrivate || !localPrivacy.accessCode) return true;
        const expected = localPrivacy.accessCode.trim().toUpperCase();
        const provided = (code || '').trim().toUpperCase();
        if (expected.length !== provided.length) return false;
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
      }
      return false;
    }

    const isPrivate = localPrivacy !== undefined ? localPrivacy.isPrivate : (data.is_private ?? false);
    const accessCode = localPrivacy !== undefined ? localPrivacy.accessCode : (data.access_code || null);

    if (!isPrivate || !accessCode) return true;

    const expected = (accessCode as string).trim().toUpperCase();
    const provided = (code || '').trim().toUpperCase();

    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  }

  async listAlbumsPaginated(options: AlbumPaginationOptions = {}): Promise<PaginatedAlbumsResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(options.limit) || 8));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .from('albums')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (options.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }
    if (options.search && options.search.trim()) {
      query = query.ilike('title', `%${options.search.trim()}%`);
    }
    if (options.date) {
      query = query.ilike('event_date', `%${options.date}%`);
    }

    query = query.range(from, to);

    let { data, count, error } = await query;
    if (error && (error.code === '42703' || error.message?.includes('deleted_at'))) {
      let retryQuery = this.supabase
        .from('albums')
        .select('*', { count: 'exact' })
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (options.category && options.category !== 'all') {
        retryQuery = retryQuery.eq('category', options.category);
      }
      if (options.search && options.search.trim()) {
        retryQuery = retryQuery.ilike('title', `%${options.search.trim()}%`);
      }
      if (options.date) {
        retryQuery = retryQuery.ilike('event_date', `%${options.date}%`);
      }
      retryQuery = retryQuery.range(from, to);
      const retryRes = await retryQuery;
      data = retryRes.data;
      count = retryRes.count;
      error = retryRes.error;
    }

    if (error || !data) {
      let fallback = INITIAL_OFFICIAL_ALBUMS.filter(a => 
        !options.category || options.category === 'all' || a.category === options.category
      );
      if (options.search && options.search.trim()) {
        const q = options.search.trim().toLowerCase();
        fallback = fallback.filter(a => a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q)));
      }
      if (options.date) {
        fallback = fallback.filter(a => a.date && a.date.includes(options.date!));
      }
      const total = fallback.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return {
        albums: fallback.slice(from, from + limit),
        pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
      };
    }

    const total = count ?? data.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      albums: data.map((row: SupabaseAlbumRow) => {
        const dto = this.mapRowToAlbum(row);
        if (dto.accessCode) dto.accessCode = '********';
        return dto;
      }),
      pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    };
  }

  async listAllAdminPaginated(options: AlbumPaginationOptions = {}): Promise<PaginatedAlbumsResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(options.limit) || 10));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .from('albums')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (options.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }
    if (options.search && options.search.trim()) {
      query = query.ilike('title', `%${options.search.trim()}%`);
    }
    if (options.date) {
      query = query.ilike('event_date', `%${options.date}%`);
    }

    query = query.range(from, to);

    let { data, count, error } = await query;
    if (error && (error.code === '42703' || error.message?.includes('deleted_at'))) {
      let retryQuery = this.supabase
        .from('albums')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (options.category && options.category !== 'all') {
        retryQuery = retryQuery.eq('category', options.category);
      }
      if (options.search && options.search.trim()) {
        retryQuery = retryQuery.ilike('title', `%${options.search.trim()}%`);
      }
      if (options.date) {
        retryQuery = retryQuery.ilike('event_date', `%${options.date}%`);
      }
      retryQuery = retryQuery.range(from, to);
      const retryRes = await retryQuery;
      data = retryRes.data;
      count = retryRes.count;
      error = retryRes.error;
    }
    if (error || !data) {
      const fallback = INITIAL_OFFICIAL_ALBUMS.filter(a => 
        !options.category || options.category === 'all' || a.category === options.category
      );
      const total = fallback.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return {
        albums: fallback.slice(from, from + limit),
        pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
      };
    }

    const total = count ?? data.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      albums: data.map((row: SupabaseAlbumRow) => this.mapRowToAlbum(row)),
      pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    };
  }

  // --- Métodos de Fotos del Álbum ---

  async addPhotosToAlbum(albumId: string, newPhotos: PhotoDTO[]): Promise<void> {
    const current = this.localPhotosMap.get(albumId) || [];
    const existingIds = new Set(current.map(p => p.id));
    const filtered = newPhotos.filter(p => !existingIds.has(p.id));
    this.localPhotosMap.set(albumId, [...current, ...filtered]);

    const rows = newPhotos.map(p => ({
      id: p.id,
      album_id: albumId,
      filename: p.filename,
      original_path: p.originalPath,
      preview_url: p.previewUrl,
      is_sample_hd: p.isSampleHd,
      width: p.width ?? null,
      height: p.height ?? null,
      size_bytes: p.sizeBytes ?? null
    }));

    try {
      const { data: albumCheck } = await this.supabase
        .from('albums')
        .select('id')
        .eq('id', albumId)
        .maybeSingle();

      if (!albumCheck) {
        const official = INITIAL_OFFICIAL_ALBUMS.find(a => a.id === albumId);
        if (official) {
          await this.supabase.from('albums').upsert({
            id: official.id,
            category: official.category,
            title: official.title,
            subtitle: official.subtitle,
            event_date: official.date,
            cover_url: official.coverUrl,
            photos_count: official.photosCount,
            unit_price: official.unitPrice,
            full_album_price: official.fullAlbumPrice,
            badge: official.badge,
            is_published: official.isPublished ?? true
          }, { onConflict: 'id' });
        }
      }

      const { error } = await this.supabase
        .from('photos')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        console.warn('[SupabaseAlbumRepository] Advertencia al persistir en tabla photos:', error.message);
      }
    } catch (err: unknown) {
      console.warn('[SupabaseAlbumRepository] Error al conectar con Supabase en addPhotosToAlbum:', err);
    }
  }

  async getPhotosByAlbumId(albumId: string): Promise<PhotoDTO[]> {
    try {
      const { data, error } = await this.supabase
        .from('photos')
        .select('*')
        .eq('album_id', albumId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          albumId: r.album_id,
          filename: r.filename,
          originalPath: r.original_path,
          previewUrl: r.preview_url,
          isSampleHd: Boolean(r.is_sample_hd),
          width: r.width ? Number(r.width) : undefined,
          height: r.height ? Number(r.height) : undefined,
          sizeBytes: r.size_bytes ? Number(r.size_bytes) : undefined,
          createdAt: r.created_at
        }));
      }
    } catch (err: unknown) {
      console.warn('[SupabaseAlbumRepository] Error consultando tabla photos en Supabase:', err);
    }

    const cached = this.localPhotosMap.get(albumId);
    if (cached && cached.length > 0) {
      return cached.map(p => ({ ...p }));
    }

    const defaultAlb = INITIAL_OFFICIAL_ALBUMS.find(a => a.id === albumId);
    if (defaultAlb) {
      return Array.from({ length: Math.min(defaultAlb.photosCount, 12) }, (_, i) => ({
        id: `${defaultAlb.id}-photo-${i + 1}`,
        albumId: defaultAlb.id,
        filename: `${defaultAlb.id}_muestra_${i + 1}.webp`,
        originalPath: `originals/${defaultAlb.id}/${defaultAlb.id}_muestra_${i + 1}.jpg`,
        previewUrl: defaultAlb.coverUrl,
        isSampleHd: i < 2,
        width: 4000,
        height: 3000,
        sizeBytes: 3500000,
        createdAt: new Date().toISOString()
      }));
    }

    return [];
  }

  async getPhotoById(albumId: string, photoId: string): Promise<PhotoDTO | null> {
    try {
      const { data, error } = await this.supabase
        .from('photos')
        .select('*')
        .eq('album_id', albumId)
        .eq('id', photoId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          albumId: data.album_id,
          filename: data.filename,
          originalPath: data.original_path,
          previewUrl: data.preview_url,
          isSampleHd: Boolean(data.is_sample_hd),
          width: data.width ? Number(data.width) : undefined,
          height: data.height ? Number(data.height) : undefined,
          sizeBytes: data.size_bytes ? Number(data.size_bytes) : undefined,
          createdAt: data.created_at
        };
      }
    } catch (err: unknown) {
      console.warn('[SupabaseAlbumRepository] Error consultando foto por ID:', err);
    }

    const cached = this.localPhotosMap.get(albumId) || [];
    const photo = cached.find(p => p.id === photoId);
    return photo ? { ...photo } : null;
  }

  async updatePhoto(albumId: string, photoId: string, updates: Partial<PhotoDTO>): Promise<PhotoDTO | null> {
    const cached = this.localPhotosMap.get(albumId) || [];
    const idx = cached.findIndex(p => p.id === photoId);
    let updatedPhoto: PhotoDTO | null = null;
    if (idx !== -1) {
      updatedPhoto = { ...cached[idx], ...updates };
      cached[idx] = updatedPhoto;
      this.localPhotosMap.set(albumId, cached);
    }

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.isSampleHd !== undefined) dbUpdates.is_sample_hd = updates.isSampleHd;
      if (updates.filename !== undefined) dbUpdates.filename = updates.filename;
      if (updates.previewUrl !== undefined) dbUpdates.preview_url = updates.previewUrl;

      if (Object.keys(dbUpdates).length > 0) {
        const { data, error } = await this.supabase
          .from('photos')
          .update(dbUpdates)
          .eq('album_id', albumId)
          .eq('id', photoId)
          .select()
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            albumId: data.album_id,
            filename: data.filename,
            originalPath: data.original_path,
            previewUrl: data.preview_url,
            isSampleHd: Boolean(data.is_sample_hd),
            width: data.width ? Number(data.width) : undefined,
            height: data.height ? Number(data.height) : undefined,
            sizeBytes: data.size_bytes ? Number(data.size_bytes) : undefined,
            createdAt: data.created_at
          };
        }
      }
    } catch (err: unknown) {
      console.warn('[SupabaseAlbumRepository] Error actualizando foto en Supabase:', err);
    }

    return updatedPhoto;
  }

  async deletePhoto(albumId: string, photoId: string): Promise<boolean> {
    const cached = this.localPhotosMap.get(albumId) || [];
    const filtered = cached.filter(p => p.id !== photoId);
    this.localPhotosMap.set(albumId, filtered);

    try {
      await this.supabase
        .from('photos')
        .delete()
        .eq('album_id', albumId)
        .eq('id', photoId);
    } catch (err: unknown) {
      console.warn('[SupabaseAlbumRepository] Error eliminando foto en Supabase:', err);
    }

    try {
      const album = await this.getAlbumById(albumId);
      if (album) {
        const newCount = Math.max(0, (album.photosCount || 1) - 1);
        await this.updatePhotosCount(albumId, newCount);
      }
    } catch {
      // Ignorar fallback
    }

    return true;
  }
}
