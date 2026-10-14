import fs from 'fs/promises';
import path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

export interface StorageSaveResult {
  relativePath: string;
  absolutePath: string;
  publicUrl?: string;
  sizeBytes: number;
}

export interface StorageSignedUrlOptions {
  expiresInSeconds?: number; // Por defecto: 259200 (72 horas)
  downloadFilename?: string; // Nombre sugerido en cabecera Content-Disposition
}

export interface IStorageService {
  saveOriginal(
    albumId: string,
    photoId: string,
    ext: string,
    buffer: Buffer,
    mimeType?: string
  ): Promise<StorageSaveResult>;

  savePreview(
    albumId: string,
    photoId: string,
    buffer: Buffer
  ): Promise<StorageSaveResult>;

  getOriginalPath(albumId: string, photoId: string, ext: string): string;
  getPreviewUrl(albumId: string, photoId: string): string;

  getOriginalBuffer?(
    albumId: string,
    photoId: string,
    ext: string
  ): Promise<Buffer | null>;

  createSignedDownloadUrl?(
    albumId: string,
    photoId: string,
    ext: string,
    options?: StorageSignedUrlOptions | number
  ): Promise<string | null>;

  ensureBucketsExist?(): Promise<void>;
}

/**
 * Helper interno para sanitizar identificadores y prevenir Path Traversal
 */
