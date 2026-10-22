import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, timer, switchMap, takeWhile, tap } from 'rxjs';
import {
  CreatePreferenceRequest,
  CreatePreferenceResponse,
  OrderStatusResponse,
  RecoverOrdersResponse
} from '../models/order.model';
import { ValidateCouponResponse, PricingTierConfig } from '../models/admin.model';
import { AlbumAccessStore } from '../state/album-access.store';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly albumAccessStore = inject(AlbumAccessStore);
  private readonly apiUrl = environment.apiUrl;

  public createPreference(request: CreatePreferenceRequest): Observable<CreatePreferenceResponse> {
    let headers = new HttpHeaders();
    const token = request.accessToken || (request.albumId ? this.albumAccessStore.getAccessToken(request.albumId) : undefined);
    if (token) {
      headers = headers.set('x-album-access-token', token);
    }

    return this.http.post<CreatePreferenceResponse>(
      `${this.apiUrl}/checkout/preference`,
      request,
      { headers }
    );
  }

  public getOrderStatus(orderId: string): Observable<OrderStatusResponse> {
    return this.http.get<OrderStatusResponse>(`${this.apiUrl}/orders/${orderId}`);
  }

  /**
   * Monitoreo reactivo del estado de la orden cada 2.5s hasta que se confirme el pago (PAID)
   */
  public monitorOrderPayment(orderId: string): Observable<OrderStatusResponse> {
    return timer(0, 2500).pipe(
      switchMap(() => this.getOrderStatus(orderId)),
      takeWhile(order => order.status === 'PENDING', true)
    );
  }

  public validateCoupon(
    code: string,
    albumId?: string,
    photoCount?: number,
    isFullAlbum?: boolean
  ): Observable<ValidateCouponResponse> {
    return this.http.post<ValidateCouponResponse>(`${this.apiUrl}/pricing/validate-coupon`, {
      code,
      albumId,
      photoCount,
      isFullAlbum
    });
  }

  /**
   * Obtiene la configuración de descuentos por volumen activa
   */
  public getPricingConfig(): Observable<PricingTierConfig> {
    return this.http.get<PricingTierConfig>(`${this.apiUrl}/pricing/config`);
  }

  /**
   * Recupera las compras vigentes de las últimas 72 horas asociadas a un correo electrónico
   */
  public recoverOrdersByEmail(email: string, paymentId?: string): Observable<RecoverOrdersResponse> {
    return this.http.post<RecoverOrdersResponse>(`${this.apiUrl}/orders/recover`, {
      email,
      paymentId
    });
  }
}

