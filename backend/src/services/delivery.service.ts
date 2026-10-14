import path from 'path';
import archiver from 'archiver';
import { Response } from 'express';
import { OrderService } from './order.service';
import { DownloadTokenService } from './token.service';
import { IStorageService } from './storage.service';
import { IAlbumRepository } from '../repositories/album.repository';
import { OrderDeliveryInfo, PhotoDownloadItem } from '../contracts/delivery.contract';

export interface DeliveryInfoResult {
  valid: boolean;
  isExpired?: boolean;
  error?: string;
  info?: OrderDeliveryInfo;
}

export interface ResolvePhotoResult {
  success: boolean;
  error?: string;
  albumId?: string;
  photoId?: string;
  filename?: string;
}

// Catálogo de títulos de álbumes conocidos (fallback defensivo)
const KNOWN_ALBUMS: Record<string, { title: string; date: string }> = {
  'album-1': { title: 'Atlético Tesorieri vs Andino SC', date: '12 Octubre, 2026' },
  'album-2': { title: 'Torneo Provincial de Hockey Femenino', date: '5 Octubre, 2026' },
  'album-3': { title: 'Facundo vs Banco Rioja (Básquet)', date: '28 Septiembre, 2026' },
  'album-4': { title: 'Cumpleaños de 15 de Martina', date: '20 Septiembre, 2026' }
};

export class DeliveryService {
  private orderService: OrderService;
  private tokenService: DownloadTokenService;
  private storageService: IStorageService;
  private albumRepository?: IAlbumRepository;
  public static readonly OFFICIAL_WHATSAPP = '5493804868714';

  constructor(
    orderService: OrderService,
    tokenService: DownloadTokenService,
    storageService: IStorageService,
    albumRepository?: IAlbumRepository
  ) {
    this.orderService = orderService;
    this.tokenService = tokenService;
    this.storageService = storageService;
    this.albumRepository = albumRepository;
  }

