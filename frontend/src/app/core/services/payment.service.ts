import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, takeWhile, tap } from 'rxjs';
import {
  CreatePreferenceRequest,
  CreatePreferenceResponse,
  OrderStatusResponse
} from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:4000/api';

  public createPreference(request: CreatePreferenceRequest): Observable<CreatePreferenceResponse> {
    return this.http.post<CreatePreferenceResponse>(
      `${this.apiUrl}/checkout/preference`,
      request
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
}
