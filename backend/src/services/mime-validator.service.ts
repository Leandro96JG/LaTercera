import path from 'path';

/**
 * Tipos MIME de imagen permitidos para procesamiento y venta en LA TERCERA
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const;

export type AllowedImageMimeType = typeof ALLOWED_IMAGE_MIME_TYPES[number];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

/**
 * Valida si un tipo MIME es una imagen soportada
 */
export function isAllowedImageMimeType(mimeType?: string | null): boolean {
  if (!mimeType) return false;
  const cleanMime = mimeType.trim().toLowerCase();
  return ALLOWED_IMAGE_MIME_TYPES.includes(cleanMime as AllowedImageMimeType);
}

/**
 * Valida si la extensión de archivo corresponde a un formato de imagen soportado
 */
export function isAllowedImageExtension(filename?: string | null): boolean {
  if (!filename) return false;
  const ext = path.extname(filename).toLowerCase();
  return (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Sanitiza el nombre de archivo para evitar Path Traversal y caracteres peligrosos
 */
export function sanitizeFilename(rawFilename: string): string {
  if (!rawFilename) return `photo_${Date.now()}.jpg`;
  // Extraer solo el nombre base sin rutas
  const basename = path.posix.basename(rawFilename.replace(/\\/g, '/'));
  // Remover caracteres de control o no seguros para el filesystem
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.length > 0 ? sanitized : `photo_${Date.now()}.jpg`;
}

/**
 * Inspecciona los primeros bytes (magic numbers) de un Buffer para validar
 * que realmente sea un archivo JPEG, PNG o WebP legítimo y no un ejecutable o script renombrado.
 */
export function validateImageBufferHeader(buffer: Buffer): { valid: boolean; detectedMime?: AllowedImageMimeType } {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // WebP: RIFF (bytes 0-3) y WEBP (bytes 8-11)
  const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
  const isWebp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (isRiff && isWebp) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  return { valid: false };
}

/**
 * Sanitiza el título del álbum removiendo acentos/tildes y caracteres especiales,
 * transformando espacios y separadores en guiones bajos limpios para nombres de archivo seguros.
 */
export function sanitizeAlbumTitle(albumTitle?: string): string {
  if (!albumTitle || typeof albumTitle !== 'string') return 'Fotos';
  const withoutAccents = albumTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const cleaned = withoutAccents
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return cleaned || 'Fotos';
}

/**
 * Formatea una insignia secuencial de 3 dígitos con prefijo numeral (ej. "#001", "#024")
 */
export function formatSequenceBadge(seq: number): string {
  const safeSeq = Math.max(1, Math.floor(Number(seq) || 1));
  return `#${String(safeSeq).padStart(3, '0')}`;
}

/**
 * Genera el título comercial limpio de la fotografía combinando el nombre del álbum y su número correlativo
 * Ejemplo: "Torneo Apertura 2026 • #001"
 */
export function buildAlbumPhotoTitle(albumTitle: string, seq: number): string {
  const title = (albumTitle || 'Álbum Fotográfico').trim();
  return `${title} • ${formatSequenceBadge(seq)}`;
}

/**
 * Genera el nombre comercial limpio para la descarga individual de una foto
 * Ejemplo: "La_Tercera_Torneo_Apertura_2026_001.jpg"
 */
export function buildCleanDownloadFilename(albumTitle: string, seq: number, ext: string = '.jpg'): string {
  const cleanAlbum = sanitizeAlbumTitle(albumTitle);
  const safeSeq = Math.max(1, Math.floor(Number(seq) || 1));
  const paddedSeq = String(safeSeq).padStart(3, '0');
  const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return `La_Tercera_${cleanAlbum}_${paddedSeq}${cleanExt}`;
}

/**
 * Genera el nombre limpio para el archivo comprimido .ZIP
 * Ejemplo: "La_Tercera_Torneo_Apertura_2026.zip" o "La_Tercera_Torneo_Apertura_2026_Seleccion.zip"
 */
export function buildCleanZipFilename(albumTitle: string, isPartial: boolean = false): string {
  const cleanAlbum = sanitizeAlbumTitle(albumTitle);
  return `La_Tercera_${cleanAlbum}${isPartial ? '_Seleccion' : ''}.zip`;
}
