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
  AdminBulkUploadResponse
} from '../contracts/admin-albums.contract';

import { AdminAuthService } from '../services/admin-auth.service';
import { createRequireAdminAuth } from '../middleware/admin-auth.middleware';

export function createAdminAlbumsRouter(authService?: AdminAuthService): Router {
  const router = Router();
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
   * POST /api/admin/albums/import-drive
   * Importa fotos desde una carpeta compartida de Google Drive, genera previews WebP 800px
   * con marca de agua en concurrencia controlada y guarda originales.
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
 * Procesa subida directa de múltiples fotos (drag-and-drop), genera previews WebP 800px
 * con marca de agua y almacena originales protegidos.
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
