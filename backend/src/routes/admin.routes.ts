import { Router, Response } from 'express';
import { AdminAuthService } from '../services/admin-auth.service';
import {
  createRequireAdminAuth,
  AuthenticatedAdminRequest
} from '../middleware/admin-auth.middleware';

export function createAdminRouter(authService: AdminAuthService): Router {
  const router = Router();
  const requireAdminAuth = createRequireAdminAuth(authService);

  // 1. Endpoint público de autenticación
  router.post('/login', (req, res) => {
    try {
      const { email, password } = req.body;
      const result = authService.login(email, password);

      if (!result.success) {
        return res.status(401).json({
          error: result.error || 'Credenciales inválidas'
        });
      }

      return res.status(200).json({
        success: true,
        token: result.token,
        user: result.user
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 2. Perfil del fotógrafo/admin autenticado
  router.get('/me', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
    return res.status(200).json({
      success: true,
      user: req.adminUser
    });
  });

  // 3. Métricas y estadísticas administrativas
  router.get('/stats', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
    return res.status(200).json({
      success: true,
      stats: {
        photosSold: 43,
        albumsSold: 3,
        revenueARS: 64200,
        storageUsedGB: 1.8,
        storageLimitGB: 10,
        activeAlbumsCount: 4,
        lastUpdated: new Date().toISOString()
      }
    });
  });

  // 4. Registro de fotógrafos colaboradores (Escalabilidad multi-fotógrafo)
  router.post('/photographers', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      // Solo el rol admin puede registrar nuevos fotógrafos
      if (req.adminUser?.role !== 'admin') {
        return res.status(403).json({
          error: 'Acceso restringido: Solo administradores pueden registrar nuevos fotógrafos'
        });
      }

      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({
          error: 'Parámetros obligatorios: email, password, name'
        });
      }

      const newPhotographer = authService.registerPhotographer({
        email,
        password,
        name,
        role: role || 'photographer'
      });

      return res.status(201).json({
        success: true,
        photographer: {
          id: newPhotographer.id,
          email: newPhotographer.email,
          name: newPhotographer.name,
          role: newPhotographer.role,
          photographerId: newPhotographer.photographerId,
          createdAt: newPhotographer.createdAt
        }
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  return router;
}