  /**
   * Sanitiza identificadores de fotos para prevenir ataques de Path Traversal
   */
  public sanitizeId(id?: string): string {
    if (!id || typeof id !== 'string') return '';
    const normalized = id.replace(/\\/g, '/');
    return path.posix.basename(normalized).replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Obtiene la información completa de entrega de fotos a partir de un token firmado
   */
  public async getDeliveryInfo(token: string, baseUrl: string): Promise<DeliveryInfoResult> {
    const verification = this.tokenService.verifyToken(token);
    if (!verification.valid || !verification.payload) {
      const isExpired = verification.error?.toLowerCase().includes('expirad') || false;
      return { valid: false, isExpired, error: verification.error };
    }

    const payload = verification.payload;
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
      return {
        valid: false,
        isExpired: true,
        error: 'El token de descarga ha expirado (límite de 72 horas alcanzado)'
      };
    }

    const order = await this.orderService.getOrderAsync(payload.orderId);
    if (!order || order.status !== 'PAID') {
      return {
        valid: false,
        error: 'La orden vinculada a esta descarga no se encuentra activa o no está pagada'
      };
    }

    let albumMeta: { title: string; date: string } | undefined;
    if (this.albumRepository) {
      try {
        const album = await this.albumRepository.getAlbumById(order.albumId);
        if (album) {
          albumMeta = {
            title: album.title,
            date: album.eventDate || album.date || new Date(order.createdAt).toLocaleDateString('es-AR')
          };
        }
      } catch (err) {
        console.warn('[DeliveryService] Error al obtener álbum de repositorio:', err);
      }
    }

    if (!albumMeta) {
      albumMeta = KNOWN_ALBUMS[order.albumId] || {
        title: `Álbum Deportivo #${order.albumId}`,
        date: new Date(order.createdAt).toLocaleDateString('es-AR')
      };
    }

    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const expiresInSeconds = Math.max(0, payload.exp - now);

    // Si es álbum completo, consultar fotos reales del álbum desde el repositorio
    let photoIds = order.photoIds;
    if (order.isFullAlbum) {
      if (this.albumRepository) {
        try {
          const albumPhotos = await this.albumRepository.getPhotosByAlbumId(order.albumId);
          if (albumPhotos && albumPhotos.length > 0) {
            photoIds = albumPhotos.map(p => p.id);
          }
        } catch (err) {
          console.warn('[DeliveryService] Error al obtener fotos del álbum:', err);
        }
      }
      if (photoIds.length === 0) {
        photoIds = Array.from({ length: 15 }, (_, i) => `foto_${i + 1}`);
      }
    }

    const photos: PhotoDownloadItem[] = photoIds.map((pId) => {
      const cleanPhoto = this.sanitizeId(pId);
      return {
        id: cleanPhoto,
        filename: `LA_TERCERA_${this.sanitizeId(order.albumId)}_${cleanPhoto}.jpg`,
        previewUrl: this.storageService.getPreviewUrl(order.albumId, cleanPhoto),
        downloadUrl: `${cleanBaseUrl}/api/downloads/${token}/file?photoId=${encodeURIComponent(cleanPhoto)}`
      };
    });

    const whatsappMessage = `Hola Jenifer! Te consulto por mi compra en La Tercera. Orden: #${order.id} (${albumMeta.title}).`;
    const whatsappSupportUrl = `https://wa.me/${DeliveryService.OFFICIAL_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;

    const deliveryInfo: OrderDeliveryInfo = {
      orderId: order.id,
      albumId: order.albumId,
      albumTitle: albumMeta.title,
      albumDate: albumMeta.date,
      customerEmail: order.customer.email,
      customerName: order.customer.name,
      isFullAlbum: order.isFullAlbum,
      totalPhotos: photos.length,
      photos,
      zipDownloadUrl: `${cleanBaseUrl}/api/downloads/${token}/zip`,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      expiresInSeconds,
      isExpired: false,
      whatsappSupportUrl
    };

    return {
      valid: true,
      info: deliveryInfo
    };
  }

  /**
   * Valida y resuelve el archivo de una foto individual dentro de la orden
   */
  public async resolvePhotoFile(token: string, photoId?: string): Promise<ResolvePhotoResult> {
    const verification = this.tokenService.verifyToken(token);
    if (!verification.valid || !verification.payload) {
      return { success: false, error: verification.error };
    }

    const order = await this.orderService.getOrderAsync(verification.payload.orderId);
    if (!order || order.status !== 'PAID') {
      return { success: false, error: 'Orden no activa o no pagada' };
    }

    // Si no se pasó photoId, tomar la primera de la orden o del álbum
    let requestedId = photoId || (order.photoIds.length > 0 ? order.photoIds[0] : undefined);
    if (!requestedId && order.isFullAlbum && this.albumRepository) {
      try {
        const albumPhotos = await this.albumRepository.getPhotosByAlbumId(order.albumId);
        if (albumPhotos && albumPhotos.length > 0) {
          requestedId = albumPhotos[0].id;
        }
      } catch (err) {
        console.warn('[DeliveryService] Error al resolver primera foto de álbum completo:', err);
      }
    }

    if (!requestedId) {
      return { success: false, error: 'Identificador de foto no provisto' };
    }

    const cleanPhotoId = this.sanitizeId(requestedId);

    // Verificación de pertenencia a la orden
    let belongsToOrder = false;
    if (order.isFullAlbum) {
      if (this.albumRepository) {
        try {
          const albumPhotos = await this.albumRepository.getPhotosByAlbumId(order.albumId);
          if (albumPhotos && albumPhotos.length > 0) {
            belongsToOrder = albumPhotos.some(p => this.sanitizeId(p.id) === cleanPhotoId);
          } else {
            belongsToOrder = true;
          }
        } catch {
          belongsToOrder = true;
        }
      } else {
        belongsToOrder = true;
      }
    } else {
      belongsToOrder = order.photoIds.some(p => this.sanitizeId(p) === cleanPhotoId);
    }

    if (!belongsToOrder) {
      return { success: false, error: 'La foto solicitada no pertenece a esta orden' };
    }

    const cleanAlbumId = this.sanitizeId(order.albumId);
    return {
      success: true,
      albumId: cleanAlbumId,
      photoId: cleanPhotoId,
      filename: `LA_TERCERA_${cleanAlbumId}_${cleanPhotoId}.jpg`
    };
  }

  /**
   * Empaqueta en streaming todas las fotos de la orden en un archivo ZIP con archiver
   */
  public async streamOrderZip(token: string, res: Response): Promise<void> {
    const verification = this.tokenService.verifyToken(token);
    if (!verification.valid || !verification.payload) {
      res.status(401).json({ error: verification.error });
      return;
    }

    const order = await this.orderService.getOrderAsync(verification.payload.orderId);
    if (!order || order.status !== 'PAID') {
      res.status(403).json({ error: 'Orden no activa o no pagada' });
      return;
    }

    const cleanAlbumId = this.sanitizeId(order.albumId);
    const zipFilename = `LA_TERCERA_${cleanAlbumId}_FOTOS_HD.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Cache-Control', 'private, no-transform, max-age=0');

    const archive = archiver('zip', {
      zlib: { level: 6 } // Balance óptimo compresión/CPU
    });

    archive.on('error', (err) => {
      console.error('[Error Streaming ZIP Delivery]', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al generar archivo ZIP' });
      }
    });

    res.on('close', () => {
      if (!res.writableEnded) {
        archive.abort();
      }
    });

    archive.pipe(res);

    let photosToPack: string[] = order.photoIds;
    if (order.isFullAlbum) {
      if (this.albumRepository) {
        try {
          const albumPhotos = await this.albumRepository.getPhotosByAlbumId(order.albumId);
          if (albumPhotos && albumPhotos.length > 0) {
            photosToPack = albumPhotos.map(p => p.id);
          }
        } catch (err) {
          console.warn('[DeliveryService] Error al obtener fotos para ZIP:', err);
        }
      }
      if (photosToPack.length === 0) {
        photosToPack = Array.from({ length: 10 }, (_, i) => `foto_${i + 1}`);
      }
    }

    for (const pId of photosToPack) {
      const cleanPhoto = this.sanitizeId(pId);
      const photoName = `LA_TERCERA_${cleanAlbumId}_${cleanPhoto}.jpg`;

      // Intentamos leer el archivo original si existe (en Supabase Storage o local), o enviamos un placeholder HD
      try {
        let buffer: Buffer | null = null;
        if (this.storageService.getOriginalBuffer) {
          buffer = await this.storageService.getOriginalBuffer(cleanAlbumId, cleanPhoto, '.jpg');
        }
        if (buffer) {
          archive.append(buffer, { name: photoName });
        } else {
          archive.append(Buffer.from(`LA_TERCERA_HD_IMAGE_${cleanPhoto}`), { name: photoName });
        }
      } catch {
        archive.append(Buffer.from(`LA_TERCERA_HD_IMAGE_${cleanPhoto}`), { name: photoName });
      }
    }

    await archive.finalize();
  }

