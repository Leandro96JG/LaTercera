import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Photo } from '../../core/models/photo.model';
import { AlbumService } from '../../core/services/album.service';

@Component({
  selector: 'app-photo-card-polaroid',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block animate-stagger-fade-in',
    '[style.--polaroid-rotation]': 'rotationDeg()',
    '[style.--polaroid-rotation-num]': 'rotationValue()',
    '[style.animation-delay]': 'staggerDelay()'
  },
  template: `
    <article
      class="polaroid-card group relative bg-white rounded-[26px] p-3 pb-4 border border-black/[0.06] shadow-md hover:shadow-2xl transition-all duration-300 ease-out flex flex-col justify-between cursor-pointer select-none"
      [class.is-selected]="isSelected()"
      [class.ring-2]="isSelected()"
      [class.ring-zinc-950]="isSelected()"
      [attr.aria-label]="photo().title || ('Foto #' + (index() + 1))"
      (click)="onCardClicked($event)"
    >
      <!-- REFLEJO DE PAPEL FOTOGRÁFICO GLOSS EN HOVER / TOUCH -->
      <div
        class="gloss-overlay absolute inset-0 rounded-[26px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div class="gloss-shine absolute inset-0 pointer-events-none"></div>
      </div>

      <!-- CONTENEDOR DE LA IMAGEN CON PROPORCIÓN Y CAPA ANTI-DESCARGA -->
      <div
        (click)="onViewClicked($event)"
        class="relative w-full aspect-[4/3] rounded-[20px] overflow-hidden bg-zinc-100 cursor-pointer"
        tabindex="0"
        (keydown.enter)="onViewClicked($event)"
        (keydown.space)="onViewClicked($event)"
        role="button"
        [attr.aria-label]="'Ampliar foto ' + (index() + 1) + ' en visor cinemático'"
      >
        <!-- SKELETON / SHIMMER STATE (Visible mientras carga la foto) -->
        @if (isLoading() && !hasError()) {
          <div class="absolute inset-0 bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 animate-shimmer-sweep flex items-center justify-center z-10">
            <div class="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
              <svg class="w-4 h-4 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
              </svg>
              <span>Cargando foto...</span>
            </div>
          </div>
        }

        <!-- PLACEHOLDER ELEGANTE CUANDO LA IMAGEN FALLA -->
        @if (hasError()) {
          <div class="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 flex flex-col items-center justify-center p-4 text-center select-none z-10 border border-zinc-800">
            <svg class="w-8 h-8 text-amber-400/90 mb-1 filter drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
            <span class="font-display font-black text-amber-400 text-xs tracking-wider uppercase">
              La Tercera
            </span>
            <span class="text-[10px] text-zinc-400 font-medium mt-0.5">
              Procesando muestra HD
            </span>
          </div>
        } @else {
          <!-- IMAGEN PROTEGIDA CON FADE-IN -->
          <img
            [src]="photo().previewUrl"
            [alt]="photo().title || ('Foto #' + (index() + 1))"
            loading="lazy"
            decoding="async"
            (load)="onImageLoaded()"
            (error)="onImageError()"
            class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 prevent-save"
            [class.opacity-0]="isLoading()"
            [class.opacity-100]="!isLoading()"
            (contextmenu)="$event.preventDefault()"
            draggable="false"
          />
        }

        <!-- BADGE SUPERIOR DE MUESTRA HD -->
        @if (photo().isSampleHD) {
          <div class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-black text-[9px] shadow-sm flex items-center gap-1 z-20">
            <svg class="w-2.5 h-2.5 text-zinc-950 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z"/>
            </svg>
            <span>Muestra HD</span>
          </div>
        }

        <!-- OVERLAY DE HOVER SUGIRIENDO EXPANDIR -->
        <div class="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white/95 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-none shadow-xs">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" x2="16.65" y1="21" y2="16.65"/>
          </svg>
          <span>Ver detalle</span>
        </div>
      </div>

      <!-- PIE DE TARJETA POLAROID: NÚMERO, PRECIO Y BOTÓN ELECCIÓN -->
      <div class="relative z-40 flex items-center justify-between pt-3 px-1 mt-1 gap-2">
        <div class="min-w-0 flex-1">
          <span class="text-[11px] font-bold text-zinc-900 block truncate">
            Foto #{{ index() + 1 }}
          </span>
          <span class="text-[10px] text-zinc-500 font-medium block truncate">
            @if (isFreeDownload()) {
              4K Original • Incluida Gratis
            } @else {
              4K Original • \${{ unitPrice().toLocaleString('es-AR') }} ARS
            }
          </span>
        </div>

        <!-- BOTÓN DE ACCIÓN / SELECCIÓN CON ERGONOMÍA MÓVIL (MIN 44px) -->
        @if (!isFreeDownload()) {
          <button
            type="button"
            (click)="onSelectClicked($event)"
            [class]="isSelected()
              ? 'relative z-50 pointer-events-auto cursor-pointer min-h-[44px] px-3.5 py-2 rounded-2xl bg-zinc-950 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 animate-check-pop focus-visible:ring-2 focus-visible:ring-zinc-950 shrink-0'
              : 'relative z-50 pointer-events-auto cursor-pointer min-h-[44px] px-3.5 py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-950 shrink-0'"
            [attr.aria-label]="isSelected() ? 'Quitar foto de la selección' : 'Elegir foto para comprar'"
          >
            @if (isSelected()) {
              <svg class="w-3.5 h-3.5 text-emerald-400 stroke-[3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>✓ Elegida</span>
            } @else {
              <svg class="w-3.5 h-3.5 text-zinc-600 stroke-[2.5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>+ Elegir</span>
            }
          </button>
        } @else {
          <div class="flex items-center gap-1.5 shrink-0">
            <a
              [href]="freeDownloadUrl()"
              [download]="'LA_TERCERA_' + photo().id + '.jpg'"
              (click)="$event.stopPropagation()"
              class="relative z-50 pointer-events-auto cursor-pointer min-h-[44px] px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500"
              [attr.aria-label]="'Descargar foto ' + (index() + 1) + ' en máxima calidad HD'"
              title="Descargar foto HD gratis"
            >
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              <span>Descargar HD</span>
            </a>
            <button
              type="button"
              (click)="onViewClicked($event)"
              class="relative z-50 pointer-events-auto cursor-pointer min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs flex items-center justify-center transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-950"
              [attr.aria-label]="'Ver foto ' + (index() + 1) + ' en máxima calidad'"
              title="Ver en pantalla completa"
            >
              <svg class="w-4 h-4 text-zinc-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" x2="16.65" y1="21" y2="16.65"/>
              </svg>
            </button>
          </div>
        }
      </div>
    </article>
  `,
  styles: [`
    :host {
      perspective: 1200px;
    }

    .polaroid-card {
      transform-style: preserve-3d;
      backface-visibility: hidden;
      will-change: transform, box-shadow;
      /* Rotación orgánica alternada por defecto */
      transform: perspective(1000px) rotate(var(--polaroid-rotation, 0deg)) translateZ(0);
      transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 320ms ease;
    }

    /* Levitación 3D elevada al pasar el mouse en desktop (+ reflejo de papel fotográfico) */
    @media (hover: hover) and (pointer: fine) {
      .polaroid-card:hover {
        transform: perspective(1000px) rotate(0deg) translateZ(28px) scale(1.03) !important;
        box-shadow: 0 24px 38px -12px rgba(0, 0, 0, 0.22), 0 10px 16px -6px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.85);
        z-index: 25;
      }
    }

    /* Efecto de Reflejo Gloss de Papel Fotográfico Satinado */
    .gloss-overlay,
    .gloss-shine {
      pointer-events: none !important;
      user-select: none !important;
    }

    .gloss-shine {
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.35) 0%,
        rgba(255, 255, 255, 0.12) 35%,
        transparent 55%,
        rgba(255, 255, 255, 0.08) 100%
      );
      mix-blend-mode: overlay;
    }

    /* Rebote Físico Elástico cuando pasa a isSelected */
    .polaroid-card.is-selected {
      transform: perspective(1000px) rotate(0deg) translateZ(12px) scale(1.01);
      border-color: #09090b;
      box-shadow: 0 14px 28px -6px rgba(0, 0, 0, 0.2);
      animation: polaroidBounce 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes polaroidBounce {
      0% {
        transform: perspective(1000px) rotate(var(--polaroid-rotation, 0deg)) scale(1);
      }
      40% {
        transform: perspective(1000px) rotate(0deg) translateZ(32px) scale(1.06);
      }
      75% {
        transform: perspective(1000px) rotate(0deg) translateZ(16px) scale(0.99);
      }
      100% {
        transform: perspective(1000px) rotate(0deg) translateZ(20px) scale(1.02);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .polaroid-card {
        transform: none !important;
        transition: none !important;
        animation: none !important;
      }
      .gloss-overlay {
        display: none !important;
      }
    }
  `]
})
export class PhotoCardPolaroidComponent {
  private readonly albumService = inject(AlbumService);

