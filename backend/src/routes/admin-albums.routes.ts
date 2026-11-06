import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import {
  GoogleDriveImporterService,
  DefaultDriveHttpClient
} from '../services/drive-importer.service';
import { BulkUploadService } from '../services/bulk-upload.service';
import { createStorageService } from '../services/storage.service';
import { buildAlbumPhotoTitle } from '../services/mime-validator.service';
import {
  AdminDriveImportRequest,
  AdminDriveImportResponse,
  AdminBulkUploadResponse,
  CreateAlbumRequest,
  CreateAlbumResponse,
  UpdateAlbumRequest,
  UpdateAlbumResponse,
  AdminListAlbumsResponse,
  AlbumCategory,
  AdminTrashListResponse,
  TrashActionResponse
} from '../contracts/admin-albums.contract';
import { IAlbumRepository, AlbumDTO, PhotoDTO, generateAlbumSlug, normalizePreviewUrl } from '../repositories/album.repository';
import { ICategoryRepository } from '../repositories/category.repository';
import { createAlbumRepository } from '../repositories';
import { AdminAuthService } from '../services/admin-auth.service';
import { createRequireAdminAuth } from '../middleware/admin-auth.middleware';

export function createAdminAlbumsRouter(
  authService?: AdminAuthService,
  albumRepo?: IAlbumRepository,
  categoryRepo?: ICategoryRepository
): Router {
  const router = Router();
  const albumRepository = albumRepo || createAlbumRepository();
  const categoryRepository = categoryRepo;
  const storageService = createStorageService();
  const driveHttpClient = new DefaultDriveHttpClient();
  const driveImporterService = new GoogleDriveImporterService(driveHttpClient, storageService);
  const bulkUploadService = new BulkUploadService(storageService);

  const requireAdminAuth = authService
    ? createRequireAdminAuth(authService)
    : (_req: Request, _res: Response, next: NextFunction) => next();

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
      const rawPage = req.query.page;
      const rawLimit = req.query.limit;

      if (rawPage === undefined) {
        const albums = await albumRepository.listAllAdmin(category);
        const response: AdminListAlbumsResponse = {
          success: true,
          total: albums.length,
          albums
        };
        return res.status(200).json(response);
      }

      const page = Math.max(1, parseInt(String(rawPage), 10) || 1);
      const limit = Math.max(1, Math.min(50, parseInt(String(rawLimit), 10) || 10));
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;

      const result = await albumRepository.listAllAdminPaginated({ page, limit, category, search, date });
      const response: AdminListAlbumsResponse = {
        success: true,
        total: result.pagination.total,
        albums: result.albums,
        pagination: result.pagination
      };

      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al listar álbumes';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * GET /api/admin/albums/trash
   * Lista todos los álbumes en la papelera de reciclaje con cálculo de días restantes
   */
  router.get('/trash', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const trashAlbums = await albumRepository.listTrashAlbums();
      const response: AdminTrashListResponse = {
        success: true,
        total: trashAlbums.length,
        trashAlbums
      };
      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al listar papelera de reciclaje';
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
      if (!body.category || typeof body.category !== 'string' || !body.category.trim()) {
        return res.status(400).json({ success: false, error: 'La categoría es obligatoria' });
      }

      const normalizedCategory = body.category.trim().toLowerCase();
      const baseCategories = ['futbol', 'hockey', 'basquet', 'sociales', 'otros'];

      let dynamicCategory = null;
      if (categoryRepository) {
        try {
          dynamicCategory = await categoryRepository.getCategoryById(normalizedCategory);
        } catch (catErr) {
          console.warn('[AdminAlbums] Error consultando categoría:', catErr);
        }
      }

      if (!dynamicCategory && !baseCategories.includes(normalizedCategory)) {
        return res.status(400).json({
          success: false,
          error: `Categoría no válida. Permitidas: ${baseCategories.join(', ')} o categorías dinámicas creadas.`
        });
      }

      if (typeof body.unitPrice !== 'number' || body.unitPrice <= 0) {
        return res.status(400).json({ success: false, error: 'El precio por foto debe ser mayor a 0 ARS' });
      }
      if (typeof body.fullAlbumPrice !== 'number' || body.fullAlbumPrice <= 0) {
        return res.status(400).json({ success: false, error: 'El precio del álbum completo debe ser mayor a 0 ARS' });
      }
      if (body.unitPrice > body.fullAlbumPrice) {
        return res.status(400).json({
          success: false,
          error: 'El precio por foto individual no puede ser mayor al precio del álbum completo'
        });
      }

      // 2. Generación de Slug Amigable y Prevención de Colisiones
      let targetSlug = body.customSlug?.trim()
        ? generateAlbumSlug(body.customSlug.trim())
        : generateAlbumSlug(body.title, body.date);
      const existing = await albumRepository.getAlbumById(targetSlug);
      if (existing) {
        targetSlug = `${targetSlug}-${Date.now().toString().slice(-4)}`;
      }

      // 3. Badges e Imágenes de Portada por Defecto (Base + Dinámicas)
      const defaultBadges: Record<string, string> = {
        futbol: '⚽ Fútbol',
        hockey: '🏑 Hockey',
        basquet: '🏀 Básquet',
        sociales: '🎉 Cumpleaños & Social',
        otros: '📸 Evento Especial',
        motos: '🏍️ Motos'
      };

      const defaultCovers: Record<string, string> = {
        futbol: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
        hockey: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=800&q=80',
        basquet: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
        sociales: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
        otros: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
        motos: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'
      };

      const resolvedBadge = body.badge?.trim() ||
        dynamicCategory?.badgeLabel ||
        defaultBadges[normalizedCategory] ||
        `📸 ${dynamicCategory?.name || normalizedCategory}`;

      const resolvedCover = body.coverUrl?.trim() ||
        defaultCovers[normalizedCategory] ||
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80';

      const newAlbum: AlbumDTO = {
        id: targetSlug,
        title: body.title.trim(),
        category: normalizedCategory,
        subtitle: body.subtitle?.trim() || 'Cobertura Oficial • La Tercera',
        date: body.date?.trim() || new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }),
        eventDate: body.eventDate?.trim(),
        eventTime: body.eventTime?.trim(),
        location: body.location?.trim() || 'La Rioja, Argentina',
        photosCount: 0,
        unitPrice: Math.round(body.unitPrice),
        fullAlbumPrice: Math.round(body.fullAlbumPrice),
        coverUrl: resolvedCover,
        badge: resolvedBadge,
        isPublished: body.isPublished ?? true,
        isHeroFeatured: body.isHeroFeatured ?? false,
        watermarkText: body.watermarkText?.trim() || undefined,
        watermarkLogoUrl: body.watermarkLogoUrl?.trim() || null,
        isFreeDownload: body.isFreeDownload ?? false,
        isPrivate: body.isPrivate ?? false,
        accessCode: body.isPrivate && body.accessCode ? body.accessCode.trim() : null
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
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updates = req.body as UpdateAlbumRequest;

      // Validaciones defensivas de precios
      if (updates.unitPrice !== undefined && (typeof updates.unitPrice !== 'number' || updates.unitPrice <= 0)) {
        return res.status(400).json({ success: false, error: 'El precio por foto debe ser mayor a 0 ARS' });
      }
      if (updates.fullAlbumPrice !== undefined && (typeof updates.fullAlbumPrice !== 'number' || updates.fullAlbumPrice <= 0)) {
        return res.status(400).json({ success: false, error: 'El precio del álbum completo debe ser mayor a 0 ARS' });
      }

      // Validación y normalización de categoría si se provee
      if (updates.category) {
        const normalizedCat = updates.category.trim().toLowerCase();
        let dynamicCategory = null;
        if (categoryRepository) {
          try {
            dynamicCategory = await categoryRepository.getCategoryById(normalizedCat);
          } catch (catErr) {
            console.warn('[AdminAlbums PUT] Error consultando categoría:', catErr);
          }
        }
        const baseCategories = ['futbol', 'hockey', 'basquet', 'sociales', 'otros'];
        if (!dynamicCategory && !baseCategories.includes(normalizedCat)) {
          return res.status(400).json({
            success: false,
            error: `Categoría "${normalizedCat}" no válida o no encontrada.`
          });
        }
        updates.category = normalizedCat;
        if (!updates.badge) {
          updates.badge = dynamicCategory?.badgeLabel || `📸 ${dynamicCategory?.name || normalizedCat}`;
        }
      }

      // Validar invariante de negocio de precios si alguno de los dos se modifica
      if (updates.unitPrice !== undefined || updates.fullAlbumPrice !== undefined) {
        const currentAlbum = await albumRepository.getAlbumById(id);
        if (!currentAlbum) {
          return res.status(404).json({ success: false, error: `Álbum con ID "${id}" no encontrado` });
        }
        const prospectiveUnitPrice = updates.unitPrice !== undefined ? updates.unitPrice : currentAlbum.unitPrice;
        const prospectiveFullAlbumPrice = updates.fullAlbumPrice !== undefined ? updates.fullAlbumPrice : currentAlbum.fullAlbumPrice;

        if (prospectiveUnitPrice > prospectiveFullAlbumPrice) {
          return res.status(400).json({
            success: false,
            error: 'El precio por foto individual no puede ser mayor al precio del álbum completo'
          });
        }
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
   * POST /api/admin/albums/:id/trash
   * Mueve un álbum a la papelera (Soft delete con retención de 30 días)
   */
  router.post('/:id/trash', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const success = await albumRepository.moveToTrash(id);
      if (!success) {
        return res.status(404).json({ success: false, error: `Álbum con ID "${id}" no encontrado` });
      }
      const response: TrashActionResponse = {
        success: true,
        albumId: id,
        message: 'Álbum movido a la papelera de reciclaje (se purgará en 30 días)'
      };
      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al mover a papelera';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * POST /api/admin/albums/:id/restore
   * Restaura un álbum desde la papelera a activo
   */
  router.post('/:id/restore', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const restored = await albumRepository.restoreFromTrash(id);
      if (!restored) {
        return res.status(404).json({ success: false, error: `Álbum con ID "${id}" no encontrado en la papelera` });
      }
      const response: TrashActionResponse = {
        success: true,
        albumId: id,
        message: `Álbum "${restored.title}" restaurado exitosamente`
      };
      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al restaurar álbum';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * DELETE /api/admin/albums/:id/permanent
   * Elimina permanentemente un álbum (Hard delete irreversible)
   */
  router.delete('/:id/permanent', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const success = await albumRepository.permanentDeleteAlbum(id);
      if (!success) {
        return res.status(404).json({ success: false, error: `Álbum con ID "${id}" no encontrado` });
      }
      const response: TrashActionResponse = {
        success: true,
        albumId: id,
        message: 'Álbum eliminado permanentemente de la base de datos'
      };
      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al purgar álbum permanentemente';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * PATCH /api/admin/albums/:id/courtesy-download
   * Habilita o deshabilita la descarga gratuita de cortesía en máxima calidad
   */
  router.patch('/:id/courtesy-download', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { isFreeDownload } = req.body as { isFreeDownload: boolean };

      if (typeof isFreeDownload !== 'boolean') {
        return res.status(400).json({ success: false, error: 'El campo isFreeDownload debe ser un booleano' });
      }

      const updates: Partial<AlbumDTO> = {
        isFreeDownload,
        freeDownloadUnlockedAt: isFreeDownload ? new Date().toISOString() : null
      };

      const updated = await albumRepository.updateAlbum(id, updates);
      if (!updated) {
        return res.status(404).json({ success: false, error: `Álbum con ID "${id}" no encontrado` });
      }

      const response: UpdateAlbumResponse = {
        success: true,
        album: updated,
        message: isFreeDownload
          ? 'Descarga gratuita de cortesía activada en máxima calidad'
          : 'Descarga gratuita de cortesía desactivada'
      };
      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar descarga gratuita';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * PATCH /api/admin/albums/:id/privacy
   * Configura la privacidad del álbum y su código PIN
   */
  router.patch('/:id/privacy', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { isPrivate, accessCode } = req.body as { isPrivate: boolean; accessCode?: string | null };

      if (typeof isPrivate !== 'boolean') {
        return res.status(400).json({ success: false, error: 'El campo isPrivate debe ser un booleano' });
      }

      if (isPrivate && (!accessCode || !accessCode.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Debe ingresar un código PIN o contraseña de acceso para álbumes privados'
        });
      }

      const updates: Partial<AlbumDTO> = {
        isPrivate,
        accessCode: isPrivate ? accessCode?.trim() : null
      };

      const updated = await albumRepository.updateAlbum(id, updates);
      if (!updated) {
        return res.status(404).json({ success: false, error: `Álbum con ID "${id}" no encontrado` });
      }

      const response: UpdateAlbumResponse = {
        success: true,
        album: {
          ...updated,
          accessCode: updated.accessCode ? '********' : null
        },
        message: isPrivate
          ? 'Álbum configurado como privado con acceso protegido por código PIN'
          : 'Álbum configurado como público para todos los visitantes'
      };
      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al configurar privacidad del álbum';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * Helper para resolver Buffer de logo para marca de agua desde archivo, base64 o URL remota/álbum
   */
  async function resolveWatermarkLogoBuffer(options: {
    logoFile?: Express.Multer.File;
    logoBase64?: string | null;
    logoUrl?: string | null;
    albumId?: string;
  }): Promise<Buffer | undefined> {
    if (options.logoFile?.buffer) {
      return options.logoFile.buffer;
    }
    if (options.logoBase64) {
      try {
        const raw = options.logoBase64.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(raw, 'base64');
      } catch (err) {
        console.warn('[AdminAlbums] Error decodificando watermarkLogoBase64:', err);
      }
    }
    let targetUrl = options.logoUrl;
    // Ignorar URLs locales de navegador tipo blob: que no pueden resolverse en Node.js
    if (targetUrl && (targetUrl.startsWith('blob:') || targetUrl.trim() === '')) {
      targetUrl = undefined;
    }
    if (!targetUrl && options.albumId) {
      try {
        const album = await albumRepository.getAlbumById(options.albumId);
        targetUrl = album?.watermarkLogoUrl || undefined;
      } catch {
        // Ignorar
      }
    }
    if (targetUrl) {
      try {
        if (targetUrl.startsWith('data:image/')) {
          const raw = targetUrl.replace(/^data:image\/\w+;base64,/, '');
          return Buffer.from(raw, 'base64');
        }
        if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
          try {
            const fetchRes = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
            if (fetchRes.ok) {
              const arrayBuf = await fetchRes.arrayBuffer();
              return Buffer.from(arrayBuf);
            }
          } catch (netErr) {
            console.warn(`[AdminAlbums] Error fetch red para '${targetUrl}', probando fallback local:`, netErr);
          }
        }
        // Fallback directo desde storage si targetUrl apunta a branding
        const brandingMatch = targetUrl.match(/branding\/([^/?#]+)/);
        if (brandingMatch) {
          const photoId = brandingMatch[1].replace(/\.webp$/i, '');
          const storageBuf = await storageService.getPreviewBuffer?.('branding', photoId);
          if (storageBuf) {
            return storageBuf;
          }
        }
      } catch (fetchErr) {
        console.warn(`[AdminAlbums] No se pudo obtener logo de marca de agua desde '${targetUrl}':`, fetchErr);
      }
    }
    return undefined;
  }

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
        watermarkLogoUrl,
        watermarkLogoBase64,
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

      const watermarkLogoBuffer = await resolveWatermarkLogoBuffer({
        logoBase64: watermarkLogoBase64,
        logoUrl: watermarkLogoUrl,
        albumId
      });

      const result = await driveImporterService.importFromDrive({
        albumId,
        driveUrl,
        watermarkText,
        watermarkLogoBuffer,
        concurrencyLimit: concurrencyLimit ? Number(concurrencyLimit) : 3,
        markHdFirstN: markHdFirstN !== undefined ? Number(markHdFirstN) : 2,
        apiKey
      });

      // Persistir fotos importadas en la tabla photos y actualizar álbum con títulos comerciales limpios
      if (result.photos.length > 0) {
        try {
          const currentAlbum = await albumRepository.getAlbumById(albumId);
          const albumTitle = currentAlbum?.title || 'Álbum Fotográfico';
          let existingCount = currentAlbum?.photosCount || 0;
          try {
            const existingPhotos = await albumRepository.getPhotosByAlbumId(albumId);
            if (existingPhotos && existingPhotos.length > 0) {
              existingCount = existingPhotos.length;
            }
          } catch {}

          const photosToPersist: PhotoDTO[] = result.photos.map((p, idx) => {
            const seq = existingCount + idx + 1;
            const photoTitle = buildAlbumPhotoTitle(albumTitle, seq);
            return {
              id: p.id,
              albumId,
              filename: photoTitle,
              originalPath: p.storagePath,
              previewUrl: p.previewUrl,
              isSampleHd: p.isHD,
              width: p.width,
              height: p.height,
              sizeBytes: p.originalSize
            };
          });
          await albumRepository.addPhotosToAlbum(albumId, photosToPersist);

          if (currentAlbum) {
            const newCount = existingCount + result.photos.length;
            const updates: Partial<AlbumDTO> = { photosCount: newCount };
            if (!currentAlbum.coverUrl && result.photos[0]?.previewUrl) {
              updates.coverUrl = result.photos[0].previewUrl;
            }
            await albumRepository.updateAlbum(albumId, updates);
          }
        } catch (repoErr) {
          console.warn('[ImportDrive] Advertencia al persistir fotos en álbum:', repoErr);
        }
      }

      const response: AdminDriveImportResponse = {
        success: result.success,
        albumId: result.albumId,
        folderId: result.folderId,
        summary: result.summary,
        photos: result.photos,
        errors: result.errors,
        skippedFiles: result.skippedFiles
      };

      return res.status(result.photos.length > 0 ? 200 : 422).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error interno al importar carpeta de Google Drive';
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  });

  /**
   * Middleware seguro para capturar errores de tamaño o cantidad de Multer
   * y responder con códigos semánticos (413 Payload Too Large) y JSON estructurado
   */
  const handleMulterUpload = (req: Request, res: Response, next: NextFunction) => {
    upload.fields([
      { name: 'photos', maxCount: 100 },
      { name: 'watermarkLogo', maxCount: 1 }
    ])(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              success: false,
              error: 'Uno o más archivos superan el límite de 50 MB por fotografía (límite del plan de Supabase Storage). Por favor reduce su resolución o expórtalo en formato JPG optimizado antes de subirlo.'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              error: 'Has superado el límite de 100 fotografías por lote.'
            });
          }
          return res.status(400).json({
            success: false,
            error: `Error de subida: ${err.message}`
          });
        }
        return res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Error al recibir los archivos de imagen'
        });
      }
      next();
    });
  };

  /**
   * POST /api/admin/albums/upload-watermark-logo
   * Permite subir un logo o escudo PNG/WebP desde la PC o celular de forma remota
   */
  router.post('/upload-watermark-logo', requireAdminAuth, upload.single('logo'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No se envió ningún archivo en el campo "logo"' });
      }

      const validMimes = ['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml'];
      if (!validMimes.includes(file.mimetype) && !file.originalname.match(/\.(png|webp|jpe?g|svg)$/i)) {
        return res.status(400).json({
          success: false,
          error: 'Formato no admitido. Selecciona un archivo PNG, WebP o JPG.'
        });
      }

      const logoId = 'logo_' + uuidv4().substring(0, 8);
      const saved = await storageService.savePreview('branding', logoId, file.buffer);

      return res.status(200).json({
        success: true,
        logoUrl: saved.publicUrl,
        message: 'Logo de marca de agua subido con éxito'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el logo';
      return res.status(500).json({ success: false, error: msg });
    }
  });

  /**
   * POST /api/admin/albums/bulk-upload
   * Procesa subida directa de múltiples fotos (drag-and-drop)
   */
  router.post('/bulk-upload', requireAdminAuth, handleMulterUpload, async (req: Request, res: Response) => {
    try {
      let files: Express.Multer.File[] = [];
      let logoFile: Express.Multer.File | undefined;

      if (Array.isArray(req.files)) {
        files = req.files;
      } else if (req.files && typeof req.files === 'object') {
        const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] };
        files = filesMap['photos'] || [];
        logoFile = filesMap['watermarkLogo']?.[0];
      }

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

      const watermarkLogoBuffer = await resolveWatermarkLogoBuffer({
        logoFile,
        logoBase64: req.body.watermarkLogoBase64,
        logoUrl: req.body.watermarkLogoUrl,
        albumId
      });

      const currentAlbum = await albumRepository.getAlbumById(albumId);
      const albumTitle = currentAlbum?.title || 'Álbum Fotográfico';
      let existingCount = currentAlbum?.photosCount || 0;
      try {
        const existingPhotos = await albumRepository.getPhotosByAlbumId(albumId);
        if (existingPhotos && existingPhotos.length > 0) {
          existingCount = existingPhotos.length;
        }
      } catch {}

      const result = await bulkUploadService.processBulkUpload({
        albumId,
        albumTitle,
        existingCount,
        files: uploadItems,
        watermarkText,
        watermarkLogoBuffer,
        concurrencyLimit,
        hdPhotoIndices
      });

      // Persistir fotos procesadas en la tabla photos y actualizar álbum con títulos comerciales limpios
      if (result.photos.length > 0) {
        try {
          const photosToPersist: PhotoDTO[] = result.photos.map((p, idx) => {
            const seq = existingCount + idx + 1;
            const photoTitle = p.title || buildAlbumPhotoTitle(albumTitle, seq);
            return {
              id: p.id,
              albumId,
              filename: photoTitle,
              originalPath: p.storagePath,
              previewUrl: p.previewUrl,
              isSampleHd: p.isHD,
              width: p.width,
              height: p.height,
              sizeBytes: p.originalSize
            };
          });
          await albumRepository.addPhotosToAlbum(albumId, photosToPersist);

          if (currentAlbum) {
            const newCount = existingCount + result.photos.length;
            const updates: Partial<AlbumDTO> = { photosCount: newCount };
            if (!currentAlbum.coverUrl && result.photos[0]?.previewUrl) {
              updates.coverUrl = result.photos[0].previewUrl;
            }
            await albumRepository.updateAlbum(albumId, updates);
          }
        } catch (repoErr) {
          console.warn('[BulkUpload] Advertencia al actualizar contador y persistir fotos en álbum:', repoErr);
        }
      }

      const response: AdminBulkUploadResponse = {
        success: result.success,
        albumId: result.albumId,
        summary: result.summary,
        photos: result.photos,
        errors: result.errors
      };

      return res.status(result.photos.length > 0 ? 200 : 422).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error interno durante la subida masiva de fotos';
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  });

  /**
   * GET /api/admin/albums/:id/photos
   * Lista todas las fotos del álbum para la vista administrativa
   */
  router.get('/:id/photos', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const rawId = req.params.id;
      const albumId = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!albumId || typeof albumId !== 'string' || !albumId.trim()) {
        return res.status(400).json({
          success: false,
          error: 'ID de álbum no proporcionado o inválido'
        });
      }

      const cleanAlbumId = albumId.trim();

      // Blindaje defensivo: si albumRepository.getAlbumById(cleanAlbumId) es null pero el ID existe o es válido,
      // en lugar de responder 404 Not Found, inicializa o busca las fotos del álbum.
      let photos: PhotoDTO[] = [];
      try {
        photos = typeof (albumRepository as any).getPhotosByAlbum === 'function'
          ? await (albumRepository as any).getPhotosByAlbum(cleanAlbumId)
          : await albumRepository.getPhotosByAlbumId(cleanAlbumId);
      } catch (photoErr: unknown) {
        console.warn(`[AdminAlbumsRoutes] Advertencia recuperando fotos para álbum "${cleanAlbumId}":`, photoErr);
        photos = [];
      }

      // Normalización defensiva de previewUrl absoluta
      const backendUrl = (process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
      const normalizedPhotos = (photos || []).map(p => ({
        ...p,
        previewUrl: p.previewUrl && p.previewUrl.startsWith('/')
          ? `${backendUrl}${p.previewUrl}`
          : p.previewUrl
      }));

      return res.status(200).json({
        success: true,
        albumId: cleanAlbumId,
        total: normalizedPhotos.length,
        photos: normalizedPhotos
      });
    } catch (error: unknown) {
      console.warn('[AdminAlbumsRoutes] Error no controlado en GET /:id/photos:', error);
      const message = error instanceof Error ? error.message : 'Error al obtener fotos del álbum';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * PATCH /api/admin/albums/:id/photos/:photoId
   * Permite alternar isSampleHD en una foto o establecerla como nueva coverUrl del álbum
   */
  router.patch('/:id/photos/:photoId', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const rawId = req.params.id;
      const albumId = Array.isArray(rawId) ? rawId[0] : rawId;
      const rawPhotoId = req.params.photoId;
      const photoId = Array.isArray(rawPhotoId) ? rawPhotoId[0] : rawPhotoId;

      const album = await albumRepository.getAlbumById(albumId);
      if (!album) {
        return res.status(404).json({
          success: false,
          error: 'Álbum no encontrado'
        });
      }

      const photos = await albumRepository.getPhotosByAlbumId(albumId);
      const photo = photos.find(p => p.id === photoId);
      if (!photo) {
        return res.status(404).json({
          success: false,
          error: 'Foto no encontrada en el álbum'
        });
      }

      let updatedCoverUrl = album.coverUrl;
      const setAsCover = req.body.setAsCover === true || req.body.isCover === true;
      if (setAsCover) {
        const updatedAlbum = await albumRepository.updateAlbum(albumId, { coverUrl: photo.previewUrl });
        if (updatedAlbum) {
          updatedCoverUrl = updatedAlbum.coverUrl;
        }
      }

      let updatedPhoto = photo;
      const sampleHdRaw = req.body.isSampleHD !== undefined ? req.body.isSampleHD : req.body.isSampleHd;
      if (typeof sampleHdRaw === 'boolean') {
        const resPhoto = await albumRepository.updatePhoto(albumId, photoId, { isSampleHd: sampleHdRaw });
        if (resPhoto) {
          updatedPhoto = resPhoto;
        }
      }

      return res.status(200).json({
        success: true,
        photo: {
          ...updatedPhoto,
          previewUrl: normalizePreviewUrl(updatedPhoto.previewUrl)
        },
        coverUrl: normalizePreviewUrl(updatedCoverUrl),
        message: 'Foto y portada actualizadas correctamente'
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar foto';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * DELETE /api/admin/albums/:id/photos/:photoId
   * Elimina la foto de la tabla photos y del almacenamiento, y decrementa photosCount
   */
  router.delete('/:id/photos/:photoId', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const rawId = req.params.id;
      const albumId = Array.isArray(rawId) ? rawId[0] : rawId;
      const rawPhotoId = req.params.photoId;
      const photoId = Array.isArray(rawPhotoId) ? rawPhotoId[0] : rawPhotoId;

      const album = await albumRepository.getAlbumById(albumId);
      if (!album) {
        return res.status(404).json({
          success: false,
          error: 'Álbum no encontrado'
        });
      }

      const photo = await albumRepository.getPhotoById(albumId, photoId);
      if (!photo) {
        return res.status(404).json({
          success: false,
          error: 'Foto no encontrada en el álbum'
        });
      }

      // Eliminar de Storage
      if (storageService.deletePhotoFiles) {
        const extMatch = photo.filename.match(/\.[a-zA-Z0-9]+$/);
        const ext = extMatch ? extMatch[0] : '.jpg';
        await storageService.deletePhotoFiles(albumId, photoId, ext);
      }

      // Eliminar de base de datos / repositorio (albumRepository.deletePhoto actualiza el conteo automáticamente)
      await albumRepository.deletePhoto(albumId, photoId);

      // Si la foto eliminada era la coverUrl, actualizar a otra o vaciar
      if (album.coverUrl === photo.previewUrl) {
        const remaining = await albumRepository.getPhotosByAlbumId(albumId);
        const newCover = remaining[0]?.previewUrl || '';
        await albumRepository.updateAlbum(albumId, { coverUrl: newCover });
      }

      return res.status(200).json({
        success: true,
        photoId,
        message: 'Foto eliminada exitosamente del álbum'
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar foto del álbum';
      return res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * PUT /api/admin/albums/:id/photos/reorder
   * Reordena las fotos del álbum según el array ordenado de IDs de fotos
   */
  router.put('/:id/photos/reorder', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const rawId = req.params.id;
      const rawAlbumId = Array.isArray(rawId) ? rawId[0] : rawId;
      const albumId = typeof rawAlbumId === 'string' ? rawAlbumId.trim() : '';
      const { photoIds } = req.body as { photoIds: string[] };

      if (!albumId) {
        return res.status(400).json({
          success: false,
          error: 'ID de álbum no proporcionado o inválido'
        });
      }

      if (!Array.isArray(photoIds)) {
        return res.status(400).json({
          success: false,
          error: 'El campo photoIds debe ser un array de identificadores de fotos'
        });
      }

      const album = await albumRepository.getAlbumById(albumId);
      if (!album) {
        const existingPhotos = await albumRepository.getPhotosByAlbumId(albumId);
        if (existingPhotos.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Álbum no encontrado'
          });
        }
      }

      await albumRepository.reorderPhotos(albumId, photoIds);

      return res.status(200).json({
        success: true,
        albumId,
        message: 'Orden de fotos actualizado correctamente'
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al reordenar fotos';
      return res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}
