import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LightboxComponent } from './lightbox.component';
import { Photo } from '../../core/models/photo.model';
import { describe, it, expect, beforeEach } from 'vitest';

describe('LightboxComponent (Visor Cinemático Táctil)', () => {
  let component: LightboxComponent;
  let fixture: ComponentFixture<LightboxComponent>;

  const mockPhoto: Photo = {
    id: 'photo-lightbox-1',
    albumId: 'album-1',
    title: 'Jugada en el área chica',
    previewUrl: 'https://example.com/p1.webp',
    originalWidth: 4000,
    originalHeight: 3000,
    isSampleHD: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LightboxComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LightboxComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente y no renderizar si isOpen es falso', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('.fixed');
    expect(backdrop).toBeNull();
  });

  it('debe renderizar la foto, el contador y no superponer marca de agua HTML cuando isOpen es verdadero', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.componentRef.setInput('currentIndex', 2);
    fixture.componentRef.setInput('totalCount', 10);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Foto 3 de 10');
    expect(compiled.textContent).toContain('Muestra HD Original');
    expect(compiled.textContent).not.toContain('LA TERCERA • MUESTRA');
  });

  it('debe emitir close al hacer clic en el botón de cerrar o presionar Escape', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.detectChanges();

    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    const closeBtn = fixture.nativeElement.querySelector('button[aria-label="Cerrar visor cinemático"]') as HTMLButtonElement;
    closeBtn.click();
    expect(closed).toBe(true);

    closed = false;
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(true);
  });

  it('debe emitir next y prev con teclado o flechas', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.detectChanges();

    let nextCalled = false;
    let prevCalled = false;
    component.next.subscribe(() => nextCalled = true);
    component.prev.subscribe(() => prevCalled = true);

    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nextCalled).toBe(true);

    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(prevCalled).toBe(true);
  });

  it('debe emitir toggleSelect al pulsar el botón de carrito rápido', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.componentRef.setInput('isSelected', false);
    fixture.detectChanges();

    let emittedPhoto: Photo | undefined;
    component.toggleSelect.subscribe((p) => emittedPhoto = p);

    const btn = fixture.nativeElement.querySelector('button[aria-label="Sumar al carrito"]') as HTMLButtonElement;
    btn.click();

    expect(emittedPhoto).toEqual(mockPhoto);
  });

  it('debe detectar swipe horizontal para avanzar (swipe izquierda) o retroceder (swipe derecha)', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.detectChanges();

    let nextCalled = false;
    let prevCalled = false;
    component.next.subscribe(() => nextCalled = true);
    component.prev.subscribe(() => prevCalled = true);

    // Swipe izquierda (avance a la siguiente foto)
    component.onTouchStart({
      touches: [{ clientX: 200, clientY: 100 }]
    } as unknown as TouchEvent);
    component.onTouchMove({
      touches: [{ clientX: 120, clientY: 100 }] // dx = -80
    } as unknown as TouchEvent);
    component.onTouchEnd();

    expect(nextCalled).toBe(true);

    // Swipe derecha (retroceso a la anterior foto)
    component.onTouchStart({
      touches: [{ clientX: 100, clientY: 100 }]
    } as unknown as TouchEvent);
    component.onTouchMove({
      touches: [{ clientX: 180, clientY: 100 }] // dx = +80
    } as unknown as TouchEvent);
    component.onTouchEnd();

    expect(prevCalled).toBe(true);
  });

  it('debe detectar swipe hacia abajo para cerrar el visor', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.detectChanges();

    let closed = false;
    component.close.subscribe(() => (closed = true));

    component.onTouchStart({
      touches: [{ clientX: 100, clientY: 100 }]
    } as unknown as TouchEvent);
    component.onTouchMove({
      touches: [{ clientX: 100, clientY: 200 }] // dy = +100
    } as unknown as TouchEvent);
    component.onTouchEnd();

    expect(closed).toBe(true);
  });

  it('debe alternar zoomScale entre 1 y 2.2 al invocar toggleZoom o pulsar el botón de lupa', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.detectChanges();

    expect(component.zoomScale()).toBe(1);

    const zoomBtn = fixture.nativeElement.querySelector('button[aria-label="Ampliar muestra a 2.2x"]') as HTMLButtonElement;
    expect(zoomBtn).toBeTruthy();
    zoomBtn.click();
    fixture.detectChanges();

    expect(component.zoomScale()).toBe(2.2);
    expect(component.touchTransform()).toContain('scale(2.2)');

    // Volver a hacer clic para reducir a 1x
    zoomBtn.click();
    fixture.detectChanges();
    expect(component.zoomScale()).toBe(1);
  });

  it('debe bloquear swipe para avanzar o cerrar cuando el zoom está activo (> 1)', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.detectChanges();

    let nextCalled = false;
    let closed = false;
    component.next.subscribe(() => (nextCalled = true));
    component.close.subscribe(() => (closed = true));

    // Activar zoom
    component.toggleZoom();
    expect(component.zoomScale()).toBe(2.2);

    // Intentar swipe horizontal con zoom activo
    component.onTouchStart({
      touches: [{ clientX: 300, clientY: 100 }]
    } as unknown as TouchEvent);
    component.onTouchMove({
      touches: [{ clientX: 100, clientY: 100 }] // dx = -200
    } as unknown as TouchEvent);
    component.onTouchEnd();

    // No debe disparar next
    expect(nextCalled).toBe(false);

    // Intentar swipe vertical hacia abajo con zoom activo
    component.onTouchStart({
      touches: [{ clientX: 100, clientY: 100 }]
    } as unknown as TouchEvent);
    component.onTouchMove({
      touches: [{ clientX: 100, clientY: 300 }] // dy = +200
    } as unknown as TouchEvent);
    component.onTouchEnd();

    // No debe disparar close
    expect(closed).toBe(false);
  });

  it('debe resetear zoomScale a 1 al cambiar de foto o al invocar resetZoom', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.componentRef.setInput('currentIndex', 0);
    fixture.detectChanges();

    component.toggleZoom();
    expect(component.zoomScale()).toBe(2.2);

    // Cambiar de foto
    fixture.componentRef.setInput('currentIndex', 1);
    fixture.detectChanges();

    expect(component.zoomScale()).toBe(1);
  });

  it('debe detectar doble toque táctil (<280ms) para alternar zoom', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.detectChanges();

    expect(component.zoomScale()).toBe(1);

    // Primer toque (tap)
    component.onTouchStart({
      touches: [{ clientX: 150, clientY: 150 }]
    } as unknown as TouchEvent);
    component.onTouchEnd();
    expect(component.zoomScale()).toBe(1);

    // Segundo toque rápido (doble tap en menos de 280ms)
    component.onTouchStart({
      touches: [{ clientX: 150, clientY: 150 }]
    } as unknown as TouchEvent);

    expect(component.zoomScale()).toBe(2.2);
  });

  it('debe mostrar el botón de Descargar HD cuando isFreeDownload es true y renderizar el enlace correcto', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentPhoto', mockPhoto);
    fixture.componentRef.setInput('currentIndex', 0);
    fixture.componentRef.setInput('totalCount', 10);
    fixture.componentRef.setInput('isFreeDownload', true);
    fixture.componentRef.setInput('albumId', 'album-1');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Descargar HD');
    const downloadLink = compiled.querySelector('a[download]') as HTMLAnchorElement;
    expect(downloadLink).not.toBeNull();
    expect(downloadLink.getAttribute('href')).toContain('/api/downloads/free/album-1/photo/photo-lightbox-1');
  });
});

