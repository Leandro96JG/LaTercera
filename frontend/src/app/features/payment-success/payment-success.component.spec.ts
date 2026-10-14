import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PaymentSuccessComponent } from './payment-success.component';
import { DeliveryService } from '../../core/services/delivery.service';
import { of, throwError } from 'rxjs';
import { OrderDeliveryInfo, DeliveryStatusResponse } from '../../core/models/delivery.model';

describe('PaymentSuccessComponent (TDD)', () => {
  let component: PaymentSuccessComponent;
  let deliveryServiceMock: any;

  const sampleInfo: OrderDeliveryInfo = {
    orderId: 'order-abc-123',
    albumId: 'album-1',
    albumTitle: 'Atlético Tesorieri vs Andino SC',
    albumDate: '12 Octubre, 2026',
    customerEmail: 'comprador@gmail.com',
    customerName: 'Martín',
    isFullAlbum: false,
    totalPhotos: 2,
    photos: [
      {
        id: 'foto-1',
        filename: 'LA_TERCERA_album-1_foto-1.jpg',
        previewUrl: '/uploads/previews/album-1/foto-1.webp',
        downloadUrl: '/api/downloads/token123/file?photoId=foto-1'
      },
      {
        id: 'foto-2',
        filename: 'LA_TERCERA_album-1_foto-2.jpg',
        previewUrl: '/uploads/previews/album-1/foto-2.webp',
        downloadUrl: '/api/downloads/token123/file?photoId=foto-2'
      }
    ],
    zipDownloadUrl: '/api/downloads/token123/zip',
    expiresAt: '2026-10-17T00:00:00.000Z',
    expiresInSeconds: 259200,
    isExpired: false,
    whatsappSupportUrl: 'https://wa.me/5493804868714?text=test'
  };

  beforeEach(async () => {
    deliveryServiceMock = {
      getOrderStatus: vi.fn(),
      getDeliveryInfo: vi.fn(),
      formatRemainingTime: vi.fn((sec: number) => sec > 0 ? `${Math.floor(sec / 3600)} horas` : 'Enlace expirado'),
      triggerDirectDownload: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PaymentSuccessComponent],
      providers: [
        { provide: DeliveryService, useValue: deliveryServiceMock }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PaymentSuccessComponent);
    component = fixture.componentInstance;
  });

  it('debe inicializarse en estado loading', () => {
    expect(component.state()).toBe('loading');
    expect(component.orderInfo()).toBeNull();
  });

  it('debe cargar exitosamente la información de entrega cuando se provee un token válido', () => {
    deliveryServiceMock.getDeliveryInfo.mockReturnValue(of(sampleInfo));

    component.loadDeliveryInfo('token123');

    expect(component.state()).toBe('ready');
    expect(component.orderInfo()).toEqual(sampleInfo);
    expect(component.remainingSeconds()).toBe(259200);
    expect(component.errorMessage()).toBeNull();
  });

  it('debe transicionar a estado expired si el token tiene más de 72 horas', () => {
    deliveryServiceMock.getDeliveryInfo.mockReturnValue(
      throwError(() => ({ status: 410, error: { error: 'Token expirado', isExpired: true } }))
    );

    component.loadDeliveryInfo('expired-token');

    expect(component.state()).toBe('expired');
    expect(component.orderInfo()).toBeNull();
  });

  it('debe transicionar a estado ready cuando consulta por orderId y la orden ya está PAID', () => {
    const statusPaid: DeliveryStatusResponse = {
      orderId: 'order-abc-123',
      status: 'PAID',
      downloadToken: 'token123',
      deliveryInfoUrl: '/api/downloads/token123/info'
    };

    deliveryServiceMock.getOrderStatus.mockReturnValue(of(statusPaid));
    deliveryServiceMock.getDeliveryInfo.mockReturnValue(of(sampleInfo));

    component.loadByOrderId('order-abc-123');

    expect(deliveryServiceMock.getOrderStatus).toHaveBeenCalledWith('order-abc-123');
    expect(deliveryServiceMock.getDeliveryInfo).toHaveBeenCalledWith('token123');
    expect(component.state()).toBe('ready');
    expect(component.orderInfo()?.orderId).toBe('order-abc-123');
  });

  it('debe disparar la descarga de ZIP mediante triggerDirectDownload', () => {
    deliveryServiceMock.getDeliveryInfo.mockReturnValue(of(sampleInfo));
    component.loadDeliveryInfo('token123');

    component.downloadAllZip();

    expect(deliveryServiceMock.triggerDirectDownload).toHaveBeenCalledWith(
      '/api/downloads/token123/zip',
      'LA_TERCERA_album-1_FOTOS_HD.zip'
    );
  });

  it('debe disparar la descarga de una foto individual', () => {
    deliveryServiceMock.getDeliveryInfo.mockReturnValue(of(sampleInfo));
    component.loadDeliveryInfo('token123');

    const photo = sampleInfo.photos[0];
    component.downloadPhoto(photo);

    expect(deliveryServiceMock.triggerDirectDownload).toHaveBeenCalledWith(
      photo.downloadUrl,
      photo.filename
    );
  });
});
