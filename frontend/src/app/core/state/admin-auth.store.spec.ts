import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AdminAuthStore } from './admin-auth.store';
import { AdminUser } from '../models/admin-auth.model';

describe('AdminAuthStore - Autenticación Administrativa & JWT con Signals', () => {
  let store: AdminAuthStore;
  let mockHttpClient: { post: ReturnType<typeof vi.fn> };

  const mockAdminUser: AdminUser = {
    id: 'admin_jenifer_espeche_01',
    email: 'fotografa@latercera.com.ar',
    name: 'Jenifer "Yuyo" Espeche',
    role: 'admin',
    photographerId: 'yuyo_espeche'
  };

  beforeEach(() => {
    localStorage.clear();
    mockHttpClient = {
      post: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AdminAuthStore,
        { provide: HttpClient, useValue: mockHttpClient }
      ]
    });

    store = TestBed.inject(AdminAuthStore);
  });

  it('debe iniciar no autenticado cuando no hay tokens en localStorage', () => {
    expect(store.isAuthenticated()).toBe(false);
    expect(store.adminToken()).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.userEmail()).toBeNull();
    expect(store.userName()).toBeNull();
    expect(store.userRole()).toBeNull();
    expect(store.authError()).toBeNull();
  });

  it('debe iniciar sesión exitosamente, actualizar Signals y persistir en localStorage', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.mockSignature';
    mockHttpClient.post.mockReturnValue(
      of({
        success: true,
        token: mockToken,
        user: mockAdminUser
      })
    );

    let loginResult = false;
    store.login('fotografa@latercera.com.ar', 'YuyoFotos2026!').subscribe((res) => {
      loginResult = res;
    });

    expect(loginResult).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.adminToken()).toBe(mockToken);
    expect(store.userEmail()).toBe('fotografa@latercera.com.ar');
    expect(store.userName()).toBe('Jenifer "Yuyo" Espeche');
    expect(store.userRole()).toBe('admin');
    expect(store.photographerId()).toBe('yuyo_espeche');
    expect(store.authError()).toBeNull();

    // Verificación de persistencia
    expect(localStorage.getItem('la_tercera_admin_jwt')).toBe(mockToken);
    expect(localStorage.getItem('la_tercera_admin_user')).toContain('Jenifer');
  });

  it('debe capturar errores de credenciales inválidas y mantener isAuthenticated en false', () => {
    mockHttpClient.post.mockReturnValue(
      throwError(() => ({ error: { error: 'Credenciales inválidas' } }))
    );

    let loginResult = true;
    store.login('desconocido@latercera.com.ar', 'wrongpass').subscribe((res) => {
      loginResult = res;
    });

    expect(loginResult).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.adminToken()).toBeNull();
    expect(store.authError()).toBe('Credenciales inválidas');
  });

  it('debe cerrar sesión (logout), limpiar Signals y purgar localStorage', () => {
    // Establecer sesión primero
    store.setSession('test_token', mockAdminUser);
    expect(store.isAuthenticated()).toBe(true);

    // Ejecutar logout
    store.logout();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.adminToken()).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.userEmail()).toBeNull();
    expect(localStorage.getItem('la_tercera_admin_jwt')).toBeNull();
    expect(localStorage.getItem('la_tercera_admin_user')).toBeNull();
  });

  it('debe derivar correctamente datos para fotógrafos colaboradores (Escalabilidad)', () => {
    const colaboradorUser: AdminUser = {
      id: 'photo_marcos_02',
      email: 'marcos@latercera.com.ar',
      name: 'Marcos Herrera',
      role: 'photographer',
      photographerId: 'marcos_ph'
    };

    store.setSession('token_colaborador', colaboradorUser);

    expect(store.isAuthenticated()).toBe(true);
    expect(store.userRole()).toBe('photographer');
    expect(store.photographerId()).toBe('marcos_ph');
    expect(store.userName()).toBe('Marcos Herrera');
  });
});
