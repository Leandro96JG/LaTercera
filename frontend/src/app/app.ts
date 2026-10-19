import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, untracked, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './features/header/header.component';
import { HeroComponent } from './features/hero/hero.component';
import { FloatingCartComponent } from './features/cart/floating-cart.component';
import { LightboxComponent } from './features/lightbox/lightbox.component';
import { CheckoutModalComponent } from './features/checkout/checkout-modal.component';
import { AdminLoginComponent } from './features/admin-login/admin-login.component';
import { AdminPanelComponent } from './features/admin-panel/admin-panel.component';
import { PaymentSuccessComponent } from './features/payment-success/payment-success.component';
import { AlbumCard3dComponent } from './features/album-card-3d/album-card-3d.component';
import { PhotoCardPolaroidComponent } from './features/photo-card-polaroid/photo-card-polaroid.component';
import { PinUnlockModalComponent } from './features/pin-unlock/pin-unlock-modal.component';
import { OrderRecoveryModalComponent } from './features/order-recovery/order-recovery-modal.component';
import { AlbumService } from './core/services/album.service';
import { CartStore } from './core/state/cart.store';
import { AdminAuthStore } from './core/state/admin-auth.store';
import { AlbumAccessStore } from './core/state/album-access.store';
import { PaymentService } from './core/services/payment.service';
import { CategoryService } from './core/services/category.service';
import { CategoryDTO, DEFAULT_CATEGORIES } from './core/models/category.model';
import { Album, AlbumCategory } from './core/models/album.model';
import { Photo } from './core/models/photo.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    HeroComponent,
    FloatingCartComponent,
    LightboxComponent,
    CheckoutModalComponent,
    AdminLoginComponent,
    AdminPanelComponent,
    PaymentSuccessComponent,
    AlbumCard3dComponent,
    PhotoCardPolaroidComponent,
    PinUnlockModalComponent,
    OrderRecoveryModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  public readonly albumService = inject(AlbumService);
  public readonly cartStore = inject(CartStore);
  public readonly adminAuthStore = inject(AdminAuthStore);
  public readonly albumAccessStore = inject(AlbumAccessStore);
  public readonly paymentService = inject(PaymentService);
  public readonly categoryService = inject(CategoryService);

  // Categorías dinámicas consultadas desde la API / Supabase
  public readonly apiCategories = signal<readonly CategoryDTO[]>(DEFAULT_CATEGORIES);

  public readonly publicCategories = computed(() => {
    const albums = this.albums();
    const baseCategories = this.apiCategories();
    const map = new Map<string, { id: string; name: string; icon: string; count: number }>();

    for (const cat of baseCategories) {
      if (cat.isActive) {
        map.set(cat.id, {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          count: 0
        });
      }
    }

    for (const album of albums) {
      const catKey = album.category || 'otros';
      if (!map.has(catKey)) {
        const badgeParts = (album.badge || '').trim().split(' ');
        const icon = badgeParts.length > 1 ? badgeParts[0] : '📸';
        const name = badgeParts.length > 1 ? badgeParts.slice(1).join(' ') : (album.category || 'Evento');
        map.set(catKey, {
          id: catKey,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          icon,
          count: 0
        });
      }
      const existing = map.get(catKey)!;
      existing.count += 1;
    }

    return Array.from(map.values()).filter(
      c => c.count > 0 || ['futbol', 'motos', 'hockey', 'basquet', 'sociales'].includes(c.id)
    );
  });

  // Splash Screen de Inicio
  public readonly showSplash = signal<boolean>(true);
  private splashTimer: any = null;

  // Estado de carga de álbumes públicos
  public readonly isLoadingPublicAlbums = signal<boolean>(true);

  // Estado de carga de fotografías del álbum seleccionado
  public readonly isLoadingAlbumPhotos = signal<boolean>(false);
  public readonly albumPhotosLoaded = signal<boolean>(false);

  // Modal de desbloqueo de álbum privado con PIN
  public readonly selectedPrivateAlbum = signal<Album | null>(null);
  public readonly isPinModalOpen = signal<boolean>(false);

  // Vistas activas: 'portfolio' | 'album' | 'admin' | 'admin-login' | 'payment-success'
  public readonly currentView = signal<'portfolio' | 'album' | 'admin' | 'admin-login' | 'payment-success'>('portfolio');

  // Filtro de categoría en portfolio
  public readonly selectedCategory = signal<string>('all');

  // Álbum actualmente abierto
  public readonly currentAlbum = signal<Album | null>(null);

  // Lista de álbumes
  public readonly albums = signal<readonly Album[]>([]);

  // Estado del Lightbox
  public readonly isLightboxOpen = signal<boolean>(false);
  public readonly lightboxIndex = signal<number>(0);

  // Estado del Checkout Modal
  public readonly isCheckoutOpen = signal<boolean>(false);

  // Estado del Modal de Recuperación de Órdenes
  public readonly isOrderRecoveryOpen = signal<boolean>(false);

  // Álbumes filtrados y búsqueda
  public readonly searchQuery = signal<string>('');
  public readonly selectedDate = signal<string>('');

  public readonly filteredAlbums = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();
    const targetDate = this.selectedDate().trim();
    let list = this.albums();

    if (cat !== 'all') {
      list = list.filter(a => a.category === cat);
    }

    if (query) {
      list = list.filter(a =>
        a.title.toLowerCase().includes(query) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(query)) ||
        (a.location && a.location.toLowerCase().includes(query)) ||
        (a.date && a.date.toLowerCase().includes(query)) ||
        (a.badge && a.badge.toLowerCase().includes(query))
      );
    }

    if (targetDate) {
      list = list.filter(a =>
        a.eventDate === targetDate || (a.date && a.date.includes(targetDate))
      );
    }

    return list;
  });

  public onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.currentPage.set(1);
  }

  public clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  // Paginación en portfolio público (6 tarjetas por página)
  public readonly currentPage = signal<number>(1);
  public readonly pageSize = signal<number>(6);

  public readonly totalPages = computed(() => {
    const total = this.filteredAlbums().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  public readonly paginatedAlbums = computed(() => {
    const list = this.filteredAlbums();
    const page = this.currentPage();
    const size = this.pageSize();
    const from = (page - 1) * size;
    return list.slice(from, from + size);
  });

  public readonly paginationPages = computed<number[]>(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  public readonly showingFrom = computed(() => {
    const total = this.filteredAlbums().length;
    if (total === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  public readonly showingTo = computed(() => {
    const total = this.filteredAlbums().length;
    return Math.min(this.currentPage() * this.pageSize(), total);
  });

  // --- Paginación y Filtros de la Galería Interna de Fotos (12 fotos por página) ---
  public readonly photosCurrentPage = signal<number>(1);
  public readonly photosPageSize = signal<number>(12);
  public readonly photosFilterMode = signal<'todas' | 'elegidas' | 'hd'>('todas');

  public readonly filteredAlbumPhotos = computed<readonly Photo[]>(() => {
    const mode = this.photosFilterMode();
    const allPhotos = this.currentPhotos();
    if (mode === 'elegidas') {
      return allPhotos.filter(p => this.cartStore.isPhotoSelected(p.id));
    }
    if (mode === 'hd') {
      return allPhotos.filter(p => Boolean(p.isSampleHD));
    }
    return allPhotos;
  });

  public readonly photosTotalPages = computed(() => {
    const total = this.filteredAlbumPhotos().length;
    return Math.max(1, Math.ceil(total / this.photosPageSize()));
  });

  public readonly paginatedAlbumPhotos = computed<readonly { photo: Photo; originalIndex: number }[]>(() => {
    const filtered = this.filteredAlbumPhotos();
    const allPhotos = this.currentPhotos();
    const page = this.photosCurrentPage();
    const size = this.photosPageSize();
    const from = (page - 1) * size;
    const slice = filtered.slice(from, from + size);

    return slice.map(photo => {
      const originalIndex = allPhotos.findIndex(p => p.id === photo.id);
      return {
        photo,
        originalIndex: originalIndex >= 0 ? originalIndex : 0
      };
    });
  });

  public readonly photosPaginationPages = computed<number[]>(() => {
    const total = this.photosTotalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  public readonly photosShowingFrom = computed(() => {
    const total = this.filteredAlbumPhotos().length;
    if (total === 0) return 0;
    return (this.photosCurrentPage() - 1) * this.photosPageSize() + 1;
  });

  public readonly photosShowingTo = computed(() => {
    const total = this.filteredAlbumPhotos().length;
    return Math.min(this.photosCurrentPage() * this.photosPageSize(), total);
  });

  public setPhotosFilterMode(mode: 'todas' | 'elegidas' | 'hd'): void {
    this.photosFilterMode.set(mode);
    this.photosCurrentPage.set(1);
  }

  public goToPhotosPage(page: number): void {
    if (page >= 1 && page <= this.photosTotalPages()) {
      this.photosCurrentPage.set(page);
    }
  }

  public nextPhotosPage(): void {
    if (this.photosCurrentPage() < this.photosTotalPages()) {
      this.goToPhotosPage(this.photosCurrentPage() + 1);
    }
  }

  public prevPhotosPage(): void {
    if (this.photosCurrentPage() > 1) {
      this.goToPhotosPage(this.photosCurrentPage() - 1);
    }
  }

  constructor() {
    // Resetear a página 1 del portfolio cuando cambian filtros
    effect(() => {
      this.selectedCategory();
      this.searchQuery();
      this.selectedDate();
      untracked(() => {
        this.currentPage.set(1);
      });
    });

    // Ajustar currentPage si totalPages disminuye
    effect(() => {
      const total = this.totalPages();
      const curr = untracked(() => this.currentPage());
      if (curr > total) {
        untracked(() => this.currentPage.set(total));
      }
    });

    // Ajustar photosCurrentPage si photosTotalPages disminuye
    effect(() => {
      const total = this.photosTotalPages();
      const curr = untracked(() => this.photosCurrentPage());
      if (curr > total) {
        untracked(() => this.photosCurrentPage.set(total));
      }
    });
  }

  // Fotos reales dinámicas del álbum actual
  public readonly activeAlbumPhotos = signal<readonly Photo[]>([]);

  // Fotos del álbum actual
  public readonly currentPhotos = computed<readonly Photo[]>(() => {
    const album = this.currentAlbum();
    if (!album) return [];

    // Si aún está cargando desde el servidor, retornar vacío para evitar fotos dummy parpadeantes
    if (this.isLoadingAlbumPhotos()) {
      return [];
    }

    // 1. Fotos reales dinámicas consultadas desde la API (/api/albums/:id/photos)
    const fetched = this.activeAlbumPhotos();
    if (fetched.length > 0 && fetched[0].albumId === album.id) {
      return fetched;
    }

    // 2. Fotos presentes directamente en el modelo de álbum
    if (album.photos && album.photos.length > 0) return album.photos;

    // 3. Fallback de fotos de demostración solo cuando ya terminó la carga y no hay fotos reales
    if (this.albumPhotosLoaded() && this.activeAlbumPhotos().length === 0) {
      return Array.from({ length: Math.min(album.photosCount, 24) }, (_, i) => ({
        id: `${album.id}-photo-${i + 1}`,
        albumId: album.id,
        title: `${album.title} • Foto ${i + 1}`,
        previewUrl: album.coverUrl,
        originalWidth: 4000,
        originalHeight: 3000,
        isSampleHD: i < 3 // Primeras 3 fotos son muestras HD destacadas
      }));
    }

    return [];
  });

  public readonly currentLightboxPhoto = computed<Photo | null>(() => {
    const photos = this.currentPhotos();
    const idx = this.lightboxIndex();
    return photos[idx] || null;
  });

  public readonly isCurrentLightboxPhotoSelected = computed<boolean>(() => {
    const p = this.currentLightboxPhoto();
    return p ? this.cartStore.isPhotoSelected(p.id) : false;
  });

  public dismissSplash(): void {
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
    this.showSplash.set(false);
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('la_tercera_splash_seen', 'true');
      } catch {}
    }
  }

  public initSplashScreen(): void {
    if (typeof sessionStorage !== 'undefined') {
      try {
        const seen = sessionStorage.getItem('la_tercera_splash_seen');
        if (seen === 'true') {
          this.showSplash.set(false);
          return;
        }
      } catch {}
    }

    if (typeof window !== 'undefined') {
      this.splashTimer = setTimeout(() => {
        this.dismissSplash();
      }, 900);
    }
  }

  public loadPublicAlbums(): void {
    this.isLoadingPublicAlbums.set(true);
    this.albumService.getAlbums().subscribe({
      next: (albums) => {
        this.isLoadingPublicAlbums.set(false);
        this.albums.set(albums);
        this.checkDirectAlbumLink();
        this.dismissSplash();
      },
      error: () => {
        this.isLoadingPublicAlbums.set(false);
        // Fallback local con álbumes oficiales de La Tercera
        this.albums.set([
          {
            id: 'album-1',
            category: 'futbol',
            title: 'Atlético Tesorieri vs Andino SC',
            subtitle: 'Liga Riojana de Fútbol • Fecha 7',
            date: '12 Octubre, 2026',
            photosCount: 48,
            unitPrice: 1200,
            fullAlbumPrice: 9500,
            coverUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
            badge: '⚽ Fútbol'
          },
          {
            id: 'album-2',
            category: 'hockey',
            title: 'Torneo Provincial de Hockey Femenino',
            subtitle: 'Polideportivo Evita • Semifinales',
            date: '5 Octubre, 2026',
            photosCount: 36,
            unitPrice: 1200,
            fullAlbumPrice: 9500,
            coverUrl: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=800&q=80',
            badge: '🏑 Hockey'
          },
          {
            id: 'album-3',
            category: 'basquet',
            title: 'Facundo vs Banco Rioja (Primera Básquet)',
            subtitle: 'Torneo Clausura de Básquetbol',
            date: '28 Septiembre, 2026',
            photosCount: 42,
            unitPrice: 1200,
            fullAlbumPrice: 9500,
            coverUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
            badge: '🏀 Básquet'
          },
          {
            id: 'album-4',
            category: 'sociales',
            title: 'Cumpleaños de 15 de Martina',
            subtitle: 'Salón Las Retamas • Festejo & Baile',
            date: '20 Septiembre, 2026',
            photosCount: 85,
            unitPrice: 1200,
            fullAlbumPrice: 9500,
            coverUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
            badge: '🎉 Cumpleaños & Social'
          }
        ]);
        this.checkDirectAlbumLink();
        this.dismissSplash();
      }
    });
  }

  /**
   * Abre automáticamente un álbum si la URL contiene el parámetro ?album=<id_o_slug>
   */
  public checkDirectAlbumLink(): void {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const albumParam = params.get('album')?.trim();
    if (!albumParam) return;

    const matched = this.albums().find(a => a.id === albumParam || a.customSlug === albumParam);
    if (matched) {
      this.openAlbum(matched);
    }
  }

  public loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        if (cats && cats.length > 0) {
          this.apiCategories.set(cats);
        }
      },
      error: () => {
        // Fallback defensivo a DEFAULT_CATEGORIES
      }
    });
  }

  ngOnInit(): void {
    this.initSplashScreen();
    this.loadPublicAlbums();
    this.loadCategories();
    this.cartStore.refreshPricingConfig();

    // Sincronización de configuración de descuentos por volumen desde el backend
    this.paymentService.getPricingConfig().subscribe({
      next: (config) => {
        if (config) {
          this.cartStore.setTierConfig(config);
        }
      },
      error: () => {
        // Fallback defensivo a valores por defecto
      }
    });

    // Detección de retorno de pasarela de pagos (Mercado Pago Checkout Pro) o enlaces directos
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isPaymentReturn =
        params.has('collection_status') ||
        params.has('external_reference') ||
        params.has('token') ||
        window.location.pathname.includes('pago-exitoso');

      if (isPaymentReturn) {
        this.transitionView(() => this.currentView.set('payment-success'));
      }

      // Atajo administrativo discreto: Ctrl + Shift + A
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
          e.preventDefault();
          this.transitionView(() => {
            if (this.adminAuthStore.isAuthenticated()) {
              this.currentView.set(this.currentView() === 'admin' ? 'portfolio' : 'admin');
            } else {
              this.currentView.set(this.currentView() === 'admin-login' ? 'portfolio' : 'admin-login');
            }
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
  }

  /**
   * Helper seguro para animar cambios de vista con la View Transitions API nativa
   * Cuenta con fallback transparente en navegadores no compatibles o entornos de prueba
   */
  public transitionView(updateFn: () => void): void {
    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      typeof (document as any).startViewTransition === 'function'
    ) {
      (document as any).startViewTransition(() => {
        updateFn();
      });
    } else {
      updateFn();
    }
  }

  public switchView(view: 'portfolio' | 'admin'): void {
    if (view === 'admin') {
      if (!this.adminAuthStore.isAuthenticated()) {
        this.transitionView(() => this.currentView.set('admin-login'));
        return;
      }
    } else if (view === 'portfolio') {
      this.loadPublicAlbums();
    }
    this.transitionView(() => this.currentView.set(view));
  }

  public onAdminLoginSuccess(): void {
    this.transitionView(() => this.currentView.set('admin'));
  }

  public logoutAdmin(): void {
    this.adminAuthStore.logout();
    if (this.currentView() === 'admin' || this.currentView() === 'admin-login') {
      this.transitionView(() => {
        this.loadPublicAlbums();
        this.currentView.set('portfolio');
      });
    }
  }

  public openPinModal(album: Album): void {
    this.selectedPrivateAlbum.set(album);
    this.isPinModalOpen.set(true);
  }

  public closePinModal(): void {
    this.isPinModalOpen.set(false);
    this.selectedPrivateAlbum.set(null);
  }

  public onAlbumUnlocked(event: { albumId: string; accessToken?: string }): void {
    this.albumAccessStore.unlockAlbum(event.albumId, event.accessToken);
    const album = this.albums().find(a => a.id === event.albumId) || this.selectedPrivateAlbum();
    this.closePinModal();
    if (album) {
      this.openAlbum(album);
    }
  }

  public downloadCourtesyZip(album: Album): void {
    const url = this.albumService.getFreeAlbumZipUrl(album.id);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }

  public openAlbum(album: Album): void {
    // Si el álbum es privado y no está desbloqueado, abrir modal de PIN
    if (album.isPrivate && !this.albumAccessStore.isUnlocked(album.id)) {
      this.openPinModal(album);
      return;
    }

    this.isLoadingAlbumPhotos.set(true);
    this.albumPhotosLoaded.set(false);
    this.photosCurrentPage.set(1);
    this.photosFilterMode.set('todas');

    this.transitionView(() => {
      this.currentAlbum.set(album);
      this.cartStore.setAlbumPricing(album.id, album.fullAlbumPrice, album.unitPrice);
      this.activeAlbumPhotos.set([]); // Limpiar fotos anteriores
      this.currentView.set('album');
    });

    // Cargar fotos reales del álbum desde el backend / Supabase
    this.albumService.getAlbumPhotos(album.id).subscribe({
      next: (photos) => {
        this.isLoadingAlbumPhotos.set(false);
        this.albumPhotosLoaded.set(true);
        if (photos && photos.length > 0) {
          this.activeAlbumPhotos.set(photos);
        }
      },
      error: (err) => {
        this.isLoadingAlbumPhotos.set(false);
        this.albumPhotosLoaded.set(true);
        console.warn('[App] No se pudieron cargar fotos desde el backend, usando fallback:', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  public goHome(): void {
    this.transitionView(() => {
      this.activeAlbumPhotos.set([]);
      this.isLoadingAlbumPhotos.set(false);
      this.albumPhotosLoaded.set(false);
      this.photosCurrentPage.set(1);
      this.photosFilterMode.set('todas');
      this.loadPublicAlbums();
      this.currentView.set('portfolio');
    });
  }

  public setCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.currentPage.set(1);
  }

  public goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  public nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  public prevPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  public buyFullAlbum(): void {
    const album = this.currentAlbum();
    if (!album) return;
    this.cartStore.setFullAlbumMode(album.id, album.fullAlbumPrice, album.unitPrice);
    this.isCheckoutOpen.set(true);
  }

  public openLightbox(photo: Photo, index: number): void {
    const realIndex = this.currentPhotos().findIndex(p => p.id === photo.id);
    this.lightboxIndex.set(realIndex >= 0 ? realIndex : index);
    this.isLightboxOpen.set(true);
  }

  public closeLightbox(): void {
    this.isLightboxOpen.set(false);
  }

  public nextLightboxPhoto(): void {
    const total = this.currentPhotos().length;
    if (total === 0) return;
    this.lightboxIndex.update(i => (i + 1) % total);
  }

  public prevLightboxPhoto(): void {
    const total = this.currentPhotos().length;
    if (total === 0) return;
    this.lightboxIndex.update(i => (i - 1 + total) % total);
  }

  public togglePhoto(photo: Photo): void {
    this.cartStore.togglePhoto(photo);
  }

  public togglePhotoFromLightbox(photo: Photo): void {
    this.togglePhoto(photo);
  }

  public openCheckout(): void {
    this.isCheckoutOpen.set(true);
  }

  public closeCheckout(): void {
    this.isCheckoutOpen.set(false);
  }

  public openOrderRecovery(): void {
    this.isOrderRecoveryOpen.set(true);
  }

  public closeOrderRecovery(): void {
    this.isOrderRecoveryOpen.set(false);
  }
}

