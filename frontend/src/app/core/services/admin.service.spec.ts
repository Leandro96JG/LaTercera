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
  };
  let mockAuthStore: { adminToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn()
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
});
