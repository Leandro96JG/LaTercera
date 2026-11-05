import { Component, ChangeDetectionStrategy, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Album } from '../../core/models/album.model';
import { AlbumService } from '../../core/services/album.service';
import { AlbumAccessStore } from '../../core/state/album-access.store';

@Component({
  selector: 'app-pin-unlock-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in"
        (click)="onBackdropClick($event)"
        (keydown.escape)="closeModal()"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Desbloquear álbum ' + album().title"
      >
        <div 
          class="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white transform transition-all animate-scale-up"
          (click)="$event.stopPropagation()"
        >
          <!-- Botón de Cerrar -->
          <button 
            type="button"
            class="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
            (click)="closeModal()"
            aria-label="Cerrar ventana de desbloqueo"
          >
            <svg class="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- Encabezado con Icono de Candado -->
          <div class="flex items-center gap-4 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <svg class="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <span class="inline-block text-xs font-mono text-amber-400 font-semibold mb-0.5">
                Acceso privado protegido
              </span>
              <h2 class="text-xl font-bold tracking-tight text-white leading-tight">
                {{ album().title }}
              </h2>
            </div>
          </div>

          <p class="text-xs text-zinc-400 mb-6 leading-relaxed">
            Este evento es privado para sus invitados y clientes. Ingresa el código PIN o contraseña provisto por la fotógrafa para ver y adquirir las fotografías.
          </p>

          <!-- Formulario de Desbloqueo -->
          <form (ngSubmit)="submitPin()" class="space-y-4">
            <div>
              <label for="pinInput" class="block text-xs font-medium text-zinc-300 mb-2">
                Código de Acceso / PIN
              </label>
              <div class="relative">
                <input
                  id="pinInput"
                  type="text"
                  [(ngModel)]="pinInput"
                  name="pinCode"
                  autocomplete="off"
                  autocapitalize="characters"
                  placeholder="Ej: ANDINO2026"
                  class="w-full min-h-[44px] bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-white uppercase placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  [disabled]="isLoading()"
                  required
                />
              </div>
            </div>

            @if (errorMessage()) {
              <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <svg class="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <div class="pt-2 flex gap-3">
              <button
                type="button"
                (click)="closeModal()"
                class="flex-1 min-h-[44px] px-4 py-3 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isLoading() || !pinInput().trim()"
                class="flex-1 min-h-[44px] px-4 py-3 rounded-xl bg-amber-400 text-zinc-950 text-xs font-bold hover:bg-amber-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                @if (isLoading()) {
                  <span class="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Verificando...</span>
                } @else {
                  <svg class="w-4 h-4 text-zinc-950 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                  </svg>
                  <span>Desbloquear Álbum</span>
                }
              </button>
            </div>
          </form>

          <!-- Contacto Fotógrafa -->
          <div class="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <p class="text-xs text-zinc-400">
              ¿No tienes el código? Consulta con 
              <a 
                href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Necesito%20el%20código%20de%20acceso%20para%20el%20álbum%20{{ album().title }}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-amber-400 hover:underline inline-flex items-center gap-1 font-semibold ml-1"
              >
                <span>Jenifer Espeche por WhatsApp</span>
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </p>
          </div>
        </div>
      </div>
    }
  `
})
export class PinUnlockModalComponent {
  private readonly albumService = inject(AlbumService);
  private readonly accessStore = inject(AlbumAccessStore);

  // Inputs
  public readonly album = input.required<Album>();
  public readonly isOpen = input.required<boolean>();

  // Outputs
  public readonly unlocked = output<{ albumId: string; accessToken?: string }>();
  public readonly closed = output<void>();

  // State
  public readonly pinInput = signal<string>('');
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

  public onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  public closeModal(): void {
    this.errorMessage.set(null);
    this.pinInput.set('');
    this.closed.emit();
  }

  public submitPin(): void {
    const code = this.pinInput().trim();
    if (!code) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.albumService.verifyAccess(this.album().id, code).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.valid) {
          this.accessStore.unlockAlbum(this.album().id, res.accessToken);
          this.unlocked.emit({ albumId: this.album().id, accessToken: res.accessToken });
          this.closeModal();
        } else {
          this.errorMessage.set(res.message || 'Código de acceso incorrecto');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Código de acceso incorrecto. Por favor verifica e intenta nuevamente.';
        this.errorMessage.set(msg);
      }
    });
  }
}
