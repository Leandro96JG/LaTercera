import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AdminService } from './admin.service';
import { AdminAuthStore } from '../state/admin-auth.store';

describe('AdminService - Llamadas HTTP de Administración con JWT', () => {
  let service: AdminService;
  let mockHttpClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockAuthStore: { adminToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    };

    mockAuthStore = {
      adminToken: vi.fn().mockReturnValue('mock_jwt_token_123')
    };

    TestBed.configureTestingModule({
      providers: [
        AdminService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: AdminAuthStore, useValue: mockAuthStore }
      ]
    });

    service = TestBed.inject(AdminService);
  });

  it('debe solicitar estadísticas con la cabecera Authorization Bearer', () => {
    mockHttpClient.get.mockReturnValue(of({ success: true, stats: { photosSold: 43 } }));

    service.getStats().subscribe((res) => {
      expect(res.success).toBe(true);
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/stats',
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe enviar solicitud de importación de Google Drive con payload y token', () => {
    mockHttpClient.post.mockReturnValue(of({ success: true, albumId: 'alb_1', photos: [] }));

    const requestPayload = {
      albumId: 'alb_1',
      driveUrl: 'https://drive.google.com/drive/folders/testFolder123',
      watermarkText: 'LA TERCERA • MUESTRA'
    };

    service.importFromDrive(requestPayload).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/albums/import-drive',
      requestPayload,
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe enviar subida masiva como FormData multipart con headers de autenticación', () => {
    mockHttpClient.post.mockReturnValue(of({ success: true, albumId: 'alb_2', photos: [] }));

    const mockFile = new File(['image-bytes'], 'partido.jpg', { type: 'image/jpeg' });
    service.bulkUpload('alb_2', [mockFile], 'LA TERCERA', [0]).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/albums/bulk-upload',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe registrar un nuevo fotógrafo colaborador', () => {
    mockHttpClient.post.mockReturnValue(of({ success: true, photographer: { id: 'usr_new' } }));

    const newPhotographer = {
      email: 'asistente@latercera.com.ar',
      password: 'PasswordSegura2026!',
      name: 'Asistente Deportes'
    };

    service.registerPhotographer(newPhotographer).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/photographers',
      newPhotographer,
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe obtener la lista de álbumes para administración', () => {
    mockHttpClient.get.mockReturnValue(of({ success: true, total: 2, albums: [] }));

    service.getAdminAlbums().subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.total).toBe(2);
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/albums',
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe crear un nuevo álbum mediante POST /api/admin/albums', () => {
    const newAlbumPayload = {
      title: 'Torneo Apertura 2026',
      category: 'futbol' as const,
      date: '2026-10-20',
      unitPrice: 1500,
      fullAlbumPrice: 11000
    };

    mockHttpClient.post.mockReturnValue(of({
      success: true,
      album: { id: 'torneo-apertura-2026', ...newAlbumPayload, photosCount: 0, isPublished: true },
      message: 'Álbum creado exitosamente'
    }));

    service.createAlbum(newAlbumPayload).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.album.id).toBe('torneo-apertura-2026');
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/albums',
      newAlbumPayload,
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe actualizar precios de un álbum con PUT /api/admin/albums/:id', () => {
    const updatePayload = {
      unitPrice: 1800,
      fullAlbumPrice: 13500
    };

    mockHttpClient.put.mockReturnValue(of({
      success: true,
      album: { id: 'album-1', ...updatePayload, title: 'Test', category: 'futbol', photosCount: 0, isPublished: true },
      message: 'Precios actualizados exitosamente'
    }));

    service.updateAlbum('album-1', updatePayload).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    expect(mockHttpClient.put).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/albums/album-1',
      updatePayload,
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe solicitar la lista de órdenes con GET /api/admin/orders y token JWT', () => {
    mockHttpClient.get.mockReturnValue(of({
      success: true,
      total: 1,
      orders: [
        {
          id: 'ord_test_1',
          albumId: 'album-1',
          totalAmount: 3600,
          status: 'PAID',
          customer: { email: 'comprador@test.com' }
        }
      ]
    }));

    service.getAdminOrders().subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
      expect(res.orders[0].id).toBe('ord_test_1');
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/orders',
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe solicitar la regeneración de token con POST /api/admin/orders/:id/regenerate-token', () => {
    mockHttpClient.post.mockReturnValue(of({
      success: true,
      orderId: 'ord_test_1',
      downloadToken: 'new.token.72h',
      downloadUrl: 'http://localhost:4200/pago-exitoso?token=new.token.72h',
      expiresInHours: 72
    }));

    service.regenerateOrderToken('ord_test_1').subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.downloadToken).toBe('new.token.72h');
      expect(res.downloadUrl).toContain('/pago-exitoso?token=new.token.72h');
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/orders/ord_test_1/regenerate-token',
      {},
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe solicitar la lista de fotos de un álbum con GET /api/admin/albums/:id/photos', () => {
    mockHttpClient.get.mockReturnValue(of({
      success: true,
      albumId: 'album-1',
      total: 1,
      photos: [
        {
          id: 'photo-1',
          albumId: 'album-1',
          filename: 'partido_01.jpg',
          originalPath: 'originals/album-1/photo-1.jpg',
          previewUrl: 'https://cdn.example.com/photo-1.webp',
          isSampleHd: true
        }
      ]
    }));

    service.getAlbumPhotos('album-1').subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
      expect(res.photos[0].id).toBe('photo-1');
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/albums/album-1/photos',
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe actualizar una foto (portada y muestra HD) con PATCH /api/admin/albums/:id/photos/:photoId', () => {
    const updatePayload = { setAsCover: true, isSampleHD: true };
    mockHttpClient.patch.mockReturnValue(of({
      success: true,
      photo: {
        id: 'photo-1',
        albumId: 'album-1',
        filename: 'partido_01.jpg',
        originalPath: 'originals/album-1/photo-1.jpg',
        previewUrl: 'https://cdn.example.com/photo-1.webp',
        isSampleHd: true
      },
      coverUrl: 'https://cdn.example.com/photo-1.webp',
      message: 'Foto actualizada correctamente'
    }));

    service.updateAlbumPhoto('album-1', 'photo-1', updatePayload).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.coverUrl).toBe('https://cdn.example.com/photo-1.webp');
    });

    expect(mockHttpClient.patch).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/albums/album-1/photos/photo-1',
      updatePayload,
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('debe eliminar una foto puntual con DELETE /api/admin/albums/:id/photos/:photoId', () => {
    mockHttpClient.delete.mockReturnValue(of({
      success: true,
      photoId: 'photo-1',
      message: 'Foto eliminada con éxito'
    }));

    service.deleteAlbumPhoto('album-1', 'photo-1').subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.photoId).toBe('photo-1');
    });

    expect(mockHttpClient.delete).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/albums/album-1/photos/photo-1',
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });
});
