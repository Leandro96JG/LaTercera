import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AdminLoginComponent } from './admin-login.component';
import { AdminAuthStore } from '../../core/state/admin-auth.store';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let adminAuthStore: AdminAuthStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        AdminAuthStore,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    adminAuthStore = TestBed.inject(AdminAuthStore);
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar el formulario con valores predeterminados y validar campos', () => {
    expect(component.loginForm.controls.email.value).toBe('fotografa@latercera.com.ar');
    expect(component.loginForm.controls.password.value).toBe('');
    expect(component.loginForm.valid).toBe(false);

    component.loginForm.controls.email.setValue('invalid-email');
    expect(component.loginForm.controls.email.valid).toBe(false);

    component.loginForm.controls.email.setValue('fotografa@latercera.com.ar');
    component.loginForm.controls.password.setValue('12345');
    expect(component.loginForm.controls.password.valid).toBe(false); // minLength 6

    component.loginForm.controls.password.setValue('123456');
    expect(component.loginForm.valid).toBe(true);
  });

  it('no debe invocar login si el formulario es inválido al presionar submit', () => {
    const spy = vi.spyOn(adminAuthStore, 'login');
    component.loginForm.controls.password.setValue('');

    component.onSubmit();

    expect(spy).not.toHaveBeenCalled();
    expect(component.loginForm.controls.password.touched).toBe(true);
  });

  it('debe invocar adminAuthStore.login y emitir loginSuccess si las credenciales son válidas', () => {
    vi.spyOn(adminAuthStore, 'login').mockReturnValue(of(true));

    let emitted = false;
    component.loginSuccess.subscribe(() => {
      emitted = true;
    });

    component.loginForm.controls.email.setValue('admin@latercera.com.ar');
    component.loginForm.controls.password.setValue('supersecret123');

    component.onSubmit();

    expect(adminAuthStore.login).toHaveBeenCalledWith('admin@latercera.com.ar', 'supersecret123');
    expect(emitted).toBe(true);
  });

  it('no debe emitir loginSuccess si adminAuthStore.login retorna false', () => {
    vi.spyOn(adminAuthStore, 'login').mockReturnValue(of(false));

    let emitted = false;
    component.loginSuccess.subscribe(() => {
      emitted = true;
    });

    component.loginForm.controls.password.setValue('wrongpass');
    component.onSubmit();

    expect(adminAuthStore.login).toHaveBeenCalled();
    expect(emitted).toBe(false);
  });

  it('debe emitir cancel al hacer clic en el botón de volver al catálogo', () => {
    let cancelEmitted = false;
    component.cancel.subscribe(() => {
      cancelEmitted = true;
    });

    const cancelBtn = fixture.nativeElement.querySelector('button[type="button"]');
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    expect(cancelEmitted).toBe(true);
  });
});
