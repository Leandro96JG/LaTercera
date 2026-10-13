import sharp from 'sharp';

export interface WatermarkOptions {
  watermarkText?: string;
  targetWidth?: number;
  quality?: number;
  isHD?: boolean;
}

export interface ProcessedImageResult {
  previewBuffer: Buffer;
  originalBuffer: Buffer;
  width: number;
  height: number;
  format: string;
}

/**
 * Procesa una imagen original:
 * 1. Mantiene el buffer original en memoria/disco.
 * 2. Si no es HD, redimensiona a ancho objetivo (ej: 800px), aplica marca de agua diagonal repetida en píxeles y convierte a WebP ligero.
 * 3. Si es HD de muestra, mantiene la nitidez y aplica una firma sutil en la esquina.
 */
export async function processImageWithWatermark(
  imageBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<ProcessedImageResult> {
  const targetWidth = options.targetWidth ?? 800;
  const quality = options.quality ?? 70;
  const watermarkText = options.watermarkText ?? 'LA TERCERA • MUESTRA';
  const isHD = options.isHD ?? false;

  // Obtener dimensiones originales
  const originalMetadata = await sharp(imageBuffer).metadata();
  const origW = originalMetadata.width || 1200;
  const origH = originalMetadata.height || 800;

  if (isHD) {
    // Foto de muestra HD: marca sutil en la esquina
    const svgHdBadge = Buffer.from(`
      <svg width="${origW}" height="${origH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="220" height="40" rx="10" fill="rgba(0,0,0,0.6)" />
        <text x="35" y="46" font-family="sans-serif" font-size="14" font-weight="bold" fill="#FDB813">
          ✦ LA TERCERA HD MASTER
        </text>
      </svg>
    `);

    const hdBuffer = await sharp(imageBuffer)
      .composite([{ input: svgHdBadge, blend: 'over' }])
      .webp({ quality: 85 })
      .toBuffer();

    return {
      previewBuffer: hdBuffer,
      originalBuffer: imageBuffer,
      width: origW,
      height: origH,
      format: 'webp'
    };
  }

  // Foto protegida: redimensionar primero para obtener dimensiones exactas
  const { data: resizedBuffer, info } = await sharp(imageBuffer)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // SVG con marca diagonal repetida estampada en los píxeles con dimensiones idénticas
  const svgWatermark = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wmPattern" width="260" height="140" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)">
          <text x="20" y="50" font-family="sans-serif" font-size="16" font-weight="900" fill="rgba(255,255,255,0.45)" letter-spacing="2">
            ${watermarkText}
          </text>
          <text x="20" y="110" font-family="sans-serif" font-size="12" font-weight="700" fill="rgba(253,184,19,0.35)" letter-spacing="1">
            PROHIBIDA SU COPIA
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wmPattern)" />
    </svg>
  `);

  const previewBuffer = await sharp(resizedBuffer)
    .composite([{ input: svgWatermark, blend: 'over' }])
    .webp({ quality })
    .toBuffer();

  return {
    previewBuffer,
    originalBuffer: imageBuffer,
    width: w,
    height: h,
    format: 'webp'
  };
}
