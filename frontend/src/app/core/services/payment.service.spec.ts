import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { RecoverOrdersResponse } from '../models/order.model';
import { environment } from '../../../environments/environment';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpTesting: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PaymentService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe enviar POST a /orders/recover con el email provisto', () => {
    const mockResponse: RecoverOrdersResponse = {
      success: true,
      orders: [
        {
          orderId: 'ord_rec_1',
          albumTitle: 'Final del Torneo',
          photoCount: 5,
          isFullAlbum: false,
          createdAt: new Date().toISOString(),
          downloadToken: 'tok_abc_123',
          redirectUrl: 'http://localhost:4200/pago-exitoso?token=tok_abc_123'
        }
      ]
    };

    service.recoverOrdersByEmail('cliente@test.com').subscribe(res => {
      expect(res.success).toBe(true);
      expect(res.orders?.length).toBe(1);
      expect(res.orders?.[0].orderId).toBe('ord_rec_1');
    });

    const req = httpTesting.expectOne(`${apiUrl}/orders/recover`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'cliente@test.com',
      paymentId: undefined
    });

    req.flush(mockResponse);
  });

  it('debe incluir paymentId opcional en el cuerpo de /orders/recover cuando se envía', () => {
    const mockResponse: RecoverOrdersResponse = {
      success: true,
      orders: []
    };

    service.recoverOrdersByEmail('cliente@test.com', 'PAY_999').subscribe(res => {
      expect(res.success).toBe(true);
    });

    const req = httpTesting.expectOne(`${apiUrl}/orders/recover`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'cliente@test.com',
      paymentId: 'PAY_999'
    });

    req.flush(mockResponse);
  });

  it('debe consultar el estado de una orden por ID', () => {
    service.getOrderStatus('ord_123').subscribe(res => {
      expect(res.id).toBe('ord_123');
      expect(res.status).toBe('PAID');
    });

    const req = httpTesting.expectOne(`${apiUrl}/orders/ord_123`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'ord_123',
      albumId: 'alb_1',
      status: 'PAID',
      totalAmount: 1200,
      photoCount: 1,
      isFullAlbum: false,
      hasDownloadToken: true,
      downloadToken: 'valid_tok',
      createdAt: new Date().toISOString()
    });
  });
});
