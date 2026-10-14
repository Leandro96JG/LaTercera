import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeliveryService } from '../../core/services/delivery.service';
import { OrderDeliveryInfo, PhotoDownloadItem, DeliveryStatusResponse } from '../../core/models/delivery.model';

export type PaymentSuccessState = 'loading' | 'polling' | 'ready' | 'expired' | 'error';

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

  @Input() initialOrderId?: string;
  @Input() initialToken?: string;
  @Output() goHome = new EventEmitter<void>();

  public readonly state = signal<PaymentSuccessState>('loading');
  public readonly orderInfo = signal<OrderDeliveryInfo | null>(null);
  public readonly errorMessage = signal<string | null>(null);
  public readonly isExpired = signal<boolean>(false);
  public readonly copiedLink = signal<boolean>(false);
  public readonly downloadingZip = signal<boolean>(false);
  public readonly downloadingPhotoId = signal<string | null>(null);
  public readonly remainingSeconds = signal<number>(0);
  public readonly pollingAttempt = signal<number>(0);

  public readonly formattedRemainingTime = computed(() => {
    return this.deliveryService.formatRemainingTime(this.remainingSeconds());
  });

  private timerInterval?: ReturnType<typeof setInterval>;
  private pollingTimeout?: ReturnType<typeof setTimeout>;

  constructor(deliveryService?: DeliveryService) {
    this.deliveryService = deliveryService || inject(DeliveryService);
  }

  ngOnInit(): void {
    let orderId = this.initialOrderId;
    let token = this.initialToken;

    // Si estamos en el navegador, inspeccionar queryParams de Mercado Pago
    if (typeof window !== 'undefined' && (!orderId && !token)) {
      const params = new URLSearchParams(window.location.search);
      token = params.get('token') || undefined;
      // En Mercado Pago Checkout Pro, external_reference contiene el orderId
      orderId = params.get('external_reference') || params.get('orderId') || params.get('order_id') || undefined;
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
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }
  }

  public loadDeliveryInfo(token: string): void {
    this.state.set('loading');
    this.errorMessage.set(null);

    this.deliveryService.getDeliveryInfo(token).subscribe({
      next: (info) => {
        this.orderInfo.set(info);
        this.remainingSeconds.set(info.expiresInSeconds);
        this.isExpired.set(info.isExpired);
        this.state.set(info.isExpired ? 'expired' : 'ready');
      },
      error: (err) => {
        if (err?.status === 410 || err?.error?.isExpired) {
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
    this.deliveryService.getOrderStatus(orderId).subscribe({
      next: (res) => {
        if (res.status === 'PAID' && res.downloadToken) {
          this.loadDeliveryInfo(res.downloadToken);
        } else if (res.status === 'PENDING' || res.status === 'PROCESSING') {
          // El webhook de Mercado Pago está impactando; polling reactivo hasta 10 intentos
          const attempt = this.pollingAttempt();
          if (attempt < 10) {
            this.state.set('polling');
            this.pollingAttempt.set(attempt + 1);
            this.pollingTimeout = setTimeout(() => {
              this.loadByOrderId(orderId);
            }, 2500);
          } else {
            this.state.set('ready'); // Dar acceso con los datos disponibles o permitir refrescar
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

    setTimeout(() => {
      this.downloadingZip.set(false);
    }, 2000);
  }

  public downloadPhoto(photo: PhotoDownloadItem): void {
    this.downloadingPhotoId.set(photo.id);
    this.deliveryService.triggerDirectDownload(photo.downloadUrl, photo.filename);

    setTimeout(() => {
      this.downloadingPhotoId.set(null);
    }, 1500);
  }

  public copyShareLink(): void {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), 3000);
    });
  }

  public onGoHome(): void {
    this.goHome.emit();
  }
}
