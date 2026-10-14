import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, map, of } from 'rxjs';
import { AdminUser, AdminLoginResponse } from '../models/admin-auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthStore {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin`;
  private static readonly STORAGE_TOKEN_KEY = 'la_tercera_admin_jwt';
  private static readonly STORAGE_USER_KEY = 'la_tercera_admin_user';

  // Signals de estado
  public readonly adminToken = signal<string | null>(this.getInitialToken());
  public readonly user = signal<AdminUser | null>(this.getInitialUser());
  public readonly isLoading = signal<boolean>(false);
  public readonly authError = signal<string | null>(null);

  // Computeds reactivos
  public readonly isAuthenticated = computed<boolean>(() => Boolean(this.adminToken()));
  public readonly userEmail = computed<string | null>(() => this.user()?.email || null);
  public readonly userName = computed<string | null>(() => this.user()?.name || null);
  public readonly userRole = computed<string | null>(() => this.user()?.role || null);
  public readonly photographerId = computed<string | null>(() => this.user()?.photographerId || null);

  /**
   * Inicio de sesión administrativo con emisión de JWT
   */
  public login(email: string, password: string): Observable<boolean> {
    this.isLoading.set(true);
    this.authError.set(null);

    return this.http
      .post<AdminLoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.success && res.token && res.user) {
            this.setSession(res.token, res.user);
          } else {
            this.authError.set(res.error || 'Credenciales inválidas');
          }
          this.isLoading.set(false);
        }),
        map((res) => Boolean(res.success && res.token)),
        catchError((err) => {
          this.isLoading.set(false);
          const errorMsg =
            err.error?.error ||
            err.message ||
            'No se pudo conectar con el servidor de autenticación';
          this.authError.set(errorMsg);
          return of(false);
        })
      );
  }

  /**
   * Cierre de sesión y limpieza de tokens
   */
  public logout(): void {
    this.adminToken.set(null);
    this.user.set(null);
    this.authError.set(null);
    this.clearStorage();
  }

  public clearError(): void {
    this.authError.set(null);
  }

  /**
   * Configura la sesión tanto en Signals como en almacenamiento local
   */
  public setSession(token: string, user: AdminUser): void {
    this.adminToken.set(token);
    this.user.set(user);
    this.authError.set(null);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(AdminAuthStore.STORAGE_TOKEN_KEY, token);
        localStorage.setItem(AdminAuthStore.STORAGE_USER_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn('No se pudo guardar la sesión en localStorage:', e);
      }
    }
  }

  private clearStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(AdminAuthStore.STORAGE_TOKEN_KEY);
        localStorage.removeItem(AdminAuthStore.STORAGE_USER_KEY);
      } catch (e) {
        console.warn('Error al limpiar localStorage:', e);
      }
    }
  }

  private getInitialToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return localStorage.getItem(AdminAuthStore.STORAGE_TOKEN_KEY);
      } catch {
        return null;
      }
    }
    return null;
  }

  private getInitialUser(): AdminUser | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(AdminAuthStore.STORAGE_USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}
