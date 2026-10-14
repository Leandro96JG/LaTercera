import { Component, ChangeDetectionStrategy, input, output, HostListener } from '@angular/core';
import { Photo } from '../../core/models/photo.model';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen() && currentPhoto()) {
      <div
        class="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8 select-none transition-opacity duration-300 animate-fadeIn"
        (click)="close.emit()"
      >
        <!-- Barra Superior -->
        <div class="flex items-center justify-between text-white z-10 max-w-6xl mx-auto w-full" (click)="$event.stopPropagation()">
          <div class="flex items-center gap-3">
            <span class="text-xs text-zinc-400 font-medium">
              Foto {{ currentIndex() + 1 }} de {{ totalCount() }}
            </span>
            @if (currentPhoto()?.isSampleHD) {
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                ✦ Muestra HD Original
              </span>
            }
          </div>

          <div class="flex items-center gap-3">
            <button
              (click)="toggleSelect.emit(currentPhoto()!)"
              [class]="isSelected()
                ? 'px-4 py-2 rounded-full bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95'
                : 'px-4 py-2 rounded-full bg-white text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95'"
            >
              @if (isSelected()) {
                <span>✓ Seleccionada</span>
              } @else {
                <span>+ Seleccionar</span>
              }
            </button>
            <button
              (click)="close.emit()"
              class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95"
              aria-label="Cerrar visor"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Imagen Central con Capa Protectora de Marca de Agua -->
        <div class="relative flex-1 flex items-center justify-center my-3 max-w-6xl mx-auto w-full" (click)="$event.stopPropagation()">
          <!-- Botón Anterior -->
          <button
            (click)="prev.emit()"
            class="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-white hover:text-zinc-950 text-white flex items-center justify-center transition shadow-lg active:scale-90"
            aria-label="Foto anterior"
          >
            ←
          </button>

          <div class="relative max-h-full max-w-full flex items-center justify-center">
            <img
              [src]="currentPhoto()?.previewUrl"
              [alt]="currentPhoto()?.title"
              class="max-h-[78vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl prevent-save animate-lightbox-next"
            >

            <!-- Capa de Marca de Agua de Muestra -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="bg-black/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/20 shadow-lg">
                <span class="font-display font-extrabold text-white/90 tracking-widest text-xs sm:text-sm">
                  LA TERCERA • MUESTRA
                </span>
              </div>
            </div>
          </div>

          <!-- Botón Siguiente -->
          <button
            (click)="next.emit()"
            class="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-white hover:text-zinc-950 text-white flex items-center justify-center transition shadow-lg active:scale-90"
            aria-label="Foto siguiente"
          >
            →
          </button>
        </div>

        <!-- Instrucción para Móvil y Teclado -->
        <div class="text-center text-[11px] text-zinc-500">
          Usa las flechas del teclado o los controles para navegar
        </div>
      </div>
    }
  `
})
export class LightboxComponent {
  public readonly isOpen = input<boolean>(false);
  public readonly currentPhoto = input<Photo | null>(null);
  public readonly currentIndex = input<number>(0);
  public readonly totalCount = input<number>(0);
  public readonly isSelected = input<boolean>(false);

  public readonly close = output<void>();
  public readonly next = output<void>();
  public readonly prev = output<void>();
  public readonly toggleSelect = output<Photo>();

  @HostListener('window:keydown', ['$event'])
  public handleKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    if (event.key === 'Escape') this.close.emit();
    if (event.key === 'ArrowRight') this.next.emit();
    if (event.key === 'ArrowLeft') this.prev.emit();
  }
}
