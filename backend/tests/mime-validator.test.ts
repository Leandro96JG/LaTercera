import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  isAllowedImageMimeType,
  isAllowedImageExtension,
  sanitizeFilename,
  validateImageBufferHeader,
  sanitizeAlbumTitle,
  formatSequenceBadge,
  buildAlbumPhotoTitle,
  buildCleanDownloadFilename,
  buildCleanZipFilename
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

  describe('Clean Album & Sequential Commercial Naming', () => {
    it('debe formatear insignias secuenciales con 3 dígitos (#001)', () => {
      expect(formatSequenceBadge(1)).toBe('#001');
      expect(formatSequenceBadge(42)).toBe('#042');
      expect(formatSequenceBadge(150)).toBe('#150');
      expect(formatSequenceBadge(0)).toBe('#001');
    });

    it('debe sanitizar títulos de álbumes eliminando acentos y caracteres especiales', () => {
      expect(sanitizeAlbumTitle('Atlético Tesorieri vs. Andino S.C.')).toBe('Atletico_Tesorieri_vs_Andino_S_C');
      expect(sanitizeAlbumTitle('¡Gran Final de Básquet 2026!')).toBe('Gran_Final_de_Basquet_2026');
      expect(sanitizeAlbumTitle('')).toBe('Fotos');
    });

    it('debe construir títulos limpios para fotos combinando nombre de álbum y número secuencial', () => {
      expect(buildAlbumPhotoTitle('Torneo Apertura 2026', 1)).toBe('Torneo Apertura 2026 • #001');
      expect(buildAlbumPhotoTitle('Copa Ciudad', 15)).toBe('Copa Ciudad • #015');
    });

    it('debe construir nombres de archivo de descarga comercialmente limpios', () => {
      expect(buildCleanDownloadFilename('Torneo Apertura 2026', 1, '.jpg'))
        .toBe('La_Tercera_Torneo_Apertura_2026_001.jpg');
      expect(buildCleanDownloadFilename('Atlético & Andino', 5, 'png'))
        .toBe('La_Tercera_Atletico_Andino_005.png');
    });

    it('debe construir nombres de archivo .ZIP limpios diferenciando álbum completo y selección', () => {
      expect(buildCleanZipFilename('Torneo Apertura 2026', false))
        .toBe('La_Tercera_Torneo_Apertura_2026.zip');
      expect(buildCleanZipFilename('Torneo Apertura 2026', true))
        .toBe('La_Tercera_Torneo_Apertura_2026_Seleccion.zip');
    });
  });
});
