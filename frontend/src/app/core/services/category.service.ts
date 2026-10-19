import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CategoryDTO, DEFAULT_CATEGORIES } from '../models/category.model';
import { AdminAuthStore } from '../state/admin-auth.store';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AdminAuthStore, { optional: true });
  private readonly apiUrl = environment.apiUrl;

  private getAuthHeaders(): HttpHeaders {
    const token = this.authStore?.adminToken?.();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Obtiene la lista pública de categorías activas
   */
  public getCategories(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(`${this.apiUrl}/categories`).pipe(
      catchError(() => of([...DEFAULT_CATEGORIES]))
    );
  }

  /**
   * Obtiene todas las categorías (activas e inactivas) para el administrador
   */
  public getAdminCategories(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(`${this.apiUrl}/admin/categories`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(() => of([...DEFAULT_CATEGORIES]))
    );
  }

  /**
   * Crea una nueva categoría con slug e icono
   */
  public createCategory(payload: {
    id?: string;
    name: string;
    icon?: string;
    badgeLabel?: string;
    order?: number;
    isActive?: boolean;
  }): Observable<{ success: boolean; category: CategoryDTO }> {
    return this.http.post<{ success: boolean; category: CategoryDTO }>(
      `${this.apiUrl}/admin/categories`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Actualiza el nombre, icono, badge o visibilidad de una categoría
   */
  public updateCategory(
    id: string,
    updates: Partial<CategoryDTO>
  ): Observable<{ success: boolean; category: CategoryDTO }> {
    return this.http.put<{ success: boolean; category: CategoryDTO }>(
      `${this.apiUrl}/admin/categories/${encodeURIComponent(id)}`,
      updates,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Elimina una categoría reasignando álbumes a 'otros'
   */
  public deleteCategory(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/admin/categories/${encodeURIComponent(id)}`,
      { headers: this.getAuthHeaders() }
    );
  }
}
