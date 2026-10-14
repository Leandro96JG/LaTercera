---
name: angular-router-lazy-loading
description: >-
  Enrutamiento declarativo moderno, Lazy Loading y Guards funcionales en Angular (v17/18/19/21+).
  Úsalo cuando el usuario necesite configurar rutas con `loadComponent`, implementar `CanActivateFn`,
  vincular parámetros de URL a inputs de componentes (`withComponentInputBinding`), o integrar View Transitions.
---

# Angular Router: Enrutamiento Declarativo, Carga Perezosa y Guards Funcionales

Esta guía detalla la configuración de rutas escalables en Angular Moderno sin dependencias de `NgModule`.

---

## 1. Definición de Rutas con Carga Perezosa (`loadComponent`)

Cada pantalla o vista principal debe cargarse de forma diferida mediante funciones de importación dinámica:

```typescript
import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'La Tercera Fotografía | Portafolio Deportivo & Social',
    loadComponent: () => import('./features/portfolio/portfolio.component').then(m => m.PortfolioComponent)
  },
  {
    path: 'album/:slug',
    title: 'Galería de Álbum | La Tercera',
    loadComponent: () => import('./features/album-gallery/album-gallery.component').then(m => m.AlbumGalleryComponent)
  },
  {
    path: 'pago-exitoso',
    title: '¡Pago Exitoso! Descarga tus Fotos | La Tercera',
    loadComponent: () => import('./features/payment-success/payment-success.component').then(m => m.PaymentSuccessComponent)
  },
  {
    path: 'admin',
    title: 'Panel de Control | La Tercera',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./features/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
```

---

## 2. Parámetros de Ruta Directos como Signal Inputs (`withComponentInputBinding`)

Habilitado en `app.config.ts`, permite recibir parámetros de ruta (`:slug`), query params (`?token=xyz`) y datos resueltos directamente como inputs en el componente:

```typescript
import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  template: `<h1>Álbum: {{ slug() }}</h1>`
})
export class AlbumGalleryComponent {
  // Se mapea automáticamente desde la ruta /album/:slug
  readonly slug = input.required<string>();
  
  // Se mapea automáticamente desde query param ?token=...
  readonly token = input<string>();
}
```

---

## 3. Guards Funcionales (`CanActivateFn`)

Evitar clases inyectables legadas para guards; preferir funciones puras y composables:

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthStore } from '../state/admin-auth.store';

export const adminAuthGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AdminAuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated() && authStore.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
```
