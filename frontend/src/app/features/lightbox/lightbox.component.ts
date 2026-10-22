import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  untracked,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Photo } from '../../core/models/photo.model';
import { AlbumService } from '../../core/services/album.service';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'handleKeydown($event)'
  },
  template: `
    @if (isOpen() && currentPhoto()) {
      <div
        class="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col justify-between p-3 sm:p-6 select-none transition-opacity duration-300 animate-fadeIn"
        (click)="close.emit()"
        (touchstart)="onTouchStart($event)"
        (touchmove)="onTouchMove($event)"
        (touchend)="onTouchEnd()"
        (touchcancel)="onTouchEnd()"
      >
        <!-- BARRA SUPERIOR CINEMÁTICA -->
        <header
          class="flex items-center justify-between text-white z-20 max-w-6xl mx-auto w-full px-2"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-3">
            <span class="text-xs text-zinc-400 font-mono font-medium">
              Foto {{ currentIndex() + 1 }} de {{ totalCount() }}
            </span>
            @if (currentPhoto()?.isSampleHD) {
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                <span>✦</span>
                <span>Muestra HD Original</span>
              </span>
            }
          </div>

          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Botón de Zoom Cinemático 1x / 2x -->
            <button
              type="button"
              (click)="toggleZoom($event)"
              class="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1.5 transition active:scale-95 border border-white/10"
              [attr.aria-label]="zoomScale() > 1 ? 'Alejar foto a 1x' : 'Ampliar muestra a 2.2x'"
            >
              <span>🔍</span>
              <span class="font-mono text-[11px]">{{ zoomScale() > 1 ? '1x' : '2x' }}</span>
            </button>

            <!-- Botón Rápido de Carrito / Selección o Descarga Directa HD Gratuita -->
            @if (!isFreeDownload()) {
              <button
                type="button"
                (click)="toggleSelect.emit(currentPhoto()!)"
                [class]="isSelected()
                  ? 'px-4 py-2 rounded-full bg-emerald-500 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 animate-check-pop'
                  : 'px-4 py-2 rounded-full bg-white text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md hover:bg-zinc-200 active:scale-95'"
                [attr.aria-label]="isSelected() ? 'Quitar del carrito' : 'Sumar al carrito'"
              >
                @if (isSelected()) {
                  <span>✓ Seleccionada</span>
                } @else {
                  <span>+ Seleccionar</span>
                }
              </button>
            } @else if (freeDownloadUrl()) {
              <a
                [href]="freeDownloadUrl()"
                [download]="'LA_TERCERA_' + (currentPhoto()?.id || 'foto') + '.jpg'"
                class="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
                [attr.aria-label]="'Descargar foto HD gratis'"
                title="Descargar foto HD gratis"
              >
                <span>⬇️ Descargar HD</span>
              </a>
            }

            <!-- Botón Cerrar -->
            <button
              type="button"
              (click)="close.emit()"
              class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-90"
              aria-label="Cerrar visor cinemático"
            >
              ✕
            </button>
          </div>
        </header>

        <!-- ZONA CENTRAL DE LA FOTO CON SOPORTE DE SWIPE FÍSICO Y ZOOM -->
        <main
          class="relative flex-1 flex items-center justify-center my-2 max-w-6xl mx-auto w-full overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <!-- Botón Foto Anterior (Desktop / Tablet) -->
          <button
            type="button"
            (click)="prev.emit()"
            class="hidden sm:flex absolute left-3 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-white hover:text-zinc-950 text-white items-center justify-center transition shadow-2xl active:scale-90 border border-white/10"
            aria-label="Ver foto anterior"
          >
            ←
          </button>

          <!-- Contenedor Transformable de la Imagen con Desplazamiento Táctil en Vivo y Doble Clic Zoom -->
          <div
            class="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-200 ease-out select-none cursor-pointer"
            [class.cursor-zoom-in]="zoomScale() === 1"
            [class.cursor-zoom-out]="zoomScale() > 1"
            [style.transform]="touchTransform()"
            (dblclick)="toggleZoom($event)"
          >
            <img
              [src]="currentPhoto()?.previewUrl"
              [alt]="currentPhoto()?.title"
              class="max-h-[76vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl prevent-save animate-lightbox-next"
              (contextmenu)="$event.preventDefault()"
              draggable="false"
            />
          </div>

          <!-- Botón Foto Siguiente (Desktop / Tablet) -->
          <button
            type="button"
            (click)="next.emit()"
            class="hidden sm:flex absolute right-3 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-white hover:text-zinc-950 text-white items-center justify-center transition shadow-2xl active:scale-90 border border-white/10"
            aria-label="Ver foto siguiente"
          >
            →
          </button>
        </main>

        <!-- PIE DEL VISOR: INSTRUCCIONES MÓVIL Y TECLADO -->
        <footer class="text-center text-[11px] text-zinc-500 font-medium py-1">
          <span class="sm:hidden">Doble toque o 🔍 para zoom • Desliza para cambiar de foto o hacia abajo para cerrar</span>
          <span class="hidden sm:inline">Doble clic o 🔍 para zoom 2x • Flechas ← / → para navegar • Escape para salir</span>
        </footer>
      </div>
    }
  `
})
export class LightboxComponent {
  private readonly albumService = inject(AlbumService);

