import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

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
});
