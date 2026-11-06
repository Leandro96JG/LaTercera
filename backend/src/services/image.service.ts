import sharp from 'sharp';

export interface WatermarkOptions {
  watermarkText?: string;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  isHD?: boolean;
  /** Variante limpia para portadas de carrusel (sin patrón diagonal cruzado) */
  isCover?: boolean;
  /** Buffer del logo pre-procesado (con canal alfa y opacidad aplicada) */
  logoBuffer?: Buffer;
  /** Posicionamiento del logo: 'center' (defecto en catálogo) o 'bottom-right' (defecto en cover) */
  logoPosition?: 'center' | 'bottom-right' | 'bottom-left';
}

export interface ProcessedImageResult {
  previewBuffer: Buffer;
  originalBuffer: Buffer;
  width: number;
  height: number;
  format: string;
}

/**
 * Sanitiza cadenas de texto para su inclusión segura en templates XML/SVG,
 * evitando que caracteres reservados (&, <, >, ", ') rompan el parser de Sharp.
 */
export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Pre-procesa un buffer de logo para marca de agua en memoria una sola vez por lote:
 * - Redimensiona con fit: 'inside' a un tamaño máximo manejable.
 * - Asegura canal alfa y aplica la opacidad multiplicando el canal alfa vía linear([1, 1, 1, opacity], [0, 0, 0, 0]).
 * - Reutilizable en memoria para procesar cientos de fotos sin recalcular ni decodificar el PNG en cada imagen.
 */
export async function prepareWatermarkLogo(
  logoBuffer: Buffer,
  maxDimension: number = 400,
  opacity: number = 0.35
): Promise<Buffer> {
  const safeOpacity = Math.max(0.05, Math.min(1, opacity));
  return await sharp(logoBuffer)
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside' })
    .ensureAlpha()
    .linear([1, 1, 1, safeOpacity], [0, 0, 0, 0])
    .png()
    .toBuffer();
}

/**
 * Procesa una imagen original:
 * 1. Mantiene el buffer original en memoria/disco para almacenamiento seguro en bucket privado.
 * 2. Si isCover=true: Produce una variante de alta estética (sin texto diagonal cruzado)
 *    para portadas y carrusel Hero; si se pasa logoBuffer, estampa sutilmente en esquina inferior.
 * 3. Si isHD=true: Muestra HD protegida a máximo 1400px con badge y marca sutil.
 * 4. Si es foto de catálogo para venta: Redimensiona usando fit: 'inside' (1000x1000 o 800x800)
 *    para respetar orientación vertical/horizontal, y aplica marca de agua estricta
 *    (logo central translúcido al 35% de tamaño proporcional a Math.min(width, height) + patrón diagonal quemado).
 */
