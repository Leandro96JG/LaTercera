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
        class="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-3 sm:p-6 select-none transition-opacity duration-300 animate-fadeIn"
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
            <span class="text-xs text-zinc-300 font-mono font-medium">
              Foto {{ currentIndex() + 1 }} de {{ totalCount() }}
            </span>
            @if (currentPhoto()?.isSampleHD) {
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                <svg class="w-2.5 h-2.5 text-emerald-300 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z"/>
                </svg>
                <span>Muestra HD Original</span>
              </span>
            }
          </div>

          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Botón de Zoom Cinemático 1x / 2x -->
            <button
              type="button"
              (click)="toggleZoom($event)"
              class="min-h-[40px] px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1.5 transition active:scale-95 border border-white/10 focus-visible:ring-2 focus-visible:ring-white"
              [attr.aria-label]="zoomScale() > 1 ? 'Alejar foto a 1x' : 'Ampliar muestra a 2.2x'"
            >
              <svg class="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" x2="16.65" y1="21" y2="16.65"/>
              </svg>
              <span class="font-mono text-[11px]">{{ zoomScale() > 1 ? '1x' : '2x' }}</span>
            </button>

            <!-- Botón Rápido de Carrito / Selección o Descarga Directa HD Gratuita -->
            @if (!isFreeDownload()) {
              <button
                type="button"
                (click)="toggleSelect.emit(currentPhoto()!)"
                [class]="isSelected()
                  ? 'min-h-[40px] px-4 py-2 rounded-full bg-emerald-500 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 animate-check-pop focus-visible:ring-2 focus-visible:ring-emerald-400'
                  : 'min-h-[40px] px-4 py-2 rounded-full bg-white text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md hover:bg-zinc-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-white'"
                [attr.aria-label]="isSelected() ? 'Quitar del carrito' : 'Sumar al carrito'"
              >
                @if (isSelected()) {
                  <svg class="w-3.5 h-3.5 text-zinc-950 stroke-[3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>✓ Seleccionada</span>
                } @else {
                  <svg class="w-3.5 h-3.5 text-zinc-950 stroke-[2.5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span>+ Seleccionar</span>
                }
              </button>
            } @else if (freeDownloadUrl()) {
              <a
                [href]="freeDownloadUrl()"
                [download]="'LA_TERCERA_' + (currentPhoto()?.id || 'foto') + '.jpg'"
                class="min-h-[40px] px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-400"
                [attr.aria-label]="'Descargar foto HD gratis'"
                title="Descargar foto HD gratis"
              >
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Descargar HD</span>
              </a>
            }

            <!-- Botón Cerrar (Accesible y con icono SVG) -->
            <button
              type="button"
              (click)="close.emit()"
              class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-90 focus-visible:ring-2 focus-visible:ring-white shrink-0"
              aria-label="Cerrar visor cinemático"
            >
              <svg class="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
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
            class="hidden sm:flex absolute left-3 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-white hover:text-zinc-950 text-white items-center justify-center transition shadow-2xl active:scale-90 border border-white/10 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Ver foto anterior"
          >
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6"/>
            </svg>
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
            class="hidden sm:flex absolute right-3 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-white hover:text-zinc-950 text-white items-center justify-center transition shadow-2xl active:scale-90 border border-white/10 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Ver foto siguiente"
          >
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </main>

        <!-- PIE DEL VISOR: INSTRUCCIONES MÓVIL Y TECLADO -->
        <footer class="text-center text-[11px] text-zinc-400 font-medium py-1">
          <span class="sm:hidden">Doble toque para zoom · Desliza para cambiar de foto o hacia abajo para cerrar</span>
          <span class="hidden sm:inline">Doble clic para zoom 2x · Flechas ← / → para navegar · Escape para salir</span>
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
