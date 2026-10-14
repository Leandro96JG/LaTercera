---
name: angular-accessibility-axe
description: >-
  Estándares de accesibilidad (a11y), cumplimiento WCAG AA y auditorías AXE en Angular.
  Úsalo cuando el usuario solicite auditar o implementar accesibilidad web, atrapar foco en modales/diálogos,
  configurar atributos ARIA, navegación por teclado o soporte para lectores de pantalla.
---

# Angular Accessibility (a11y) & Directrices WCAG AA

Esta guía detalla cómo diseñar interfaces accesibles y libres de barreras siguiendo los estándares oficiales de Angular y WCAG 2.1 AA.

---

## 1. Principio Fundamental Oficial de Angular

> **Requisito Oficial:** Toda interfaz debe superar las comprobaciones de **AXE** y cumplir con los mínimos de **WCAG AA**, incluyendo gestión de foco, contraste de color y roles ARIA.

---

## 2. Pautas Técnicas Esenciales

### A. Semántica de Botones y Enlaces
- Usar `<button>` para acciones (`(click)`) y `<a>` para navegación (`href`, `routerLink`). Nunca `<div (click)="...">` sin teclado y rol.
- Si un botón solo contiene un ícono visual, es **obligatorio** proveer `aria-label`:
  ```html
  <button type="button" aria-label="Cerrar modal de compra" (click)="close()">
    <svg aria-hidden="true">...</svg>
  </button>
  ```

### B. Gestión de Foco en Modales y Diálogos
Al abrir un diálogo o modal Bento:
1. El foco debe desplazarse automáticamente al primer elemento interactivo o al contenedor con `tabindex="-1"`.
2. El foco debe quedar atrapado dentro del modal (*Focus Trap*), impidiendo que la tecla `Tab` navegue por el fondo.
3. Al presionar `Escape`, el modal debe cerrarse y devolver el foco al botón que lo abrió.

```typescript
@Component({
  template: `
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
      (keydown.escape)="close()"
      tabindex="-1"
      class="modal-backdrop">
      <h2 id="modal-title">{{ title() }}</h2>
      ...
    </div>
  `
})
export class BentoModalComponent implements AfterViewInit {
  private readonly elementRef = inject(ElementRef);

  ngAfterViewInit(): void {
    // Foco automático accesible
    this.elementRef.nativeElement.focus();
  }
}
```

### C. Imágenes y Optimización Visual
- Usar `alt=""` para imágenes puramente decorativas (fondos, sombras).
- Usar descripciones semánticas claras en fotos de catálogo (ej.: `alt="Jugada de gol - Torneo Apertura 2026"`).
- Emplear `NgOptimizedImage` para imágenes estáticas servidas desde CDN:
  ```html
  <img [ngSrc]="photo.previewUrl" width="800" height="600" priority alt="..." />
  ```

### D. Formularios y Mensajes de Error
- Vincular siempre `<label for="id_campo">` con el `<input id="id_campo">`.
- Usar `aria-invalid="true"` y `aria-describedby="error-id"` cuando un campo presente un error de validación.
