import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthStore } from '../state/admin-auth.store';
import {
  AdminStats,
  DriveImportRequest,
  DriveImportResponse,
  BulkUploadResponse,
  RegisterPhotographerRequest,
  RegisterPhotographerResponse,
  CreateAlbumRequest,
  CreateAlbumResponse,
  UpdateAlbumRequest,
  UpdateAlbumResponse,
  AdminListAlbumsResponse,
  AdminTrashListResponse,
  TrashActionResponse,
  AdminOrdersResponse,
  RegenerateTokenResponse,
  AdminAlbumPhotosResponse,
  UpdateAlbumPhotoRequest,
  UpdateAlbumPhotoResponse,
  DeleteAlbumPhotoResponse
} from '../models/admin.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AdminAuthStore);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  private getAuthHeaders(): HttpHeaders {
    const token = this.authStore.adminToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Obtiene estadísticas y métricas del panel administrativo
   */
  public getStats(): Observable<{ success: boolean; stats: AdminStats }> {
    return this.http.get<{ success: boolean; stats: AdminStats }>(`${this.baseUrl}/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Importa fotos desde una carpeta compartida de Google Drive
   */
  public importFromDrive(req: DriveImportRequest): Observable<DriveImportResponse> {
    return this.http.post<DriveImportResponse>(`${this.baseUrl}/albums/import-drive`, req, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Realiza la subida masiva de fotos (multipart/form-data)
   */
  public bulkUpload(
    albumId: string,
    files: File[],
    watermarkText: string = 'LA TERCERA • MUESTRA',
    hdPhotoIndices: number[] = [0, 1]
  ): Observable<BulkUploadResponse> {
    const formData = new FormData();
    formData.append('albumId', albumId);
    formData.append('watermarkText', watermarkText);
    formData.append('hdPhotoIndices', JSON.stringify(hdPhotoIndices));

    for (const file of files) {
      formData.append('photos', file, file.name);
    }

    // Al enviar FormData, Angular/HttpClient asigna automáticamente el Content-Type multipart con boundary
    return this.http.post<BulkUploadResponse>(`${this.baseUrl}/albums/bulk-upload`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Registra un nuevo fotógrafo colaborador (escalabilidad multi-fotógrafo)
   */
  public registerPhotographer(
    req: RegisterPhotographerRequest
  ): Observable<RegisterPhotographerResponse> {
    return this.http.post<RegisterPhotographerResponse>(`${this.baseUrl}/photographers`, req, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obtiene la lista completa de álbumes para el panel de administración
   */
  public getAdminAlbums(category?: string): Observable<AdminListAlbumsResponse> {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.http.get<AdminListAlbumsResponse>(`${this.baseUrl}/albums${params}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Crea un nuevo álbum o evento deportivo/social
   */
  public createAlbum(req: CreateAlbumRequest): Observable<CreateAlbumResponse> {
    return this.http.post<CreateAlbumResponse>(`${this.baseUrl}/albums`, req, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Actualiza precios y metadatos de un álbum existente
   */
  public updateAlbum(albumId: string, updates: UpdateAlbumRequest): Observable<UpdateAlbumResponse> {
    return this.http.put<UpdateAlbumResponse>(`${this.baseUrl}/albums/${albumId}`, updates, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obtiene la lista de álbumes en la papelera de reciclaje con días restantes
   */
  public getTrashAlbums(): Observable<AdminTrashListResponse> {
    return this.http.get<AdminTrashListResponse>(`${this.baseUrl}/albums/trash`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Mueve un álbum a la papelera (soft delete de 30 días)
   */
  public moveToTrash(albumId: string): Observable<TrashActionResponse> {
    return this.http.post<TrashActionResponse>(`${this.baseUrl}/albums/${albumId}/trash`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Restaura un álbum desde la papelera a activo
   */
  public restoreFromTrash(albumId: string): Observable<TrashActionResponse> {
    return this.http.post<TrashActionResponse>(`${this.baseUrl}/albums/${albumId}/restore`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Elimina permanentemente un álbum (hard delete irreversible)
   */
  public permanentDeleteAlbum(albumId: string): Observable<TrashActionResponse> {
    return this.http.delete<TrashActionResponse>(`${this.baseUrl}/albums/${albumId}/permanent`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Activa o desactiva la descarga gratuita de cortesía en máxima calidad
   */
  public toggleCourtesyDownload(albumId: string, isFreeDownload: boolean): Observable<UpdateAlbumResponse> {
    return this.http.patch<UpdateAlbumResponse>(
      `${this.baseUrl}/albums/${albumId}/courtesy-download`,
      { isFreeDownload },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Configura la privacidad del álbum y su código de acceso PIN
   */
  public updateAlbumPrivacy(
    albumId: string,
    isPrivate: boolean,
    accessCode?: string | null
  ): Observable<UpdateAlbumResponse> {
    return this.http.patch<UpdateAlbumResponse>(
      `${this.baseUrl}/albums/${albumId}/privacy`,
      { isPrivate, accessCode },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Obtiene la lista completa de órdenes y ventas administrativas
   */
  public getAdminOrders(): Observable<AdminOrdersResponse> {
    return this.http.get<AdminOrdersResponse>(`${this.baseUrl}/orders`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Regenera el token de descarga de 72 horas para una orden
   */
  public regenerateOrderToken(orderId: string): Observable<RegenerateTokenResponse> {
    return this.http.post<RegenerateTokenResponse>(
      `${this.baseUrl}/orders/${orderId}/regenerate-token`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Obtiene la lista completa de fotos de un álbum para el panel administrativo
   */
  public getAlbumPhotos(albumId: string): Observable<AdminAlbumPhotosResponse> {
    return this.http.get<AdminAlbumPhotosResponse>(`${this.baseUrl}/albums/${albumId}/photos`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Actualiza una foto puntual del álbum (portada o muestra HD)
   */
  public updateAlbumPhoto(
    albumId: string,
    photoId: string,
    updates: UpdateAlbumPhotoRequest
  ): Observable<UpdateAlbumPhotoResponse> {
    return this.http.patch<UpdateAlbumPhotoResponse>(
      `${this.baseUrl}/albums/${albumId}/photos/${photoId}`,
      updates,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Elimina una foto individual de un álbum
   */
  public deleteAlbumPhoto(albumId: string, photoId: string): Observable<DeleteAlbumPhotoResponse> {
    return this.http.delete<DeleteAlbumPhotoResponse>(
      `${this.baseUrl}/albums/${albumId}/photos/${photoId}`,
      { headers: this.getAuthHeaders() }
    );
  }
}

