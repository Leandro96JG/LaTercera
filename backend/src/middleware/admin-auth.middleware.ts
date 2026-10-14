import { Request, Response, NextFunction } from 'express';
import { AdminAuthService, AdminJwtPayload } from '../services/admin-auth.service';

export interface AuthenticatedAdminRequest extends Request {
  adminUser?: AdminJwtPayload;
}

/**
 * Factory para crear el middleware requireAdminAuth
 */
export function createRequireAdminAuth(authService: AdminAuthService) {
  return function requireAdminAuth(
    req: AuthenticatedAdminRequest,
    res: Response,
    next: NextFunction
  ) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Acceso no autorizado: Cabecera Authorization requerida'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Formato de cabecera inválido. Debe ser: Bearer <token>'
      });
    }

    const token = parts[1];
    const verification = authService.verifyJwt(token);

    if (!verification.valid || !verification.payload) {
      return res.status(401).json({
        error: verification.error || 'Token de autenticación inválido o expirado'
      });
    }

    // Adjuntar usuario autenticado a la request
    req.adminUser = verification.payload;
    return next();
  };
}
