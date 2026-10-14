---
name: angular-zoneless-performance
description: >-
  Migración y optimización de rendimiento Zoneless en Angular (v18/19/21+).
  Úsalo cuando el usuario solicite migrar una aplicación a Zoneless (`provideZonelessChangeDetection`),
  eliminar Zone.js del bundle, optimizar ciclos de renderizado con Signals, o auditar el rendimiento móvil con 60/120fps.
---

# Angular Zoneless & Rendimiento de Alta Frecuencia

Esta guía describe cómo prescindir de `zone.js` mediante la arquitectura Zoneless nativa de Angular, reduciendo el tamaño del bundle y logrando detección de cambios granular a 60/120fps.

---

## 1. Habilitación de Zoneless en `app.config.ts`

En Angular moderno, la detección de cambios sin Zone.js se activa en los proveedores raíz:

```typescript
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Detección de cambios puramente reactiva por Signals
    provideZonelessChangeDetection(),
    
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions() // Animaciones fluidas nativas entre vistas
    ),
    provideHttpClient()
  ]
};
```

### Eliminación de `zone.js`:
1. En `angular.json`, remover `zone.js` del array `polyfills`.
2. En `package.json`, `zone.js` pasa a ser prescindible si ninguna librería legacy lo requiere.

---

## 2. Invariantes de Código Zoneless

Para que un componente funcione impecablemente sin Zone.js:
1. **Actualizaciones Notificadas:** Toda mutación de estado que deba refrescar la interfaz de usuario DEBE originarse en un `signal()`, un evento del DOM (`(click)`), una entrada `input()`, o un observable gestionado con `toSignal()`.
2. **Prohibido `mutate()`:** En Angular moderno, `signal.mutate()` está obsoleto; usar siempre `signal.update(prev => ...)` o `signal.set(...)`.
3. **Async APIs Nativas:** `setTimeout` y `fetch` ya no disparan ciclos globales de detección; las vistas se programan para actualizarse solo si se modifican Signals.

---

## 3. Uso de la Herramienta MCP Oficial `zoneless_migration`

El servidor oficial `@angular/cli mcp` incluye la herramienta `zoneless_migration`. Puedes invocarla para:
- Analizar el workspace en busca de incompatibilidades con Zoneless.
- Detectar dependencias de `NgZone.run()` o `ChangeDetectorRef.detectChanges()`.
- Generar sugerencias automatizadas de refactorización hacia Signals.

---

## 4. Optimización para Pantallas de 120Hz (Mobile-First)

1. **Compositor GPU Puro:** Animar exclusivamente `transform` y `opacity`.
2. **Propiedades CSS de Contención:**
   ```css
   .gallery-grid {
     contain: layout style paint;
     content-visibility: auto;
   }
   ```
3. **Supresión de Retardo Táctil:**
   ```css
   button, a, .clickable-card {
     touch-action: manipulation;
     -webkit-tap-highlight-color: transparent;
   }
   ```
4. **Respeto a Preferencias de Movimiento:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
