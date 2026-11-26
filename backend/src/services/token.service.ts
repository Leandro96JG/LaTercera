import crypto from 'crypto';
import path from 'path';

export type TokenScopeType = 'download' | 'album_access' | 'order_status';

export interface DownloadTokenPayload {
  orderId: string;
  resourceType: 'photo' | 'album_zip';
  resourceId: string;
  tokenType?: TokenScopeType;
  exp: number; // Unix epoch en segundos
  iat: number;
  nonce: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: DownloadTokenPayload;
  error?: string;
}

export class DownloadTokenService {
  private secretKey: string;
  public static readonly DEFAULT_DURATION_SECONDS = 72 * 3600; // 72 horas

  constructor(secretKey: string) {
    if (!secretKey || secretKey.length < 32) {
      throw new Error('DOWNLOAD_SECRET debe tener al menos 32 caracteres');
    }
    this.secretKey = secretKey;
  }

  /**
   * Sanitiza el resourceId contra ataques de Path Traversal (../../ o ..\\..)
   */
  public sanitizeResourceId(resourceId: string): string {
    const normalized = resourceId.replace(/\\/g, '/');
    return path.posix.basename(normalized);
  }

  /**
   * Genera un token firmado con HMAC-SHA256 y expiración configurable (por defecto 72h)
   */
  public generateToken(
    orderId: string,
    resourceType: 'photo' | 'album_zip',
    resourceId: string,
    durationSeconds: number = DownloadTokenService.DEFAULT_DURATION_SECONDS,
    tokenType: TokenScopeType = 'download'
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const sanitizedResource = this.sanitizeResourceId(resourceId);

    const payload: DownloadTokenPayload = {
      orderId,
      resourceType,
      resourceId: sanitizedResource,
      tokenType,
      iat: now,
      exp: now + durationSeconds,
      nonce: crypto.randomBytes(16).toString('hex')
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  /**
   * Genera un token exclusivo para acceso a álbum privado desbloqueado por PIN
   */
  public generateAlbumAccessToken(albumId: string, durationSeconds: number = 24 * 3600): string {
    return this.generateToken('pin_access', 'album_zip', albumId, durationSeconds, 'album_access');
  }

  /**
   * Genera un nonce firmado para consultar el estado de una orden sin exponer IDOR
   */
  public generateStatusNonce(orderId: string, durationSeconds: number = 72 * 3600): string {
    return this.generateToken(orderId, 'photo', orderId, durationSeconds, 'order_status');
  }

  /**
   * Valida la firma del token, su expiración temporal y opcionalmente su alcance (tokenType)
   */
  public verifyToken(token: string, expectedType?: TokenScopeType): TokenVerificationResult {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token no provisto o tipo inválido' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Formato de token inválido' };
    }

    const [encodedPayload, receivedSignature] = parts;

    // Calcular firma esperada
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(encodedPayload)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(receivedSignature, 'utf8');

    // Comparación segura en tiempo constante
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      return { valid: false, error: 'Firma de token alterada o inválida' };
    }

    // Decodificar payload
    let payload: DownloadTokenPayload;
    try {
      const decodedJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      payload = JSON.parse(decodedJson);
    } catch {
      return { valid: false, error: 'Payload de token malformado' };
    }

    // Validar expiración temporal
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || now > payload.exp) {
      return { valid: false, error: 'El enlace de descarga ha expirado (límite de 72 horas superado)' };
    }

    if (expectedType) {
      const actualType: TokenScopeType = payload.tokenType || (payload.orderId === 'pin_access' ? 'album_access' : 'download');
      if (actualType !== expectedType) {
        return { valid: false, error: 'Tipo de token no autorizado para esta operación' };
      }
    }

    return { valid: true, payload };
  }
}
