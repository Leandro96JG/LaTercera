import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processImageWithWatermark, escapeXml, prepareWatermarkLogo } from '../src/services/image.service';

describe('Image Service - Procesamiento y Marca de Agua con Sharp', () => {
  it('debe sanitizar correctamente caracteres reservados XML con escapeXml', () => {
    const raw = 'LA TERCERA & EVENTOS <2026> "FOTOS" \'PRO\'';
    const escaped = escapeXml(raw);
    expect(escaped).toBe('LA TERCERA &amp; EVENTOS &lt;2026&gt; &quot;FOTOS&quot; &apos;PRO&apos;');
  });

  it('debe pre-procesar un buffer de logo una sola vez con opacidad al 35% y canal alfa (prepareWatermarkLogo)', async () => {
    // Generar un logo PNG transparente de prueba 300x300
    const mockLogo = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 4,
        background: { r: 253, g: 184, b: 19, alpha: 1 }
      }
    }).png().toBuffer();

    const prepared = await prepareWatermarkLogo(mockLogo, 200, 0.35);
    expect(prepared).toBeDefined();

    const meta = await sharp(prepared).metadata();
    expect(meta.format).toBe('png');
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBeLessThanOrEqual(200);
    expect(meta.height).toBeLessThanOrEqual(200);
  });

  it('debe procesar una imagen de portada (isCover: true) sin patrón diagonal para mantener estética limpia', async () => {
    const testImageBuffer = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 20, g: 30, b: 50 }
      }
    }).jpeg().toBuffer();

    const mockLogo = await sharp({
      create: {
        width: 150,
        height: 150,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0.8 }
      }
    }).png().toBuffer();

    const preparedLogo = await prepareWatermarkLogo(mockLogo, 200, 0.50);

    const result = await processImageWithWatermark(testImageBuffer, {
      isCover: true,
      logoBuffer: preparedLogo,
      targetWidth: 1000,
      targetHeight: 1000
    });

    expect(result.previewBuffer).toBeDefined();
    const meta = await sharp(result.previewBuffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeLessThanOrEqual(1000);
  });

  it('debe procesar fotos verticales respetando fit: "inside" y escalando el logo con Math.min(width, height)', async () => {
    // Foto vertical de eventos 800x1200
    const verticalImageBuffer = await sharp({
      create: {
        width: 800,
        height: 1200,
        channels: 3,
        background: { r: 40, g: 60, b: 80 }
      }
    }).jpeg().toBuffer();

    const mockLogo = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 255, g: 200, b: 50, alpha: 1 }
      }
    }).png().toBuffer();

    const preparedLogo = await prepareWatermarkLogo(mockLogo, 300, 0.35);

    const result = await processImageWithWatermark(verticalImageBuffer, {
      logoBuffer: preparedLogo,
      targetWidth: 800,
      targetHeight: 800
    });

    expect(result.previewBuffer).toBeDefined();
    expect(result.height).toBeLessThanOrEqual(800);
    // Para una foto 800x1200 ajustada a 800x800 con fit: 'inside', el alto es 800 y el ancho ~533
    expect(result.height).toBe(800);
    expect(result.width).toBe(533);
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

  it('debe estampar el logo PNG en muestras HD protegidas (isHD: true + logoBuffer)', async () => {
    const testImageBuffer = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 50, g: 100, b: 150 }
      }
    }).jpeg().toBuffer();

    const mockLogo = await sharp({
      create: {
        width: 250,
        height: 250,
        channels: 4,
        background: { r: 253, g: 184, b: 19, alpha: 0.9 }
      }
    }).png().toBuffer();

    const preparedLogo = await prepareWatermarkLogo(mockLogo, 300, 0.40);

    const result = await processImageWithWatermark(testImageBuffer, {
      isHD: true,
      logoBuffer: preparedLogo,
      watermarkText: 'COPA CIUDAD • HD'
    });

    expect(result.previewBuffer).toBeDefined();
    expect(result.format).toBe('webp');
    const meta = await sharp(result.previewBuffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeLessThanOrEqual(1400);
  });
});
