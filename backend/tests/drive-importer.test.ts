import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import {
  GoogleDriveImporterService,
  IDriveHttpClient,
  DriveFileMetadata
} from '../src/services/drive-importer.service';
import { MemoryStorageService } from '../src/services/storage.service';

describe('Google Drive Importer Service (TDD con Mocks HTTP)', () => {
  /**
   * Helper para generar imágenes sintéticas válidas con Sharp
   */
  async function createTestImageBuffer(
    width: number,
    height: number,
    format: 'jpeg' | 'png' | 'webp' = 'jpeg'
  ): Promise<Buffer> {
    const s = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 50, g: 120, b: 200 }
      }
    });

    if (format === 'png') return s.png().toBuffer();
    if (format === 'webp') return s.webp().toBuffer();
    return s.jpeg().toBuffer();
  }

  it('debe importar una carpeta de Google Drive simulada, filtrar archivos no soportados y generar previews WebP 800px', async () => {
    const jpegBuffer = await createTestImageBuffer(1600, 1200, 'jpeg');
    const pngBuffer = await createTestImageBuffer(1400, 900, 'png');
    const webpBuffer = await createTestImageBuffer(1200, 800, 'webp');

    // Mock HTTP Client que simula llamadas a la API de Google Drive
    const mockFiles: DriveFileMetadata[] = [
      { id: 'drive_file_1', name: 'partido_01.jpg', mimeType: 'image/jpeg', size: jpegBuffer.length },
      { id: 'drive_file_2', name: 'festejo_gol.png', mimeType: 'image/png', size: pngBuffer.length },
      { id: 'drive_file_3', name: 'hinchada.webp', mimeType: 'image/webp', size: webpBuffer.length },
      // Archivos no imagen que deben ser omitidos automáticamente
      { id: 'drive_file_4', name: 'planilla_partido.pdf', mimeType: 'application/pdf', size: 1024 },
      { id: 'drive_file_5', name: 'video_resumen.mp4', mimeType: 'video/mp4', size: 10485760 }
    ];

    const mockHttpClient: IDriveHttpClient = {
      listFiles: vi.fn().mockResolvedValue(mockFiles),
      downloadFile: vi.fn().mockImplementation(async (fileId: string) => {
        if (fileId === 'drive_file_1') return jpegBuffer;
        if (fileId === 'drive_file_2') return pngBuffer;
        if (fileId === 'drive_file_3') return webpBuffer;
        throw new Error(`File ID ${fileId} no encontrado en mock`);
      })
    };

    const prevKey = process.env.GOOGLE_DRIVE_API_KEY;
    delete process.env.GOOGLE_DRIVE_API_KEY;
    const memoryStorage = new MemoryStorageService();
    let result;
    try {
      const importer = new GoogleDriveImporterService(mockHttpClient, memoryStorage);

      result = await importer.importFromDrive({
        albumId: 'album_futbol_tesorieri',
        driveUrl: 'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        watermarkText: 'LA TERCERA • MUESTRA',
        concurrencyLimit: 2,
        markHdFirstN: 1 // La primera foto como HD Master, las otras protegidas normales
      });
    } finally {
      if (prevKey !== undefined) process.env.GOOGLE_DRIVE_API_KEY = prevKey;
    }

    // 1. Verificar listado y llamada HTTP
    expect(mockHttpClient.listFiles).toHaveBeenCalledWith(
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      undefined
    );

    // 2. Verificar filtrado de tipos MIME
    expect(result.summary.totalFound).toBe(5);
    expect(result.summary.totalEligible).toBe(3);
    expect(result.summary.totalSkipped).toBe(2);
    expect(result.skippedFiles.length).toBe(2);
    expect(result.skippedFiles[0].name).toBe('planilla_partido.pdf');
    expect(result.skippedFiles[1].name).toBe('video_resumen.mp4');

    // 3. Verificar procesamiento exitoso
    expect(result.summary.successful).toBe(3);
    expect(result.summary.failed).toBe(0);
    expect(result.photos.length).toBe(3);

    // 4. Verificar foto HD Master vs fotos protegidas estándar
    const hdPhoto = result.photos[0];
    expect(hdPhoto.isHD).toBe(true);
    expect(hdPhoto.originalName).toBe('partido_01.jpg');

    const regularPhoto = result.photos[1];
    expect(regularPhoto.isHD).toBe(false);
    expect(regularPhoto.originalName).toBe('festejo_gol.png');

    // 5. Verificar que el preview es WebP con ancho <= 800px
    expect(regularPhoto.format).toBe('webp');
    expect(regularPhoto.width).toBeLessThanOrEqual(800);

    // 6. Verificar persistencia en almacenamiento
    expect(memoryStorage.originals.size).toBe(3);
    expect(memoryStorage.previews.size).toBe(3);

    // 7. Verificar que se registraron métricas de bytes
    expect(result.summary.totalPreviewBytes).toBeGreaterThan(0);
    expect(result.summary.totalOriginalBytes).toBeGreaterThan(0);
  });

  it('debe ser resiliente ante fallo en la descarga de una imagen específica sin interrumpir las demás', async () => {
    const goodBuffer = await createTestImageBuffer(1200, 800, 'jpeg');

    const mockFiles: DriveFileMetadata[] = [
      { id: 'ok_1', name: 'foto_1.jpg', mimeType: 'image/jpeg' },
      { id: 'corrupt_2', name: 'foto_corrupta.jpg', mimeType: 'image/jpeg' },
      { id: 'ok_3', name: 'foto_3.jpg', mimeType: 'image/jpeg' }
    ];

    const mockHttpClient: IDriveHttpClient = {
      listFiles: vi.fn().mockResolvedValue(mockFiles),
      downloadFile: vi.fn().mockImplementation(async (fileId: string) => {
        if (fileId === 'ok_1' || fileId === 'ok_3') return goodBuffer;
        if (fileId === 'corrupt_2') {
          // Devuelve un archivo corrupto que no es imagen
          return Buffer.from('archivo binario corrupto o dañado');
        }
        throw new Error('No encontrado');
      })
    };

    const memoryStorage = new MemoryStorageService();
    const importer = new GoogleDriveImporterService(mockHttpClient, memoryStorage);

    const result = await importer.importFromDrive({
      albumId: 'album_prueba_fallo',
      driveUrl: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      concurrencyLimit: 2
    });

    expect(result.summary.totalFound).toBe(3);
    expect(result.summary.successful).toBe(2);
    expect(result.summary.failed).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].fileName).toBe('foto_corrupta.jpg');
    expect(result.errors[0].error).toContain('dañado o no contiene una cabecera de imagen válida');

    expect(result.photos.length).toBe(2);
  });

  it('debe respetar el límite de concurrencia al descargar y procesar lotes grandes de fotos', async () => {
    const testBuffer = await createTestImageBuffer(1000, 700, 'jpeg');
    const totalPhotos = 15;

    const mockFiles: DriveFileMetadata[] = Array.from({ length: totalPhotos }, (_, i) => ({
      id: `file_${i}`,
      name: `jugada_${i}.jpg`,
      mimeType: 'image/jpeg'
    }));

    let activeDownloads = 0;
    let maxSimultaneous = 0;

    const mockHttpClient: IDriveHttpClient = {
      listFiles: vi.fn().mockResolvedValue(mockFiles),
      downloadFile: vi.fn().mockImplementation(async () => {
        activeDownloads++;
        if (activeDownloads > maxSimultaneous) {
          maxSimultaneous = activeDownloads;
        }
        await new Promise((r) => setTimeout(r, 15));
        activeDownloads--;
        return testBuffer;
      })
    };

    const memoryStorage = new MemoryStorageService();
    const importer = new GoogleDriveImporterService(mockHttpClient, memoryStorage);

    const result = await importer.importFromDrive({
      albumId: 'album_concurrencia',
      driveUrl: 'https://drive.google.com/drive/u/0/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      concurrencyLimit: 3
    });

    expect(result.summary.successful).toBe(15);
    expect(result.summary.peakConcurrency).toBeLessThanOrEqual(3);
    expect(maxSimultaneous).toBeLessThanOrEqual(3);
  });
});
