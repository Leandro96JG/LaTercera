import fs from 'fs/promises';
import path from 'path';

export interface StorageSaveResult {
  relativePath: string;
  absolutePath: string;
  publicUrl?: string;
  sizeBytes: number;
}

export interface IStorageService {
  saveOriginal(
    albumId: string,
    photoId: string,
    ext: string,
    buffer: Buffer
  ): Promise<StorageSaveResult>;

  savePreview(
    albumId: string,
    photoId: string,
    buffer: Buffer
  ): Promise<StorageSaveResult>;

  getOriginalPath(albumId: string, photoId: string, ext: string): string;
  getPreviewUrl(albumId: string, photoId: string): string;
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

  private sanitizeId(id: string): string {
    return path.posix.basename(id.replace(/\\/g, '/')).replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  getOriginalPath(albumId: string, photoId: string, ext: string): string {
    const cleanAlbum = this.sanitizeId(albumId);
    const cleanPhoto = this.sanitizeId(photoId);
    const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return path.join(this.baseStorageDir, 'originals', cleanAlbum, `${cleanPhoto}${cleanExt}`);
  }

  getPreviewUrl(albumId: string, photoId: string): string {
    const cleanAlbum = this.sanitizeId(albumId);
    const cleanPhoto = this.sanitizeId(photoId);
    return `${this.publicBaseUrl}/previews/${cleanAlbum}/${cleanPhoto}.webp`;
  }

  async saveOriginal(
    albumId: string,
    photoId: string,
    ext: string,
    buffer: Buffer
  ): Promise<StorageSaveResult> {
    const filePath = this.getOriginalPath(albumId, photoId, ext);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    const cleanAlbum = this.sanitizeId(albumId);
    const cleanPhoto = this.sanitizeId(photoId);
    const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;

    return {
      absolutePath: filePath,
      relativePath: `originals/${cleanAlbum}/${cleanPhoto}${cleanExt}`,
      sizeBytes: buffer.length
    };
  }

  async savePreview(
    albumId: string,
    photoId: string,
    buffer: Buffer
  ): Promise<StorageSaveResult> {
    const cleanAlbum = this.sanitizeId(albumId);
    const cleanPhoto = this.sanitizeId(photoId);
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
}

/**
 * Implementación en memoria de IStorageService para pruebas unitarias sin tocar el disco
 */
export class MemoryStorageService implements IStorageService {
  public originals: Map<string, Buffer> = new Map();
  public previews: Map<string, Buffer> = new Map();

  getOriginalPath(albumId: string, photoId: string, ext: string): string {
    return `mem://originals/${albumId}/${photoId}.${ext}`;
  }

  getPreviewUrl(albumId: string, photoId: string): string {
    return `/uploads/previews/${albumId}/${photoId}.webp`;
  }

  async saveOriginal(
    albumId: string,
    photoId: string,
    ext: string,
    buffer: Buffer
  ): Promise<StorageSaveResult> {
    const key = `${albumId}/${photoId}.${ext}`;
    this.originals.set(key, buffer);
    return {
      absolutePath: `mem://${key}`,
      relativePath: `originals/${key}`,
      sizeBytes: buffer.length
    };
  }

  async savePreview(
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
}
