import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { App } from './app';
import { AlbumService } from './core/services/album.service';
import { Album } from './core/models/album.model';

describe('App Root Component - LA TERCERA', () => {
  beforeEach(async () => {
    localStorage.clear();
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
});
