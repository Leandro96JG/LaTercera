import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { BulkUploadService } from '../src/services/bulk-upload.service';
import { MemoryStorageService } from '../src/services/storage.service';

describe('Bulk Upload Service (Subida Masiva y Procesamiento Sharp)', () => {
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
        background: { r: 40, g: 140, b: 80 }
      }
    });

    if (format === 'png') return s.png().toBuffer();
    if (format === 'webp') return s.webp().toBuffer();
    return s.jpeg().toBuffer();
  }

  it('debe procesar un lote de fotos subidas, aplicar marca de agua y asignar badges HD', async () => {
    const img1 = await createTestImageBuffer(1600, 1000, 'jpeg');
    const img2 = await createTestImageBuffer(1400, 900, 'png');
    const img3 = await createTestImageBuffer(1200, 800, 'webp');

    const memoryStorage = new MemoryStorageService();
    const service = new BulkUploadService(memoryStorage);

    const result = await service.processBulkUpload({
      albumId: 'album_hockey_semifinal',
      files: [
        { originalname: 'foto_01.jpg', buffer: img1, mimetype: 'image/jpeg' },
        { originalname: 'foto_02.png', buffer: img2, mimetype: 'image/png' },
        { originalname: 'foto_03.webp', buffer: img3, mimetype: 'image/webp' }
      ],
      watermarkText: 'LA TERCERA • MUESTRA',
      concurrencyLimit: 2,
      hdPhotoIndices: [0] // Solo la primera es HD Master
    });

    expect(result.success).toBe(true);
    expect(result.summary.totalReceived).toBe(3);
    expect(result.summary.successful).toBe(3);
    expect(result.summary.failed).toBe(0);
    expect(result.photos.length).toBe(3);

    // Primera es HD
    expect(result.photos[0].isHD).toBe(true);
    expect(result.photos[0].originalName).toBe('foto_01.jpg');

    // Segunda es protegida normal
    expect(result.photos[1].isHD).toBe(false);
    expect(result.photos[1].originalName).toBe('foto_02.png');
    expect(result.photos[1].width).toBeLessThanOrEqual(800);
    expect(result.photos[1].format).toBe('webp');

    // Verificación en Storage
    expect(memoryStorage.originals.size).toBe(3);
    expect(memoryStorage.previews.size).toBe(3);
  });

  it('debe capturar errores de archivos corruptos o extensiones no válidas dentro del lote', async () => {
    const validImg = await createTestImageBuffer(1000, 700, 'jpeg');

    const memoryStorage = new MemoryStorageService();
    const service = new BulkUploadService(memoryStorage);

    const result = await service.processBulkUpload({
      albumId: 'album_con_errores',
      files: [
        { originalname: 'valida.jpg', buffer: validImg, mimetype: 'image/jpeg' },
        {
          originalname: 'invalida.txt',
          buffer: Buffer.from('archivo de texto plano no permitido'),
          mimetype: 'text/plain'
        }
      ]
    });

    expect(result.summary.totalReceived).toBe(2);
    expect(result.summary.successful).toBe(1);
    expect(result.summary.failed).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].fileName).toBe('invalida.txt');
    expect(result.errors[0].error).toContain('Formato no soportado');
  });

  it('debe rechazar llamadas sin álbum o sin archivos', async () => {
    const service = new BulkUploadService();

    await expect(
      service.processBulkUpload({ albumId: '', files: [] })
    ).rejects.toThrow('El albumId es obligatorio');

    await expect(
      service.processBulkUpload({ albumId: 'alb_1', files: [] })
    ).rejects.toThrow('No se enviaron archivos para procesar');
  });
});
