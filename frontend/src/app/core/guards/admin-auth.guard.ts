import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthStore } from '../state/admin-auth.store';

/**
 * Functional Guard para proteger rutas de administración
 * Redirige a /admin/login o al catálogo público si el usuario no tiene JWT válido
 */
export const adminAuthGuard: CanActivateFn = () => {
  const authStore = inject(AdminAuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  // Redirigir al inicio o login si no está autenticado
  router.navigate(['/']);
  return false;
};