function sanitizeId(id: string): string {
  return path.posix.basename(id.replace(/\\/g, '/')).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Helper para inferir tipos MIME estándar a partir de la extensión
 */
function inferMimeTypeFromExt(ext: string): string {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  switch (cleanExt) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Implementación de almacenamiento en la nube con Supabase Storage Buckets
 */
export class SupabaseStorageService implements IStorageService {
  public static readonly BUCKET_PREVIEWS = 'previews';
  public static readonly BUCKET_ORIGINALS = 'originals';
  private static readonly DEFAULT_SIGNED_EXPIRY_SECONDS = 72 * 60 * 60; // 72 horas

  constructor(private supabase: SupabaseClient) {}

  public getPreviewUrl(albumId: string, photoId: string): string {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const objectPath = `${cleanAlbum}/${cleanPhoto}.webp`;

    const { data } = this.supabase.storage
      .from(SupabaseStorageService.BUCKET_PREVIEWS)
      .getPublicUrl(objectPath);

    return data.publicUrl;
  }

  public getOriginalPath(albumId: string, photoId: string, ext: string): string {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return `supabase://${SupabaseStorageService.BUCKET_ORIGINALS}/${cleanAlbum}/${cleanPhoto}${cleanExt}`;
  }

  public async savePreview(
    albumId: string,
    photoId: string,
    buffer: Buffer
  ): Promise<StorageSaveResult> {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const objectPath = `${cleanAlbum}/${cleanPhoto}.webp`;

    const { error } = await this.supabase.storage
      .from(SupabaseStorageService.BUCKET_PREVIEWS)
      .upload(objectPath, buffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000' // Caché CDN inmutable de 1 año
      });

    if (error) {
      throw new Error(`[SupabaseStorage] Fallo al subir preview '${objectPath}': ${error.message}`);
    }

    const publicUrl = this.getPreviewUrl(albumId, photoId);

    return {
      absolutePath: `supabase://${SupabaseStorageService.BUCKET_PREVIEWS}/${objectPath}`,
      relativePath: `previews/${objectPath}`,
      publicUrl,
      sizeBytes: buffer.length
    };
  }

  public async saveOriginal(
    albumId: string,
    photoId: string,
    ext: string,
    buffer: Buffer,
    mimeType?: string
  ): Promise<StorageSaveResult> {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    const objectPath = `${cleanAlbum}/${cleanPhoto}${cleanExt}`;
    const resolvedMime = mimeType || inferMimeTypeFromExt(cleanExt);

    const { error } = await this.supabase.storage
      .from(SupabaseStorageService.BUCKET_ORIGINALS)
      .upload(objectPath, buffer, {
        contentType: resolvedMime,
        upsert: true
      });

    if (error) {
      throw new Error(`[SupabaseStorage] Fallo al subir original '${objectPath}': ${error.message}`);
    }

    return {
      absolutePath: `supabase://${SupabaseStorageService.BUCKET_ORIGINALS}/${objectPath}`,
      relativePath: `originals/${objectPath}`,
      sizeBytes: buffer.length
    };
  }

  public async getOriginalBuffer(
    albumId: string,
    photoId: string,
    ext: string
  ): Promise<Buffer | null> {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    const objectPath = `${cleanAlbum}/${cleanPhoto}${cleanExt}`;

    const { data, error } = await this.supabase.storage
      .from(SupabaseStorageService.BUCKET_ORIGINALS)
      .download(objectPath);

    if (error || !data) {
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  public async createSignedDownloadUrl(
    albumId: string,
    photoId: string,
    ext: string,
    options?: StorageSignedUrlOptions | number
  ): Promise<string | null> {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    const objectPath = `${cleanAlbum}/${cleanPhoto}${cleanExt}`;

    const expiresInSeconds =
      typeof options === 'number'
        ? options
        : options?.expiresInSeconds ?? SupabaseStorageService.DEFAULT_SIGNED_EXPIRY_SECONDS;

    const downloadFilename =
      typeof options === 'object' && options?.downloadFilename
        ? options.downloadFilename
        : `LA_TERCERA_${cleanAlbum}_${cleanPhoto}${cleanExt}`;

    const { data, error } = await this.supabase.storage
      .from(SupabaseStorageService.BUCKET_ORIGINALS)
      .createSignedUrl(objectPath, expiresInSeconds, {
        download: downloadFilename
      });

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  }

  public async ensureBucketsExist(): Promise<void> {
    const { data: buckets, error } = await this.supabase.storage.listBuckets();
    if (error) {
      console.warn(`[SupabaseStorage] Advertencia al listar buckets: ${error.message}`);
      return;
    }

    const existingNames = new Set(buckets?.map((b) => b.name) || []);

    if (!existingNames.has(SupabaseStorageService.BUCKET_PREVIEWS)) {
      await this.supabase.storage.createBucket(SupabaseStorageService.BUCKET_PREVIEWS, {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png']
      });
    }

    if (!existingNames.has(SupabaseStorageService.BUCKET_ORIGINALS)) {
      await this.supabase.storage.createBucket(SupabaseStorageService.BUCKET_ORIGINALS, {
        public: false,
        fileSizeLimit: 52428800,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });
    }
  }
}

/**
 * Servicio de almacenamiento local en disco con separación de capas pública y privada
 */
export class LocalDiskStorageService implements IStorageService {
  private baseStorageDir: string;
  private publicBaseUrl: string;

  constructor(baseStorageDir?: string, publicBaseUrl: string = '/uploads') {
    this.baseStorageDir = baseStorageDir || path.resolve(process.cwd(), 'uploads');
    this.publicBaseUrl = publicBaseUrl;
  }

  public getOriginalPath(albumId: string, photoId: string, ext: string): string {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return path.join(this.baseStorageDir, 'originals', cleanAlbum, `${cleanPhoto}${cleanExt}`);
  }

  public getPreviewUrl(albumId: string, photoId: string): string {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    return `${this.publicBaseUrl}/previews/${cleanAlbum}/${cleanPhoto}.webp`;
  }

  public async saveOriginal(
    albumId: string,
    photoId: string,
    ext: string,
    buffer: Buffer
  ): Promise<StorageSaveResult> {
    const filePath = this.getOriginalPath(albumId, photoId, ext);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;

    return {
      absolutePath: filePath,
      relativePath: `originals/${cleanAlbum}/${cleanPhoto}${cleanExt}`,
      sizeBytes: buffer.length
    };
  }

  public async savePreview(
    albumId: string,
    photoId: string,
    buffer: Buffer
  ): Promise<StorageSaveResult> {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const previewDir = path.join(this.baseStorageDir, 'previews', cleanAlbum);
    await fs.mkdir(previewDir, { recursive: true });

    const filePath = path.join(previewDir, `${cleanPhoto}.webp`);
    await fs.writeFile(filePath, buffer);

    return {
      absolutePath: filePath,
      relativePath: `previews/${cleanAlbum}/${cleanPhoto}.webp`,
      publicUrl: this.getPreviewUrl(albumId, photoId),
      sizeBytes: buffer.length
    };
  }

  public async getOriginalBuffer(
    albumId: string,
    photoId: string,
    ext: string
  ): Promise<Buffer | null> {
    const filePath = this.getOriginalPath(albumId, photoId, ext);
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  public async createSignedDownloadUrl(
    albumId: string,
    photoId: string,
    ext: string
  ): Promise<string | null> {
    const cleanAlbum = sanitizeId(albumId);
    const cleanPhoto = sanitizeId(photoId);
    const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return `${this.publicBaseUrl}/originals/${cleanAlbum}/${cleanPhoto}${cleanExt}`;
  }

  public async ensureBucketsExist(): Promise<void> {
    await fs.mkdir(path.join(this.baseStorageDir, 'originals'), { recursive: true });
    await fs.mkdir(path.join(this.baseStorageDir, 'previews'), { recursive: true });
  }
}

/**
 * Implementación en memoria de IStorageService para pruebas unitarias sin tocar el disco
 */
export class MemoryStorageService implements IStorageService {
  public originals: Map<string, Buffer> = new Map();
  public previews: Map<string, Buffer> = new Map();

  public getOriginalPath(albumId: string, photoId: string, ext: string): string {
    const cleanExt = ext.replace(/^\./, '');
    return `mem://originals/${albumId}/${photoId}.${cleanExt}`;
  }

  public getPreviewUrl(albumId: string, photoId: string): string {
    return `/uploads/previews/${albumId}/${photoId}.webp`;
  }

  public async saveOriginal(
    albumId: string,
    photoId: string,
    ext: string,
    buffer: Buffer
  ): Promise<StorageSaveResult> {
    const cleanExt = ext.replace(/^\./, '');
    const key = `${albumId}/${photoId}.${cleanExt}`;
    this.originals.set(key, buffer);
    return {
      absolutePath: `mem://${key}`,
      relativePath: `originals/${key}`,
      sizeBytes: buffer.length
    };
  }

  public async savePreview(
    albumId: string,
    photoId: string,
    buffer: Buffer
  ): Promise<StorageSaveResult> {
    const key = `${albumId}/${photoId}.webp`;
    this.previews.set(key, buffer);
    return {
      absolutePath: `mem://${key}`,
      relativePath: `previews/${key}`,
      publicUrl: this.getPreviewUrl(albumId, photoId),
      sizeBytes: buffer.length
    };
  }

  public async getOriginalBuffer(
    albumId: string,
    photoId: string,
    ext: string
  ): Promise<Buffer | null> {
    const cleanExt = ext.replace(/^\./, '');
    const key = `${albumId}/${photoId}.${cleanExt}`;
    return this.originals.get(key) || null;
  }

  public async createSignedDownloadUrl(
    albumId: string,
    photoId: string,
    ext: string
  ): Promise<string | null> {
    const cleanExt = ext.replace(/^\./, '');
    return `https://mock.supabase.co/storage/v1/object/sign/originals/${albumId}/${photoId}.${cleanExt}?token=mock_signed_72h`;
  }

  public async ensureBucketsExist(): Promise<void> {
    // No-op en memoria
  }
}

/**
 * Factory híbrido de almacenamiento con detección automática de Supabase
 */
export function createStorageService(forceLocal: boolean = false): IStorageService {
  const provider = (process.env.STORAGE_PROVIDER || '').toLowerCase();

  // Modo memoria explícito para entornos de CI o tests
  if (provider === 'memory') {
    return new MemoryStorageService();
  }

  // Si Supabase está configurado en .env y no se fuerza modo local
  if (!forceLocal && provider !== 'local' && isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      return new SupabaseStorageService(client);
    }
  }

  // Fallback por defecto: Local Disk
  return new LocalDiskStorageService();
}
