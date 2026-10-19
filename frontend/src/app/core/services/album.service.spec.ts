import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlbumService } from './album.service';
import { AlbumAccessStore } from '../state/album-access.store';

describe('AlbumService', () => {
  let service: AlbumService;
  let httpTesting: HttpTestingController;
  let accessStore: AlbumAccessStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AlbumService,
        AlbumAccessStore,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AlbumService);
    httpTesting = TestBed.inject(HttpTestingController);
    accessStore = TestBed.inject(AlbumAccessStore);
    accessStore.clearAll();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe obtener la lista de álbumes públicos', () => {
    const mockResponse = {
      albums: [
        {
          id: 'album-1',
          category: 'futbol',
          title: 'Clásico Riojano',
          subtitle: 'Fecha 1',
          date: '10 Octubre, 2026',
          photosCount: 20,
          unitPrice: 1200,
          fullAlbumPrice: 9500,
          coverUrl: 'https://example.com/cover.jpg',
          badge: '⚽ Fútbol'
        }
      ]
    };

    service.getAlbums().subscribe((albums) => {
      expect(albums.length).toBe(1);
      expect(albums[0].title).toBe('Clásico Riojano');
    });

    const req = httpTesting.expectOne('http://localhost:4000/api/albums');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('debe obtener las fotos reales protegidas de un álbum desde /api/albums/:id/photos', () => {
    const mockPhotosResponse = {
      success: true,
      albumId: 'album-1',
      total: 2,
      photos: [
        {
          id: 'photo-001',
          albumId: 'album-1',
          filename: 'foto_1.jpg',
          previewUrl: 'https://storage.supabase.com/previews/album-1/foto_1.webp',
          isSampleHd: true,
          width: 4000,
          height: 3000,
          sizeBytes: 4200000
        },
        {
          id: 'photo-002',
          albumId: 'album-1',
          filename: 'foto_2.jpg',
          previewUrl: 'https://storage.supabase.com/previews/album-1/foto_2.webp',
          isSampleHd: false,
          width: 4000,
          height: 3000,
          sizeBytes: 3900000
        }
      ]
    };

    service.getAlbumPhotos('album-1').subscribe((photos) => {
      expect(photos.length).toBe(2);
      expect(photos[0].id).toBe('photo-001');
      expect(photos[0].title).toBe('foto_1.jpg');
      expect(photos[0].isSampleHD).toBe(true);
      expect(photos[0].fileSizeMb).toBe(4.01);
      expect(photos[1].isSampleHD).toBe(false);
    });

    const req = httpTesting.expectOne('http://localhost:4000/api/albums/album-1/photos');
    expect(req.request.method).toBe('GET');
    req.flush(mockPhotosResponse);
  });

  it('debe verificar el código PIN de un álbum privado', () => {
    const mockVerifyRes = {
      success: true,
      valid: true,
      albumId: 'album-privado-1',
      accessToken: 'token_valido_hmac_123'
    };

    service.verifyAccess('album-privado-1', 'PIN123').subscribe((res) => {
      expect(res.valid).toBe(true);
      expect(res.accessToken).toBe('token_valido_hmac_123');
    });

    const req = httpTesting.expectOne('http://localhost:4000/api/albums/album-privado-1/verify-access');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ accessCode: 'PIN123' });
    req.flush(mockVerifyRes);
  });

  it('debe generar la URL de descarga para el ZIP de un álbum liberado de cortesía sin token', () => {
    const url = service.getFreeAlbumZipUrl('album-gratis-1');
    expect(url).toBe('http://localhost:4000/api/downloads/free/album-gratis-1/zip');
  });

  it('debe enviar la cabecera x-album-access-token si el álbum tiene token en AlbumAccessStore al consultar fotos', () => {
    accessStore.unlockAlbum('album-privado-1', 'token_desbloqueo_xyz');

    service.getAlbumPhotos('album-privado-1').subscribe((photos) => {
      expect(photos).toBeDefined();
    });

    const req = httpTesting.expectOne('http://localhost:4000/api/albums/album-privado-1/photos');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('x-album-access-token')).toBe('token_desbloqueo_xyz');
    req.flush({ success: true, albumId: 'album-privado-1', total: 0, photos: [] });
  });

  it('debe generar la URL de descarga para el ZIP con query param ?accessToken=... si existe token en AlbumAccessStore', () => {
    accessStore.unlockAlbum('album-gratis-privado', 'token_zip_123');

    const url = service.getFreeAlbumZipUrl('album-gratis-privado');
    expect(url).toBe('http://localhost:4000/api/downloads/free/album-gratis-privado/zip?accessToken=token_zip_123');
  });

  it('debe generar la URL de descarga individual para una foto gratuita sin token', () => {
    const url = service.getFreePhotoDownloadUrl('album-gratis-1', 'photo-123');
    expect(url).toBe('http://localhost:4000/api/downloads/free/album-gratis-1/photo/photo-123');
  });

  it('debe generar la URL de descarga individual para una foto gratuita con ?accessToken=... si el álbum fue desbloqueado', () => {
    accessStore.unlockAlbum('album-gratis-privado', 'token_photo_456');

    const url = service.getFreePhotoDownloadUrl('album-gratis-privado', 'photo-123');
    expect(url).toBe('http://localhost:4000/api/downloads/free/album-gratis-privado/photo/photo-123?accessToken=token_photo_456');
  });
});
