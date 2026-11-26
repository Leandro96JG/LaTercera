import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import confetti from 'canvas-confetti';
import { DeliveryService } from '../../core/services/delivery.service';
import { CartStore } from '../../core/state/cart.store';
import { OrderDeliveryInfo, PhotoDownloadItem, DeliveryStatusResponse, ZIP_DOWNLOAD_THRESHOLD } from '../../core/models/delivery.model';

export type PaymentSuccessState = 'loading' | 'polling' | 'ready' | 'expired' | 'revoked' | 'error';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.component.html',
  styleUrl: './payment-success.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {
  private deliveryService: DeliveryService;
  private readonly router = inject(Router, { optional: true });
  private readonly cartStore = inject(CartStore, { optional: true });

  public readonly initialOrderId = input<string | undefined>(undefined);
  public readonly initialToken = input<string | undefined>(undefined);
  public readonly goHome = output<void>();

  public readonly state = signal<PaymentSuccessState>('loading');
  public readonly orderInfo = signal<OrderDeliveryInfo | null>(null);
  public readonly errorMessage = signal<string | null>(null);
  public readonly isExpired = signal<boolean>(false);
  public readonly copiedLink = signal<boolean>(false);
  public readonly downloadingZip = signal<boolean>(false);
  public readonly downloadingAllIndividual = signal<boolean>(false);
  public readonly downloadingPhotoId = signal<string | null>(null);
  public readonly sharingPhotoId = signal<string | null>(null);
  public readonly downloadedPhotoIds = signal<ReadonlySet<string>>(new Set());
  public readonly showSaveGuide = signal<boolean>(false);
  public readonly isInAppBrowser = signal<boolean>(false);
  public readonly canWebShareFiles = signal<boolean>(false);
  public readonly remainingSeconds = signal<number>(0);
  public readonly pollingAttempt = signal<number>(0);
  public readonly currentOrderId = signal<string | null>(null);
  private currentToken: string | null = null;

  public readonly totalPhotosCount = computed(() => {
    const info = this.orderInfo();
    if (!info) return 0;
    return info.photos?.length || info.totalPhotos || 0;
  });

  public readonly isSinglePhoto = computed(() => {
    const info = this.orderInfo();
    return Boolean(info && !info.isFullAlbum && this.totalPhotosCount() === 1);
  });

  public readonly isSmallPackJpg = computed(() => {
    const info = this.orderInfo();
    const count = this.totalPhotosCount();
    return Boolean(info && !info.isFullAlbum && count > 1 && count < ZIP_DOWNLOAD_THRESHOLD);
  });

  public readonly shouldUseZipAsPrimary = computed(() => {
    const info = this.orderInfo();
    return Boolean(info && (info.isFullAlbum || this.totalPhotosCount() >= ZIP_DOWNLOAD_THRESHOLD));
  });

  public readonly downloadedCount = computed(() => this.downloadedPhotoIds().size);

  public readonly whatsappSelfLinkUrl = computed(() => {
    const info = this.orderInfo();
    const fallbackUrl = typeof window !== 'undefined' ? window.location.href : '';
    const linkUrl = this.currentToken && typeof window !== 'undefined'
      ? `${window.location.origin}/?token=${encodeURIComponent(this.currentToken)}`
      : fallbackUrl;
    const msg = `📸 Mis fotos de "${info?.albumTitle || 'La Tercera'}" (disponibles por 72h):\n${linkUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  });

  public readonly formattedRemainingTime = computed(() => {
    return this.deliveryService.formatRemainingTime(this.remainingSeconds());
  });

  private timerInterval?: ReturnType<typeof setInterval>;
  private activeTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();
  private isDestroyed = false;

  constructor(deliveryService?: DeliveryService) {
    this.deliveryService = deliveryService || inject(DeliveryService);
  }

  ngOnInit(): void {
    this.isInAppBrowser.set(Boolean(this.deliveryService.isInAppBrowser?.()));
    this.canWebShareFiles.set(Boolean(this.deliveryService.canWebShareFiles?.()));

    let orderId = this.initialOrderId();
    let token = this.initialToken();
    let collectionStatus: string | null = null;

    // Si estamos en el navegador, inspeccionar queryParams de Mercado Pago
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      collectionStatus = params.get('collection_status') || params.get('status');
      if (!orderId && !token) {
        token = params.get('token') || undefined;
        // En Mercado Pago Checkout Pro, external_reference contiene el orderId
        orderId = params.get('external_reference') || params.get('orderId') || params.get('order_id') || undefined;
      }
    }

    if (collectionStatus && ['rejected', 'failure', 'cancelled'].includes(collectionStatus.toLowerCase()) && !token) {
      if (orderId) {
        this.currentOrderId.set(orderId);
      }
      this.state.set('error');
      this.errorMessage.set('El pago no fue aprobado o fue cancelado en Mercado Pago. Puedes volver al álbum e intentarlo con otro medio de pago.');
      return;
    }

    if (token) {
      this.loadDeliveryInfo(token);
    } else if (orderId) {
      this.loadByOrderId(orderId);
    } else {
      this.state.set('error');
      this.errorMessage.set('No se encontró el identificador de orden ni token de descarga.');
    }

    // Iniciar cuenta regresiva si hay remainingSeconds
    this.timerInterval = setInterval(() => {
      const current = this.remainingSeconds();
      if (current > 0) {
        this.remainingSeconds.set(current - 1);
      } else if (this.state() === 'ready' && current === 0) {
        this.state.set('expired');
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    for (const timeoutId of this.activeTimeouts) {
      clearTimeout(timeoutId);
    }
    this.activeTimeouts.clear();
  }

  private registerTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    const id = setTimeout(() => {
      this.activeTimeouts.delete(id);
      if (!this.isDestroyed) {
        fn();
      }
    }, ms);
    this.activeTimeouts.add(id);
    return id;
  }

  public triggerConfetti(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    try {
      // Guardar contra entornos sin soporte completo de Canvas 2D (ej. jsdom)
      const testCanvas = document.createElement('canvas');
      if (!testCanvas.getContext || !testCanvas.getContext('2d')) {
        return;
      }
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FDB813', '#131316', '#10B981', '#FFFFFF']
        });
      }
    } catch {
      // Fallback silencioso en entornos de prueba o navegadores sin canvas
    }
  }

  public loadDeliveryInfo(token: string): void {
    this.currentToken = token;
    this.state.set('loading');
    this.errorMessage.set(null);

    this.deliveryService.getDeliveryInfo(token).subscribe({
      next: (info) => {
        if (this.isDestroyed) return;
        const isExp = info.isExpired;
        this.orderInfo.set(info);
        this.remainingSeconds.set(info.expiresInSeconds);
        this.isExpired.set(isExp);
        this.state.set(isExp ? 'expired' : 'ready');
        if (!isExp) {
          this.cartStore?.clearCart();
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(
                'lt_ready_order',
                JSON.stringify({
                  orderId: info.orderId,
                  albumTitle: info.albumTitle,
                  token,
                  expiresAt: info.expiresAt
                })
              );
              window.localStorage.removeItem('lt_pending_order');
            } catch {}
          }
          this.triggerConfetti();
        }
      },
      error: (err: { status?: number; error?: { isExpired?: boolean; isCancelled?: boolean; error?: string } }) => {
        if (this.isDestroyed) return;
        if (err?.status === 403 || err?.error?.isCancelled) {
          this.state.set('revoked');
          this.errorMessage.set(err?.error?.error || 'El acceso a las fotografías fue revocado debido a la anulación o reembolso del pago.');
        } else if (err?.status === 410 || err?.error?.isExpired) {
          this.state.set('expired');
          this.isExpired.set(true);
        } else {
          this.state.set('error');
          this.errorMessage.set(err?.error?.error || 'Error al validar el enlace de descarga.');
        }
      }
    });
  }

  public loadByOrderId(orderId: string): void {
    this.currentOrderId.set(orderId);
    let statusNonce: string | undefined;
    let mpPaymentId: string | undefined;
    if (typeof window !== 'undefined') {
      try {
        const rawPending = window.localStorage.getItem('lt_pending_order');
        if (rawPending) {
          const parsed = JSON.parse(rawPending) as { orderId?: string; statusNonce?: string };
          if (parsed.orderId === orderId && parsed.statusNonce) {
            statusNonce = parsed.statusNonce;
          }
        }
        const params = new URLSearchParams(window.location.search);
        mpPaymentId = params.get('payment_id') || params.get('collection_id') || undefined;
      } catch {}
    }

    const status$ = (statusNonce || mpPaymentId)
      ? this.deliveryService.getOrderStatus(orderId, statusNonce, mpPaymentId)
      : this.deliveryService.getOrderStatus(orderId);

    status$.subscribe({
      next: (res: DeliveryStatusResponse) => {
        if (this.isDestroyed) return;
        if (res.status === 'PAID' && res.downloadToken) {
          this.loadDeliveryInfo(res.downloadToken);
        } else if (res.status === 'CANCELLED') {
          this.state.set('revoked');
          this.errorMessage.set('El acceso a las fotografías fue revocado debido a la anulación o reembolso del pago.');
        } else if (res.status === 'PENDING' || res.status === 'PROCESSING') {
          // El webhook de Mercado Pago está impactando; polling reactivo cada 3s hasta 6 intentos (18s máx)
          const attempt = this.pollingAttempt();
          if (attempt < 6) {
            this.state.set('polling');
            this.pollingAttempt.set(attempt + 1);
            this.registerTimeout(() => {
              this.loadByOrderId(orderId);
            }, 3000);
          } else {
            this.state.set('error');
            this.errorMessage.set('El pago sigue procesándose en Mercado Pago. Haz clic en Reintentar en unos segundos.');
          }
        } else if (res.status === 'FRAUD_ALERT_PRICE_MISMATCH') {
          this.state.set('error');
          this.errorMessage.set('Discrepancia detectada en la acreditación del pago. Contacta a soporte.');
        } else {
          this.state.set('error');
          this.errorMessage.set(`El pago se encuentra en estado: ${res.status}`);
        }
      },
      error: () => {
        if (this.isDestroyed) return;
        this.state.set('error');
        this.errorMessage.set('No fue posible consultar el estado de la orden.');
      }
    });
  }

  public downloadAllZip(): void {
    const info = this.orderInfo();
    if (!info) return;

    this.downloadingZip.set(true);
    const filename = `LA_TERCERA_${info.albumId}_FOTOS_HD.zip`;
    this.deliveryService.triggerDirectDownload(info.zipDownloadUrl, filename);

    this.registerTimeout(() => {
      this.downloadingZip.set(false);
    }, 2000);
  }

  public downloadAllIndividual(): void {
    const info = this.orderInfo();
    if (!info || info.photos.length === 0) return;

    this.downloadingAllIndividual.set(true);
    info.photos.forEach((photo, idx) => {
      if (idx === 0) {
        this.downloadPhoto(photo);
      } else {
        this.registerTimeout(() => {
          this.downloadPhoto(photo);
        }, idx * 380);
      }
    });

    this.registerTimeout(() => {
      this.downloadingAllIndividual.set(false);
    }, Math.max(1500, info.photos.length * 420));
  }

  public downloadPhoto(photo: PhotoDownloadItem): void {
    this.downloadingPhotoId.set(photo.id);
    this.deliveryService.triggerDirectDownload(photo.downloadUrl, photo.filename);
    this.downloadedPhotoIds.update((prev) => {
      const next = new Set(prev);
      next.add(photo.id);
      return next;
    });

    this.registerTimeout(() => {
      if (this.downloadingPhotoId() === photo.id) {
        this.downloadingPhotoId.set(null);
      }
    }, 1500);
  }

  public async sharePhotoToGallery(photo: PhotoDownloadItem): Promise<void> {
    if (!this.deliveryService.savePhotoToGallery) {
      this.downloadPhoto(photo);
      return;
    }

    this.sharingPhotoId.set(photo.id);
    try {
      await this.deliveryService.savePhotoToGallery(photo.downloadUrl, photo.filename);
      if (this.isDestroyed) return;
      this.downloadedPhotoIds.update((prev) => {
        const next = new Set(prev);
        next.add(photo.id);
        return next;
      });
    } finally {
      if (!this.isDestroyed) {
        this.sharingPhotoId.set(null);
      }
    }
  }

  public isPhotoDownloaded(photoId: string): boolean {
    return this.downloadedPhotoIds().has(photoId);
  }

  public toggleSaveGuide(): void {
    this.showSaveGuide.update(v => !v);
  }

  public copyShareLink(): void {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      if (this.isDestroyed) return;
      this.copiedLink.set(true);
      this.registerTimeout(() => {
        this.copiedLink.set(false);
      }, 3000);
    });
  }

  public onGoHome(): void {
    if (this.router) {
      this.router.navigate(['/'], { replaceUrl: true });
    }
    if (typeof window !== 'undefined' && typeof window.history !== 'undefined') {
      try {
        window.history.replaceState({}, document.title, '/');
      } catch {}
    }
    this.goHome.emit();
  }

  public retryPolling(): void {
    const orderId = this.currentOrderId();
    if (orderId) {
      this.pollingAttempt.set(0);
      this.state.set('polling');
      this.errorMessage.set(null);
      this.loadByOrderId(orderId);
    }
  }
}
