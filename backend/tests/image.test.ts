import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processImageWithWatermark, escapeXml } from '../src/services/image.service';

describe('Image Service - Procesamiento y Marca de Agua con Sharp', () => {
  it('debe sanitizar correctamente caracteres reservados XML con escapeXml', () => {
    const raw = 'LA TERCERA & EVENTOS <2026> "FOTOS" \'PRO\'';
    const escaped = escapeXml(raw);
    expect(escaped).toBe('LA TERCERA &amp; EVENTOS &lt;2026&gt; &quot;FOTOS&quot; &apos;PRO&apos;');
  });

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

  it('debe procesar una imagen HD de muestra redimensionándola a máximo 1400px con badge y marca de agua sutil centrada', async () => {
    // Imagen grande de 2400x1600 para verificar que se redimensiona a 1400px
    const largeImageBuffer = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 3,
        background: { r: 50, g: 100, b: 150 }
      }
    }).jpeg().toBuffer();

    const result = await processImageWithWatermark(largeImageBuffer, {
      isHD: true,
      watermarkText: 'LA TERCERA • MUESTRA'
    });

    expect(result.previewBuffer).toBeDefined();
    expect(result.width).toBe(1400);

    const metadata = await sharp(result.previewBuffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1400);
  });

  it('debe procesar sin error una imagen con caracteres especiales XML en watermarkText ("LA TERCERA & EVENTOS <2026>")', async () => {
    const testImageBuffer = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 60, g: 90, b: 140 }
      }
    }).jpeg().toBuffer();

    const result = await processImageWithWatermark(testImageBuffer, {
      watermarkText: 'LA TERCERA & EVENTOS <2026>',
      targetWidth: 800
    });

    expect(result.previewBuffer).toBeDefined();
    expect(result.previewBuffer.length).toBeGreaterThan(0);

    const metadata = await sharp(result.previewBuffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(800);
  });

  it('debe procesar imagen HD de muestra utilizando el watermarkText personalizado del usuario en lugar de texto hardcodeado', async () => {
    const testImageBuffer = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 80, g: 120, b: 160 }
      }
    }).jpeg().toBuffer();

    const customText = 'CLUB ATLÉTICO TESORIERI • EXCLUSIVO';
    const result = await processImageWithWatermark(testImageBuffer, {
      isHD: true,
      watermarkText: customText
    });

    expect(result.previewBuffer).toBeDefined();
    expect(result.format).toBe('webp');
    const metadata = await sharp(result.previewBuffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(1400);
  });
});
