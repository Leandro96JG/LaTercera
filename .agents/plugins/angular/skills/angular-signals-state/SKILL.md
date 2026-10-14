---
name: angular-signals-state
description: >-
  Gestión de estado reactivo con Signals en Angular (v17/18/19/21+).
  Úsalo cuando el usuario necesite crear o refactorizar estados reactivos, implementar Signals (`signal`, `computed`, `effect`),
  diseñar Signal Stores, combinar RxJS con `toSignal` / `toObservable`, o configurar detección de cambios `OnPush`.
---

# Angular Signals & Estado Reactivo: Guía y Patrones de Arquitectura

Esta guía detalla la implementación y mejores prácticas para la gestión de estado reactivo utilizando Angular Signals y la estrategia `ChangeDetectionStrategy.OnPush`.

---

## 1. Fundamentos de Signals

Los Signals proporcionan una reactividad granular y predecible sin depender del ciclo de comprobación de cambios de Zone.js.

### A. Señal Mutable (`signal`)
```typescript
import { signal } from '@angular/core';

// Declaración
const count = signal<number>(0);

// Lectura (invocando la señal como función)
console.log(count()); // 0

// Actualización directa
count.set(5);

// Actualización basada en el valor previo
count.update(prev => prev + 1);
```

### B. Señal Computada Derivada (`computed`)
Las señales computadas son de solo lectura y se recalculan perezosamente (*memoized*) solo cuando sus dependencias cambian:

```typescript
import { signal, computed } from '@angular/core';

const items = signal<{ id: string; price: number }[]>([]);
const discount = signal<number>(0.1); // 10%

// Computada pura sin efectos secundarios
const subtotal = computed(() => items().reduce((acc, it) => acc + it.price, 0));
const total = computed(() => Math.round(subtotal() * (1 - discount())));
```

---

## 2. Patrón Signal Store para Gestión de Estado Centralizada

Para módulos o características complejas (como carritos, autenticación o filtros), estructurar un Store inyectable con señales privadas y derivadas públicas:

```typescript
import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  id: string;
  unitPrice: number;
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  // Estado privado mutable
  private readonly _items = signal<CartItem[]>([]);
  private readonly _coupon = signal<string | null>(null);

  // Exposición pública de solo lectura
  readonly items = this._items.asReadonly();
  readonly coupon = this._coupon.asReadonly();
  readonly count = computed(() => this._items().length);
  
  readonly total = computed(() => {
    const raw = this._items().reduce((acc, it) => acc + it.unitPrice, 0);
    return this._coupon() === 'YUYO10' ? Math.round(raw * 0.9) : raw;
  });

  // Métodos de mutación controlada
  addItem(item: CartItem): void {
    this._items.update(current => [...current, item]);
  }

  removeItem(id: string): void {
    this._items.update(current => current.filter(it => it.id !== id));
  }

  applyCoupon(code: string): void {
    this._coupon.set(code.trim().toUpperCase());
  }

  clear(): void {
    this._items.set([]);
    this._coupon.set(null);
  }
}
```

---

## 3. Interoperabilidad con RxJS (`toSignal` y `toObservable`)

Para flujos asíncronos que requieren operadores de tiempo (debounce, merge, switchMap) o eventos de red:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <input [formControl]="searchControl" placeholder="Buscar álbum...">
    <p>Resultados encontrados: {{ searchResults()?.length ?? 0 }}</p>
  `
})
export class AlbumSearchComponent {
  private readonly http = inject(HttpClient);
  readonly searchControl = new FormControl('', { nonNullable: true });

  // Convertir el flujo reactivo de búsqueda en una Señal
  readonly searchResults = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.http.get<any[]>(`/api/albums?q=${encodeURIComponent(query)}`))
    ),
    { initialValue: [] }
  );
}
```

---

## 4. Efectos Controlados (`effect`)

Usar `effect()` para sincronizar con APIs externas o almacenamiento local:

```typescript
import { Injectable, effect, inject } from '@angular/core';
import { CartStore } from './cart.store';

@Injectable({ providedIn: 'root' })
export class CartStorageSyncService {
  private readonly cart = inject(CartStore);

  constructor() {
    effect(() => {
      // Se ejecuta automáticamente cada vez que cambien los items del carrito
      const items = this.cart.items();
      localStorage.setItem('cart_items', JSON.stringify(items));
    });
  }
}
```
