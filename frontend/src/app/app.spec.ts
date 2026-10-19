import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { App } from './app';
import { AlbumService } from './core/services/album.service';
import { Album } from './core/models/album.model';
import { Photo } from './core/models/photo.model';

describe('App Root Component - LA TERCERA', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
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

  it('debe transicionar a la vista payment-success y regresar al catálogo con goHome()', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.currentView.set('payment-success');
    expect(app.currentView()).toBe('payment-success');

    app.goHome();
    expect(app.currentView()).toBe('portfolio');
  });

  it('debe paginar los álbumes en el catálogo público y calcular páginas correctamente', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.albums.set([
      { id: '1', category: 'futbol', title: 'Álbum 1', subtitle: 'Sub 1', date: '2026', badge: '⚽', photosCount: 10, unitPrice: 1000, fullAlbumPrice: 8000, coverUrl: '' },
      { id: '2', category: 'futbol', title: 'Álbum 2', subtitle: 'Sub 2', date: '2026', badge: '⚽', photosCount: 10, unitPrice: 1000, fullAlbumPrice: 8000, coverUrl: '' },
      { id: '3', category: 'hockey', title: 'Álbum 3', subtitle: 'Sub 3', date: '2026', badge: '🏑', photosCount: 10, unitPrice: 1000, fullAlbumPrice: 8000, coverUrl: '' },
      { id: '4', category: 'sociales', title: 'Álbum 4', subtitle: 'Sub 4', date: '2026', badge: '🎉', photosCount: 10, unitPrice: 1000, fullAlbumPrice: 8000, coverUrl: '' }
    ]);

    app.pageSize.set(2);
    expect(app.totalPages()).toBe(2);
    expect(app.paginatedAlbums().length).toBe(2);
    expect(app.currentPage()).toBe(1);

    app.nextPage();
    expect(app.currentPage()).toBe(2);
    expect(app.paginatedAlbums().length).toBe(2);

    app.prevPage();
    expect(app.currentPage()).toBe(1);

    // Cambiar categoría resetea a página 1
    app.goToPage(2);
    expect(app.currentPage()).toBe(2);
    app.setCategory('futbol');
    expect(app.currentPage()).toBe(1);
    expect(app.filteredAlbums().length).toBe(2);
  });

  it('debe tener pageSize por defecto en 6 y permitir filtrar por selectedDate', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.pageSize()).toBe(6);

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

  it('debe inicializar showSplash y ocultarlo al llamar a dismissSplash() guardando en sessionStorage', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.showSplash.set(true);
    expect(app.showSplash()).toBe(true);

    app.dismissSplash();
    expect(app.showSplash()).toBe(false);
    expect(sessionStorage.getItem('la_tercera_splash_seen')).toBe('true');

    // Al re-inicializar con la sesión ya vista, debe desactivarse de inmediato
    app.initSplashScreen();
    expect(app.showSplash()).toBe(false);
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
});

