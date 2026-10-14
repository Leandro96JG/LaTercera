import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { extractGoogleDriveFolderId } from './drive-parser.service';
import { isAllowedImageMimeType, isAllowedImageExtension, sanitizeFilename, validateImageBufferHeader } from './mime-validator.service';
import { runConcurrentBatch, BatchProgress } from './concurrency.service';
import { processImageWithWatermark } from './image.service';
import { IStorageService, LocalDiskStorageService } from './storage.service';

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: string | number;
}

export interface IDriveHttpClient {
  listFiles(folderId: string, apiKey?: string): Promise<DriveFileMetadata[]>;
  downloadFile(fileId: string, apiKey?: string): Promise<Buffer>;
}

/**
 * Cliente HTTP por defecto utilizando fetch nativo y Google Drive API v3
 */
export class DefaultDriveHttpClient implements IDriveHttpClient {
  async listFiles(folderId: string, apiKey?: string): Promise<DriveFileMetadata[]> {
    if (!apiKey) {
      throw new Error(
        'Se requiere GOOGLE_DRIVE_API_KEY para consultar la API de Google Drive v3'
      );
    }

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id, name, mimeType, size)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=1000&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as { files?: DriveFileMetadata[] };
    return data.files || [];
  }

  async downloadFile(fileId: string, apiKey?: string): Promise<Buffer> {
    const url = apiKey
      ? `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`
      : `https://drive.google.com/uc?export=download&id=${fileId}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error descargando archivo ${fileId} de Google Drive (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

export interface ImportDriveOptions {
  albumId: string;
  driveUrl: string;
  watermarkText?: string;
  concurrencyLimit?: number;
  markHdFirstN?: number;
  apiKey?: string;
  onProgress?: (progress: BatchProgress) => void;
}

export interface ProcessedPhotoItem {
  id: string;
  driveFileId?: string;
  originalName: string;
  storagePath: string;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
  previewSize: number;
  format: string;
  isHD: boolean;
}

export interface SkippedFileItem {
  id: string;
  name: string;
  mimeType: string;
  reason: string;
}

export interface ImportDriveResult {
  success: boolean;
  albumId: string;
  folderId: string;
  summary: {
    totalFound: number;
    totalEligible: number;
    totalSkipped: number;
    successful: number;
    failed: number;
    totalOriginalBytes: number;
    totalPreviewBytes: number;
    durationMs: number;
    peakConcurrency: number;
  };
  photos: ProcessedPhotoItem[];
  errors: Array<{ fileId: string; fileName: string; error: string }>;
  skippedFiles: SkippedFileItem[];
}

/**
 * Servicio Orquestador de Importación desde Google Drive y Procesamiento Masivo
 */
export class GoogleDriveImporterService {
  private httpClient: IDriveHttpClient;
  private storageService: IStorageService;
  private defaultApiKey?: string;

  constructor(
    httpClient?: IDriveHttpClient,
    storageService?: IStorageService,
    defaultApiKey?: string
  ) {
    this.httpClient = httpClient || new DefaultDriveHttpClient();
    this.storageService = storageService || new LocalDiskStorageService();
    this.defaultApiKey = defaultApiKey || process.env.GOOGLE_DRIVE_API_KEY;
  }

  async importFromDrive(options: ImportDriveOptions): Promise<ImportDriveResult> {
    const {
      albumId,
      driveUrl,
      watermarkText = 'LA TERCERA • MUESTRA',
      concurrencyLimit = 3,
      markHdFirstN = 2,
      apiKey = this.defaultApiKey
    } = options;

    if (!albumId) {
      throw new Error('El albumId es obligatorio');
    }

    // 1. Parseo y extracción del Folder ID
    const folderId = extractGoogleDriveFolderId(driveUrl);

    // 2. Consulta y listado de archivos en la carpeta de Drive
    const allFiles = await this.httpClient.listFiles(folderId, apiKey);

    // 3. Filtrar archivos por tipo MIME y extensión permitidos
    const eligibleFiles: DriveFileMetadata[] = [];
    const skippedFiles: SkippedFileItem[] = [];

    for (const file of allFiles) {
      const hasAllowedMime = isAllowedImageMimeType(file.mimeType);
      const hasAllowedExt = isAllowedImageExtension(file.name);

      if (hasAllowedMime || hasAllowedExt) {
        eligibleFiles.push(file);
      } else {
        skippedFiles.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          reason: `Tipo MIME '${file.mimeType}' o extensión no soportada (solo JPG, PNG, WebP)`
        });
      }
    }

    const errors: Array<{ fileId: string; fileName: string; error: string }> = [];
    const photos: ProcessedPhotoItem[] = [];
    let totalOriginalBytes = 0;
    let totalPreviewBytes = 0;

    // 4. Procesamiento concurrente controlado (anti-OOM en lotes 50+)
    const batchResult = await runConcurrentBatch<DriveFileMetadata, ProcessedPhotoItem>(
      eligibleFiles,
      async (file, index) => {
        // a. Descargar buffer de imagen
        const rawBuffer = await this.httpClient.downloadFile(file.id, apiKey);

        // b. Validar integridad de imagen mediante magic bytes
        const headerCheck = validateImageBufferHeader(rawBuffer);
        if (!headerCheck.valid) {
          throw new Error(
            `El archivo '${file.name}' está dañado o no contiene una cabecera de imagen válida (JPEG, PNG, WebP)`
          );
        }

        const photoId = uuidv4();
        const safeName = sanitizeFilename(file.name);
        const ext = path.extname(safeName) || (headerCheck.detectedMime === 'image/png' ? '.png' : '.jpg');

        // c. Determinar si es foto HD de muestra (primeras N fotos del álbum)
        const isHD = index < markHdFirstN;

        // d. Procesar con Sharp (redimensionar a 800px, WebP, marca de agua diagonal de píxeles)
        const processed = await processImageWithWatermark(rawBuffer, {
          watermarkText,
          targetWidth: 800,
          quality: isHD ? 85 : 70,
          isHD
        });

        // e. Guardar archivo original en capa privada protegida
        const originalSaved = await this.storageService.saveOriginal(
          albumId,
          photoId,
          ext,
          rawBuffer
        );

        // f. Guardar preview WebP en capa pública protegida con marca de agua
        const previewSaved = await this.storageService.savePreview(
          albumId,
          photoId,
          processed.previewBuffer
        );

        return {
          id: photoId,
          driveFileId: file.id,
          originalName: file.name,
          storagePath: originalSaved.relativePath,
          previewUrl: previewSaved.publicUrl || this.storageService.getPreviewUrl(albumId, photoId),
          width: processed.width,
          height: processed.height,
          originalSize: rawBuffer.length,
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

    // 5. Consolidar resultados y métricas
    for (const item of batchResult.results) {
      if (item.success && item.data) {
        photos.push(item.data);
        totalOriginalBytes += item.data.originalSize;
        totalPreviewBytes += item.data.previewSize;
      } else {
        const file = eligibleFiles[item.index];
        errors.push({
          fileId: file ? file.id : 'unknown',
          fileName: file ? file.name : `item_${item.index}`,
          error: item.error || 'Error desconocido durante el procesamiento'
        });
      }
    }

    return {
      success: errors.length === 0 || photos.length > 0,
      albumId,
      folderId,
      summary: {
        totalFound: allFiles.length,
        totalEligible: eligibleFiles.length,
        totalSkipped: skippedFiles.length,
        successful: photos.length,
        failed: errors.length,
        totalOriginalBytes,
        totalPreviewBytes,
        durationMs: batchResult.durationMs,
        peakConcurrency: batchResult.peakConcurrency
      },
      photos,
      errors,
      skippedFiles
    };
  }
}
