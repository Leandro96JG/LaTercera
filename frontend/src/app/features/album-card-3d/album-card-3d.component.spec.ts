import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlbumCard3dComponent } from './album-card-3d.component';
import { Album } from '../../core/models/album.model';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('AlbumCard3dComponent', () => {
  let component: AlbumCard3dComponent;
  let fixture: ComponentFixture<AlbumCard3dComponent>;

  const mockPublicAlbum: Album = {
    id: 'album-teso',
    category: 'futbol',
    title: 'Atlético Tesorieri vs Andino SC',
    subtitle: 'Liga Riojana • Fecha 7',
    date: '12 Octubre, 2026',
    eventTime: '18:30',
    location: 'Estadio Mercado Luna',
    photosCount: 48,
    unitPrice: 1200,
    fullAlbumPrice: 9500,
    coverUrl: 'https://example.com/cover.webp',
    badge: '⚽ Fútbol'
  };

  const mockPrivateAlbum: Album = {
    id: 'album-private',
    category: 'sociales',
    title: 'Fiesta Privada 15 Años',
    subtitle: 'Salón Las Retamas',
    date: '10 Octubre, 2026',
    photosCount: 60,
    unitPrice: 1500,
    fullAlbumPrice: 12000,
    coverUrl: 'https://example.com/private.webp',
    badge: '🎉 Cumpleaños',
    isPrivate: true,
    accessCode: '1234'
  };

  const mockFreeAlbum: Album = {
    id: 'album-free',
    category: 'hockey',
    title: 'Torneo Provincial de Hockey',
    subtitle: 'Finales',
    date: '8 Octubre, 2026',
    photosCount: 30,
    unitPrice: 1200,
    fullAlbumPrice: 9500,
    coverUrl: 'https://example.com/free.webp',
    badge: '🏑 Hockey',
    isFreeDownload: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumCard3dComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumCard3dComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debe crear el componente correctamente', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('debe renderizar el título, el badge y la cantidad de fotos', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Atlético Tesorieri vs Andino SC');
    expect(compiled.textContent).toContain('⚽ Fútbol');
    expect(compiled.textContent).toContain('48 fotos');
  });

  it('debe emitir selectAlbum al hacer clic en un álbum público', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    let emittedAlbum: Album | undefined;
    component.selectAlbum.subscribe((alb) => {
      emittedAlbum = alb;
    });

    const card = fixture.nativeElement.querySelector('.album-card-root') as HTMLElement;
    card.click();

    expect(emittedAlbum).toEqual(mockPublicAlbum);
  });

  it('debe emitir selectAlbum al presionar Enter sobre la tarjeta', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    let emittedAlbum: Album | undefined;
    component.selectAlbum.subscribe((alb) => {
      emittedAlbum = alb;
    });

    const card = fixture.nativeElement.querySelector('.album-card-root') as HTMLElement;
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emittedAlbum).toEqual(mockPublicAlbum);
  });

  it('debe emitir openPinModal al hacer clic en un álbum privado bloqueado', () => {
    fixture.componentRef.setInput('album', mockPrivateAlbum);
    fixture.componentRef.setInput('isUnlocked', false);
    fixture.detectChanges();

    let pinAlbum: Album | undefined;
    component.openPinModal.subscribe((alb) => {
      pinAlbum = alb;
    });

    const card = fixture.nativeElement.querySelector('.album-card-root') as HTMLElement;
    card.click();

    expect(pinAlbum).toEqual(mockPrivateAlbum);
  });

  it('debe emitir selectAlbum al hacer clic en un álbum privado si ya está desbloqueado', () => {
    fixture.componentRef.setInput('album', mockPrivateAlbum);
    fixture.componentRef.setInput('isUnlocked', true);
    fixture.detectChanges();

    let emittedAlbum: Album | undefined;
    component.selectAlbum.subscribe((alb) => {
      emittedAlbum = alb;
    });

    const card = fixture.nativeElement.querySelector('.album-card-root') as HTMLElement;
    card.click();

    expect(emittedAlbum).toEqual(mockPrivateAlbum);
  });

  it('debe mostrar la insignia de GRATIS HD y Cortesía Oficial en álbum gratuito sin cajas de precio', () => {
    fixture.componentRef.setInput('album', mockFreeAlbum);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('GRATIS HD');
    expect(compiled.textContent).toContain('Cortesía Oficial');
    expect(compiled.querySelectorAll('.price-box').length).toBe(0);
  });

  it('debe mostrar las dos cajitas de precio formateado es-AR en un álbum pago', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const boxes = compiled.querySelectorAll('.price-box');
    expect(boxes.length).toBe(2);
    expect(boxes[0].textContent).toContain('Por foto');
    expect(boxes[0].textContent).toContain('$1.200');
    expect(boxes[1].textContent).toContain('Álbum completo');
    expect(boxes[1].textContent).toContain('$9.500');
    expect(boxes[1].textContent).toContain('las 48 fotos');
  });

  it('debe asignar el viewTransitionName único y el staggerDelay a partir del index', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.componentRef.setInput('index', 3);
    fixture.detectChanges();

    expect(component.viewTransitionName()).toBe('album-cover-album-teso');
    const article = fixture.nativeElement.querySelector('.album-card-root') as HTMLElement;
    expect(article.style.viewTransitionName).toBe('album-cover-album-teso');
    expect(component.staggerDelay()).toBe((3 * 45) + 'ms');
  });

  it('debe renderizar el badge de PRIVADO, el blur is-locked y quitarlo al desbloquear', () => {
    fixture.componentRef.setInput('album', mockPrivateAlbum);
    fixture.componentRef.setInput('isUnlocked', false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('PRIVADO');
    expect(compiled.textContent).toContain('Ingresar PIN');
    expect(compiled.textContent).toContain('Álbum privado');
    expect(compiled.querySelector('.album-card-root svg')).not.toBeNull();

    const img = compiled.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('is-locked')).toBe(true);

    fixture.componentRef.setInput('isUnlocked', true);
    fixture.detectChanges();
    expect(img.classList.contains('is-locked')).toBe(false);
    expect(compiled.textContent).not.toContain('Álbum privado');
  });

  it('no debe aplicar is-locked en un álbum público', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('is-locked')).toBe(false);
  });

  it('debe tener altura uniforme h-full, título con min-h-[2.75rem], subtítulo en el segundo p e imagen absolute en aspect-[16/10]', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('h-full')).toBe(true);

    const article = host.querySelector('.album-card-root') as HTMLElement;
    expect(article.classList.contains('h-full')).toBe(true);
    expect(article.classList.contains('flex')).toBe(true);

    const title = host.querySelector('h3') as HTMLElement;
    expect(title.classList.contains('min-h-[2.75rem]')).toBe(true);
    expect(title.classList.contains('line-clamp-2')).toBe(true);

    const paragraphs = host.querySelectorAll('p');
    const subtitle = paragraphs[1] as HTMLElement;
    expect(subtitle.classList.contains('min-h-[1.125rem]')).toBe(true);
    expect(subtitle.classList.contains('line-clamp-1')).toBe(true);

    const img = host.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('absolute')).toBe(true);
    expect(img.parentElement?.classList.contains('aspect-[16/10]')).toBe(true);
  });

  it('debe formatear metaLine con fecha, hora y lugar omitiendo valores vacíos', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();
    expect(component.metaLine()).toBe('12 Octubre, 2026 · 18:30 hs · Estadio Mercado Luna');

    fixture.componentRef.setInput('album', {
      ...mockPublicAlbum,
      eventTime: undefined,
      location: undefined
    });
    fixture.detectChanges();
    expect(component.metaLine()).toBe('12 Octubre, 2026');
  });

  it('debe calcular ctaLabel y aplicar tono visual según categoría', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();
    expect(component.ctaLabel()).toBe('Ver fotos');
    const sportMeta = fixture.nativeElement.querySelectorAll('p')[0] as HTMLElement;
    expect(sportMeta.classList.contains('text-amber-700')).toBe(true);

    fixture.componentRef.setInput('album', mockPrivateAlbum);
    fixture.componentRef.setInput('isUnlocked', false);
    fixture.detectChanges();
    expect(component.ctaLabel()).toBe('Ingresar PIN');
    const socialMeta = fixture.nativeElement.querySelectorAll('p')[0] as HTMLElement;
    expect(socialMeta.classList.contains('text-rose-700')).toBe(true);

    fixture.componentRef.setInput('isUnlocked', true);
    fixture.detectChanges();
    expect(component.ctaLabel()).toBe('Ver fotos del evento');

    fixture.componentRef.setInput('album', mockFreeAlbum);
    fixture.detectChanges();
    expect(component.ctaLabel()).toBe('Ver y descargar gratis');
  });

  it('debe calcular isNew según createdAt dentro de las últimas 72 horas', () => {
    vi.useFakeTimers();
    const now = new Date('2026-11-26T12:00:00.000Z');
    vi.setSystemTime(now);

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    fixture.componentRef.setInput('album', { ...mockPublicAlbum, createdAt: oneHourAgo });
    fixture.detectChanges();
    expect(component.isNew()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('NUEVO');

    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
    fixture.componentRef.setInput('album', { ...mockPublicAlbum, createdAt: fourDaysAgo });
    fixture.detectChanges();
    expect(component.isNew()).toBe(false);

    fixture.componentRef.setInput('album', { ...mockPublicAlbum, createdAt: undefined });
    fixture.detectChanges();
    expect(component.isNew()).toBe(false);
  });
});
