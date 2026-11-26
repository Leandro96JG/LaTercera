import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { App } from './app';
import { AlbumService } from './core/services/album.service';
import { Album } from './core/models/album.model';
import { Photo } from './core/models/photo.model';

// Mock IntersectionObserver for Angular @defer (on viewport) in Vitest jsdom environment
if (typeof (globalThis as any).IntersectionObserver === 'undefined') {
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe('App Root Component - LA TERCERA', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('debe inicializar el componente App correctamente', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(app.currentView()).toBe('portfolio');
  });

  it('debe iniciar en vista portfolio con filtro en todos', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.selectedCategory()).toBe('all');
    expect(app.isCheckoutOpen()).toBe(false);
    expect(app.isLightboxOpen()).toBe(false);
  });

  it('debe redirigir a admin-login si un usuario no autenticado intenta acceder al panel admin', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.adminAuthStore.isAuthenticated()).toBe(false);
    app.switchView('admin');

    expect(app.currentView()).toBe('admin-login');
  });

  it('debe permitir acceso a admin si el usuario cuenta con sesión válida', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.adminAuthStore.setSession('test_valid_jwt', {
      id: 'admin_1',
      email: 'fotografa@latercera.com.ar',
      name: 'Jenifer Espeche',
      role: 'admin',
      photographerId: 'yuyo_espeche'
    });

    expect(app.adminAuthStore.isAuthenticated()).toBe(true);
    app.switchView('admin');

    expect(app.currentView()).toBe('admin');
  });

  it('debe redirigir a portfolio al cerrar sesión desde la vista admin', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.adminAuthStore.setSession('token', {
      id: '1',
      email: 'admin@latercera.com.ar',
      name: 'Yuyo',
      role: 'admin',
      photographerId: 'yuyo'
    });
    app.switchView('admin');
    expect(app.currentView()).toBe('admin');

    app.logoutAdmin();
    expect(app.currentView()).toBe('portfolio');
    expect(app.adminAuthStore.isAuthenticated()).toBe(false);
  });

  it('debe transicionar a la vista payment-success y regresar al catálogo con goHome() limpiando URL', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    app.currentView.set('payment-success');
    expect(app.currentView()).toBe('payment-success');

    app.goHome();
    expect(app.currentView()).toBe('portfolio');
    expect(replaceStateSpy).toHaveBeenCalledWith({}, document.title, '/');
  });

  it('debe mostrar 6 álbumes iniciales, cargar más con loadMore() y reiniciar al filtrar', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const manyAlbums: Album[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      category: i < 7 ? 'futbol' : 'hockey',
      title: `Álbum ${i + 1}`,
      subtitle: `Sub ${i + 1}`,
      date: '2026',
      badge: i < 7 ? '⚽ Fútbol' : '🏑 Hockey',
      photosCount: 10,
      unitPrice: 1000,
      fullAlbumPrice: 8000,
      coverUrl: '',
      createdAt: new Date(Date.UTC(2026, 9, 10 - i)).toISOString()
    }));

    app.albums.set(manyAlbums);
    expect(app.visibleCount()).toBe(6);
    expect(app.visibleAlbums().length).toBe(6);
    expect(app.remainingCount()).toBe(4);

    app.loadMore();
    expect(app.visibleCount()).toBe(12);
    expect(app.visibleAlbums().length).toBe(10);
    expect(app.remainingCount()).toBe(0);

    // Cambiar categoría reinicia visibleCount a 6
    app.setCategory('futbol');
    expect(app.visibleCount()).toBe(6);
    expect(app.filteredAlbums().length).toBe(7);
    expect(app.visibleAlbums().length).toBe(6);
    expect(app.remainingCount()).toBe(1);

    // Buscar reinicia visibleCount a 6
    app.loadMore();
    expect(app.visibleCount()).toBe(12);
    app.onSearchInput({ target: { value: 'Álbum 1' } } as unknown as Event);
    expect(app.visibleCount()).toBe(6);
  });

  it('debe ordenar filteredAlbums por createdAt descendente y respetar el orden original sin createdAt', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.albums.set([
      { id: 'old', category: 'futbol', title: 'Partido Viejo', subtitle: 'Sub', date: '2026', badge: '⚽ Fútbol', photosCount: 10, unitPrice: 1000, fullAlbumPrice: 8000, coverUrl: '', createdAt: '2026-10-01T10:00:00.000Z' },
      { id: 'newest', category: 'hockey', title: 'Torneo Nuevo', subtitle: 'Sub', date: '2026', badge: '🏑 Hockey', photosCount: 10, unitPrice: 1000, fullAlbumPrice: 8000, coverUrl: '', createdAt: '2026-10-15T10:00:00.000Z' },
      { id: 'mid', category: 'futbol', title: 'Partido Medio', subtitle: 'Sub', date: '2026', badge: '⚽ Fútbol', photosCount: 10, unitPrice: 1000, fullAlbumPrice: 8000, coverUrl: '', createdAt: '2026-10-10T10:00:00.000Z' }
    ]);

    expect(app.filteredAlbums().map(a => a.id)).toEqual(['newest', 'mid', 'old']);

    app.setCategory('futbol');
    expect(app.filteredAlbums().map(a => a.id)).toEqual(['mid', 'old']);

    app.setCategory('all');
    app.searchQuery.set('Partido');
    expect(app.filteredAlbums().map(a => a.id)).toEqual(['mid', 'old']);

    // Sin createdAt respeta el orden original
    app.searchQuery.set('');
    app.albums.set([
      { id: 'a', category: 'futbol', title: 'A', subtitle: '', date: '2026', badge: '⚽', photosCount: 5, unitPrice: 1000, fullAlbumPrice: 5000, coverUrl: '' },
      { id: 'b', category: 'futbol', title: 'B', subtitle: '', date: '2026', badge: '⚽', photosCount: 5, unitPrice: 1000, fullAlbumPrice: 5000, coverUrl: '' }
    ]);
    expect(app.filteredAlbums().map(a => a.id)).toEqual(['a', 'b']);
  });

  it('debe ocultar categorías sin álbumes y ordenarlas por el álbum más reciente de cada categoría', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.albums.set([
      { id: '1', category: 'futbol', title: 'F1', subtitle: '', date: '2026', badge: '⚽ Fútbol', photosCount: 5, unitPrice: 1000, fullAlbumPrice: 5000, coverUrl: '', createdAt: '2026-10-05T10:00:00.000Z' },
      { id: '2', category: 'hockey', title: 'H1', subtitle: '', date: '2026', badge: '🏑 Hockey', photosCount: 5, unitPrice: 1000, fullAlbumPrice: 5000, coverUrl: '', createdAt: '2026-10-20T10:00:00.000Z' },
      { id: '3', category: 'sociales', title: 'S1', subtitle: '', date: '2026', badge: '🎉 Sociales', photosCount: 5, unitPrice: 1000, fullAlbumPrice: 5000, coverUrl: '', createdAt: '2026-10-12T10:00:00.000Z' }
    ]);

    const cats = app.publicCategories();
    expect(cats.map(c => c.id)).toEqual(['hockey', 'sociales', 'futbol']);
    expect(cats.every(c => c.count > 0)).toBe(true);
  });

  it('debe permitir filtrar por selectedDate', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.albums.set([
      { id: '1', category: 'futbol', title: 'Álbum 1', subtitle: 'Sub 1', date: '12 Octubre, 2026', eventDate: '2026-10-12', badge: '⚽', photosCount: 10, unitPrice: 1000, fullAlbumPrice: 8000, coverUrl: '' },
      { id: '2', category: 'futbol', title: 'Álbum 2', subtitle: 'Sub 2', date: '15 Octubre, 2026', eventDate: '2026-10-15', badge: '⚽', photosCount: 10, unitPrice: 1000, fullAlbumPrice: 8000, coverUrl: '' }
    ]);

    app.selectedDate.set('2026-10-12');
    expect(app.filteredAlbums().length).toBe(1);
    expect(app.filteredAlbums()[0].id).toBe('1');
  });

  it('debe paginar y filtrar las fotos de la galería interna con photosPageSize = 12', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const mockAlbum: Album = {
      id: 'album-test-photos',
      category: 'futbol',
      title: 'Torneo Paginado',
      subtitle: 'Sub',
      date: '2026',
      badge: '⚽',
      photosCount: 20,
      unitPrice: 1000,
      fullAlbumPrice: 8000,
      coverUrl: ''
    };

    const mockPhotos: Photo[] = Array.from({ length: 20 }, (_, i) => ({
      id: `photo-${i + 1}`,
      albumId: mockAlbum.id,
      title: `Foto ${i + 1}`,
      previewUrl: `http://localhost:4000/previews/${i + 1}.webp`,
      originalWidth: 4000,
      originalHeight: 3000,
      isSampleHD: i < 3
    }));

    app.currentAlbum.set(mockAlbum);
    app.activeAlbumPhotos.set(mockPhotos);
    app.albumPhotosLoaded.set(true);

    expect(app.photosPageSize()).toBe(12);
    expect(app.filteredAlbumPhotos().length).toBe(20);
    expect(app.photosTotalPages()).toBe(2);
    expect(app.paginatedAlbumPhotos().length).toBe(12);
    expect(app.paginatedAlbumPhotos()[0].photo.id).toBe('photo-1');
    expect(app.paginatedAlbumPhotos()[0].originalIndex).toBe(0);

    // Navegar a página 2
    app.nextPhotosPage();
    expect(app.photosCurrentPage()).toBe(2);
    expect(app.paginatedAlbumPhotos().length).toBe(8);
    expect(app.paginatedAlbumPhotos()[0].photo.id).toBe('photo-13');
    expect(app.paginatedAlbumPhotos()[0].originalIndex).toBe(12);

    // Filtro HD
    app.setPhotosFilterMode('hd');
    expect(app.photosCurrentPage()).toBe(1);
    expect(app.filteredAlbumPhotos().length).toBe(3);
    expect(app.photosTotalPages()).toBe(1);
    expect(app.paginatedAlbumPhotos().length).toBe(3);

    // Filtro Elegidas
    app.cartStore.togglePhoto(mockPhotos[5]); // photo-6
    app.cartStore.togglePhoto(mockPhotos[10]); // photo-11
    app.setPhotosFilterMode('elegidas');
    expect(app.filteredAlbumPhotos().length).toBe(2);
    expect(app.paginatedAlbumPhotos().map(p => p.photo.id)).toEqual(['photo-6', 'photo-11']);
    expect(app.paginatedAlbumPhotos()[0].originalIndex).toBe(5);
    expect(app.paginatedAlbumPhotos()[1].originalIndex).toBe(10);
  });

  it('debe mapear el índice original de la foto al abrir el visor Lightbox desde una galería filtrada', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const mockAlbum: Album = {
      id: 'album-lightbox-test',
      category: 'futbol',
      title: 'Torneo Lightbox',
      subtitle: 'Sub',
      date: '2026',
      badge: '⚽',
      photosCount: 5,
      unitPrice: 1000,
      fullAlbumPrice: 8000,
      coverUrl: ''
    };

    const mockPhotos: Photo[] = Array.from({ length: 5 }, (_, i) => ({
      id: `photo-lb-${i + 1}`,
      albumId: mockAlbum.id,
      title: `Foto ${i + 1}`,
      previewUrl: '',
      originalWidth: 4000,
      originalHeight: 3000,
      isSampleHD: i === 3
    }));

    app.currentAlbum.set(mockAlbum);
    app.activeAlbumPhotos.set(mockPhotos);
    app.albumPhotosLoaded.set(true);

    // Abrir foto con índice 3 en currentPhotos pasando un índice local 0
    app.openLightbox(mockPhotos[3], 0);
    expect(app.isLightboxOpen()).toBe(true);
    expect(app.lightboxIndex()).toBe(3);
  });

  it('debe interceptar álbumes privados solicitando PIN antes de abrirlos', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const privateAlbum = {
      id: 'album-private-1',
      category: 'sociales' as const,
      title: 'Fiesta Privada VIP',
      subtitle: 'Acceso Restringido',
      date: '2026',
      badge: '🔒 Privado',
      photosCount: 20,
      unitPrice: 1500,
      fullAlbumPrice: 12000,
      coverUrl: '',
      isPrivate: true
    };

    expect(app.albumAccessStore.isUnlocked(privateAlbum.id)).toBe(false);

    // Intentar abrir álbum privado
    app.openAlbum(privateAlbum);

    // Debe abrir modal de PIN y NO la vista de álbum
    expect(app.isPinModalOpen()).toBe(true);
    expect(app.selectedPrivateAlbum()?.id).toBe(privateAlbum.id);
    expect(app.currentView()).toBe('portfolio');

    // Desbloquear álbum
    app.onAlbumUnlocked({ albumId: privateAlbum.id });
    expect(app.isPinModalOpen()).toBe(false);
    expect(app.currentView()).toBe('album');
    expect(app.currentAlbum()?.id).toBe(privateAlbum.id);
  });

  it('debe permitir abrir álbumes no privados directamente', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const publicAlbum = {
      id: 'album-pub-1',
      category: 'futbol' as const,
      title: 'Fútbol Libre',
      subtitle: 'Abierto',
      date: '2026',
      badge: '⚽',
      photosCount: 15,
      unitPrice: 1000,
      fullAlbumPrice: 8000,
      coverUrl: '',
      isPrivate: false
    };

    app.openAlbum(publicAlbum);
    expect(app.isPinModalOpen()).toBe(false);
    expect(app.currentView()).toBe('album');
    expect(app.currentAlbum()?.id).toBe(publicAlbum.id);
  });

  it('debe actualizar activeAlbumPhotos y currentPhotos al abrir un álbum', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const albumService = TestBed.inject(AlbumService);

    const mockAlbum = {
      id: 'album-real-photos',
      category: 'futbol' as const,
      title: 'Partido Real',
      subtitle: 'Liga',
      date: '2026',
      badge: '⚽',
      photosCount: 2,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://example.com/cover.jpg',
      isPrivate: false
    };

    const mockPhotos = [
      {
        id: 'photo-real-1',
        albumId: 'album-real-photos',
        title: 'Acción 1',
        previewUrl: 'https://example.com/p1.webp',
        originalWidth: 4000,
        originalHeight: 3000,
        isSampleHD: true
      }
    ];

    vi.spyOn(albumService, 'getAlbumPhotos').mockReturnValue(of(mockPhotos));

    app.openAlbum(mockAlbum);

    expect(app.activeAlbumPhotos()).toEqual(mockPhotos);
    expect(app.currentPhotos()).toEqual(mockPhotos);
    expect(app.currentPhotos()[0].id).toBe('photo-real-1');
  });

  it('debe ejecutar startViewTransition en transitionView si la API nativa está disponible', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const startViewTransitionMock = vi.fn((cb: () => void) => {
      cb();
    });
    (document as any).startViewTransition = startViewTransitionMock;

    let executed = false;
    app.transitionView(() => {
      executed = true;
    });

    expect(startViewTransitionMock).toHaveBeenCalled();
    expect(executed).toBe(true);

    delete (document as any).startViewTransition;
  });

  it('debe abrir automáticamente el álbum si la URL contiene el query param ?album=<id>', () => {
    window.history.pushState({}, '', '/?album=album-1');

    const albumService = TestBed.inject(AlbumService);
    const mockAlbum: Album = {
      id: 'album-1',
      category: 'futbol',
      title: 'Atlético Tesorieri vs Andino SC',
      subtitle: 'Liga Riojana',
      date: '12 Octubre, 2026',
      photosCount: 10,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://example.com/cover.webp',
      badge: '⚽ Fútbol'
    };
    vi.spyOn(albumService, 'getAlbums').mockReturnValue(of([mockAlbum]));
    vi.spyOn(albumService, 'getAlbumPhotos').mockReturnValue(of([]));

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.ngOnInit();

    expect(app.currentView()).toBe('album');
    expect(app.currentAlbum()?.id).toBe('album-1');

    window.history.pushState({}, '', '/');
  });

  it('debe inicializar showSplash y renderSplash, y desmontar el DOM del splash tras dismissSplash()', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      app.showSplash.set(true);
      app.renderSplash.set(true);
      expect(app.showSplash()).toBe(true);
      expect(app.renderSplash()).toBe(true);

      app.dismissSplash();
      expect(app.showSplash()).toBe(false);
      expect(sessionStorage.getItem('la_tercera_splash_seen')).toBe('true');

      vi.advanceTimersByTime(550);
      expect(app.renderSplash()).toBe(false);

      // Al re-inicializar con la sesión ya vista, debe desactivarse y desmontarse de inmediato
      app.initSplashScreen();
      expect(app.showSplash()).toBe(false);
      expect(app.renderSplash()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('debe gestionar isLoadingPublicAlbums y actualizarlo a false al recibir álbumes', () => {
    const albumService = TestBed.inject(AlbumService);
    const mockAlbum: Album = {
      id: 'album-1',
      category: 'futbol',
      title: 'Tesorieri',
      subtitle: 'Liga Riojana',
      date: '2026',
      badge: '⚽',
      photosCount: 5,
      unitPrice: 1000,
      fullAlbumPrice: 8000,
      coverUrl: 'https://example.com/cover.webp'
    };
    vi.spyOn(albumService, 'getAlbums').mockReturnValue(of([mockAlbum]));

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.loadPublicAlbums();
    expect(app.isLoadingPublicAlbums()).toBe(false);
    expect(app.albums().length).toBe(1);
  });

  it('debe prevenir el parpadeo de fotos dummy retornando lista vacía mientras isLoadingAlbumPhotos es true', () => {
    const albumService = TestBed.inject(AlbumService);
    const mockAlbum: Album = {
      id: 'album-demo',
      category: 'futbol',
      title: 'Partido Final',
      subtitle: 'Polideportivo',
      date: '2026',
      badge: '⚽',
      photosCount: 20,
      unitPrice: 1000,
      fullAlbumPrice: 8000,
      coverUrl: 'https://example.com/cover.jpg'
    };

    const photosSubject = new Subject<any[]>();
    vi.spyOn(albumService, 'getAlbumPhotos').mockReturnValue(photosSubject.asObservable());

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.openAlbum(mockAlbum);

    // Mientras la petición HTTP de fotos está en vuelo:
    expect(app.isLoadingAlbumPhotos()).toBe(true);
    expect(app.albumPhotosLoaded()).toBe(false);
    // currentPhotos() DEBE retornar [] para no parpadear con 24 fotos dummy repetidas
    expect(app.currentPhotos()).toEqual([]);

    // Cuando el servidor responde con las fotos reales
    const realPhotos = [
      {
        id: 'real-1',
        albumId: 'album-demo',
        title: 'Foto Real 1',
        previewUrl: 'https://example.com/p1.webp',
        originalWidth: 4000,
        originalHeight: 3000,
        isSampleHD: true
      }
    ];
    photosSubject.next(realPhotos);
    photosSubject.complete();

    expect(app.isLoadingAlbumPhotos()).toBe(false);
    expect(app.albumPhotosLoaded()).toBe(true);
    expect(app.currentPhotos()).toEqual(realPhotos);
  });

  it('debe renderizar los skeletons 3D de carpetas en el catálogo mientras isLoadingPublicAlbums es true', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.isLoadingPublicAlbums.set(true);
    app.albums.set([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    // No debe mostrar "No se encontraron carpetas" mientras carga
    expect(compiled.textContent).not.toContain('No se encontraron carpetas');
    // Debe tener elementos con animate-shimmer-sweep para los skeletons
    const skeletons = compiled.querySelectorAll('.animate-shimmer-sweep');
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });

  it('debe permitir seleccionar y deseleccionar fotos en el catálogo mediante togglePhoto', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const testPhoto: Photo = {
      id: 'photo-toggle-catalog-1',
      albumId: 'album-1',
      title: 'Foto de Prueba Catálogo',
      previewUrl: 'https://example.com/p.webp',
      originalWidth: 4000,
      originalHeight: 3000,
      isSampleHD: true
    };

    // Estado inicial: no seleccionada
    expect(app.cartStore.isPhotoSelected(testPhoto.id)).toBe(false);

    // 1. Seleccionar desde el catálogo
    app.togglePhoto(testPhoto);
    expect(app.cartStore.isPhotoSelected(testPhoto.id)).toBe(true);
    expect(app.cartStore.totalItemsCount()).toBe(1);

    // 2. Deseleccionar desde el catálogo
    app.togglePhoto(testPhoto);
    expect(app.cartStore.isPhotoSelected(testPhoto.id)).toBe(false);
    expect(app.cartStore.totalItemsCount()).toBe(0);
  });

  it('debe abrir y cerrar el modal de recuperación de órdenes', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.isOrderRecoveryOpen()).toBe(false);
    app.openOrderRecovery();
    expect(app.isOrderRecoveryOpen()).toBe(true);
    app.closeOrderRecovery();
    expect(app.isOrderRecoveryOpen()).toBe(false);
  });

  it('debe renderizar el Hero del álbum activo con fondo ambiental glassmorphic y tarjeta de portada 3D', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const albumService = TestBed.inject(AlbumService);

    const testAlbum: Album = {
      id: 'album-hero-3d',
      category: 'futbol',
      title: 'Final de Campeonato 2026',
      subtitle: 'Cancha Principal',
      date: '18 Octubre, 2026',
      badge: '🏆 Final',
      photosCount: 20,
      unitPrice: 1500,
      fullAlbumPrice: 12000,
      coverUrl: 'https://example.com/cover-hero.webp',
      isPrivate: false
    };

    vi.spyOn(albumService, 'getAlbumPhotos').mockReturnValue(of([]));

    app.openAlbum(testAlbum);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    
    // Contenedor oscuro glassmorphic y tarjeta 3D
    const heroCard = compiled.querySelector('.hero-cover-card');
    expect(heroCard).toBeTruthy();
    expect(compiled.textContent).toContain('Final de Campeonato 2026');
    expect(compiled.textContent).toContain('Portada del Evento');

    // Imagen de portada dentro de la tarjeta 3D
    const coverImg = heroCard?.querySelector('img') as HTMLImageElement;
    expect(coverImg?.src).toContain('cover-hero.webp');
  });

  it('debe rutear la selección de fotos hacia freeSelectedPhotos cuando el álbum es gratuito', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const albumService = TestBed.inject(AlbumService);

    const freeAlbum: Album = {
      id: 'album-gratis-1',
      category: 'futbol',
      title: 'Torneo Infantil Gratis',
      subtitle: 'Cortesía Oficial',
      badge: '🎁 Cortesía',
      date: '2026',
      photosCount: 5,
      unitPrice: 0,
      fullAlbumPrice: 0,
      coverUrl: '',
      isFreeDownload: true
    };

    vi.spyOn(albumService, 'getAlbumPhotos').mockReturnValue(of([]));
    app.openAlbum(freeAlbum);

    const photo: Photo = {
      id: 'f-free-1',
      albumId: 'album-gratis-1',
      title: 'Gol de cabeza',
      previewUrl: '',
      originalWidth: 4000,
      originalHeight: 3000,
      isSampleHD: false
    };

    expect(app.isPhotoSelected(photo.id)).toBe(false);
    app.togglePhoto(photo);
    expect(app.isPhotoSelected(photo.id)).toBe(true);
    expect(app.cartStore.isFreePhotoSelected(photo.id)).toBe(true);
    expect(app.cartStore.isPhotoSelected(photo.id)).toBe(false);
  });

  it('no debe renderizar botones ni tutorial de linterna al abrir un álbum pago', () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const mockPaidAlbum: any = {
      id: 'album-pago',
      title: 'Torneo Apertura 2026',
      isFreeDownload: false,
      fullAlbumPrice: 12000,
      unitPrice: 1500
    };

    app.openAlbum(mockPaidAlbum);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-spotlight-tutorial')).toBeNull();
    expect(compiled.textContent).not.toContain('Linterna OFF');
    expect(compiled.textContent).not.toContain('¿Cómo iluminar?');
  });

  it('debe registrar un estado en el historial al abrir un álbum y volver al portfolio al presionar atrás (popstate)', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const albumService = TestBed.inject(AlbumService);
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    const testAlbum: Album = {
      id: 'album-nav-1',
      customSlug: 'superclasico-2026',
      category: 'futbol',
      title: 'Superclásico 2026',
      subtitle: 'Estadio Centro',
      date: '2026-10-18',
      badge: '⚽ Fútbol',
      photosCount: 15,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://example.com/cover.jpg',
      isPrivate: false
    };

    vi.spyOn(albumService, 'getAlbumPhotos').mockReturnValue(of([]));
    app.albums.set([testAlbum]);
    app.ngOnInit();

    app.openAlbum(testAlbum);
    expect(app.currentView()).toBe('album');
    expect(app.currentAlbum()?.id).toBe('album-nav-1');
    expect(pushStateSpy).toHaveBeenCalledWith(
      { view: 'album', albumId: 'album-nav-1' },
      document.title,
      expect.stringContaining('?album=superclasico-2026')
    );

    // Simular apertura de modal dentro del álbum
    app.isLightboxOpen.set(true);

    // Simular botón "Atrás" del navegador / celular regresando a '/'
    window.history.replaceState(null, document.title, '/');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));

    expect(app.currentView()).toBe('portfolio');
    expect(app.currentAlbum()).toBeNull();
    expect(app.isLightboxOpen()).toBe(false);
  });

  it('debe reabrir el álbum si el usuario navega hacia adelante (popstate con estado de álbum) sin duplicar historial', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const albumService = TestBed.inject(AlbumService);

    const testAlbum: Album = {
      id: 'album-nav-2',
      category: 'hockey',
      title: 'Final Hockey',
      subtitle: 'Polideportivo',
      date: '2026-10-20',
      badge: '🏑 Hockey',
      photosCount: 10,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: '',
      isPrivate: false
    };

    vi.spyOn(albumService, 'getAlbumPhotos').mockReturnValue(of([]));
    app.albums.set([testAlbum]);
    app.ngOnInit();

    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    pushStateSpy.mockClear();

    window.dispatchEvent(
      new PopStateEvent('popstate', { state: { view: 'album', albumId: 'album-nav-2' } })
    );

    expect(app.currentView()).toBe('album');
    expect(app.currentAlbum()?.id).toBe('album-nav-2');
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('no debe duplicar historial cuando se abre un álbum desde enlace directo (?album=...)', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const albumService = TestBed.inject(AlbumService);

    const testAlbum: Album = {
      id: 'album-direct-1',
      customSlug: 'final-directa',
      category: 'futbol',
      title: 'Final Directa',
      subtitle: 'Cancha 1',
      date: '2026-10-22',
      badge: '⚽ Fútbol',
      photosCount: 10,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: '',
      isPrivate: false
    };

    vi.spyOn(albumService, 'getAlbumPhotos').mockReturnValue(of([]));
    window.history.replaceState({}, document.title, '/?album=final-directa');
    app.albums.set([testAlbum]);

    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    app.checkDirectAlbumLink();

    expect(app.currentView()).toBe('album');
    expect(app.currentAlbum()?.id).toBe('album-direct-1');
    expect(pushStateSpy).not.toHaveBeenCalled();

    // Limpiar URL para siguientes tests
    window.history.replaceState({}, document.title, '/');
  });
});

