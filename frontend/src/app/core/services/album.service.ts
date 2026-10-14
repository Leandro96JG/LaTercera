import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Album, AlbumsApiResponse } from '../models/album.model';
import { Photo } from '../models/photo.model';
import { VerifyAlbumAccessResponse } from '../models/admin.model';
import { environment } from '../../../environments/environment';

export interface AlbumPhotosApiResponse {
  readonly success: boolean;
  readonly albumId: string;
  readonly total: number;
  readonly photos: readonly {
    readonly id: string;
    readonly albumId: string;
    readonly filename: string;
    readonly previewUrl: string;
    readonly isSampleHd: boolean;
    readonly width?: number;
    readonly height?: number;
    readonly sizeBytes?: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class AlbumService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/albums`;
  private readonly downloadApiUrl = `${environment.apiUrl}/downloads`;

  public getAlbums(): Observable<readonly Album[]> {
    return this.http.get<AlbumsApiResponse>(this.apiUrl).pipe(
      map(response => response.albums)
    );
  }

  public getAlbumById(id: string): Observable<Album | undefined> {
    return this.getAlbums().pipe(
      map(albums => albums.find(a => a.id === id))
    );
  }

  /**
   * Obtiene las fotos reales de un álbum procesadas y protegidas
   */
  public getAlbumPhotos(albumId: string): Observable<readonly Photo[]> {
    return this.http.get<AlbumPhotosApiResponse>(`${this.apiUrl}/${albumId}/photos`).pipe(
      map(res => {
        if (!res || !res.photos || res.photos.length === 0) return [];
        return res.photos.map(p => ({
          id: p.id,
          albumId: p.albumId,
          title: p.filename || `Foto ${p.id}`,
          previewUrl: p.previewUrl,
          originalWidth: p.width || 4000,
          originalHeight: p.height || 3000,
          isSampleHD: Boolean(p.isSampleHd),
          fileSizeMb: p.sizeBytes ? +(p.sizeBytes / (1024 * 1024)).toFixed(2) : undefined
        }));
      })
    );
  }

  /**
   * Verifica el código de acceso PIN de un álbum privado
   */
  public verifyAccess(albumId: string, accessCode: string): Observable<VerifyAlbumAccessResponse> {
    return this.http.post<VerifyAlbumAccessResponse>(`${this.apiUrl}/${albumId}/verify-access`, {
      accessCode
    });
  }

  /**
   * Obtiene la URL de descarga directa para el ZIP de un álbum liberado de cortesía
   */
  public getFreeAlbumZipUrl(albumId: string): string {
    return `${this.downloadApiUrl}/free/${albumId}/zip`;
  }
}

