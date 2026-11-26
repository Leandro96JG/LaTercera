import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderDeliveryInfo, DeliveryStatusResponse } from '../models/delivery.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DeliveryService {
  private http: HttpClient;
  private readonly downloadApiUrl = `${environment.apiUrl}/downloads`;

  constructor(http?: HttpClient) {
    this.http = http || inject(HttpClient);
  }

  /**
   * Consulta el estado de una orden para confirmar acreditación en Mercado Pago
   */
  getOrderStatus(orderId: string, statusNonce?: string, paymentId?: string): Observable<DeliveryStatusResponse> {
    const queryParts: string[] = [];
    if (statusNonce) {
      queryParts.push(`nonce=${encodeURIComponent(statusNonce)}`);
    }
    if (paymentId) {
      queryParts.push(`payment_id=${encodeURIComponent(paymentId)}`);
    }
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.http.get<DeliveryStatusResponse>(`${this.downloadApiUrl}/order/${encodeURIComponent(orderId)}/status${qs}`);
  }

  /**
   * Obtiene la información completa de entrega usando el token firmado de 72h
   */
  getDeliveryInfo(token: string): Observable<OrderDeliveryInfo> {
    return this.http.get<OrderDeliveryInfo>(`${this.downloadApiUrl}/${encodeURIComponent(token)}/info`);
  }

  /**
   * Convierte los segundos restantes en un texto legible
   */
  formatRemainingTime(seconds: number): string {
    if (seconds <= 0) {
      return 'Enlace expirado';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours >= 24 && minutes === 0) {
      return `${hours} horas`;
    }

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours} horas`;
    }

    return `${minutes} minutos`;
  }

  /**
   * Detecta si el cliente abrió la web dentro del navegador interno de Instagram, WhatsApp o Facebook
   */
  isInAppBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Instagram|FBAN|FBAV|WhatsApp|Line|MicroMessenger/i.test(ua);
  }

  /**
   * Verifica si el navegador móvil soporta Web Share API con archivos (para "Guardar en Galería")
   */
  canWebShareFiles(): boolean {
    if (typeof navigator === 'undefined') return false;
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
  }

  /**
   * Intenta guardar una foto directamente en la Galería / Carrete usando Web Share API en celulares,
   * con fallback transparente a descarga directa si el navegador no soporta compartir archivos.
   */
  async savePhotoToGallery(url: string, filename: string): Promise<'shared' | 'downloaded'> {
    if (typeof window === 'undefined') return 'downloaded';
    if (this.canWebShareFiles()) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const mime = blob.type || 'image/jpeg';
          const file = new File([blob], filename, { type: mime });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: filename
            });
            return 'shared';
          }
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') {
          return 'shared';
        }
      }
    }
    this.triggerDirectDownload(url, filename);
    return 'downloaded';
  }

  /**
   * Dispara la descarga directa de un archivo en el navegador sin abrir pestañas en blanco
   */
  triggerDirectDownload(url: string, filename?: string): void {
    if (typeof window === 'undefined') return;

    const link = document.createElement('a');
    link.href = url;
    if (filename) {
      link.download = filename;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
