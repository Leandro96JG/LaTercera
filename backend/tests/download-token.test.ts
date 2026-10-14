import { describe, it, expect } from 'vitest';
import { DownloadTokenService } from '../src/services/token.service';

describe('Download Token Service - Criptografía y Expiración 72h', () => {
  const TEST_SECRET = 'secreto_descargas_la_tercera_cripto_72_horas_min_32_caracteres_hex';
  const tokenService = new DownloadTokenService(TEST_SECRET);

  it('debe rechazar inicialización si el secreto tiene menos de 32 caracteres', () => {
    expect(() => new DownloadTokenService('clave_corta')).toThrow(/al menos 32 caracteres/);
  });

  it('debe generar y verificar exitosamente un token válido', () => {
    const token = tokenService.generateToken('order-123', 'photo', 'foto_001.jpg');
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const verification = tokenService.verifyToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.payload?.orderId).toBe('order-123');
    expect(verification.payload?.resourceType).toBe('photo');
    expect(verification.payload?.resourceId).toBe('foto_001.jpg');
    expect(verification.payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('debe calcular la expiración exactamente a las 72 horas por defecto', () => {
    const beforeSec = Math.floor(Date.now() / 1000);
    const token = tokenService.generateToken('order-456', 'album_zip', 'album_completo.zip');
    const afterSec = Math.floor(Date.now() / 1000);

    const verification = tokenService.verifyToken(token);
    expect(verification.valid).toBe(true);
    const expectedDuration = 72 * 3600;

    expect(verification.payload!.exp - beforeSec).toBeGreaterThanOrEqual(expectedDuration);
    expect(verification.payload!.exp - afterSec).toBeLessThanOrEqual(expectedDuration);
  });

  it('debe rechazar un token expirado', () => {
    // Generar un token con expiración de -10 segundos (ya vencido)
    const expiredToken = tokenService.generateToken('order-expired', 'photo', 'foto_002.jpg', -10);
    const verification = tokenService.verifyToken(expiredToken);

    expect(verification.valid).toBe(false);
    expect(verification.error).toMatch(/expirado|72 horas/i);
  });

  it('debe rechazar un token si la firma fue manipulada o alterada en un carácter', () => {
    const token = tokenService.generateToken('order-789', 'photo', 'foto_003.jpg');
    const [payload, signature] = token.split('.');

    // Alteramos el último carácter de la firma
    const tamperedSignature = signature.slice(0, -1) + (signature.endsWith('a') ? 'b' : 'a');
    const tamperedToken = `${payload}.${tamperedSignature}`;

    const verification = tokenService.verifyToken(tamperedToken);
    expect(verification.valid).toBe(false);
    expect(verification.error).toMatch(/firma/i);
  });

  it('debe rechazar un token si el payload fue alterado (IDOR / BOLA attack)', () => {
    const token = tokenService.generateToken('order-111', 'photo', 'foto_autorizada.jpg');
    const [, signature] = token.split('.');

    // Atacante intenta reemplazar el recurso por otra foto sin cambiar la firma
    const fakePayload = {
      orderId: 'order-111',
      resourceType: 'photo',
      resourceId: 'foto_privada_otra_persona.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      nonce: 'fake'
    };
    const fakeEncoded = Buffer.from(JSON.stringify(fakePayload)).toString('base64url');
    const attackToken = `${fakeEncoded}.${signature}`;

    const verification = tokenService.verifyToken(attackToken);
    expect(verification.valid).toBe(false);
    expect(verification.error).toMatch(/firma/i);
  });

  it('debe sanitizar nombres de archivo para prevenir Path Traversal en el resourceId', () => {
    const sanitized = tokenService.sanitizeResourceId('../../etc/passwd');
    expect(sanitized).toBe('passwd');

    const sanitizedWindows = tokenService.sanitizeResourceId('..\\..\\windows\\system32\\cmd.exe');
    expect(sanitizedWindows).toBe('cmd.exe');

    const normal = tokenService.sanitizeResourceId('partido_tesorieri_01.jpg');
    expect(normal).toBe('partido_tesorieri_01.jpg');
  });
});
