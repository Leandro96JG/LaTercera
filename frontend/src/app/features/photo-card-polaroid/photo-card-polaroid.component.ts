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
            <span class="text-zinc-300 text-xs font-mono font-bold animate-pulse">
              Cargando foto...
            </span>
          </div>
        }

        <!-- PLACEHOLDER ELEGANTE CUANDO LA IMAGEN FALLA -->
        @if (hasError()) {
          <div class="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 flex flex-col items-center justify-center p-4 text-center select-none z-10 border border-zinc-800">
            <span class="text-2xl mb-1 filter drop-shadow">📷</span>
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

        <!-- MARCA DE AGUA CENTRADA PERPETUA "LA TERCERA • MUESTRA" -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-45 group-hover:opacity-75 transition-opacity">
          <span class="font-display font-extrabold text-white text-[11px] sm:text-xs tracking-widest bg-black/45 px-3 py-1.5 rounded-full backdrop-blur-sm -rotate-12 border border-white/20 shadow-lg">
            LA TERCERA • MUESTRA
          </span>
        </div>

        <!-- BADGE SUPERIOR DE MUESTRA HD -->
        @if (photo().isSampleHD) {
          <div class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-black text-[9px] shadow-md flex items-center gap-1 z-20">
            <span>✦</span>
            <span>Muestra HD</span>
          </div>
        }

        <!-- OVERLAY DE HOVER SUGIRIENDO EXPANDIR -->
        <div class="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/90 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
          <span>🔍</span>
          <span>Ver 4K</span>
        </div>
      </div>

      <!-- PIE DE TARJETA POLAROID: NÚMERO, PRECIO Y BOTÓN ELECCIÓN -->
      <div class="relative z-40 flex items-center justify-between pt-3 px-1 mt-1">
        <div>
          <span class="text-[11px] font-bold text-zinc-800 block">
            Foto #{{ index() + 1 }}
          </span>
          <span class="text-[10px] text-zinc-400 font-medium">
            @if (isFreeDownload()) {
              4K Original • Incluida Gratis
            } @else {
              4K Original • \${{ unitPrice().toLocaleString('es-AR') }} ARS
            }
          </span>
        </div>

        <!-- BOTÓN DE ACCIÓN / SELECCIÓN -->
        @if (!isFreeDownload()) {
          <button
            type="button"
            (click)="onSelectClicked($event)"
            [class]="isSelected()
              ? 'relative z-50 pointer-events-auto cursor-pointer px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white font-extrabold text-xs flex items-center gap-1 shadow-md transition-all active:scale-90 animate-check-pop'
              : 'relative z-50 pointer-events-auto cursor-pointer px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs flex items-center gap-1 transition-all active:scale-90'"
            [attr.aria-label]="isSelected() ? 'Quitar foto de la selección' : 'Elegir foto para comprar'"
          >
            @if (isSelected()) {
              <span>✓ Elegida</span>
            } @else {
              <span>+ Elegir</span>
            }
          </button>
        } @else {
          <div class="flex items-center gap-1.5">
            <a
              [href]="freeDownloadUrl()"
              [download]="'LA_TERCERA_' + photo().id + '.jpg'"
              (click)="$event.stopPropagation()"
              class="relative z-50 pointer-events-auto cursor-pointer px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-sm transition-all active:scale-95"
              [attr.aria-label]="'Descargar foto ' + (index() + 1) + ' en máxima calidad HD'"
              title="Descargar foto HD gratis"
            >
              <span>⬇️ Descargar HD</span>
            </a>
            <button
              type="button"
              (click)="onViewClicked($event)"
              class="relative z-50 pointer-events-auto cursor-pointer p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs flex items-center justify-center transition-all active:scale-90"
              [attr.aria-label]="'Ver foto ' + (index() + 1) + ' en máxima calidad'"
              title="Ver en pantalla completa"
            >
              <span>🔍</span>
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

    /* Efecto de Reflejo Gloss de Papel Fotográfico Satinado (completamente transparente a eventos del ratón/touch) */
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
