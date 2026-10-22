import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { AlbumAccessStore } from '../state/album-access.store';
import { RecoverOrdersResponse, CreatePreferenceRequest, CreatePreferenceResponse } from '../models/order.model';
import { environment } from '../../../environments/environment';

describe('PaymentService', () => {
  let service: PaymentService;
  let albumAccessStore: AlbumAccessStore;
  let httpTesting: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        AlbumAccessStore,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PaymentService);
    albumAccessStore = TestBed.inject(AlbumAccessStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe enviar POST a /checkout/preference sin header si el álbum no tiene token guardado', () => {
    const request: CreatePreferenceRequest = {
      albumId: 'album-publico',
      photoIds: ['p1'],
      isFullAlbum: false,
      customer: { email: 'comprador@test.com' }
    };

    const mockResponse: CreatePreferenceResponse = {
      success: true,
      orderId: 'ord-101',
      totalAmount: 1500,
      photoCount: 1,
      isFullAlbum: false,
      discount: 0
    };

    service.createPreference(request).subscribe(res => {
      expect(res.success).toBe(true);
      expect(res.orderId).toBe('ord-101');
    });

    const req = httpTesting.expectOne(`${apiUrl}/checkout/preference`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('x-album-access-token')).toBe(false);
    req.flush(mockResponse);
  });

  it('debe adjuntar la cabecera x-album-access-token en createPreference si AlbumAccessStore tiene el token guardado', () => {
    albumAccessStore.unlockAlbum('album-privado-123', 'tok_pin_desbloqueado_xyz');

    const request: CreatePreferenceRequest = {
      albumId: 'album-privado-123',
      photoIds: ['p2'],
      isFullAlbum: false,
      customer: { email: 'invitado@test.com' }
    };

    service.createPreference(request).subscribe(res => {
      expect(res.success).toBe(true);
    });

    const req = httpTesting.expectOne(`${apiUrl}/checkout/preference`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('x-album-access-token')).toBe('tok_pin_desbloqueado_xyz');
    req.flush({ success: true, orderId: 'ord-priv-1', totalAmount: 2000, photoCount: 1, isFullAlbum: false, discount: 0 });
  });

  it('debe adjuntar la cabecera x-album-access-token si request.accessToken viene explícito', () => {
    const request: CreatePreferenceRequest = {
      albumId: 'album-explícito',
      photoIds: ['p3'],
      isFullAlbum: false,
      accessToken: 'token-en-request-body',
      customer: { email: 'expl@test.com' }
    };

    service.createPreference(request).subscribe(res => {
      expect(res.success).toBe(true);
    });

    const req = httpTesting.expectOne(`${apiUrl}/checkout/preference`);
    expect(req.request.headers.get('x-album-access-token')).toBe('token-en-request-body');
    req.flush({ success: true, orderId: 'ord-expl-1', totalAmount: 2000, photoCount: 1, isFullAlbum: false, discount: 0 });
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
