import crypto from 'crypto';
import {
  IPhotographerRepository,
  MemoryPhotographerRepository
} from '../repositories/photographer.repository';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'photographer';
  photographerId: string;
  iss: string;
  iat: number;
  exp: number;
}

export interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'photographer';
  photographerId: string;
}

export interface PhotographerAccount {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'photographer';
  photographerId: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
}

export class AdminAuthService {
  private readonly jwtSecret: string;
  private readonly tokenDurationSeconds: number;
  private readonly photographers: Map<string, PhotographerAccount> = new Map();
  private readonly photographerRepo: IPhotographerRepository;

  constructor(
    jwtSecret: string,
    tokenDurationOrRepo?: number | IPhotographerRepository,
    repo?: IPhotographerRepository
  ) {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres para garantizar seguridad criptográfica');
    }
    this.jwtSecret = jwtSecret;

    if (typeof tokenDurationOrRepo === 'number') {
      this.tokenDurationSeconds = tokenDurationOrRepo;
      this.photographerRepo = repo || new MemoryPhotographerRepository();
    } else if (tokenDurationOrRepo && typeof tokenDurationOrRepo === 'object') {
      this.tokenDurationSeconds = 86400;
      this.photographerRepo = tokenDurationOrRepo;
    } else {
      this.tokenDurationSeconds = 86400;
      this.photographerRepo = repo || new MemoryPhotographerRepository();
    }

