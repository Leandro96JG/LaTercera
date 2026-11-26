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
    'class': 'block h-full select-none animate-stagger-fade-in',
    '[style.animation-delay]': 'staggerDelay()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave()',
    '(pointermove)': 'onPointerMove($event)'
  },
  template: `
    <article
      #cardArticle
      class="album-card-root group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-[32px] h-full flex flex-col justify-between"
      [style.view-transition-name]="viewTransitionName()"
      (click)="handleAction($event)"
      tabindex="0"
      (keydown.enter)="handleAction($event)"
      (keydown.space)="handleAction($event)"
      role="button"
      [attr.aria-label]="'Carpeta 3D del álbum ' + album().title + (album().isPrivate && !isUnlocked() ? ' (Privado, requiere PIN)' : '')"
    >
      <!-- CONTENEDOR 3D DE LA CARPETA CON PERSPECTIVA (2D GPU en móviles táctiles) -->
      <div
        class="folder-container relative w-full aspect-[4/3] rounded-[30px] bg-zinc-950 border border-zinc-800/90 shadow-xl transition-transform duration-300 ease-out transform-gpu group-hover:border-zinc-700/80"
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
          <div class="flex flex-col gap-5 sm:gap-6 my-auto" aria-hidden="true">
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

          <!-- Categoría en Vertical con Tipografía Nítida -->
          <span class="text-[9px] font-mono tracking-widest text-zinc-400 uppercase -rotate-90 whitespace-nowrap font-bold select-none my-2">
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
          <!-- Hoja Apilada 1 (Solo desktop hover) -->
          <div
            class="stacked-sheet sheet-1 hidden sm:block absolute inset-3 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 transform-gpu transition-transform duration-500 ease-out origin-bottom-left"
            [class.sheet-open]="isOpenState()"
          ></div>

          <!-- Hoja Apilada 2 (Solo desktop hover) -->
          <div
            class="stacked-sheet sheet-2 hidden sm:block absolute inset-2.5 rounded-2xl bg-zinc-900 border border-zinc-700/80 transform-gpu transition-transform duration-500 ease-out origin-bottom-left"
            [class.sheet-open]="isOpenState()"
          ></div>

          <!-- Foto Principal Interior (Visible y nítida) -->
          <div class="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-900 z-10">
            <img
              [src]="album().coverUrl"
              [alt]="'Portada interior de ' + album().title"
              loading="lazy"
              decoding="async"
              width="480"
              height="360"
              class="w-full h-full object-cover transform-gpu transition-transform duration-700 ease-out brightness-95 sm:group-hover:scale-105"
            />
            <!-- Gradiente de profundidad interior -->
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/25 to-transparent"></div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- TAPA FRONTAL ABATIBLE 3D (OPEN COVER & SPECULAR SHINE)    -->
        <!-- ======================================================== -->
        <div
          class="cover-flap absolute inset-0 left-9 sm:left-11 rounded-r-[30px] bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/35 border-l border-white/10 p-4 sm:p-5 flex flex-col justify-between transition-transform duration-500 ease-out origin-left z-20 shadow-xl overflow-hidden"
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

          <!-- Cabecera de la Tapa: Badges con Iconografía Vectorial Neta -->
          <div class="relative z-10 flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700/60 shadow-xs">
                {{ album().badge || album().category }}
              </span>

              @if (album().isFreeDownload) {
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-400 text-zinc-950 shadow-xs flex items-center gap-1">
                  <svg class="w-3 h-3 text-zinc-950 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z"/>
                  </svg>
                  <span>GRATIS HD</span>
                </span>
              }

              @if (album().isPrivate && !isUnlocked()) {
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-1">
                  <svg class="w-3 h-3 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>PRIVADO</span>
                </span>
              } @else if (album().isPrivate && isUnlocked()) {
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                  <svg class="w-3 h-3 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                  </svg>
                  <span>DESBLOQUEADO</span>
                </span>
              }
            </div>

            <div class="text-right">
              <span class="px-2.5 py-1 rounded-lg bg-zinc-950/80 text-[11px] font-mono text-zinc-300 border border-zinc-800/80">
                {{ album().photosCount }} fotos
              </span>
            </div>
          </div>

          <!-- Troquelado Central / Título y Metadatos del Evento -->
          <div class="relative z-10 my-auto py-2">
            <h3 class="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-2 min-h-[2.75rem] leading-snug group-hover:text-amber-400 transition-colors">
              {{ album().title }}
            </h3>
            <p class="text-xs text-zinc-300 line-clamp-1 min-h-[1.125rem] font-medium mt-0.5">
              @if (album().subtitle) {
                {{ album().subtitle }}
              } @else {
                <span class="opacity-0 select-none">-</span>
              }
            </p>
            <div class="flex items-center gap-2 mt-2 text-[11px] text-zinc-400 font-medium">
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                <span>{{ album().eventDate || album().date }}</span>
              </span>
              @if (album().eventTime) {
                <span class="text-zinc-600">•</span>
                <span class="flex items-center gap-1">
                  <svg class="w-3 h-3 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{{ album().eventTime }} hs</span>
                </span>
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

            <!-- Botón de apertura con microinteracción (Sin flechas genéricas) -->
            <div class="flex items-center gap-1.5 text-[11px] font-bold text-zinc-300 group-hover:text-amber-400 transition-colors">
              @if (album().isPrivate && !isUnlocked()) {
                <span>Ingresar PIN</span>
                <svg class="w-3.5 h-3.5 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              } @else {
                <span>Abrir álbum</span>
                <svg class="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              }
            </div>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      perspective: 1000px;
      display: block;
      height: 100%;
      content-visibility: auto;
      contain-intrinsic-size: 320px;
    }

    .album-card-root {
      transform-style: preserve-3d;
      height: 100%;
    }

    .folder-container {
      perspective: 1000px;
      transform-style: preserve-3d;
      transform: perspective(1000px) rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg));
      transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @media (hover: hover) and (pointer: fine) {
      .album-card-root:hover .folder-container {
        transform: perspective(1000px) rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg)) scale3d(1.02, 1.02, 1.02);
      }
    }

    /* Solapa Frontal 3D */
    .cover-flap {
      transform-style: preserve-3d;
      backface-visibility: hidden;
      transform-origin: left center;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.4);
    }

    /* Apertura 3D en Hover o Estado Abierto Activo (Solo Desktop con hover real) */
    .flap-open {
      transform: rotateY(-24deg) scale(0.985);
    }

    /* En celulares táctiles, deshabilitar 3D preserve-3d y apertura de solapa para scroll a 120fps */
    @media (hover: none) and (pointer: coarse) {
      :host {
        perspective: none;
      }
      .album-card-root,
      .folder-container,
      .cover-flap {
        transform-style: flat !important;
        perspective: none !important;
      }
      .folder-container,
      .flap-open {
        transform: none !important;
      }
      .specular-shine,
      .stacked-sheet {
        display: none !important;
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

  private cardRect: DOMRect | null = null;
  private animFrameId: number | null = null;
  private lastMoveTimestamp = 0;
  private isCoarsePointer = false;

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

  // Estado derivado para abrir la tapa (Desktop Hover o Toque explícito)
  public readonly isOpenState = computed<boolean>(() => {
    return this.isHovered() || this.isTouchActive() || this.isInViewportCenter();
  });

  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        this.isCoarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      }
    });
  }

  public onPointerEnter(event?: PointerEvent): void {
    if (event?.pointerType === 'touch' || this.isCoarsePointer) return;
    this.isHovered.set(true);
    if (event) {
      const target = event.currentTarget as HTMLElement | null;
      if (target) {
        this.cardRect = target.getBoundingClientRect();
      }
    }
  }

  public onPointerLeave(): void {
    this.isHovered.set(false);
    this.cardRect = null;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.specularX.set(50);
    this.specularY.set(50);
  }

  public onPointerMove(event: PointerEvent): void {
    if (!this.isHovered() || this.isCoarsePointer || event.pointerType === 'touch') return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this.lastMoveTimestamp > 0 && now - this.lastMoveTimestamp < 16) return;
    this.lastMoveTimestamp = now;

    if (!this.cardRect && event.currentTarget) {
      const target = event.currentTarget as HTMLElement | null;
      if (target?.getBoundingClientRect) {
        this.cardRect = target.getBoundingClientRect();
      }
    }
    if (!this.cardRect) return;

    const rect = this.cardRect;
    if (rect.width > 0 && rect.height > 0) {
      const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
      this.specularX.set(Math.round(x));
      this.specularY.set(Math.round(y));
    }
  }

  public onTouchStart(): void {
    this.isTouchActive.set(true);
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
}
