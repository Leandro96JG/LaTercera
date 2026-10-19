import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  ElementRef,
  inject,
  afterNextRender,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Album } from '../../core/models/album.model';

@Component({
  selector: 'app-album-card-3d',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block select-none animate-stagger-fade-in',
    '[style.animation-delay]': 'staggerDelay()',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
    '(pointermove)': 'onPointerMove($event)',
    '(touchstart)': 'onTouchStart($event)',
    '(touchmove)': 'onTouchMove($event)',
    '(touchend)': 'onTouchEnd()',
    '(touchcancel)': 'onTouchEnd()'
  },
  template: `
    <article
      #cardArticle
      class="album-card-root group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-[32px]"
      [style.view-transition-name]="viewTransitionName()"
      (click)="handleAction($event)"
      tabindex="0"
      (keydown.enter)="handleAction($event)"
      (keydown.space)="handleAction($event)"
      role="button"
      [attr.aria-label]="'Carpeta 3D del álbum ' + album().title + (album().isPrivate && !isUnlocked() ? ' (Privado, requiere PIN)' : '')"
    >
      <!-- CONTENEDOR 3D DE LA CARPETA CON PERSPECTIVA -->
      <div
        class="folder-container relative w-full aspect-[4/3] rounded-[30px] bg-zinc-950 border border-zinc-800/90 shadow-2xl transition-all duration-300 ease-out transform-gpu group-hover:shadow-amber-500/10 group-hover:border-zinc-700/80"
        [class.is-open]="isOpenState()"
        [style.--tilt-rx]="tiltRotateX() + 'deg'"
        [style.--tilt-ry]="tiltRotateY() + 'deg'"
      >
        <!-- ======================================================== -->
        <!-- LOMO LATERAL IZQUIERDO: CUERO NEGRO, ANILLAS Y REMACHES   -->
        <!-- ======================================================== -->
        <div class="absolute left-0 top-0 bottom-0 w-9 sm:w-11 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 rounded-l-[30px] border-r border-zinc-800/90 flex flex-col items-center justify-between py-4 z-30 shadow-2xl">
          <!-- Remache Metálico Superior -->
          <div class="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-zinc-500 to-zinc-700 border border-zinc-600 shadow-inner flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-zinc-950/80 shadow-inner"></div>
          </div>

          <!-- Anillas Metálicas de Encuadernación (3 Anillas Físicas) -->
          <div class="flex flex-col gap-5 sm:gap-6 my-auto">
            <!-- Anilla 1 -->
            <div class="relative w-4 h-2.5 rounded-r-full border-2 border-l-0 border-zinc-400 bg-gradient-to-r from-zinc-700 to-zinc-300 shadow-md">
              <div class="absolute -left-1 top-0.5 w-1 h-1 rounded-full bg-zinc-950"></div>
            </div>
            <!-- Anilla 2 -->
            <div class="relative w-4 h-2.5 rounded-r-full border-2 border-l-0 border-zinc-400 bg-gradient-to-r from-zinc-700 to-zinc-300 shadow-md">
              <div class="absolute -left-1 top-0.5 w-1 h-1 rounded-full bg-zinc-950"></div>
            </div>
            <!-- Anilla 3 -->
            <div class="relative w-4 h-2.5 rounded-r-full border-2 border-l-0 border-zinc-400 bg-gradient-to-r from-zinc-700 to-zinc-300 shadow-md">
              <div class="absolute -left-1 top-0.5 w-1 h-1 rounded-full bg-zinc-950"></div>
            </div>
          </div>

          <!-- Categoría en Vertical Monospace -->
          <span class="text-[9px] font-mono tracking-widest text-zinc-400 uppercase -rotate-90 whitespace-nowrap font-bold select-none my-2 drop-shadow">
            {{ album().category }}
          </span>

          <!-- Remache Metálico Inferior -->
          <div class="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-zinc-500 to-zinc-700 border border-zinc-600 shadow-inner flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-zinc-950/80 shadow-inner"></div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- INTERIOR DERECHO: EFECTO DE HOJAS / FOTOS APILADAS       -->
        <!-- ======================================================== -->
        <div class="absolute inset-0 left-9 sm:left-11 rounded-r-[30px] overflow-hidden bg-zinc-950 p-2.5 sm:p-3 pointer-events-none">
          <!-- Hoja Apilada 1 (Fondo inclinado +2.5deg simulando papel fotográfico) -->
          <div
            class="stacked-sheet sheet-1 absolute inset-3 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 shadow-md transform-gpu transition-transform duration-500 ease-out origin-bottom-left"
            [class.sheet-open]="isOpenState()"
          ></div>

          <!-- Hoja Apilada 2 (Hoja intermedia inclinada -1.5deg) -->
          <div
            class="stacked-sheet sheet-2 absolute inset-2.5 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-lg transform-gpu transition-transform duration-500 ease-out origin-bottom-left"
            [class.sheet-open]="isOpenState()"
          ></div>

          <!-- Foto Principal Interior (Revelada al abrir la tapa) -->
          <div class="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-900 shadow-inner z-10">
            <img
              [src]="album().coverUrl"
              [alt]="'Portada interior de ' + album().title"
              loading="lazy"
              decoding="async"
              class="w-full h-full object-cover transform-gpu transition-transform duration-700 ease-out brightness-95 group-hover:scale-105 group-hover:brightness-105"
            />
            <!-- Gradiente de profundidad interior -->
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/25 to-transparent"></div>

            <!-- Indicador sutil de fotos apiladas en esquina interior -->
            <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300">
              {{ album().photosCount }} hojas
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- TAPA FRONTAL ABATIBLE 3D (OPEN COVER & SPECULAR SHINE)    -->
        <!-- ======================================================== -->
        <div
          class="cover-flap absolute inset-0 left-9 sm:left-11 rounded-r-[30px] bg-zinc-900/95 backdrop-blur-md border-l border-white/10 p-4 sm:p-5 flex flex-col justify-between transition-all duration-500 ease-out origin-left z-20 shadow-xl overflow-hidden"
          [class.flap-open]="isOpenState()"
          [style.--shine-x]="specularX() + '%'"
          [style.--shine-y]="specularY() + '%'"
        >
          <!-- Brillo Especular Dinámico que sigue al cursor en Desktop -->
          <div
            class="specular-shine absolute inset-0 pointer-events-none transition-opacity duration-300"
            [class.opacity-100]="isHovered() || isTouchActive()"
            [class.opacity-0]="!isHovered() && !isTouchActive()"
          ></div>

          <!-- Cabecera de la Tapa -->
          <div class="relative z-10 flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700/60 shadow-sm">
                {{ album().badge || album().category }}
              </span>

              @if (album().isFreeDownload) {
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-400 text-zinc-950 shadow-sm animate-pulse flex items-center gap-1">
                  <span>🎁</span> <span>GRATIS HD</span>
                </span>
              }

              @if (album().isPrivate && !isUnlocked()) {
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 border border-red-500/40 text-red-400 flex items-center gap-1">
                  <span>🔒</span> <span>PRIVADO</span>
                </span>
              } @else if (album().isPrivate && isUnlocked()) {
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                  <span>🔓</span> <span>DESBLOQUEADO</span>
                </span>
              }
            </div>

            <div class="text-right">
              <span class="px-2 py-0.5 rounded-md bg-zinc-950/80 text-[11px] font-mono text-zinc-400 border border-zinc-800/80">
                {{ album().photosCount }} fotos
              </span>
            </div>
          </div>

          <!-- Troquelado Central / Título y Metadatos del Evento -->
          <div class="relative z-10 my-auto py-2">
            <h3 class="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-1 group-hover:text-amber-400 transition-colors drop-shadow-md">
              {{ album().title }}
            </h3>
            @if (album().subtitle) {
              <p class="text-xs text-zinc-300 line-clamp-1 font-medium mt-0.5 drop-shadow">
                {{ album().subtitle }}
              </p>
            }
            <div class="flex items-center gap-2 mt-2 text-[11px] text-zinc-400 font-medium">
              <span>📅 {{ album().eventDate || album().date }}</span>
              @if (album().eventTime) {
                <span>• ⏰ {{ album().eventTime }} hs</span>
              }
            </div>
          </div>

          <!-- Pie de la Tapa: Precios y Acción de Apertura -->
          <div class="relative z-10 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <div>
              @if (album().isFreeDownload) {
                <span class="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Cortesía Oficial
                </span>
              } @else {
                <div class="flex items-baseline gap-1.5">
                  <span class="text-sm font-extrabold text-white">
                    \${{ album().unitPrice.toLocaleString('es-AR') }}
                  </span>
                  <span class="text-[10px] text-zinc-400">c/u</span>
                  <span class="text-zinc-600">•</span>
                  <span class="text-[11px] text-amber-400 font-bold">
                    \${{ album().fullAlbumPrice.toLocaleString('es-AR') }} pack
                  </span>
                </div>
              }
            </div>

            <!-- Botón de apertura indicativo -->
            <div class="flex items-center gap-1.5 text-[11px] font-bold text-zinc-300 group-hover:text-amber-400 transition-colors">
              @if (album().isPrivate && !isUnlocked()) {
                <span>Ingresar PIN</span>
                <span class="text-xs">🔒</span>
              } @else {
                <span>Abrir carpeta</span>
                <span class="transform transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              }
            </div>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      perspective: 1200px;
    }

    .folder-container {
      perspective: 1200px;
      transform-style: preserve-3d;
      will-change: transform, box-shadow;
      transform: perspective(1200px) rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg));
      transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 400ms ease;
    }

    /* Solapa Frontal 3D */
    .cover-flap {
      transform-style: preserve-3d;
      backface-visibility: hidden;
      will-change: transform, box-shadow;
      transform-origin: left center;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.4);
    }

    /* Apertura 3D en Hover o Estado Abierto Activo */
    .flap-open {
      transform: rotateY(-24deg) scale(0.985);
      background-color: rgba(24, 24, 27, 0.75);
      box-shadow: 12px 14px 28px rgba(0, 0, 0, 0.55);
    }

    @media (max-width: 640px) {
      .flap-open {
        transform: rotateY(-18deg) scale(0.98);
        box-shadow: 8px 10px 20px rgba(0, 0, 0, 0.45);
      }
    }

    /* Brillo Especular Dinámico */
    .specular-shine {
      background: radial-gradient(
        circle at var(--shine-x, 50%) var(--shine-y, 50%),
        rgba(255, 255, 255, 0.16) 0%,
        rgba(255, 255, 255, 0.05) 30%,
        transparent 65%
      );
    }

    /* Animación de Hojas Apiladas en el Interior al Abrirse */
    .stacked-sheet.sheet-1.sheet-open {
      transform: rotate(2.4deg) translate(2px, -1px);
    }

    .stacked-sheet.sheet-2.sheet-open {
      transform: rotate(-1.4deg) translate(1px, -2px);
    }

    /* Reducción de movimiento por accesibilidad */
    @media (prefers-reduced-motion: reduce) {
      .folder-container,
      .cover-flap,
      .stacked-sheet {
        transition: none !important;
        transform: none !important;
      }
    }
  `]
})
export class AlbumCard3dComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  public readonly album = input.required<Album>();
  public readonly index = input<number>(0);
  public readonly isUnlocked = input<boolean>(false);
  public readonly isSelected = input<boolean>(false);

  // Retraso de animación de entrada en cascada a 60fps
  public readonly staggerDelay = computed<string>(() => {
    return ((this.index() % 8) * 45) + 'ms';
  });

  // View transition name único para morphing con el hero
  public readonly viewTransitionName = computed<string>(() => {
    return 'album-cover-' + this.album().id;
  });

  // Outputs
  public readonly selectAlbum = output<Album>();
  public readonly openPinModal = output<Album>();
  public readonly downloadCourtesyZip = output<Album>();

  // Estados Reactivos con Signals
  public readonly isHovered = signal<boolean>(false);
  public readonly isTouchActive = signal<boolean>(false);
  public readonly isInViewportCenter = signal<boolean>(false);

  // Coordenadas de brillo especular
  public readonly specularX = signal<number>(50);
  public readonly specularY = signal<number>(50);

  // Inclinación reactiva suave de la carpeta (-5deg a +5deg)
  public readonly tiltRotateX = computed<number>(() => {
    if (!this.isHovered() && !this.isTouchActive()) return 0;
    const factor = (50 - this.specularY()) / 50;
    return Number((factor * 5).toFixed(2));
  });

  public readonly tiltRotateY = computed<number>(() => {
    if (!this.isHovered() && !this.isTouchActive()) return 0;
    const factor = (this.specularX() - 50) / 50;
    return Number((factor * 5).toFixed(2));
  });

  // Estado derivado para abrir la tapa (Desktop Hover, Mobile Viewport o Toque)
  public readonly isOpenState = computed<boolean>(() => {
    return this.isHovered() || this.isTouchActive() || this.isInViewportCenter();
  });

  constructor() {
    afterNextRender(() => {
      this.initMobileIntersectionObserver();
    });
  }

  public onPointerEnter(): void {
    this.isHovered.set(true);
  }

  public onPointerLeave(): void {
    this.isHovered.set(false);
    this.specularX.set(50);
    this.specularY.set(50);
  }

  public onPointerMove(event: PointerEvent): void {
    if (!this.isHovered()) return;
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
      this.specularX.set(Math.round(x));
      this.specularY.set(Math.round(y));
    }
  }

  public onTouchStart(event?: TouchEvent): void {
    this.isTouchActive.set(true);
    if (event?.touches?.[0]) {
      this.updateTouchCoords(event.touches[0], event.currentTarget as HTMLElement | null);
    }
  }

  public onTouchMove(event: TouchEvent): void {
    if (!this.isTouchActive()) return;
    if (event?.touches?.[0]) {
      this.updateTouchCoords(event.touches[0], event.currentTarget as HTMLElement | null);
    }
  }

  private updateTouchCoords(touch: Touch, target: HTMLElement | null): void {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
      this.specularX.set(Math.round(x));
      this.specularY.set(Math.round(y));
    }
  }

  public onTouchEnd(): void {
    this.isTouchActive.set(false);
    this.specularX.set(50);
    this.specularY.set(50);
  }

  public handleAction(event: Event): void {
    event.stopPropagation();
    const alb = this.album();

    if (alb.isPrivate && !this.isUnlocked()) {
      this.openPinModal.emit(alb);
    } else {
      this.selectAlbum.emit(alb);
    }
  }

  private initMobileIntersectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    // Detectar si la pantalla es móvil/touch
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Si el álbum se encuentra en el tercio central de la pantalla móvil
          this.isInViewportCenter.set(entry.isIntersecting);
        }
      },
      {
        rootMargin: '-25% 0px -25% 0px',
        threshold: 0.4
      }
    );

    const el = this.elementRef.nativeElement;
    observer.observe(el);

    this.destroyRef.onDestroy(() => {
      observer.disconnect();
    });
  }
}
