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
  getOrderStatus(orderId: string): Observable<DeliveryStatusResponse> {
    return this.http.get<DeliveryStatusResponse>(`${this.downloadApiUrl}/order/${encodeURIComponent(orderId)}/status`);
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
   * Dispara la descarga directa de un archivo en el navegador
   */
  triggerDirectDownload(url: string, filename?: string): void {
    if (typeof window === 'undefined') return;

    const link = document.createElement('a');
    link.href = url;
    if (filename) {
      link.download = filename;
    }
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
