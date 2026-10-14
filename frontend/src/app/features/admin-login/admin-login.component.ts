import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminAuthStore } from '../../core/state/admin-auth.store';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-md mx-auto my-12 animate-fadeIn">
      <!-- Tarjeta Bento de Login Administrativo -->
      <div class="bg-zinc-950 text-white rounded-[32px] p-8 shadow-2xl border border-white/10 relative overflow-hidden">
        <!-- Resplandor Dorado Sutil de Fondo -->
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Encabezado del Formulario -->
        <div class="flex items-center gap-3.5 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 p-2 flex items-center justify-center shadow-inner">
            <span class="text-xl">🔒</span>
          </div>
          <div>
            <h2 class="font-display font-extrabold text-xl text-white tracking-tight leading-tight">
              Acceso Administrativo
            </h2>
            <p class="text-[11px] text-zinc-400 font-medium">
              Panel privado para fotógrafos • LA TERCERA
            </p>
          </div>
        </div>

        <!-- Banner de Error si falla la autenticación -->
        @if (adminAuthStore.authError()) {
          <div class="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <span class="text-sm">⚠️</span>
            <span>{{ adminAuthStore.authError() }}</span>
          </div>
        }

        <!-- Formulario Reactivo Tipado -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Email Registrado
            </label>
            <input
              type="email"
              formControlName="email"
              placeholder="fotografa@latercera.com.ar"
              autocomplete="username"
              class="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20 transition"
            />
            @if (loginForm.controls.email.touched && loginForm.controls.email.invalid) {
              <span class="text-[11px] text-rose-400 mt-1 block">
                Ingresa un correo electrónico válido
              </span>
            }
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              formControlName="password"
              placeholder="••••••••••••"
              autocomplete="current-password"
              class="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20 transition"
            />
            @if (loginForm.controls.password.touched && loginForm.controls.password.invalid) {
              <span class="text-[11px] text-rose-400 mt-1 block">
                La contraseña es requerida (mín. 6 caracteres)
              </span>
            }
          </div>

          <!-- Botón de Envío con Estado de Carga -->
          <button
            type="submit"
            [disabled]="loginForm.invalid || adminAuthStore.isLoading()"
            class="w-full mt-2 py-3.5 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-extrabold text-sm tracking-tight shadow-md hover:shadow-amber-400/20 transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            @if (adminAuthStore.isLoading()) {
              <span class="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
              <span>Verificando credenciales...</span>
            } @else {
              <span>Ingresar al Panel</span>
              <span class="text-base">→</span>
            }
          </button>
        </form>

        <!-- Botón Cancelar / Volver al Catálogo -->
        <div class="mt-6 pt-5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            (click)="cancel.emit()"
            class="text-zinc-400 hover:text-white transition flex items-center gap-1.5 font-medium"
          >
            <span>← Volver al catálogo público</span>
          </button>

          <span class="text-[10px] text-zinc-500 font-mono">
            Atajo: Ctrl + Shift + A
          </span>
        </div>
      </div>
    </div>
  `
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  public readonly adminAuthStore = inject(AdminAuthStore);

  public readonly loginSuccess = output<void>();
  public readonly cancel = output<void>();

  public readonly loginForm = this.fb.nonNullable.group({
    email: ['fotografa@latercera.com.ar', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  public onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    this.adminAuthStore.login(email, password).subscribe((success) => {
      if (success) {
        this.loginSuccess.emit();
      }
    });
  }
}
