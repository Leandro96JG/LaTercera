import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, untracked, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  private readonly router = inject(Router, { optional: true });

  // Categorías dinámicas consultadas desde la API / Supabase
  public readonly apiCategories = signal<readonly CategoryDTO[]>(DEFAULT_CATEGORIES);

  public readonly publicCategories = computed(() => {
    const albums = this.albums();
    const baseCategories = this.apiCategories();
    const map = new Map<string, { id: string; name: string; icon: string; count: number; latestTs: number; firstIndex: number }>();

    for (const cat of baseCategories) {
      if (cat.isActive) {
        map.set(cat.id, {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          count: 0,
          latestTs: -Infinity,
          firstIndex: Number.MAX_SAFE_INTEGER
        });
      }
    }

    albums.forEach((album, index) => {
      const catKey = album.category || 'otros';
      if (!map.has(catKey)) {
        const badgeParts = (album.badge || '').trim().split(' ');
        const icon = badgeParts.length > 1 ? badgeParts[0] : '📸';
        const name = badgeParts.length > 1 ? badgeParts.slice(1).join(' ') : (album.category || 'Evento');
        map.set(catKey, {
          id: catKey,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          icon,
          count: 0,
          latestTs: -Infinity,
          firstIndex: index
        });
      }
      const existing = map.get(catKey)!;
      existing.count += 1;
      existing.firstIndex = Math.min(existing.firstIndex, index);
      if (album.createdAt) {
        const ts = Date.parse(album.createdAt);
        if (!Number.isNaN(ts)) {
          existing.latestTs = Math.max(existing.latestTs, ts);
        }
      }
    });

    return Array.from(map.values())
      .filter(c => c.count > 0)
      .sort((a, b) => {
        if (a.latestTs !== b.latestTs) return b.latestTs - a.latestTs;
        return a.firstIndex - b.firstIndex;
      })
      .map(({ id, name, icon, count }) => ({ id, name, icon, count }));
  });

  // Splash Screen de Inicio
  public readonly showSplash = signal<boolean>(true);
  public readonly renderSplash = signal<boolean>(true);
  private splashTimer: ReturnType<typeof setTimeout> | null = null;
  private splashUnmountTimer: ReturnType<typeof setTimeout> | null = null;
  private splashFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly minSplashElapsed = signal<boolean>(false);
  private readonly albumsReceived = signal<boolean>(false);
  private readonly heroImageReceived = signal<boolean>(false);

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

  // Enlace rápido de compra acreditada reciente (<72h) almacenada en localStorage
  public readonly readyOrderLink = signal<{ orderId: string; albumTitle: string; token: string } | null>(null);
  public readonly readyOrderToken = signal<string | undefined>(undefined);

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

    return [...list]
      .map((a, i) => ({ a, i }))
      .sort((x, y) => {
        const tx = x.a.createdAt ? Date.parse(x.a.createdAt) : NaN;
        const ty = y.a.createdAt ? Date.parse(y.a.createdAt) : NaN;
        if (!Number.isNaN(tx) && !Number.isNaN(ty) && tx !== ty) return ty - tx;
        return x.i - y.i;
      })
      .map(({ a }) => a);
  });

  public onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.visibleCount.set(6);
  }

  public clearSearch(): void {
    this.searchQuery.set('');
    this.visibleCount.set(6);
  }

  // Carga progresiva en portfolio público («Ver más álbumes», de a 6)
  public readonly visibleCount = signal<number>(6);
  public readonly loadMoreAnnouncement = signal<string>('');

  public readonly visibleAlbums = computed(() => {
    return this.filteredAlbums().slice(0, this.visibleCount());
  });

  public readonly remainingCount = computed(() => {
    return Math.max(0, this.filteredAlbums().length - this.visibleCount());
  });

  public readonly activeCategoryName = computed<string>(() => {
    const cat = this.selectedCategory();
    if (cat === 'all') return '';
    return this.publicCategories().find(c => c.id === cat)?.name || cat;
  });

  public readonly activeCategoryIcon = computed<string>(() => {
    const cat = this.selectedCategory();
    if (cat === 'all') return '📸';
    return this.publicCategories().find(c => c.id === cat)?.icon || '📸';
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
    // Resetear cantidad visible del portfolio cuando cambian filtros
    effect(() => {
      this.selectedCategory();
      this.searchQuery();
      this.selectedDate();
      untracked(() => {
        this.visibleCount.set(6);
      });
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

    // Si el álbum no tiene fotos cargadas en backend, retornar vacío (evita clones repetidos de portada)
    return [];
  });

  public readonly currentLightboxPhoto = computed<Photo | null>(() => {
    const photos = this.currentPhotos();
    const idx = this.lightboxIndex();
    return photos[idx] || null;
  });

  public isPhotoSelected(photoId: string): boolean {
    const alb = this.currentAlbum();
    if (alb?.isFreeDownload) {
      return this.cartStore.isFreePhotoSelected(photoId);
    }
    return this.cartStore.isPhotoSelected(photoId);
  }

  public readonly currentAlbumSelectedCount = computed<number>(() => {
    const photos = this.currentPhotos();
    const alb = this.currentAlbum();
    if (!alb || photos.length === 0) return 0;
    if (alb.isFreeDownload) {
      return photos.filter(p => this.cartStore.isFreePhotoSelected(p.id)).length;
    }
    return photos.filter(p => this.cartStore.isPhotoSelected(p.id)).length;
  });

  public readonly isCurrentLightboxPhotoSelected = computed<boolean>(() => {
    const p = this.currentLightboxPhoto();
    return p ? this.isPhotoSelected(p.id) : false;
  });

  public dismissSplash(): void {
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
    if (this.splashFallbackTimer) {
      clearTimeout(this.splashFallbackTimer);
      this.splashFallbackTimer = null;
    }
    this.showSplash.set(false);
    if (typeof window !== 'undefined') {
      if (this.splashUnmountTimer) {
        clearTimeout(this.splashUnmountTimer);
      }
      this.splashUnmountTimer = setTimeout(() => {
        this.renderSplash.set(false);
        this.splashUnmountTimer = null;
      }, 520);
    } else {
      this.renderSplash.set(false);
    }
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('la_tercera_splash_seen', 'true');
      } catch {}
    }
  }

  public onHeroLoaded(): void {
    this.heroImageReceived.set(true);
    this.checkSplashDismissal();
  }

  public onAlbumsLoaded(): void {
    this.albumsReceived.set(true);
    this.checkSplashDismissal();
  }

  private checkSplashDismissal(): void {
    if (this.minSplashElapsed() && this.albumsReceived()) {
      this.dismissSplash();
    }
  }

  public initSplashScreen(): void {
    if (typeof sessionStorage !== 'undefined') {
      try {
        const seen = sessionStorage.getItem('la_tercera_splash_seen');
        if (seen === 'true') {
          this.showSplash.set(false);
          this.renderSplash.set(false);
          return;
        }
      } catch {}
    }

    if (typeof window !== 'undefined') {
      // Tiempo mínimo anti-parpadeo: 450ms
      this.splashTimer = setTimeout(() => {
        this.minSplashElapsed.set(true);
        this.checkSplashDismissal();
      }, 450);

      // Timeout de seguridad máximo: 1800ms
      this.splashFallbackTimer = setTimeout(() => {
        this.dismissSplash();
      }, 1800);
    }
  }

  public loadPublicAlbums(): void {
    this.isLoadingPublicAlbums.set(true);
    this.albumService.getAlbums().subscribe({
      next: (albums) => {
        this.isLoadingPublicAlbums.set(false);
        this.albums.set(albums);
        this.checkDirectAlbumLink();
        this.onAlbumsLoaded();
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
        this.onAlbumsLoaded();
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
      this.openAlbum(matched, false);
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

      const isAdminRoute =
        params.has('admin') ||
        window.location.pathname.includes('admin');

      if (isPaymentReturn) {
        this.transitionView(() => this.currentView.set('payment-success'));
      } else if (isAdminRoute) {
        this.transitionView(() => {
          this.currentView.set(this.adminAuthStore.isAuthenticated() ? 'admin' : 'admin-login');
        });
      }

      // Cargar acceso directo a descarga reciente (<72h) almacenada en el navegador
      try {
        const rawReady = window.localStorage.getItem('lt_ready_order');
        if (rawReady) {
          const parsed = JSON.parse(rawReady) as {
            orderId?: string;
            albumTitle?: string;
            token?: string;
            expiresAt?: string;
          };
          const expMs = parsed.expiresAt ? new Date(parsed.expiresAt).getTime() : 0;
          if (parsed.token && parsed.orderId && (!expMs || expMs > Date.now())) {
            this.readyOrderLink.set({
              orderId: parsed.orderId,
              albumTitle: parsed.albumTitle || 'Tus Fotos',
              token: parsed.token
            });
          } else {
            window.localStorage.removeItem('lt_ready_order');
          }
        }
      } catch {}

      // Atajo administrativo discreto: Ctrl + Shift + A
      window.addEventListener('keydown', this.onKeydown);
      window.addEventListener('popstate', this.onPopState);
    }
  }

  private readonly onKeydown = (e: KeyboardEvent): void => {
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
  };

  ngOnDestroy(): void {
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
    if (this.splashFallbackTimer) {
      clearTimeout(this.splashFallbackTimer);
      this.splashFallbackTimer = null;
    }
    if (this.splashUnmountTimer) {
      clearTimeout(this.splashUnmountTimer);
      this.splashUnmountTimer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeydown);
      window.removeEventListener('popstate', this.onPopState);
    }
  }

  private readonly onPopState = (event: PopStateEvent): void => {
    if (typeof window === 'undefined') return;
    const state = event.state as { view?: string; albumId?: string } | null;
    const params = new URLSearchParams(window.location.search);
    const albumParam = params.get('album')?.trim();

    if (state?.view === 'album' || albumParam) {
      const targetKey = state?.albumId || albumParam;
      const matched = this.albums().find(a => a.id === targetKey || a.customSlug === targetKey);
      if (matched) {
        if (this.currentView() !== 'album' || this.currentAlbum()?.id !== matched.id) {
          this.openAlbum(matched, false);
        }
        return;
      }
    }

    this.closeAllModals();
    if (this.currentView() !== 'portfolio') {
      this.resetToPortfolio(false);
    }
  };

  private closeAllModals(): void {
    this.isLightboxOpen.set(false);
    this.isCheckoutOpen.set(false);
    this.isPinModalOpen.set(false);
    this.selectedPrivateAlbum.set(null);
    this.isOrderRecoveryOpen.set(false);
  }

  private resetToPortfolio(reloadAlbums: boolean): void {
    this.transitionView(() => {
      this.currentAlbum.set(null);
      this.activeAlbumPhotos.set([]);
      this.isLoadingAlbumPhotos.set(false);
      this.albumPhotosLoaded.set(false);
      this.photosCurrentPage.set(1);
      this.photosFilterMode.set('todas');
      if (reloadAlbums) {
        this.loadPublicAlbums();
      }
      this.currentView.set('portfolio');
    });
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

  public openAlbum(album: Album, pushHistory = true): void {
    // Si el álbum es privado y no está desbloqueado, abrir modal de PIN
    if (album.isPrivate && !this.albumAccessStore.isUnlocked(album.id)) {
      this.openPinModal(album);
      return;
    }

    if (pushHistory && typeof window !== 'undefined' && typeof window.history !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('album', album.customSlug || album.id);
        window.history.pushState(
          { view: 'album', albumId: album.id },
          document.title,
          `${url.pathname}${url.search}`
        );
      } catch {}
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
    if (this.router) {
      this.router.navigate(['/'], { replaceUrl: true });
    }
    if (typeof window !== 'undefined' && typeof window.history !== 'undefined') {
      try {
        window.history.replaceState({}, document.title, '/');
      } catch {}
    }
    this.resetToPortfolio(true);
  }

  public setCategory(cat: string, event?: Event): void {
    this.selectedCategory.set(cat);
    this.visibleCount.set(6);
    if (event && typeof document !== 'undefined') {
      const target = event.currentTarget as HTMLElement | null;
      target?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      document.getElementById('catalogo-albumes')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }

  public loadMore(): void {
    const prevCount = this.visibleAlbums().length;
    this.visibleCount.set(this.visibleCount() + 6);
    const loaded = Math.min(6, Math.max(0, this.filteredAlbums().length - prevCount));
    this.loadMoreAnnouncement.set(loaded > 0 ? `Se cargaron ${loaded} álbumes más` : '');

    if (typeof document !== 'undefined') {
      queueMicrotask(() => {
        const cards = document.querySelectorAll<HTMLElement>('#catalogo-albumes app-album-card-3d .album-card-root');
        cards[prevCount]?.focus();
      });
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
    const alb = this.currentAlbum();
    if (alb?.isFreeDownload) {
      this.cartStore.toggleFreePhoto(photo);
    } else {
      this.cartStore.togglePhoto(photo);
    }
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

  public openReadyOrder(token: string): void {
    if (!token) return;
    this.readyOrderToken.set(token);
    this.transitionView(() => this.currentView.set('payment-success'));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