  // Inputs
  public readonly photo = input.required<Photo>();
  public readonly index = input.required<number>();
  public readonly unitPrice = input.required<number>();
  public readonly isFreeDownload = input<boolean>(false);
  public readonly albumId = input<string>();
  public readonly isSelected = input<boolean>(false);

  public readonly freeDownloadUrl = computed<string>(() => {
    const albId = this.albumId();
    if (!albId || !this.isFreeDownload()) return '';
    return this.albumService.getFreePhotoDownloadUrl(albId, this.photo().id);
  });

  // Retraso de animación de entrada en cascada a 60fps
  public readonly staggerDelay = computed<string>(() => {
    return ((this.index() % 8) * 45) + 'ms';
  });

  // Outputs
  public readonly toggleSelect = output<Photo>();
  public readonly openViewer = output<{ photo: Photo; index: number }>();

  // Estado del Shimmer Skeleton y Fallback de Error
  public readonly isLoading = signal<boolean>(true);
  public readonly hasError = signal<boolean>(false);

  // Rotación orgánica alternada (-1.5deg a 1.5deg)
  public readonly rotationValue = computed<number>(() => {
    const idx = this.index();
    const cycle = idx % 4;
    switch (cycle) {
      case 0: return -1.5;
      case 1: return 1.3;
      case 2: return -1.1;
      case 3: return 1.5;
      default: return 0;
    }
  });

  public readonly rotationDeg = computed<string>(() => {
    return `${this.rotationValue()}deg`;
  });

  public onImageLoaded(): void {
    this.isLoading.set(false);
  }

  public onImageError(): void {
    this.isLoading.set(false);
    this.hasError.set(true);
  }

  public onCardClicked(event: Event): void {
    if (this.isFreeDownload()) {
      this.onViewClicked(event);
    } else {
      this.onSelectClicked(event);
    }
  }

  public onViewClicked(event: Event): void {
    event.stopPropagation();
    this.openViewer.emit({ photo: this.photo(), index: this.index() });
  }

  public onSelectClicked(event: Event): void {
    event.stopPropagation();
    (event.currentTarget as HTMLElement | null)?.blur();
    this.toggleSelect.emit(this.photo());
  }
}
