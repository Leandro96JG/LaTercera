import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processImageWithWatermark } from '../src/services/image.service';

describe('Image Service - Procesamiento y Marca de Agua con Sharp', () => {
  it('debe procesar una imagen y generar versión WebP comprimida con marca de agua', async () => {
    // Crear un buffer de imagen de prueba 1200x800 con Sharp
    const testImageBuffer = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 30, g: 70, b: 120 }
      }
    }).jpeg().toBuffer();

    const result = await processImageWithWatermark(testImageBuffer, {
      watermarkText: 'LA TERCERA • MUESTRA',
      targetWidth: 800
    });

    expect(result.previewBuffer).toBeDefined();
    expect(result.previewBuffer.length).toBeGreaterThan(0);

    // Inspeccionar metadatos de la imagen resultante
    const metadata = await sharp(result.previewBuffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(800);
  });
});
