import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PhotoCardPolaroidComponent } from './photo-card-polaroid.component';
import { Photo } from '../../core/models/photo.model';
import { describe, it, expect, beforeEach } from 'vitest';

describe('PhotoCardPolaroidComponent', () => {
  let component: PhotoCardPolaroidComponent;
  let fixture: ComponentFixture<PhotoCardPolaroidComponent>;

  const mockPhoto: Photo = {
    id: 'photo-101',
    albumId: 'album-teso',
    title: 'Defensa de Andino despejando el balón',
    previewUrl: 'https://example.com/photo-101-preview.webp',
    originalWidth: 4000,
    originalHeight: 3000,
    isSampleHD: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoCardPolaroidComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoCardPolaroidComponent);
    component = fixture.componentInstance;
  });

  it('debe crear el componente correctamente', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('debe calcular rotaciones orgánicas alternadas según el índice', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('unitPrice', 1200);

    fixture.componentRef.setInput('index', 0);
    expect(component.rotationValue()).toBe(-1.5);
    expect(component.rotationDeg()).toBe('-1.5deg');

    fixture.componentRef.setInput('index', 1);
    expect(component.rotationValue()).toBe(1.3);
    expect(component.rotationDeg()).toBe('1.3deg');

    fixture.componentRef.setInput('index', 2);
    expect(component.rotationValue()).toBe(-1.1);

    fixture.componentRef.setInput('index', 3);
    expect(component.rotationValue()).toBe(1.5);
  });

  it('debe mostrar el estado Skeleton Shimmer inicialmente y ocultarlo al cargar la imagen', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.detectChanges();

    expect(component.isLoading()).toBe(true);

    component.onImageLoaded();
    expect(component.isLoading()).toBe(false);
  });

  it('debe emitir toggleSelect al hacer clic en el botón + Elegir', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.componentRef.setInput('isSelected', false);
    fixture.detectChanges();

    let emittedPhoto: Photo | undefined;
    component.toggleSelect.subscribe((p) => {
      emittedPhoto = p;
    });

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('+ Elegir');
    button.click();

    expect(emittedPhoto).toEqual(mockPhoto);
  });

  it('debe emitir toggleSelect al hacer clic en el botón ✓ Elegida para deseleccionar', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.componentRef.setInput('isSelected', true);
    fixture.detectChanges();

    let emittedPhoto: Photo | undefined;
    component.toggleSelect.subscribe((p) => {
      emittedPhoto = p;
    });

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('✓ Elegida');
    button.click();

    expect(emittedPhoto).toEqual(mockPhoto);
  });

  it('debe emitir toggleSelect al hacer clic en la superficie de la tarjeta polaroid fuera de la imagen', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.componentRef.setInput('isSelected', false);
    fixture.detectChanges();

    let emittedPhoto: Photo | undefined;
    component.toggleSelect.subscribe((p) => {
      emittedPhoto = p;
    });

    const card = fixture.nativeElement.querySelector('article') as HTMLElement;
    card.click();

    expect(emittedPhoto).toEqual(mockPhoto);
  });

  it('debe emitir openViewer al hacer clic en el contenedor de la imagen sin emitir toggleSelect', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 3);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.detectChanges();

    let emittedViewer: { photo: Photo; index: number } | undefined;
    let emittedToggle: Photo | undefined;
    component.openViewer.subscribe((evt) => {
      emittedViewer = evt;
    });
    component.toggleSelect.subscribe((p) => {
      emittedToggle = p;
    });

    const imgContainer = fixture.nativeElement.querySelector('[role="button"]') as HTMLElement;
    imgContainer.click();

    expect(emittedViewer).toEqual({ photo: mockPhoto, index: 3 });
    expect(emittedToggle).toBeUndefined();
  });

  it('debe mostrar la insignia de Muestra HD si la foto lo indica', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Muestra HD');
  });

  it('no debe superponer la marca de agua HTML en el DOM porque viene grabada en los píxeles del WebP', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('LA TERCERA • MUESTRA');
  });

  it('debe activar hasError y renderizar el placeholder estético de La Tercera si la imagen falla al cargar', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.detectChanges();

    expect(component.hasError()).toBe(false);

    // Simular error de carga de imagen
    component.onImageError();
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(component.isLoading()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('La Tercera');
    expect(compiled.textContent).toContain('Procesando muestra HD');
    expect(compiled.querySelector('img')).toBeNull(); // No debe mostrar el img roto
  });

  it('debe renderizar el overlay de brillo fotográfico gloss y aplicar la clase is-selected', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.componentRef.setInput('isSelected', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.gloss-overlay')).not.toBeNull();
    expect(compiled.querySelector('.gloss-shine')).not.toBeNull();
    const card = compiled.querySelector('.polaroid-card') as HTMLElement;
    expect(card.classList.contains('is-selected')).toBe(true);
  });

  it('debe calcular el staggerDelay de entrada en cascada a partir del index', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 5);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.detectChanges();

    expect(component.staggerDelay()).toBe((5 * 45) + 'ms');
  });

  it('debe mostrar el botón de Descargar HD cuando isFreeDownload es true y renderizar el enlace correcto', () => {
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('unitPrice', 1200);
    fixture.componentRef.setInput('isFreeDownload', true);
    fixture.componentRef.setInput('albumId', 'album-teso');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Descargar HD');
    const downloadLink = compiled.querySelector('a[download]') as HTMLAnchorElement;
    expect(downloadLink).not.toBeNull();
    expect(downloadLink.getAttribute('href')).toContain('/api/downloads/free/album-teso/photo/photo-101');
  });
});
