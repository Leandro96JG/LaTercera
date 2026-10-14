import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  isAllowedImageMimeType,
  isAllowedImageExtension,
  sanitizeFilename,
  validateImageBufferHeader
} from '../src/services/mime-validator.service';

describe('MIME Validator & Image Integrity Service', () => {
  it('debe validar tipos MIME permitidos (JPG, PNG, WebP)', () => {
    expect(isAllowedImageMimeType('image/jpeg')).toBe(true);
    expect(isAllowedImageMimeType('image/png')).toBe(true);
    expect(isAllowedImageMimeType('image/webp')).toBe(true);
    expect(isAllowedImageMimeType('IMAGE/JPEG')).toBe(true);

    // Tipos no permitidos
    expect(isAllowedImageMimeType('application/pdf')).toBe(false);
    expect(isAllowedImageMimeType('video/mp4')).toBe(false);
    expect(isAllowedImageMimeType('text/plain')).toBe(false);
    expect(isAllowedImageMimeType('')).toBe(false);
    expect(isAllowedImageMimeType(null)).toBe(false);
  });

  it('debe validar extensiones de archivo permitidas', () => {
    expect(isAllowedImageExtension('foto.jpg')).toBe(true);
    expect(isAllowedImageExtension('foto.jpeg')).toBe(true);
    expect(isAllowedImageExtension('foto.PNG')).toBe(true);
    expect(isAllowedImageExtension('foto.webp')).toBe(true);

    expect(isAllowedImageExtension('documento.pdf')).toBe(false);
    expect(isAllowedImageExtension('video.mp4')).toBe(false);
    expect(isAllowedImageExtension('script.sh')).toBe(false);
  });

  it('debe sanitizar nombres de archivo previniendo Path Traversal', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('..\\..\\windows\\system32\\calc.exe')).toBe('calc.exe');
    expect(sanitizeFilename('partido final #1 (tesorieri).jpg')).toBe('partido_final__1__tesorieri_.jpg');
  });

  it('debe detectar magic bytes en buffers reales de Sharp para JPEG, PNG y WebP', async () => {
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } }
    }).jpeg().toBuffer();

    const pngBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 255, b: 0 } }
    }).png().toBuffer();

    const webpBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 255 } }
    }).webp().toBuffer();

    expect(validateImageBufferHeader(jpegBuffer)).toEqual({ valid: true, detectedMime: 'image/jpeg' });
    expect(validateImageBufferHeader(pngBuffer)).toEqual({ valid: true, detectedMime: 'image/png' });
    expect(validateImageBufferHeader(webpBuffer)).toEqual({ valid: true, detectedMime: 'image/webp' });

    // Archivo no imagen (ej: buffer de texto)
    const fakeBuffer = Buffer.from('Esto no es una imagen');
    expect(validateImageBufferHeader(fakeBuffer)).toEqual({ valid: false });
  });
});
