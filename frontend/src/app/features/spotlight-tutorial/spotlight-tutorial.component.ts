import { Component, ChangeDetectionStrategy, input, output, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spotlight-tutorial',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onDismiss()'
  },
  template: `
    @if (isOpen() && !isDismissedInternally()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial de Modo Linterna"
      >
        <div
          class="relative w-full max-w-lg bg-zinc-950 text-white rounded-[32px] border border-white/20 p-6 sm:p-7 shadow-2xl flex flex-col gap-5 animate-scale-up"
          (click)="$event.stopPropagation()"
        >
          <!-- Encabezado Bento -->
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <span class="w-9 h-9 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-lg shadow-sm">
                🔦
              </span>
              <div>
                <h3 class="font-display font-extrabold text-base sm:text-lg text-white">
                  Modo Linterna / Revelar Fotos
                </h3>
                <p class="text-[11px] text-zinc-400">
                  Explora las muestras originales iluminando cada detalle
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="onDismiss()"
              class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95"
              aria-label="Cerrar tutorial"
            >
              ✕
            </button>
          </div>

          <!-- Muestra Interactiva / Demostración Animada del Haz de Luz (Sincronización en Lockstep) -->
          <div class="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-zinc-900 border border-white/15 shadow-inner flex items-center justify-center select-none">
            <!-- Imagen base oscura (18% brillo) -->
            <img
              src="assets/branding/fotografa.jpg"
              alt="Muestra de demostración"
              class="w-full h-full object-cover brightness-[0.18] contrast-[1.08] pointer-events-none"
            />

            <!-- Haz de luz simulado con clip-path exacto sin desfases -->
            <div
              class="spotlight-sweep-beam absolute inset-0 pointer-events-none"
              aria-hidden="true"
            >
              <img
                src="assets/branding/fotografa.jpg"
                alt="Foto iluminada"
                class="w-full h-full object-cover brightness-100 contrast-100"
              />
            </div>

            <!-- Anillo del haz de luz exactamente alineado -->
            <div class="spotlight-sweep-ring absolute w-24 h-24 rounded-full border-2 border-amber-300/80 shadow-[0_0_25px_8px_rgba(253,184,19,0.35)] pointer-events-none"></div>

            <!-- Badge explicativo superpuesto -->
            <div class="absolute bottom-2.5 left-2.5 px-3 py-1 rounded-xl bg-black/75 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-white/10 flex items-center gap-1.5 shadow-sm">
              <span>💡</span>
              <span>El círculo revela el 100% de color y nitidez</span>
            </div>
          </div>

          <!-- Puntos Clave de Uso (Desktop y Celular) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <!-- Tip PC / Desktop -->
            <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-2.5">
              <span class="text-base shrink-0">🖱️</span>
              <div>
                <span class="font-bold text-white block">En tu Computadora</span>
                <p class="text-[11px] text-zinc-300 mt-0.5">
                  Simplemente pasa el cursor sobre cualquier foto para iluminarla al instante.
                </p>
              </div>
            </div>

            <!-- Tip Celular / Mobile -->
            <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-2.5">
              <span class="text-base shrink-0">📱</span>
              <div>
                <span class="font-bold text-white block">En tu Celular</span>
                <p class="text-[11px] text-zinc-300 mt-0.5">
                  Usa el botón <strong>[ 🔦 Linterna ]</strong> y desliza el dedo. La luz se eleva para no tapar tu vista.
                </p>
              </div>
            </div>
          </div>

          <!-- Botón de Confirmación Principal -->
          <div class="pt-2 flex justify-end">
            <button
              type="button"
              (click)="onDismiss()"
              class="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <span>¡Entendido, explorar fotos!</span>
              <span>🚀</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes sweepAnimation {
      0% {
        clip-path: circle(48px at 20% 50%);
      }
      50% {
        clip-path: circle(48px at 80% 50%);
      }
      100% {
        clip-path: circle(48px at 20% 50%);
      }
    }

    @keyframes ringSweepAnimation {
      0% {
        left: 20%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
      50% {
        left: 80%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
      100% {
        left: 20%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
    }

    .spotlight-sweep-beam {
      animation: sweepAnimation 4s ease-in-out infinite;
    }

    .spotlight-sweep-ring {
      animation: ringSweepAnimation 4s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .spotlight-sweep-beam,
      .spotlight-sweep-ring {
        animation: none !important;
      }
    }
  `]
})
export class SpotlightTutorialComponent {
  public static readonly STORAGE_KEY = 'la_tercera_spotlight_tutorial_v1';

  public readonly isOpen = input<boolean>(false);
  public readonly isDismissedInternally = signal<boolean>(false);

  public readonly close = output<void>();
  public readonly closeTutorial = output<void>();

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        untracked(() => {
          this.isDismissedInternally.set(false);
        });
      }
    });
  }

  public onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onDismiss();
    }
  }

  public dismiss(): void {
    this.onDismiss();
  }

  public onDismiss(): void {
    this.isDismissedInternally.set(true);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SpotlightTutorialComponent.STORAGE_KEY, 'true');
      } catch {}
    }
    this.close.emit();
    this.closeTutorial.emit();
  }
}
