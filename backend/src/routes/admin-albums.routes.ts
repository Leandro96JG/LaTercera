import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  GoogleDriveImporterService,
  DefaultDriveHttpClient
} from '../services/drive-importer.service';
import { BulkUploadService } from '../services/bulk-upload.service';
import { createStorageService } from '../services/storage.service';
import {
  AdminDriveImportRequest,
  AdminDriveImportResponse,
  AdminBulkUploadResponse,
  CreateAlbumRequest,
  CreateAlbumResponse,
  UpdateAlbumRequest,
  UpdateAlbumResponse,
  AdminListAlbumsResponse,
  AlbumCategory
} from '../contracts/admin-albums.contract';
import { IAlbumRepository, AlbumDTO, generateAlbumSlug } from '../repositories/album.repository';
import { createAlbumRepository } from '../repositories';
import { AdminAuthService } from '../services/admin-auth.service';
import { createRequireAdminAuth } from '../middleware/admin-auth.middleware';

export function createAdminAlbumsRouter(
  authService?: AdminAuthService,
  albumRepo?: IAlbumRepository
): Router {
  const router = Router();
  const albumRepository = albumRepo || createAlbumRepository();
  const storageService = createStorageService();
  const driveHttpClient = new DefaultDriveHttpClient();
  const driveImporterService = new GoogleDriveImporterService(driveHttpClient, storageService);
  const bulkUploadService = new BulkUploadService(storageService);

  const requireAdminAuth = authService
    ? createRequireAdminAuth(authService)
    : (req: any, res: any, next: any) => next();

  // Configuración de Multer para subida múltiple en memoria (hasta 100 fotos de 50MB)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB por archivo
      files: 100 // Lote máximo de 100 archivos por petición
    }
  });

  /**
   * GET /api/admin/albums
   * Lista todos los álbumes para la vista administrativa (incluyendo no publicados)
   */
  router.get('/', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const albums = await albumRepository.listAllAdmin(category);

      const response: AdminListAlbumsResponse = {
        success: true,
        total: albums.length,
        albums
      };

      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al listar álbumes';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * POST /api/admin/albums
   * Crea un nuevo álbum / evento con autogeneración de slug amigable y validaciones numéricas
   */
  router.post('/', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const body = req.body as CreateAlbumRequest;

      // 1. Validaciones defensivas de entrada
      if (!body.title || !body.title.trim()) {
        return res.status(400).json({ success: false, error: 'El título del álbum es obligatorio' });
      }
      if (!body.category) {
        return res.status(400).json({ success: false, error: 'La categoría es obligatoria' });
      }
      const validCategories: AlbumCategory[] = ['futbol', 'hockey', 'basquet', 'sociales', 'otros'];
      if (!validCategories.includes(body.category)) {
        return res.status(400).json({
          success: false,
          error: `Categoría no válida. Permitidas: ${validCategories.join(', ')}`
        });
      }
      if (typeof body.unitPrice !== 'number' || body.unitPrice <= 0) {
        return res.status(400).json({ success: false, error: 'El precio por foto debe ser mayor a 0 ARS' });
      }
      if (typeof body.fullAlbumPrice !== 'number' || body.fullAlbumPrice <= 0) {
        return res.status(400).json({ success: false, error: 'El precio del álbum completo debe ser mayor a 0 ARS' });
      }

      // 2. Generación de Slug Amigable y Prevención de Colisiones
      let targetSlug = body.customSlug?.trim() || generateAlbumSlug(body.title, body.date);
      const existing = await albumRepository.getAlbumById(targetSlug);
      if (existing) {
        targetSlug = `${targetSlug}-${Date.now().toString().slice(-4)}`;
      }

      // 3. Badges e Imágenes de Portada por Defecto
      const defaultBadges: Record<AlbumCategory, string> = {
        futbol: '⚽ Fútbol',
        hockey: '🏑 Hockey',
        basquet: '🏀 Básquet',
        sociales: '🎉 Cumpleaños & Social',
        otros: '📸 Evento Especial'
      };

      const defaultCovers: Record<AlbumCategory, string> = {
        futbol: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
        hockey: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=800&q=80',
        basquet: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
        sociales: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
        otros: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80'
      };

      const newAlbum: AlbumDTO = {
        id: targetSlug,
        title: body.title.trim(),
        category: body.category,
        subtitle: body.subtitle?.trim() || 'Cobertura Oficial • La Tercera',
        date: body.date?.trim() || new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }),
        location: body.location?.trim() || 'La Rioja, Argentina',
        photosCount: 0,
        unitPrice: Math.round(body.unitPrice),
        fullAlbumPrice: Math.round(body.fullAlbumPrice),
        coverUrl: body.coverUrl?.trim() || defaultCovers[body.category],
        badge: body.badge?.trim() || defaultBadges[body.category],
        isPublished: body.isPublished ?? true
      };

      const created = await albumRepository.createAlbum(newAlbum);

      const response: CreateAlbumResponse = {
        success: true,
        album: created,
        message: `Álbum "${created.title}" creado con éxito`
      };

      return res.status(201).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear álbum';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * PUT /api/admin/albums/:id
   * Actualiza precios, metadatos o estado de publicación de un álbum
   */
  router.put('/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body as UpdateAlbumRequest;

      // Validaciones defensivas de precios
      if (updates.unitPrice !== undefined && (typeof updates.unitPrice !== 'number' || updates.unitPrice <= 0)) {
        return res.status(400).json({ success: false, error: 'El precio por foto debe ser mayor a 0 ARS' });
      }
      if (updates.fullAlbumPrice !== undefined && (typeof updates.fullAlbumPrice !== 'number' || updates.fullAlbumPrice <= 0)) {
        return res.status(400).json({ success: false, error: 'El precio del álbum completo debe ser mayor a 0 ARS' });
      }

      const updated = await albumRepository.updateAlbum(id, updates);
      if (!updated) {
        return res.status(404).json({ success: false, error: `Álbum con ID "${id}" no encontrado` });
      }

      const response: UpdateAlbumResponse = {
        success: true,
        album: updated,
        message: `Álbum "${updated.title}" actualizado con éxito`
      };

      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar álbum';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * POST /api/admin/albums/import-drive
   * Importa fotos desde una carpeta compartida de Google Drive
   */
  router.post('/import-drive', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const {
        albumId,
        driveUrl,
        watermarkText,
        concurrencyLimit,
        markHdFirstN,
        apiKey
      } = req.body as AdminDriveImportRequest;

      if (!albumId || !driveUrl) {
        return res.status(400).json({
          success: false,
          error: 'Campos requeridos faltantes: albumId y driveUrl'
        });
      }

      const result = await driveImporterService.importFromDrive({
        albumId,
        driveUrl,
        watermarkText,
        concurrencyLimit: concurrencyLimit ? Number(concurrencyLimit) : 3,
        markHdFirstN: markHdFirstN !== undefined ? Number(markHdFirstN) : 2,
        apiKey
      });

      const response: AdminDriveImportResponse = {
        success: result.success,
        albumId: result.albumId,
        folderId: result.folderId,
        summary: result.summary,
        photos: result.photos as any,
        errors: result.errors,
        skippedFiles: result.skippedFiles
      };

      return res.status(result.photos.length > 0 ? 200 : 422).json(response);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Error interno al importar carpeta de Google Drive'
      });
    }
  });

  /**
   * POST /api/admin/albums/bulk-upload
   * Procesa subida directa de múltiples fotos (drag-and-drop)
   */
  router.post('/bulk-upload', requireAdminAuth, upload.array('photos', 100), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const albumId = req.body.albumId;
      const watermarkText = req.body.watermarkText;
      const concurrencyLimit = req.body.concurrencyLimit ? Number(req.body.concurrencyLimit) : 3;

      let hdPhotoIndices: number[] = [0, 1];
      if (req.body.hdPhotoIndices) {
        try {
          hdPhotoIndices = typeof req.body.hdPhotoIndices === 'string'
            ? JSON.parse(req.body.hdPhotoIndices)
            : req.body.hdPhotoIndices;
        } catch {
          hdPhotoIndices = [0, 1];
        }
      }

      if (!albumId) {
        return res.status(400).json({
          success: false,
          error: 'El campo albumId es obligatorio'
        });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No se enviaron archivos en el campo multipart "photos"'
        });
      }

      const uploadItems = files.map((f) => ({
        originalname: f.originalname,
        buffer: f.buffer,
        mimetype: f.mimetype,
        size: f.size
      }));

      const result = await bulkUploadService.processBulkUpload({
        albumId,
        files: uploadItems,
        watermarkText,
        concurrencyLimit,
        hdPhotoIndices
      });

      const response: AdminBulkUploadResponse = {
        success: result.success,
        albumId: result.albumId,
        summary: result.summary,
        photos: result.photos as any,
        errors: result.errors
      };

      return res.status(result.photos.length > 0 ? 200 : 422).json(response);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Error interno durante la subida masiva de fotos'
      });
    }
  });

  return router;
}

export const adminAlbumsRouter = createAdminAlbumsRouter();
