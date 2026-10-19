import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlbumCard3dComponent } from './album-card-3d.component';
import { Album } from '../../core/models/album.model';
import { describe, it, expect, beforeEach } from 'vitest';

describe('AlbumCard3dComponent', () => {
  let component: AlbumCard3dComponent;
  let fixture: ComponentFixture<AlbumCard3dComponent>;

  const mockPublicAlbum: Album = {
    id: 'album-teso',
    category: 'futbol',
    title: 'Atlético Tesorieri vs Andino SC',
    subtitle: 'Liga Riojana • Fecha 7',
    date: '12 Octubre, 2026',
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

  it('debe crear el componente correctamente', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('debe renderizar el título, la categoría y la cantidad de fotos', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Atlético Tesorieri vs Andino SC');
    expect(compiled.textContent).toContain('futbol');
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

  it('debe reflejar estado de apertura al hacer hover (pointerenter y pointerleave)', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    expect(component.isOpenState()).toBe(false);

    component.onPointerEnter();
    expect(component.isHovered()).toBe(true);
    expect(component.isOpenState()).toBe(true);

    component.onPointerLeave();
    expect(component.isHovered()).toBe(false);
    expect(component.isOpenState()).toBe(false);
  });

  it('debe activar la micro-apertura táctil con onTouchStart y volver con onTouchEnd', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    component.onTouchStart();
    expect(component.isTouchActive()).toBe(true);
    expect(component.isOpenState()).toBe(true);

    component.onTouchEnd();
    expect(component.isTouchActive()).toBe(false);
    expect(component.isOpenState()).toBe(false);
  });

  it('debe actualizar las coordenadas del brillo especular con onPointerMove', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    component.onPointerEnter();

    const dummyTarget = document.createElement('div');
    Object.defineProperty(dummyTarget, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 200, height: 100 })
    });

    const pointerEvent = {
      currentTarget: dummyTarget,
      clientX: 50,
      clientY: 25
    } as unknown as PointerEvent;

    component.onPointerMove(pointerEvent);

    expect(component.specularX()).toBe(25); // (50/200) * 100 = 25%
    expect(component.specularY()).toBe(25); // (25/100) * 100 = 25%
  });

  it('debe mostrar la insignia de GRATIS HD cuando el álbum es de descarga gratuita', () => {
    fixture.componentRef.setInput('album', mockFreeAlbum);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('GRATIS HD');
    expect(compiled.textContent).toContain('Cortesía Oficial');
  });

  it('debe calcular la inclinación 3D (tiltRotateX y tiltRotateY) entre -5deg y +5deg al mover el cursor', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    component.onPointerEnter();

    const dummyTarget = document.createElement('div');
    Object.defineProperty(dummyTarget, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 200, height: 100 })
    });

    const pointerEvent = {
      currentTarget: dummyTarget,
      clientX: 50,
      clientY: 25
    } as unknown as PointerEvent;

    component.onPointerMove(pointerEvent);

    // specularX=25, specularY=25
    expect(component.tiltRotateX()).toBe(2.5);
    expect(component.tiltRotateY()).toBe(-2.5);

    component.onPointerLeave();
    expect(component.tiltRotateX()).toBe(0);
    expect(component.tiltRotateY()).toBe(0);
  });

  it('debe asignar el viewTransitionName único para la View Transitions API', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.detectChanges();

    expect(component.viewTransitionName()).toBe('album-cover-album-teso');
    const article = fixture.nativeElement.querySelector('.album-card-root') as HTMLElement;
    expect(article.style.viewTransitionName).toBe('album-cover-album-teso');
  });

  it('debe calcular el staggerDelay de entrada en cascada a partir del index', () => {
    fixture.componentRef.setInput('album', mockPublicAlbum);
    fixture.componentRef.setInput('index', 3);
    fixture.detectChanges();

    expect(component.staggerDelay()).toBe((3 * 45) + 'ms');
  });
});
