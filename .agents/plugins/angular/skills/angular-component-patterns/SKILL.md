---
name: angular-component-patterns
description: >-
  Patrones arquitectónicos de componentes en Angular Moderno (v17/18/19/21+).
  Úsalo cuando el usuario solicite crear componentes Standalone, implementar entradas y salidas con Signals (`input()`, `output()`),
  utilizar flujo de control integrado (`@if`, `@for`, `@switch`), vistas diferidas (`@defer`) o inyección con `inject()`.
---

# Angular Component Patterns: Standalone, Signals I/O y Control Flow

Esta guía detalla la anatomía de componentes modernos de alto rendimiento en Angular, maximizando la legibilidad y eliminando código repetitivo (*boilerplate*).

---

## 1. Estructura Estándar de Componente Moderno

```typescript
import { 
  Component, 
  ChangeDetectionStrategy, 
  input, 
  output, 
  computed, 
  inject 
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PhotoCardData {
  id: string;
  previewUrl: string;
  isSample: boolean;
  price: number;
}

@Component({
  selector: 'app-photo-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="photo-card" (click)="onSelect()">
      <img [src]="photo().previewUrl" [alt]="'Foto ' + photo().id" loading="lazy" />
      
      @if (photo().isSample) {
        <span class="badge-hd">⭐ Muestra HD</span>
      }

      <div class="footer">
        <span class="price">\${{ formattedPrice() }}</span>
        <button type="button" (click)="buyClicked.emit(photo().id)">
          Comprar
        </button>
      </div>
    </article>
  `,
  styles: [`
    .photo-card { border-radius: 1rem; overflow: hidden; position: relative; }
    .badge-hd { position: absolute; top: 0.5rem; left: 0.5rem; }
  `]
})
export class PhotoCardComponent {
  // 1. Signal Inputs
  readonly photo = input.required<PhotoCardData>();
  readonly isSelected = input<boolean>(false);

  // 2. Signal Outputs
  readonly photoSelected = output<string>();
  readonly buyClicked = output<string>();

  // 3. Computed derivados del input
  readonly formattedPrice = computed(() => this.photo().price.toLocaleString('es-AR'));

  // 4. Métodos de interacción
  onSelect(): void {
    this.photoSelected.emit(this.photo().id);
  }
}
```

---

## 2. Flujo de Control Integrado (Built-in Control Flow)

### A. Condicionales (@if, @else if, @else)
```html
@if (authStore.isAdmin()) {
  <app-admin-toolbar />
} @else if (authStore.isAuthenticated()) {
  <app-user-profile />
} @else {
  <button (click)="openLogin()">Ingresar</button>
}
```

### B. Bucles (@for) con Bloque Vacío (@empty)
```html
@for (album of albums(); track album.id) {
  <app-bento-album-card [album]="album" />
} @empty {
  <div class="empty-state">
    <p>No se encontraron álbumes disponibles.</p>
  </div>
}
```

### C. Conmutadores (@switch)
```html
@switch (order.status) {
  @case ('PAID') {
    <span class="tag green">Pagado</span>
  }
  @case ('PENDING') {
    <span class="tag yellow">Pendiente</span>
  }
  @default {
    <span class="tag gray">Cancelado</span>
  }
}
```

---

## 3. Vistas Diferidas (@defer)

Reducir el tamaño inicial del bundle cargando componentes pesados solo cuando son necesarios o visibles en pantalla:

```html
<!-- Cargar galería pesada solo cuando entra en el viewport del usuario -->
@defer (on viewport) {
  <app-heavy-photo-gallery [albumId]="album.id" />
} @placeholder {
  <div class="h-64 bg-zinc-100 animate-pulse rounded-2xl flex items-center justify-center">
    <span>Cargando galería...</span>
  </div>
} @loading (minimum 200ms) {
  <div class="spinner">Descargando recursos...</div>
} @error {
  <p class="text-red-500">Error al cargar la galería.</p>
}
```

---

## 4. Inyección de Dependencias con `inject()`

Evitar constructores inflados y facilitar la composición funcional:

```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CartStore } from './cart.store';
import { DeliveryService } from './delivery.service';

@Component({ ... })
export class CheckoutComponent {
  private readonly router = inject(Router);
  readonly cart = inject(CartStore);
  private readonly delivery = inject(DeliveryService);
}
```