    // Inicializar cuenta oficial de la fotógrafa principal (Jenifer "Yuyo" Espeche)
    this.initializeDefaultAdmin();
  }

  public getRepository(): IPhotographerRepository {
    return this.photographerRepo;
  }

  /**
   * Hashea una contraseña usando scrypt con sal aleatoria de 16 bytes
   */
  public hashPassword(password: string): string {
    if (!password || password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${derivedKey}`;
  }

  /**
   * Verifica una contraseña en tiempo constante evitando timing attacks
   */
  public verifyPassword(password: string, storedHash: string): boolean {
    if (!password || !storedHash) return false;

    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }

    const salt = parts[1];
    const originalKey = parts[2];

    const testKey = crypto.scryptSync(password, salt, 64).toString('hex');

    const originalBuf = Buffer.from(originalKey, 'hex');
    const testBuf = Buffer.from(testKey, 'hex');

    if (originalBuf.length !== testBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(originalBuf, testBuf);
  }

  /**
   * Genera un token JWT (RFC 7519) firmado con HMAC-SHA256
   */
  public createJwt(
    user: AdminUserDto,
    durationSeconds: number = this.tokenDurationSeconds
  ): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload: AdminJwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      photographerId: user.photographerId,
      iss: 'la-tercera-api',
      iat: now,
      exp: now + durationSeconds
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Valida un token JWT: estructura, firma HMAC-SHA256, expiración y emisor
   */
  public verifyJwt(token: string): {
    valid: boolean;
    payload?: AdminJwtPayload;
    error?: string;
  } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token no provisto' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Formato JWT inválido' };
    }

    const [headerB64, payloadB64, receivedSig] = parts;

    // Verificar firma criptográfica
    const expectedSig = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    const receivedBuf = Buffer.from(receivedSig, 'utf8');

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      return { valid: false, error: 'Firma de token inválida o alterada' };
    }

    // Decodificar payload
    try {
      const payload: AdminJwtPayload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8')
      );

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp <= now) {
        return { valid: false, error: 'Token expirado' };
      }

      if (payload.iss !== 'la-tercera-api') {
        return { valid: false, error: 'Emisor de token no autorizado' };
      }

      return { valid: true, payload };
    } catch {
      return { valid: false, error: 'Error al decodificar payload JWT' };
    }
  }

  /**
   * Autenticación contra el repositorio de fotógrafos (Síncrona)
   */
  public login(
    email: string,
    password: string
  ): {
    success: boolean;
    token?: string;
    user?: AdminUserDto;
    error?: string;
  } {
    if (!email || !password) {
      return { success: false, error: 'Email y contraseña requeridos' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const account = this.photographers.get(normalizedEmail);

    // Protección anti-timing: verificar hash falso si no existe la cuenta
    const dummyHash =
      'scrypt:00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const isValid = account
      ? this.verifyPassword(password, account.passwordHash)
      : this.verifyPassword(password, dummyHash);

    if (!account || !isValid || !account.isActive) {
      return { success: false, error: 'Credenciales inválidas' };
    }

    const userDto: AdminUserDto = {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      photographerId: account.photographerId
    };

    const token = this.createJwt(userDto);

    return {
      success: true,
      token,
      user: userDto
    };
  }

  /**
   * Autenticación asíncrona contra Supabase / Repository
   * Permite que los fotógrafos colaboradores inicien sesión tras un reinicio del servidor
   */
  public async loginAsync(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    token?: string;
    user?: AdminUserDto;
    error?: string;
  }> {
    if (!email || !password) {
      return { success: false, error: 'Email y contraseña requeridos' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    let account = this.photographers.get(normalizedEmail);

    // Si no está en memoria (ej: tras reinicio del servidor), consultar el repositorio
    if (!account) {
      try {
        const fromRepo = await this.photographerRepo.findByEmail(normalizedEmail);
        if (fromRepo) {
          account = fromRepo;
          this.photographers.set(normalizedEmail, account);
        }
      } catch (err: any) {
        console.warn(`[AdminAuthService] Error al consultar repositorio de fotógrafos: ${err.message}`);
      }
    }

    // Protección anti-timing: verificar hash falso si no existe la cuenta
    const dummyHash =
      'scrypt:00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const isValid = account
      ? this.verifyPassword(password, account.passwordHash)
      : this.verifyPassword(password, dummyHash);

    if (!account || !isValid || !account.isActive) {
      return { success: false, error: 'Credenciales inválidas' };
    }

    const userDto: AdminUserDto = {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      photographerId: account.photographerId
    };

    const token = this.createJwt(userDto);

    return {
      success: true,
      token,
      user: userDto
    };
  }

  /**
   * Registro escalable para futuros fotógrafos colaboradores (Síncrono para tests y compatibilidad)
   */
  public registerPhotographer(data: {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'photographer';
    phone?: string;
  }): PhotographerAccount {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (this.photographers.has(normalizedEmail)) {
      throw new Error(`El fotógrafo con email ${normalizedEmail} ya existe`);
    }

    const passwordHash = this.hashPassword(data.password);
    const newAccount: PhotographerAccount = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      email: normalizedEmail,
      name: data.name,
      role: data.role || 'photographer',
      photographerId: `photo_${crypto.randomBytes(6).toString('hex')}`,
      passwordHash,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.photographers.set(normalizedEmail, newAccount);

    // Persistir en el repositorio Supabase / Memoria
    this.photographerRepo
      .createPhotographer({
        email: newAccount.email,
        passwordHash: newAccount.passwordHash,
        name: newAccount.name,
        role: newAccount.role,
        photographerId: newAccount.photographerId,
        phone: data.phone
      })
      .catch((err) => {
        console.warn(`[AdminAuthService] Error al persistir fotógrafo en repositorio: ${err.message}`);
      });

    return newAccount;
  }

  /**
   * Registro asíncrono que aguarda la confirmación de persistencia en Supabase / DB
   */
  public async registerPhotographerAsync(data: {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'photographer';
    phone?: string;
  }): Promise<PhotographerAccount> {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (this.photographers.has(normalizedEmail)) {
      throw new Error(`El fotógrafo con email ${normalizedEmail} ya existe`);
    }

    // Comprobar existencia previa en DB
    const existing = await this.photographerRepo.findByEmail(normalizedEmail);
    if (existing) {
      this.photographers.set(normalizedEmail, existing);
      throw new Error(`El fotógrafo con email ${normalizedEmail} ya existe`);
    }

    const passwordHash = this.hashPassword(data.password);
    const createdInRepo = await this.photographerRepo.createPhotographer({
      email: normalizedEmail,
      passwordHash,
      name: data.name,
      role: data.role || 'photographer',
      phone: data.phone
    });

    const newAccount: PhotographerAccount = {
      id: createdInRepo.id,
      email: createdInRepo.email,
      name: createdInRepo.name,
      role: createdInRepo.role,
      photographerId: createdInRepo.photographerId || createdInRepo.id,
      passwordHash: createdInRepo.passwordHash,
      isActive: createdInRepo.isActive,
      createdAt: createdInRepo.createdAt
    };

    this.photographers.set(normalizedEmail, newAccount);
    return newAccount;
  }

  public getPhotographerByEmail(email: string): PhotographerAccount | undefined {
    return this.photographers.get(email.trim().toLowerCase());
  }

  public async getPhotographerByEmailAsync(email: string): Promise<PhotographerAccount | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const cached = this.photographers.get(normalizedEmail);
    if (cached) return cached;

    try {
      const fromRepo = await this.photographerRepo.findByEmail(normalizedEmail);
      if (fromRepo) {
        this.photographers.set(normalizedEmail, fromRepo);
        return fromRepo;
      }
    } catch (err: any) {
      console.warn(`[AdminAuthService] Error consultando fotógrafo por email: ${err.message}`);
    }
    return null;
  }

  private initializeDefaultAdmin(): void {
    const adminEmail = (process.env.ADMIN_EMAIL || 'fotografa@latercera.com.ar').trim().toLowerCase();
    const defaultPassword = process.env.ADMIN_PASSWORD || 'YuyoFotos2026!';

    const defaultAdmin: PhotographerAccount = {
      id: 'admin_jenifer_espeche_01',
      email: adminEmail,
      name: 'Jenifer "Yuyo" Espeche',
      role: 'admin',
      photographerId: 'yuyo_espeche',
      passwordHash: this.hashPassword(defaultPassword),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.photographers.set(adminEmail, defaultAdmin);
  }
}
