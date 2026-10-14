import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  isAllowedImageMimeType,
  isAllowedImageExtension,
  sanitizeFilename,
  validateImageBufferHeader
} from './mime-validator.service';
import { runConcurrentBatch, BatchProgress } from './concurrency.service';
import { processImageWithWatermark } from './image.service';
import { IStorageService, createStorageService } from './storage.service';

export interface UploadedFileItem {
  originalname: string;
  buffer: Buffer;
  mimetype?: string;
  size?: number;
}

export interface BulkUploadOptions {
  albumId: string;
  files: UploadedFileItem[];
  watermarkText?: string;
  concurrencyLimit?: number;
  hdPhotoIndices?: number[];
  onProgress?: (progress: BatchProgress) => void;
}

export interface ProcessedUploadPhotoItem {
  id: string;
  originalName: string;
  storagePath: string;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
  previewSize: number;
  format: 'webp';
  isHD: boolean;
}

export interface BulkUploadResult {
  success: boolean;
  albumId: string;
  summary: {
    totalReceived: number;
    successful: number;
    failed: number;
    totalOriginalBytes: number;
    totalPreviewBytes: number;
    durationMs: number;
    peakConcurrency: number;
  };
  photos: ProcessedUploadPhotoItem[];
  errors: Array<{ fileName: string; error: string }>;
}

export class BulkUploadService {
  private storageService: IStorageService;

  constructor(storageService?: IStorageService) {
    this.storageService = storageService || createStorageService();
  }

  async processBulkUpload(options: BulkUploadOptions): Promise<BulkUploadResult> {
    const {
      albumId,
      files,
      watermarkText = 'LA TERCERA • MUESTRA',
      concurrencyLimit = 3,
      hdPhotoIndices = [0, 1] // Por defecto las 2 primeras son HD Master
    } = options;

    if (!albumId) {
      throw new Error('El albumId es obligatorio');
    }

    if (!files || files.length === 0) {
      throw new Error('No se enviaron archivos para procesar');
    }

    const errors: Array<{ fileName: string; error: string }> = [];
    const photos: ProcessedUploadPhotoItem[] = [];
    let totalOriginalBytes = 0;
    let totalPreviewBytes = 0;

    const batchResult = await runConcurrentBatch<UploadedFileItem, ProcessedUploadPhotoItem>(
      files,
      async (file, index) => {
        // Validar extensión y MIME type
        const hasValidExt = isAllowedImageExtension(file.originalname);
        const hasValidMime = isAllowedImageMimeType(file.mimetype);

        if (!hasValidExt && !hasValidMime) {
          throw new Error(
            `Formato no soportado para '${file.originalname}'. Solo se admiten archivos JPG, PNG y WebP.`
          );
        }

        // Validar integridad de imagen mediante magic bytes
        const headerCheck = validateImageBufferHeader(file.buffer);
        if (!headerCheck.valid) {
          throw new Error(
            `El archivo '${file.originalname}' no contiene una cabecera de imagen válida (JPEG, PNG, WebP)`
          );
        }

        const photoId = uuidv4();
        const safeName = sanitizeFilename(file.originalname);
        const ext =
          path.extname(safeName) ||
          (headerCheck.detectedMime === 'image/png' ? '.png' : '.jpg');

        const isHD = hdPhotoIndices.includes(index);

        // Procesar preview WebP 800px con marca de agua
        const processed = await processImageWithWatermark(file.buffer, {
          watermarkText,
          targetWidth: 800,
          quality: isHD ? 85 : 70,
          isHD
        });

        // Guardar original en capa privada
        const originalSaved = await this.storageService.saveOriginal(
          albumId,
          photoId,
          ext,
          file.buffer
        );

        // Guardar preview en capa pública
        const previewSaved = await this.storageService.savePreview(
          albumId,
          photoId,
          processed.previewBuffer
        );

        return {
          id: photoId,
          originalName: file.originalname,
          storagePath: originalSaved.relativePath,
          previewUrl: previewSaved.publicUrl || this.storageService.getPreviewUrl(albumId, photoId),
          width: processed.width,
          height: processed.height,
          originalSize: file.buffer.length,
          previewSize: processed.previewBuffer.length,
          format: processed.format,
          isHD
        };
      },
      {
        concurrencyLimit,
        onProgress: options.onProgress
      }
    );

    for (const item of batchResult.results) {
      if (item.success && item.data) {
        photos.push(item.data);
        totalOriginalBytes += item.data.originalSize;
        totalPreviewBytes += item.data.previewSize;
      } else {
        const file = files[item.index];
        errors.push({
          fileName: file ? file.originalname : `archivo_${item.index}`,
          error: item.error || 'Error desconocido'
        });
      }
    }

    return {
      success: errors.length === 0 || photos.length > 0,
      albumId,
      summary: {
        totalReceived: files.length,
        successful: photos.length,
        failed: errors.length,
        totalOriginalBytes,
        totalPreviewBytes,
        durationMs: batchResult.durationMs,
        peakConcurrency: batchResult.peakConcurrency
      },
      photos,
      errors
    };
  }
}
