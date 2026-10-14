import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { AdminAuthService, AdminUserDto } from '../src/services/admin-auth.service';
import { MemoryPhotographerRepository } from '../src/repositories/photographer.repository';
import { createRequireAdminAuth } from '../src/middleware/admin-auth.middleware';
import { createAdminRouter } from '../src/routes/admin.routes';

describe('Admin Authentication & JWT Security Suite', () => {
  const TEST_SECRET = 'clave_secreta_super_segura_jwt_admin_minimo_32_caracteres_hex';
  let authService: AdminAuthService;

  beforeEach(() => {
    authService = new AdminAuthService(TEST_SECRET, 3600);
  });

  describe('Password Hashing & Constant-time Verification', () => {
    it('debe rechazar contraseñas de menos de 8 caracteres', () => {
      expect(() => authService.hashPassword('1234567')).toThrow();
    });

    it('debe generar hashes con sales únicas para la misma contraseña', () => {
      const hash1 = authService.hashPassword('PasswordSegura123!');
      const hash2 = authService.hashPassword('PasswordSegura123!');

      expect(hash1).not.toBe(hash2);
      expect(hash1.startsWith('scrypt:')).toBe(true);
      expect(hash2.startsWith('scrypt:')).toBe(true);
    });

    it('debe verificar contraseñas correctas e invalidar contraseñas erróneas', () => {
      const password = 'SuperPassword2026!';
      const hash = authService.hashPassword(password);

      expect(authService.verifyPassword(password, hash)).toBe(true);
      expect(authService.verifyPassword('PasswordIncorrecta!', hash)).toBe(false);
      expect(authService.verifyPassword('', hash)).toBe(false);
      expect(authService.verifyPassword(password, 'hash_invalido')).toBe(false);
    });
  });

  describe('JWT RFC 7519 Generation & Cryptographic Verification', () => {
    const mockUser: AdminUserDto = {
      id: 'usr_001',
      email: 'fotografa@latercera.com.ar',
      name: 'Jenifer "Yuyo" Espeche',
      role: 'admin',
      photographerId: 'yuyo_espeche'
    };

    it('debe generar un token JWT con 3 componentes Base64Url', () => {
      const token = authService.createJwt(mockUser);
      const parts = token.split('.');

      expect(parts.length).toBe(3);

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      expect(payload.sub).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe('admin');
      expect(payload.photographerId).toBe(mockUser.photographerId);
      expect(payload.iss).toBe('la-tercera-api');
    });

    it('debe verificar correctamente un token válido', () => {
      const token = authService.createJwt(mockUser);
      const result = authService.verifyJwt(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe(mockUser.id);
      expect(result.payload?.email).toBe(mockUser.email);
    });

    it('debe rechazar tokens con firma manipulada (anti-tampering)', () => {
      const token = authService.createJwt(mockUser);
      const [header, payload, sig] = token.split('.');

      // Alterar firma
      const tamperedSig = sig.slice(0, -3) + 'XYZ';
      const tamperedToken = `${header}.${payload}.${tamperedSig}`;

      const result = authService.verifyJwt(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Firma de token inválida');
    });

    it('debe rechazar tokens con payload alterado', () => {
      const token = authService.createJwt(mockUser);
      const [header, payload, sig] = token.split('.');

      const payloadObj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      payloadObj.role = 'super_hacker';
      const tamperedPayload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');

      const tamperedToken = `${header}.${tamperedPayload}.${sig}`;

      const result = authService.verifyJwt(tamperedToken);
      expect(result.valid).toBe(false);
    });

    it('debe rechazar tokens expirados', () => {
      // Generar token con duración de -10 segundos
      const expiredToken = authService.createJwt(mockUser, -10);
      const result = authService.verifyJwt(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expirado');
    });

    it('debe rechazar tokens malformados o vacíos', () => {
      expect(authService.verifyJwt('').valid).toBe(false);
      expect(authService.verifyJwt('un.solo.punto').valid).toBe(false);
      expect(authService.verifyJwt('este-no-es-un-jwt').valid).toBe(false);
    });
  });

  describe('Login & Multi-Photographer Management', () => {
    it('debe permitir inicio de sesión con las credenciales por defecto de Yuyo', () => {
      const result = authService.login('fotografa@latercera.com.ar', 'YuyoFotos2026!');

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user?.name).toBe('Jenifer "Yuyo" Espeche');
      expect(result.user?.role).toBe('admin');
    });

    it('debe rechazar credenciales incorrectas', () => {
      const result = authService.login('fotografa@latercera.com.ar', 'ContraseñaErronea123');
      expect(result.success).toBe(false);
      expect(result.token).toBeUndefined();
      expect(result.error).toBe('Credenciales inválidas');
    });

    it('debe registrar y autenticar nuevos fotógrafos (Escalabilidad)', () => {
      const nuevoFotografo = authService.registerPhotographer({
        email: 'marcos@latercera.com.ar',
        password: 'PasswordMarcos2026!',
        name: 'Marcos Herrera',
        role: 'photographer'
      });

      expect(nuevoFotografo.email).toBe('marcos@latercera.com.ar');
      expect(nuevoFotografo.role).toBe('photographer');

      const loginResult = authService.login('marcos@latercera.com.ar', 'PasswordMarcos2026!');
      expect(loginResult.success).toBe(true);
      expect(loginResult.user?.name).toBe('Marcos Herrera');
      expect(loginResult.user?.role).toBe('photographer');
    });

    it('debe registrar y persistir fotógrafos en IPhotographerRepository via registerPhotographer y registerPhotographerAsync', async () => {
      const customRepo = new MemoryPhotographerRepository();
      const customAuth = new AdminAuthService(TEST_SECRET, 3600, customRepo);

      // Registro asíncrono
      const nuevo = await customAuth.registerPhotographerAsync({
        email: 'carla@latercera.com.ar',
        password: 'PasswordCarla2026!',
        name: 'Carla Romero',
        role: 'photographer',
        phone: '+54 9 380 411-2233'
      });

      expect(nuevo.email).toBe('carla@latercera.com.ar');
      expect(nuevo.name).toBe('Carla Romero');

      // Verificar persistencia directa en el repositorio
      const persisted = await customRepo.findByEmail('carla@latercera.com.ar');
      expect(persisted).not.toBeNull();
      expect(persisted?.email).toBe('carla@latercera.com.ar');
      expect(persisted?.name).toBe('Carla Romero');

      // Rechazar duplicados asíncronamente
      await expect(
        customAuth.registerPhotographerAsync({
          email: 'carla@latercera.com.ar',
          password: 'OtraPassword123!',
          name: 'Duplicado'
        })
      ).rejects.toThrow('ya existe');
    });

    it('debe autenticar mediante loginAsync a fotógrafos colaboradores persistidos tras reinicio del servidor', async () => {
      const persistentRepo = new MemoryPhotographerRepository();
      const instance1 = new AdminAuthService(TEST_SECRET, 3600, persistentRepo);

      await instance1.registerPhotographerAsync({
        email: 'lucas@latercera.com.ar',
        password: 'PasswordLucas2026!',
        name: 'Lucas Albornoz',
        role: 'photographer'
      });

      // Simular reinicio creando una nueva instancia del servicio compartiendo el mismo repositorio
      const instance2 = new AdminAuthService(TEST_SECRET, 3600, persistentRepo);

      // En la nueva instancia, la memoria local está limpia de usuarios nuevos
      expect(instance2.getPhotographerByEmail('lucas@latercera.com.ar')).toBeUndefined();

      // loginAsync busca en el repositorio, valida la contraseña y puebla el caché
      const loginResult = await instance2.loginAsync('lucas@latercera.com.ar', 'PasswordLucas2026!');
      expect(loginResult.success).toBe(true);
      expect(loginResult.token).toBeDefined();
      expect(loginResult.user?.name).toBe('Lucas Albornoz');
      expect(loginResult.user?.email).toBe('lucas@latercera.com.ar');
      expect(loginResult.user?.role).toBe('photographer');

      // Confirmar que quedó cacheado en memoria
      expect(instance2.getPhotographerByEmail('lucas@latercera.com.ar')).toBeDefined();

      // getPhotographerByEmailAsync
      const fetched = await instance2.getPhotographerByEmailAsync('lucas@latercera.com.ar');
      expect(fetched?.name).toBe('Lucas Albornoz');
    });
  });

  describe('Middleware requireAdminAuth', () => {
    let mockReq: any;
    let mockRes: any;
    let nextCalled: boolean;

    beforeEach(() => {
      mockReq = {
        headers: {}
      };
      mockRes = {
        status: function (code: number) {
          this.statusCode = code;
          return this;
        },
        json: function (data: any) {
          this.body = data;
          return this;
        }
      };
      nextCalled = false;
    });

    const next = () => {
      nextCalled = true;
    };

    it('debe denegar acceso 401 si no hay cabecera Authorization', () => {
      const middleware = createRequireAdminAuth(authService);
      middleware(mockReq, mockRes, next);

      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.error).toContain('Authorization requerida');
      expect(nextCalled).toBe(false);
    });

    it('debe denegar acceso 401 si el formato no es Bearer', () => {
      const middleware = createRequireAdminAuth(authService);
      mockReq.headers.authorization = 'Basic dXNlcjpwYXNz';
      middleware(mockReq, mockRes, next);

      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.error).toContain('Bearer <token>');
      expect(nextCalled).toBe(false);
    });

    it('debe autorizar el acceso y adjuntar adminUser si el token es válido', () => {
      const middleware = createRequireAdminAuth(authService);
      const token = authService.createJwt({
        id: 'admin_1',
        email: 'fotografa@latercera.com.ar',
        name: 'Jenifer Espeche',
        role: 'admin',
        photographerId: 'yuyo'
      });

      mockReq.headers.authorization = `Bearer ${token}`;
      middleware(mockReq, mockRes, next);

      expect(nextCalled).toBe(true);
      expect(mockReq.adminUser).toBeDefined();
      expect(mockReq.adminUser.email).toBe('fotografa@latercera.com.ar');
    });

    it('debe denegar acceso 401 si el token es inválido o manipulado', () => {
      const middleware = createRequireAdminAuth(authService);
      mockReq.headers.authorization = 'Bearer token.invalido.falso';
      middleware(mockReq, mockRes, next);

      expect(mockRes.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });
  });
});