  // Inputs
  public readonly isOpen = input<boolean>(false);
  public readonly currentPhoto = input<Photo | null>(null);
  public readonly currentIndex = input<number>(0);
  public readonly totalCount = input<number>(0);
  public readonly isSelected = input<boolean>(false);
  public readonly isFreeDownload = input<boolean>(false);
  public readonly albumId = input<string>();

  public readonly freeDownloadUrl = computed<string>(() => {
    const albId = this.albumId();
    const photo = this.currentPhoto();
    if (!albId || !photo || !this.isFreeDownload()) return '';
    return this.albumService.getFreePhotoDownloadUrl(albId, photo.id);
  });

  // Outputs
  public readonly close = output<void>();
  public readonly next = output<void>();
  public readonly prev = output<void>();
  public readonly toggleSelect = output<Photo>();

  // Estado de Gestos Táctiles y Zoom Cinemático
  public readonly zoomScale = signal<number>(1);
  private lastTapTime = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchCurrentX = 0;
  private touchCurrentY = 0;
  private isSwiping = false;

  public readonly touchDeltaX = signal<number>(0);
  public readonly touchDeltaY = signal<number>(0);

  public readonly touchTransform = computed<string>(() => {
    const scale = this.zoomScale();
    const dx = this.touchDeltaX();
    const dy = this.touchDeltaY();

    if (scale > 1) {
      if (dx === 0 && dy === 0) return `scale(${scale})`;
      return `scale(${scale}) translate3d(${dx * 0.3}px, ${dy * 0.3}px, 0)`;
    }

    if (dx === 0 && dy === 0) return 'none';
    return `translate3d(${dx * 0.4}px, ${dy * 0.3}px, 0)`;
  });

  constructor() {
    effect(() => {
      // Al cambiar de foto, índice o cerrar el visor, reseteamos el zoom a 1x
      this.currentIndex();
      this.isOpen();
      this.currentPhoto();
      untracked(() => {
        this.resetZoom();
      });
    });
  }

  public toggleZoom(event?: Event | MouseEvent | TouchEvent): void {
    if (event && typeof (event as any).stopPropagation === 'function') {
      (event as any).stopPropagation();
    }
    this.zoomScale.update((s) => (s > 1 ? 1 : 2.2));
    this.touchDeltaX.set(0);
    this.touchDeltaY.set(0);
  }

  public resetZoom(): void {
    this.zoomScale.set(1);
    this.touchDeltaX.set(0);
    this.touchDeltaY.set(0);
    this.lastTapTime = 0;
  }

  public onTouchStart(event: TouchEvent): void {
    if (event.touches && event.touches.length === 1) {
      const now = Date.now();
      if (now - this.lastTapTime < 280) {
        this.lastTapTime = 0;
        this.isSwiping = false;
        this.toggleZoom(event);
        return;
      }
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
      this.touchCurrentX = this.touchStartX;
      this.touchCurrentY = this.touchStartY;
      this.isSwiping = true;
    }
  }

  public onTouchMove(event: TouchEvent): void {
    if (!this.isSwiping || !event.touches || event.touches.length !== 1) return;
    this.touchCurrentX = event.touches[0].clientX;
    this.touchCurrentY = event.touches[0].clientY;

    const dx = this.touchCurrentX - this.touchStartX;
    const dy = this.touchCurrentY - this.touchStartY;
    this.touchDeltaX.set(dx);
    this.touchDeltaY.set(dy);
  }

  public onTouchEnd(): void {
    if (!this.isSwiping) return;
    this.isSwiping = false;

    const dx = this.touchCurrentX - this.touchStartX;
    const dy = this.touchCurrentY - this.touchStartY;

    // Resetear desplazamiento visual elásticamente
    this.touchDeltaX.set(0);
    this.touchDeltaY.set(0);

    // Si el movimiento fue un tap (< 15px), registrar marca de tiempo para detección de doble tap
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      this.lastTapTime = Date.now();
    } else {
      this.lastTapTime = 0;
    }

    // Si el zoom está activo (> 1), NO emitimos swipe para evitar cambiar de foto accidentalmente al hacer pan
    if (this.zoomScale() > 1) {
      return;
    }

    // Umbral de swipe horizontal (45px)
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -45) {
        this.next.emit();
        return;
      } else if (dx > 45) {
        this.prev.emit();
        return;
      }
    }

    // Umbral de swipe vertical hacia abajo para cerrar (70px)
    if (dy > 70) {
      this.close.emit();
    }
  }

  public handleKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    if (event.key === 'Escape') {
      this.resetZoom();
      this.close.emit();
    }
    if (event.key === 'ArrowRight') {
      this.resetZoom();
      this.next.emit();
    }
    if (event.key === 'ArrowLeft') {
      this.resetZoom();
      this.prev.emit();
    }
  }
}
