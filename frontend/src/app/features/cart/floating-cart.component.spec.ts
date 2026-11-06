import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FloatingCartComponent } from './floating-cart.component';
import { CartStore } from '../../core/state/cart.store';
import { Photo } from '../../core/models/photo.model';

describe('FloatingCartComponent', () => {
  let component: FloatingCartComponent;
  let fixture: ComponentFixture<FloatingCartComponent>;
  let cartStore: CartStore;

  const mockPhoto: Photo = {
    id: 'photo-cart-1',
    albumId: 'album-teso',
    title: 'Remate al arco',
    previewUrl: 'https://example.com/p1.webp',
    originalWidth: 4000,
    originalHeight: 3000,
    isSampleHD: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingCartComponent],
      providers: [
        CartStore,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingCartComponent);
    component = fixture.componentInstance;
    cartStore = TestBed.inject(CartStore);
    cartStore.clearCart();
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('no debe renderizar nada cuando el carrito está vacío', () => {
    cartStore.clearCart();
    fixture.detectChanges();

    const aside = fixture.nativeElement.querySelector('aside');
    expect(aside).toBeNull();
  });

  it('debe renderizar la píldora flotante cuando hay fotos seleccionadas', () => {
    cartStore.setAlbumPricing('album-teso', 9500, 1200);
    cartStore.togglePhoto(mockPhoto);
    fixture.detectChanges();

    const aside = fixture.nativeElement.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('1');
    expect(fixture.nativeElement.textContent).toContain('Comprar');
  });

  it('debe expandir el drawer al llamar a toggleExpanded y cerrarlo con closeExpanded', () => {
    cartStore.setAlbumPricing('album-teso', 9500, 1200);
    cartStore.togglePhoto(mockPhoto);
    fixture.detectChanges();

    expect(component.isExpanded()).toBe(false);

    component.toggleExpanded();
    fixture.detectChanges();
    expect(component.isExpanded()).toBe(true);

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Fotos en el Carrito');

    component.closeExpanded();
    fixture.detectChanges();
    expect(component.isExpanded()).toBe(false);
  });

  it('debe emitir checkout al hacer clic en el botón Comprar de la píldora flotante', () => {
    cartStore.setAlbumPricing('album-teso', 9500, 1200);
    cartStore.togglePhoto(mockPhoto);
    fixture.detectChanges();

    let checkoutEmitted = false;
    component.checkout.subscribe(() => {
      checkoutEmitted = true;
    });

    const buyButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b: any) => b.textContent?.includes('Comprar')
    ) as HTMLButtonElement;
    expect(buyButton).toBeDefined();

    buyButton.click();
    expect(checkoutEmitted).toBe(true);
  });

  it('debe renderizar la píldora verde de cortesía cuando isFreeAlbum es true y hay fotos gratuitas elegidas', () => {
    fixture.componentRef.setInput('isFreeAlbum', true);
    fixture.componentRef.setInput('activeAlbumId', 'album-gratis');
    cartStore.clearFreeSelection();
    cartStore.toggleFreePhoto(mockPhoto);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cortesía Gratis');
    expect(compiled.textContent).toContain('Descargar Selección (ZIP)');
  });

  it('debe mostrar el drawer de cortesía con opciones de descarga ZIP al expandir', () => {
    fixture.componentRef.setInput('isFreeAlbum', true);
    fixture.componentRef.setInput('activeAlbumId', 'album-gratis');
    cartStore.clearFreeSelection();
    cartStore.toggleFreePhoto(mockPhoto);
    component.toggleExpanded();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Lote de Cortesía (1 fotos)');
    expect(compiled.textContent).toContain('Descargar Todo el Álbum (ZIP)');
    expect(compiled.textContent).toContain('Descargar Selección (1 Fotos ZIP)');

    // Remover la foto libre
    component.removeFreePhoto(mockPhoto.id);
    fixture.detectChanges();
    expect(cartStore.hasFreeItems()).toBe(false);
  });
});
