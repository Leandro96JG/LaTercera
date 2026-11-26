import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { PhotographerItem, RegisterPhotographerResponse } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-photographers-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fadeIn">
      <!-- Lista de Fotógrafos y Colaboradores Activos -->
      <div class="bg-white rounded-[32px] p-6 sm:p-8 border border-black/[0.05] shadow-bento space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-display font-extrabold text-xl text-zinc-900 tracking-tight">
              Equipo de Fotógrafos & Administradores
            </h3>
            <p class="text-xs text-zinc-600 mt-0.5">
              Activa o desactiva accesos sin eliminar el historial de álbumes de cada colaborador.
            </p>
          </div>
          <button
            type="button"
            (click)="refreshList.emit()"
            [disabled]="isLoading()"
            class="min-h-[44px] px-4 py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition self-start sm:self-auto"
          >
            {{ isLoading() ? 'Actualizando...' : '🔄 Actualizar Lista' }}
          </button>
        </div>

        @if (photographers().length > 0) {
          <div class="divide-y divide-zinc-100 border border-black/[0.05] rounded-2xl overflow-hidden">
            @for (person of photographers(); track person.id) {
              <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-zinc-50/70 transition">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-bold text-sm text-zinc-900">{{ person.name }}</span>
                    <span
                      [class]="person.role === 'admin'
                        ? 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900'
                        : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700'"
                    >
                      {{ person.role === 'admin' ? 'Administradora' : 'Fotógrafo' }}
                    </span>
                    <span
                      [class]="person.isActive
                        ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800'
                        : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700'"
                    >
                      {{ person.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
                  <p class="text-xs text-zinc-600 font-mono mt-0.5 truncate">{{ person.email }}</p>
                </div>

                @if (person.id !== currentUserId()) {
                  <button
                    type="button"
                    (click)="toggleActive.emit(person)"
                    [disabled]="togglingId() === person.id"
                    [class]="person.isActive
                      ? 'min-h-[40px] px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition shrink-0'
                      : 'min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shrink-0'"
                  >
                    {{ togglingId() === person.id ? 'Actualizando...' : (person.isActive ? 'Desactivar acceso' : 'Reactivar acceso') }}
                  </button>
                } @else {
                  <span class="text-[11px] font-semibold text-zinc-500">Sesión actual</span>
                }
              </div>
            }
          </div>
        } @else if (!isLoading()) {
          <p class="text-xs text-zinc-500">Aún no se cargaron colaboradores o solo hay una cuenta registrada.</p>
        }
      </div>

      <!-- Registro de Fotógrafos Colaboradores -->
      <div class="bg-white rounded-[32px] p-6 sm:p-8 border border-black/[0.05] shadow-bento space-y-6">
        <div>
          <h3 class="font-display font-extrabold text-xl text-zinc-900 tracking-tight">
            Registro de Fotógrafos Colaboradores
          </h3>
          <p class="text-xs text-zinc-600 mt-0.5">
            Permite crear cuentas para fotógrafos asistentes que cubren partidos adicionales. Cada fotógrafo tendrá credenciales privadas y acceso a sus propios álbumes.
          </p>
        </div>

        @if (photographerResult(); as res) {
          <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-fadeIn">
            <div class="flex items-center gap-2">
              <span>✅</span>
              <span>Fotógrafo <strong>{{ res.photographer.name }}</strong> ({{ res.photographer.email }}) registrado exitosamente.</span>
            </div>
            <span class="font-mono text-[10px] text-emerald-700">ID: {{ res.photographer.photographerId }}</span>
          </div>
        }

        @if (photographerError()) {
          <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{{ photographerError() }}</span>
          </div>
        }

        <form [formGroup]="photographerForm()" (ngSubmit)="submitRegister.emit()" class="space-y-4 max-w-xl">
          <div>
            <label class="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Nombre Completo del Fotógrafo
            </label>
            <input
              type="text"
              formControlName="name"
              placeholder="Ej: Lucas Martínez"
              class="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-950 transition"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              formControlName="email"
              placeholder="lucas@latercera.com.ar"
              class="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-950 transition"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Contraseña Inicial
            </label>
            <input
              type="password"
              formControlName="password"
              placeholder="Mínimo 8 caracteres"
              class="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-950 transition"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Rol del Sistema
            </label>
            <select
              formControlName="role"
              class="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-semibold focus:outline-none focus:border-zinc-950 transition"
            >
              <option value="photographer">Fotógrafo Colaborador</option>
              <option value="admin">Co-Administrador</option>
            </select>
          </div>

          <div class="pt-2">
            <button
              type="submit"
              [disabled]="photographerForm().invalid || isRegistering()"
              class="min-h-[44px] px-6 py-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-display font-extrabold text-xs shadow-md transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              @if (isRegistering()) {
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Registrando fotógrafo...</span>
              } @else {
                <span>Crear Cuenta de Fotógrafo</span>
                <span>→</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class AdminPhotographersTabComponent {
  public readonly photographers = input<readonly PhotographerItem[]>([]);
  public readonly isLoading = input<boolean>(false);
  public readonly togglingId = input<string | null>(null);
  public readonly currentUserId = input<string | null>(null);

  public readonly photographerForm = input.required<FormGroup>();
  public readonly isRegistering = input<boolean>(false);
  public readonly photographerResult = input<RegisterPhotographerResponse | null>(null);
  public readonly photographerError = input<string | null>(null);

  public readonly refreshList = output<void>();
  public readonly toggleActive = output<PhotographerItem>();
  public readonly submitRegister = output<void>();
}
