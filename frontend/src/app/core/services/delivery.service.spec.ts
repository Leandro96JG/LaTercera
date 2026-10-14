import { describe, it, expect, beforeEach } from 'vitest';
import { DeliveryService } from './delivery.service';
import { of, throwError } from 'rxjs';
import { OrderDeliveryInfo, DeliveryStatusResponse } from '../models/delivery.model';

describe('DeliveryService Frontend (TDD)', () => {
  let service: DeliveryService;
  let httpMock: any;

  beforeEach(() => {
    httpMock = {
      get: vi.fn()
    };
    service = new DeliveryService(httpMock);
  });

  it('debe consultar el estado de la orden por orderId', async () => {
    const mockResponse: DeliveryStatusResponse = {
      orderId: 'order-123',
      status: 'PAID',
      downloadToken: 'valid.token.hmac',
      deliveryInfoUrl: '/api/downloads/valid.token.hmac/info'
    };

    httpMock.get.mockReturnValue(of(mockResponse));

    service.getOrderStatus('order-123').subscribe((res) => {
      expect(res.orderId).toBe('order-123');
      expect(res.status).toBe('PAID');
      expect(res.downloadToken).toBe('valid.token.hmac');
    });

    expect(httpMock.get).toHaveBeenCalledWith('http://localhost:4000/api/downloads/order/order-123/status');
  });

  it('debe obtener la información de entrega usando el token de descarga', async () => {
    const mockInfo: OrderDeliveryInfo = {
      orderId: 'order-123',
      albumId: 'album-1',
      albumTitle: 'Atlético Tesorieri vs Andino SC',
      customerEmail: 'juan@test.com',
      isFullAlbum: false,
      totalPhotos: 2,
      photos: [
        {
          id: 'p1',
          filename: 'foto1.jpg',
          previewUrl: '/uploads/p1.webp',
          downloadUrl: '/api/downloads/token/file?photoId=p1'
        }
      ],
      zipDownloadUrl: '/api/downloads/token/zip',
      expiresAt: '2026-10-17T00:00:00.000Z',
      expiresInSeconds: 259200,
      isExpired: false,
      whatsappSupportUrl: 'https://wa.me/5493804868714'
    };

    httpMock.get.mockReturnValue(of(mockInfo));

    service.getDeliveryInfo('sample-token').subscribe((info) => {
      expect(info.orderId).toBe('order-123');
      expect(info.albumTitle).toBe('Atlético Tesorieri vs Andino SC');
      expect(info.photos.length).toBe(1);
      expect(info.isExpired).toBe(false);
    });

    expect(httpMock.get).toHaveBeenCalledWith('http://localhost:4000/api/downloads/sample-token/info');
  });

  it('debe formatear el tiempo restante en un formato humano amigable', () => {
    // 72 horas = 259200 segundos
    expect(service.formatRemainingTime(259200)).toBe('72 horas');
    // 50 horas 30 minutos = 181800 segundos
    expect(service.formatRemainingTime(181800)).toBe('50h 30m');
    // 45 minutos = 2700 segundos
    expect(service.formatRemainingTime(2700)).toBe('45 minutos');
    // Expirado
    expect(service.formatRemainingTime(0)).toBe('Enlace expirado');
    expect(service.formatRemainingTime(-10)).toBe('Enlace expirado');
  });
});
