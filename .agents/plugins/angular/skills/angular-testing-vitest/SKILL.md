---
name: angular-testing-vitest
description: >-
  Pruebas unitarias de componentes y servicios en Angular Moderno con Vitest y TestBed.
  Úsalo cuando el usuario necesite escribir o corregir pruebas unitarias, probar componentes con Signals,
  simular peticiones HTTP con `provideHttpClientTesting()`, o validar interacción con el DOM sin Karma.
---

# Angular Testing con Vitest: Componentes Standalone, Signals y TestBed

Esta guía detalla cómo crear suites de pruebas unitarias ultrarrápidas y deterministas en Angular utilizando Vitest y Angular TestBed.

---

## 1. Configuración de Pruebas para Componentes Standalone

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PhotoCardComponent } from './photo-card.component';

describe('PhotoCardComponent', () => {
  let component: PhotoCardComponent;
  let fixture: ComponentFixture<PhotoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoCardComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar la insignia de muestra HD cuando isSample es true', () => {
    // Asignar input signal
    fixture.componentRef.setInput('photo', {
      id: 'photo-1',
      previewUrl: 'https://cdn.example.com/photo.webp',
      isSample: true,
      price: 1500
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.badge-hd');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('⭐ Muestra HD');
  });
});
```

---

## 2. Pruebas Unitarias de Signal Stores

Las pruebas de estado reactivo no requieren TestBed completo si no interactúan con el DOM, lo que las hace instantáneas:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CartStore } from './cart.store';

describe('CartStore', () => {
  let store: CartStore;

  beforeEach(() => {
    store = new CartStore();
  });

  it('debe calcular el total correctamente y aplicar cupones de descuento', () => {
    expect(store.total()).toBe(0);

    store.addItem({ id: 'p1', unitPrice: 1000 });
    store.addItem({ id: 'p2', unitPrice: 2000 });

    expect(store.count()).toBe(2);
    expect(store.total()).toBe(3000);

    store.applyCoupon('YUYO10');
    expect(store.total()).toBe(2700); // 10% de descuento
  });
});
```

---

## 3. Pruebas de Servicios HTTP con `HttpTestingController`

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DeliveryService } from './delivery.service';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DeliveryService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(DeliveryService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe consultar la información de descarga por token', async () => {
    const promise = service.getDownloadInfo('token-123');

    const req = httpTesting.expectOne('/api/downloads/token-123/info');
    expect(req.request.method).toBe('GET');

    req.flush({
      orderId: 'ord-1',
      totalPhotos: 5,
      downloadUrl: 'https://cdn.example.com/zip'
    });

    const result = await promise;
    expect(result.orderId).toBe('ord-1');
    expect(result.totalPhotos).toBe(5);
  });
});
```
