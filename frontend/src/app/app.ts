import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './features/header/header.component';
import { HeroComponent } from './features/hero/hero.component';
import { FloatingCartComponent } from './features/cart/floating-cart.component';
import { LightboxComponent } from './features/lightbox/lightbox.component';
import { CheckoutModalComponent } from './features/checkout/checkout-modal.component';
import { AdminLoginComponent } from './features/admin-login/admin-login.component';
import { AdminPanelComponent } from './features/admin-panel/admin-panel.component';
import { PaymentSuccessComponent } from './features/payment-success/payment-success.component';
import { AlbumService } from './core/services/album.service';
import { CartStore } from './core/state/cart.store';
import { AdminAuthStore } from './core/state/admin-auth.store';
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
    PaymentSuccessComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public readonly albumService = inject(AlbumService);
  public readonly cartStore = inject(CartStore);
  public readonly adminAuthStore = inject(AdminAuthStore);

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

  // Álbumes filtrados
  public readonly filteredAlbums = computed(() => {
    const cat = this.selectedCategory();
    const list = this.albums();
    if (cat === 'all') return list;
    return list.filter(a => a.category === cat);
  });

  // Fotos del álbum actual
  public readonly currentPhotos = computed<readonly Photo[]>(() => {
    const album = this.currentAlbum();
    if (!album) return [];
    if (album.photos && album.photos.length > 0) return album.photos;

    // Generar fotos de demostración basadas en el álbum
    return Array.from({ length: Math.min(album.photosCount, 24) }, (_, i) => ({
      id: `${album.id}-photo-${i + 1}`,
      albumId: album.id,
      title: `${album.title} • Foto ${i + 1}`,
      previewUrl: album.coverUrl,
      originalWidth: 4000,
      originalHeight: 3000,
      isSampleHD: i < 3 // Primeras 3 fotos son muestras HD destacadas
    }));
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

  ngOnInit(): void {
    this.albumService.getAlbums().subscribe({
      next: (albums) => {
        this.albums.set(albums);
      },
      error: () => {
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
        this.currentView.set('payment-success');
      }

      // Atajo administrativo discreto: Ctrl + Shift + A
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
          e.preventDefault();
          if (this.adminAuthStore.isAuthenticated()) {
            this.currentView.set(this.currentView() === 'admin' ? 'portfolio' : 'admin');
          } else {
            this.currentView.set(this.currentView() === 'admin-login' ? 'portfolio' : 'admin-login');
          }
        }
      });
    }
  }

  public switchView(view: 'portfolio' | 'admin'): void {
    if (view === 'admin') {
      if (!this.adminAuthStore.isAuthenticated()) {
        this.currentView.set('admin-login');
        return;
      }
    }
    this.currentView.set(view);
  }

  public onAdminLoginSuccess(): void {
    this.currentView.set('admin');
  }

  public logoutAdmin(): void {
    this.adminAuthStore.logout();
    if (this.currentView() === 'admin' || this.currentView() === 'admin-login') {
      this.currentView.set('portfolio');
    }
  }

  public openAlbum(album: Album): void {
    this.currentAlbum.set(album);
    this.currentView.set('album');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  public goHome(): void {
    this.currentView.set('portfolio');
  }

  public setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  public buyFullAlbum(): void {
    const album = this.currentAlbum();
    if (!album) return;
    this.cartStore.setFullAlbumMode(album.id, album.fullAlbumPrice);
    this.isCheckoutOpen.set(true);
  }

  public openLightbox(photo: Photo, index: number): void {
    this.lightboxIndex.set(index);
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

  public togglePhotoFromLightbox(photo: Photo): void {
    this.cartStore.togglePhoto(photo);
  }

  public openCheckout(): void {
    this.isCheckoutOpen.set(true);
  }

  public closeCheckout(): void {
    this.isCheckoutOpen.set(false);
  }
}