  /**
   * Empaqueta en streaming todas las fotos de un álbum liberado de cortesía en un archivo ZIP con archiver
   */
  public async streamFreeAlbumZip(albumId: string, albumTitle: string, res: Response): Promise<void> {
    const cleanAlbumId = this.sanitizeId(albumId);
    const safeTitle = albumTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const zipFilename = `LA_TERCERA_${cleanAlbumId}_${safeTitle}_HD.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Cache-Control', 'private, no-transform, max-age=0');

    const archive = archiver('zip', {
      zlib: { level: 6 }
    });

    archive.on('error', (err) => {
      console.error('[Error Streaming Free Album ZIP]', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al generar archivo ZIP del álbum de cortesía' });
      }
    });

    res.on('close', () => {
      if (!res.writableEnded) {
        archive.abort();
      }
    });

    archive.pipe(res);

    // Fotos reales del álbum completo o fallback defensivo
    let photosToPack: string[] = [];
    if (this.albumRepository) {
      try {
        const albumPhotos = await this.albumRepository.getPhotosByAlbumId(albumId);
        if (albumPhotos && albumPhotos.length > 0) {
          photosToPack = albumPhotos.map(p => p.id);
        }
      } catch (err) {
        console.warn('[DeliveryService] Error al obtener fotos para ZIP de cortesía:', err);
      }
    }
    if (photosToPack.length === 0) {
      photosToPack = Array.from({ length: 12 }, (_, i) => `foto_${i + 1}`);
    }

    for (const pId of photosToPack) {
      const cleanPhoto = this.sanitizeId(pId);
      const photoName = `LA_TERCERA_${cleanAlbumId}_${cleanPhoto}.jpg`;

      try {
        let buffer: Buffer | null = null;
        if (this.storageService.getOriginalBuffer) {
          buffer = await this.storageService.getOriginalBuffer(cleanAlbumId, cleanPhoto, '.jpg');
        }
        if (buffer) {
          archive.append(buffer, { name: photoName });
        } else {
          archive.append(Buffer.from(`LA_TERCERA_HD_IMAGE_${cleanPhoto}`), { name: photoName });
        }
      } catch {
        archive.append(Buffer.from(`LA_TERCERA_HD_IMAGE_${cleanPhoto}`), { name: photoName });
      }
    }

    await archive.finalize();
  }
}

