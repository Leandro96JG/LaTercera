import crypto from 'crypto';

export interface WebhookValidationInput {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
  secretKey: string;
  toleranceSeconds?: number;
}

export interface WebhookValidationResult {
  isValid: boolean;
  reason?: string;
  dataId?: string;
  timestamp?: number;
}

/**
 * Valida la firma criptográfica HMAC-SHA256 de webhooks de Mercado Pago (API v2)
 * Incluye protección anti-replay temporal y prevención de timing attacks.
 */
export function validateMercadoPagoWebhook(input: WebhookValidationInput): WebhookValidationResult {
  const { xSignature, xRequestId, dataId, secretKey, toleranceSeconds = 300 } = input;

  if (!xSignature || !xRequestId || !dataId) {
    return {
      isValid: false,
      reason: 'Cabeceras requeridas (x-signature, x-request-id) o dataId ausentes'
    };
  }

  // Parsear ts y v1 de la cabecera x-signature
  const parts = xSignature.split(',');
  let tsStr: string | null = null;
  let v1Hash: string | null = null;

  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key === 'ts') tsStr = value;
    if (key === 'v1') v1Hash = value;
  }

  if (!tsStr || !v1Hash) {
    return {
      isValid: false,
      reason: 'Estructura inválida en cabecera x-signature (debe contener ts=... y v1=...)'
    };
  }

  const rawTs = parseInt(tsStr, 10);
  if (isNaN(rawTs)) {
    return {
      isValid: false,
      reason: 'Timestamp en x-signature no es un número válido'
    };
  }

  // Normalizar timestamps de milisegundos a segundos si superan 1e11
  const tsSeconds = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Verificación Anti-Replay Attack
  if (Math.abs(nowSeconds - tsSeconds) > toleranceSeconds) {
    return {
      isValid: false,
      reason: `Firma fuera de ventana de tolerancia anti-replay (${toleranceSeconds}s)`
    };
  }

  // Construir manifest oficial según documentación de Mercado Pago
  // Formato: id:[data.id];request-id:[x-request-id];ts:[ts];
  // Importante: usar el tsStr original enviado por Mercado Pago en el manifest
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${tsStr};`;

  // Calcular HMAC-SHA256 con el secreto configurado
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(manifest)
    .digest('hex');

  const computedBuffer = Buffer.from(computedHash, 'utf8');
  const receivedBuffer = Buffer.from(v1Hash, 'utf8');

  // Prevención de error por discrepancia de tamaño en crypto.timingSafeEqual
  if (computedBuffer.length !== receivedBuffer.length) {
    return {
      isValid: false,
      reason: 'Discrepancia en longitud de firma criptográfica'
    };
  }

  // Comparación en tiempo constante contra timing attacks
  const isMatch = crypto.timingSafeEqual(computedBuffer, receivedBuffer);

  return isMatch
    ? { isValid: true, dataId, timestamp: tsSeconds }
    : { isValid: false, reason: 'Firma criptográfica inválida' };
}