export async function processImageWithWatermark(
  imageBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<ProcessedImageResult> {
  const isCover = options.isCover ?? false;
  const isHD = options.isHD ?? false;
  const targetWidth = options.targetWidth ?? (isCover ? 1000 : 800);
  const targetHeight = options.targetHeight ?? (isCover ? 1000 : 800);
  const quality = options.quality ?? (isCover ? 80 : (isHD ? 85 : 70));
  const watermarkText = options.watermarkText ?? 'LA TERCERA • MUESTRA';
  const safeWatermarkText = escapeXml(watermarkText);

  if (isHD) {
    // Foto de muestra HD protegida: redimensionar a caja máxima de 1400x1400px con fit: 'inside'
    const { data: resizedHdBuffer, info: hdInfo } = await sharp(imageBuffer)
      .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });

    const hdW = hdInfo.width;
    const hdH = hdInfo.height;

    const compositeLayers: sharp.OverlayOptions[] = [];

    // Badge superior izquierdo + marca sutil diagonal centrada
    const svgHdWatermark = Buffer.from(`
      <svg width="${hdW}" height="${hdH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="220" height="40" rx="10" fill="rgba(0,0,0,0.6)" />
        <text x="35" y="46" font-family="DejaVu Sans, Arial, sans-serif" font-size="14" font-weight="bold" fill="#FDB813">
          ✦ LA TERCERA HD MASTER
        </text>
        <g transform="translate(${Math.round(hdW / 2)}, ${Math.round(hdH / 2)}) rotate(-25)">
          <text text-anchor="middle" y="0" font-family="DejaVu Sans, Arial, sans-serif" font-size="${Math.max(24, Math.round(hdW / 32))}" font-weight="900" fill="rgba(255,255,255,0.32)" stroke="rgba(0,0,0,0.25)" stroke-width="1" letter-spacing="4">
            ${safeWatermarkText}
          </text>
        </g>
      </svg>
    `);
    compositeLayers.push({ input: svgHdWatermark, blend: 'over' });

    const hdBuffer = await sharp(resizedHdBuffer)
      .composite(compositeLayers)
      .webp({ quality: 85 })
      .toBuffer();

    return {
      previewBuffer: hdBuffer,
      originalBuffer: imageBuffer,
      width: hdW,
      height: hdH,
      format: 'webp'
    };
  }

  // Redimensionar foto con fit: 'inside' para respetar fotos verticales y horizontales
  const { data: resizedBuffer, info } = await sharp(imageBuffer)
    .resize({ width: targetWidth, height: targetHeight, fit: 'inside', withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const minDim = Math.min(w, h);
  const compositeLayers: sharp.OverlayOptions[] = [];

  if (isCover) {
    // -------------------------------------------------------------
    // CASO 1: PORTADA / CARROUSEL HERO (ALTA ESTÉTICA LIMPIA)
    // Sin texto diagonal "LA TERCERA • MUESTRA" que arruina el impacto.
    // Si hay logoBuffer, se estampa discretamente en esquina inferior derecha.
    // -------------------------------------------------------------
    if (options.logoBuffer) {
      const cornerSize = Math.max(48, Math.round(minDim * 0.22));
      const { data: cornerLogo, info: cInfo } = await sharp(options.logoBuffer)
        .resize({ width: cornerSize, height: cornerSize, fit: 'inside' })
        .toBuffer({ resolveWithObject: true });

      const topPos = Math.max(12, h - cInfo.height - 18);
      const leftPos = Math.max(12, w - cInfo.width - 18);

      compositeLayers.push({
        input: cornerLogo,
        top: topPos,
        left: leftPos,
        blend: 'over'
      });
    }

    const previewBuffer = compositeLayers.length > 0
      ? await sharp(resizedBuffer).composite(compositeLayers).webp({ quality }).toBuffer()
      : await sharp(resizedBuffer).webp({ quality }).toBuffer();

    return {
      previewBuffer,
      originalBuffer: imageBuffer,
      width: w,
      height: h,
      format: 'webp'
    };
  }

  // -------------------------------------------------------------
  // CASO 2: FOTOS DE CATÁLOGO INTERNAS (VENTA Y PROTECCIÓN ESTRICTA)
  // Logo central al 35% de opacidad + micro-patrón diagonal repetido.
  // -------------------------------------------------------------
  if (options.logoBuffer) {
    // Escala del logo central limitada al 40% del lado menor para no desbordar en fotos verticales
    const maxLogoSize = Math.max(64, Math.round(minDim * 0.40));
    const { data: centeredLogo, info: lInfo } = await sharp(options.logoBuffer)
      .resize({ width: maxLogoSize, height: maxLogoSize, fit: 'inside' })
      .toBuffer({ resolveWithObject: true });

    const topCenter = Math.max(0, Math.round((h - lInfo.height) / 2));
    const leftCenter = Math.max(0, Math.round((w - lInfo.width) / 2));

    compositeLayers.push({
      input: centeredLogo,
      top: topCenter,
      left: leftCenter,
      blend: 'over'
    });
  }

  // SVG con marca diagonal repetida estampada en los píxeles con dimensiones idénticas
  const svgWatermark = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wmPattern" width="260" height="140" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)">
          <text x="20" y="50" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" font-weight="900" fill="rgba(255,255,255,0.45)" letter-spacing="2">
            ${safeWatermarkText}
          </text>
          <text x="20" y="110" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="rgba(253,184,19,0.35)" letter-spacing="1">
            PROHIBIDA SU COPIA
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wmPattern)" />
    </svg>
  `);
  compositeLayers.push({ input: svgWatermark, blend: 'over' });

  const previewBuffer = await sharp(resizedBuffer)
    .composite(compositeLayers)
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
