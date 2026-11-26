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
      class="album-card-root group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-[28px] h-full flex flex-col justify-between p-1.5"
      [style.view-transition-name]="viewTransitionName()"
      (click)="handleAction($event)"
      tabindex="0"
      (keydown.enter)="handleAction($event)"
      (keydown.space)="handleAction($event)"
      role="button"
      [attr.aria-label]="'Álbum ' + album().title + (album().isPrivate && !isUnlocked() ? ' (Privado, requiere PIN)' : '')"
    >
      <!-- CONTENEDOR DEL ABANICO DE FOTOS (PHOTO STACK) -->
      <div
        class="folder-container relative w-full aspect-[4/3] transition-transform duration-300 ease-out transform-gpu"
        [class.is-open]="isOpenState()"
        [style.--tilt-rx]="tiltRotateX() + 'deg'"
        [style.--tilt-ry]="tiltRotateY() + 'deg'"
      >
        <!-- Tarjeta trasera izquierda del abanico -->
        <div
          aria-hidden="true"
          class="stack-card stack-card-back-left absolute inset-1 rounded-[26px] bg-zinc-200 dark:bg-zinc-800 border border-black/10 shadow-md transform-gpu transition-transform duration-500 ease-out pointer-events-none"
          [class.stack-open]="isOpenState()"
        ></div>

        <!-- Tarjeta trasera derecha del abanico -->
        <div
          aria-hidden="true"
          class="stack-card stack-card-back-right absolute inset-1 rounded-[26px] bg-zinc-300 dark:bg-zinc-900 border border-black/10 shadow-md transform-gpu transition-transform duration-500 ease-out pointer-events-none"
          [class.stack-open]="isOpenState()"
        ></div>

        <!-- Tarjeta principal protagonista -->
        <div
          class="photo-stack-main relative w-full h-full rounded-[26px] overflow-hidden bg-zinc-900 border border-white/15 shadow-[0_18px_38px_-14px_rgba(0,0,0,0.45)] group-hover:border-amber-400/50 transition-colors duration-300 z-10"
        >
          <!-- Imagen de portada limpia y luminosa -->
          <img
            [src]="album().coverUrl"
            [alt]="'Portada de ' + album().title"
            loading="lazy"
            decoding="async"
            width="480"
            height="360"
            class="w-full h-full object-cover transform-gpu transition-transform duration-700 ease-out sm:group-hover:scale-105"
          />

          <!-- Degradado concentrado abajo para preservar el brillo real de la foto -->
          <div class="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/45 via-45% to-zinc-950/15 pointer-events-none"></div>

          <!-- Brillo especular dinámico en Desktop -->
          <div
            class="specular-shine absolute inset-0 pointer-events-none transition-opacity duration-300"
            [style.--shine-x]="specularX() + '%'"
            [style.--shine-y]="specularY() + '%'"
            [class.opacity-100]="isHovered() || isTouchActive()"
            [class.opacity-0]="!isHovered() && !isTouchActive()"
          ></div>

          <!-- Capa de contenido editorial sobre la tarjeta -->
          <div class="cover-flap relative z-10 h-full p-4 sm:p-5 flex flex-col justify-between">
            <!-- Cabecera superior flotante -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-950/65 backdrop-blur-md text-zinc-100 border border-white/15 shadow-xs">
                  {{ album().badge || album().category }}
                </span>
                @if (album().badge && album().badge !== album().category) {
                  <span class="sr-only">{{ album().category }}</span>
                }

                @if (album().isFreeDownload) {
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-400 text-zinc-950 shadow-xs flex items-center gap-1">
                    <svg class="w-3 h-3 text-zinc-950 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z"/>
                    </svg>
                    <span>GRATIS HD</span>
                  </span>
                }

                @if (album().isPrivate && !isUnlocked()) {
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/30 backdrop-blur-md border border-rose-400/50 text-rose-100 flex items-center gap-1">
                    <svg class="w-3 h-3 text-rose-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>PRIVADO</span>
                  </span>
                } @else if (album().isPrivate && isUnlocked()) {
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/30 backdrop-blur-md border border-emerald-400/50 text-emerald-100 flex items-center gap-1">
                    <svg class="w-3 h-3 text-emerald-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                    <span>DESBLOQUEADO</span>
                  </span>
                }
              </div>

              <span class="px-2.5 py-1 rounded-full bg-zinc-950/65 backdrop-blur-md text-[11px] font-mono font-semibold text-zinc-100 border border-white/15 shrink-0">
                {{ album().photosCount }} fotos
              </span>
            </div>

            <!-- Bloque inferior: título, metadatos, precio y CTA -->
            <div class="space-y-2.5">
              <div>
                <h3 class="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-2 min-h-[2.75rem] leading-snug drop-shadow-sm group-hover:text-amber-300 transition-colors">
                  {{ album().title }}
                </h3>
                <p class="text-xs text-zinc-200/90 line-clamp-1 min-h-[1.125rem] font-medium mt-0.5">
                  @if (album().subtitle) {
                    {{ album().subtitle }}
                  } @else {
                    <span class="opacity-0 select-none">-</span>
                  }
                </p>
                <div class="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-300 font-medium">
                  <span class="flex items-center gap-1">
                    <svg class="w-3 h-3 text-zinc-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                      <line x1="16" x2="16" y1="2" y2="6"/>
                      <line x1="8" x2="8" y1="2" y2="6"/>
                      <line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                    <span>{{ album().eventDate || album().date }}</span>
                  </span>
                  @if (album().eventTime) {
                    <span class="text-zinc-500">•</span>
                    <span class="flex items-center gap-1">
                      <svg class="w-3 h-3 text-zinc-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>{{ album().eventTime }} hs</span>
                    </span>
                  }
                </div>
              </div>

              <div class="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
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
                      <span class="text-[10px] text-zinc-300">c/u</span>
                      <span class="text-zinc-500">•</span>
                      <span class="text-[11px] text-amber-300 font-bold">
                        \${{ album().fullAlbumPrice.toLocaleString('es-AR') }} pack
                      </span>
                    </div>
                  }
                </div>

                <div class="flex items-center gap-1 text-[11px] font-bold text-white bg-white/10 group-hover:bg-amber-400 group-hover:text-zinc-950 px-2.5 py-1 rounded-full backdrop-blur-sm transition-colors">
                  @if (album().isPrivate && !isUnlocked()) {
                    <span>Ingresar PIN</span>
                    <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  } @else {
                    <span>Abrir álbum</span>
                    <svg class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  }
                </div>
              </div>
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
    }

    .album-card-root {
      height: 100%;
    }

    .folder-container {
      transform: perspective(1000px) rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg));
      transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @media (hover: hover) and (pointer: fine) {
      .album-card-root:hover .folder-container {
        transform: perspective(1000px) rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg)) scale3d(1.02, 1.02, 1.02);
      }
    }

    /* Abanico trasero 2D acelerado por GPU */
    .stack-card-back-left {
      transform: rotate(-2.4deg) translate3d(-4px, 4px, 0);
    }

    .stack-card-back-right {
      transform: rotate(2.4deg) translate3d(4px, 5px, 0);
    }

    .stack-card-back-left.stack-open {
      transform: rotate(-5deg) translate3d(-10px, -2px, 0);
    }

    .stack-card-back-right.stack-open {
      transform: rotate(5deg) translate3d(10px, -2px, 0);
    }

    /* En celulares táctiles: abanico estático ligero a 120fps sin tilt ni brillo dinámico */
    @media (hover: none) and (pointer: coarse) {
      :host {
        perspective: none;
      }
      .folder-container {
        transform: none !important;
      }
      .stack-card-back-left,
      .stack-card-back-left.stack-open {
        transform: rotate(-2deg) translate3d(-3px, 3px, 0);
      }
      .stack-card-back-right,
      .stack-card-back-right.stack-open {
        transform: rotate(2deg) translate3d(3px, 4px, 0);
      }
      .specular-shine {
        display: none !important;
      }
    }

    /* Brillo Especular Dinámico */
    .specular-shine {
      background: radial-gradient(
        circle at var(--shine-x, 50%) var(--shine-y, 50%),
        rgba(255, 255, 255, 0.14) 0%,
        rgba(255, 255, 255, 0.04) 30%,
        transparent 65%
      );
    }

    /* Reducción de movimiento por accesibilidad */
    @media (prefers-reduced-motion: reduce) {
      .folder-container,
      .stack-card {
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
