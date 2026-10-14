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
  RegisterPhotographerResponse
} from '../models/admin.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AdminAuthStore);
  private readonly baseUrl = 'http://localhost:4000/api/admin';

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
}
