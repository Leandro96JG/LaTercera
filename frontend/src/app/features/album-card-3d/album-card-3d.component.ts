import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed
} from '@angular/core';
import { Album } from '../../core/models/album.model';
import { AlbumTone, AlbumToneTokens, resolveAlbumTone } from './album-tone';

const TONE_TOKENS: Record<AlbumTone, AlbumToneTokens> = {
  sport: {
    meta: 'text-amber-700',
    titleHover: 'sm:group-hover:text-amber-700',
    divider: 'divider-ticket',
    packBox: 'bg-amber-50 border-amber-300',
    packLabel: 'text-amber-800',
    ctaHover: 'sm:group-hover:bg-amber-400 sm:group-hover:text-zinc-950'
  },
  social: {
    meta: 'text-rose-700',
    titleHover: 'sm:group-hover:text-rose-700',
    divider: 'divider-elegant',
    packBox: 'bg-rose-50 border-rose-200',
    packLabel: 'text-rose-700',
    ctaHover: 'sm:group-hover:bg-rose-700 sm:group-hover:text-white'
  },
  neutral: {
    meta: 'text-zinc-700',
    titleHover: 'sm:group-hover:text-zinc-950',
    divider: 'divider-plain',
    packBox: 'bg-zinc-100 border-zinc-300',
    packLabel: 'text-zinc-700',
    ctaHover: 'sm:group-hover:bg-zinc-800 sm:group-hover:text-white'
  }
};

const NEW_ALBUM_WINDOW_MS = 72 * 60 * 60 * 1000;

@Component({
  selector: 'app-album-card-3d',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block h-full animate-stagger-fade-in',
    '[style.animation-delay]': 'staggerDelay()'
  },
  template: `
    <article
      class="album-card-root group h-full flex flex-col bg-white rounded-3xl border border-black/[0.06]
             shadow-bento overflow-hidden cursor-pointer outline-none
             transition-[transform,box-shadow] duration-300 ease-out
             active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      [class.ring-2]="isSelected()"
      [class.ring-zinc-950]="isSelected()"
      [style.view-transition-name]="viewTransitionName()"
      role="button"
      tabindex="0"
      [attr.aria-label]="ariaLabel()"
      (click)="handleAction($event)"
      (keydown.enter)="handleAction($event)"
      (keydown.space)="$event.preventDefault(); handleAction($event)"
    >
      <!-- MEDIA: proporción fija 16:10, imagen absolute -->
      <div class="relative aspect-[16/10] bg-zinc-200 overflow-hidden">
        <img
          [src]="album().coverUrl"
          [alt]="isLocked() ? 'Portada protegida de álbum privado' : 'Portada de ' + album().title"
          width="640"
          height="400"
          [attr.loading]="index() < 2 ? 'eager' : 'lazy'"
          [attr.fetchpriority]="index() === 0 ? 'high' : null"
          decoding="async"
          draggable="false"
          (contextmenu)="$event.preventDefault()"
          class="cover-img absolute inset-0 w-full h-full object-cover transition-[transform,filter] duration-500 ease-out"
          [class.is-locked]="isLocked()"
        />

        <!-- Álbum privado bloqueado: velo visual + sello central -->
        @if (isLocked()) {
          <div class="absolute inset-0 bg-zinc-950/35 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
            <span class="w-11 h-11 rounded-full bg-white/90 text-zinc-950 flex items-center justify-center shadow-lg">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <span class="text-[11px] font-bold text-white tracking-wide drop-shadow">Álbum privado</span>
          </div>
        }

        <!-- Velo suave solo arriba para legibilidad de chips -->
        <div class="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent pointer-events-none"></div>

        <!-- Chips superiores -->
        <div class="absolute top-2.5 inset-x-2.5 flex items-start justify-between gap-2">
          <span class="flex items-center gap-1.5">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-black/45 backdrop-blur-sm border border-white/20">
              {{ categoryLabel() }}
            </span>
            @if (isNew()) {
              <span class="px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm bg-amber-400 text-zinc-950">
                NUEVO
              </span>
            }
          </span>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono text-white bg-black/45 backdrop-blur-sm border border-white/20 shrink-0">
            {{ album().photosCount }} fotos
          </span>
        </div>

        <!-- Chip de estado inferior (solo uno, por prioridad) -->
        @if (isLocked()) {
          <span class="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm bg-zinc-950/80 text-white">
            🔒 PRIVADO
          </span>
        } @else if (album().isFreeDownload) {
          <span class="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm bg-amber-400 text-zinc-950">
            ★ GRATIS HD
          </span>
        } @else if (album().isPrivate) {
          <span class="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm bg-emerald-500 text-zinc-950">
            DESBLOQUEADO
          </span>
        }
      </div>

      <!-- BODY -->
      <div class="flex-1 flex flex-col px-4 pt-3.5 pb-4 gap-1">
        <p
          class="text-[11px] font-bold uppercase tracking-wide line-clamp-1"
          [class]="toneTokens().meta"
        >
          {{ metaLine() }}
        </p>
        <h3
          class="font-display text-[17px] leading-snug font-extrabold text-zinc-950 line-clamp-2 min-h-[2.75rem] transition-colors"
          [class]="toneTokens().titleHover"
        >
          {{ album().title }}
        </h3>
        <p class="text-[13px] text-zinc-600 line-clamp-1 min-h-[1.125rem]">
          {{ album().subtitle }}
        </p>

        <!-- Separador según tono -->
        <div class="my-3" [class]="toneTokens().divider" aria-hidden="true">
          @if (tone() === 'social') {
            <span>✦</span>
          }
        </div>

        <!-- PRECIOS: dos cajitas con el mismo peso visual -->
        <div class="mt-auto">
          @if (album().isFreeDownload) {
            <div class="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-center justify-between">
              <span class="text-sm font-black text-amber-800 uppercase tracking-wider">Cortesía Oficial</span>
              <span class="text-xs font-semibold text-amber-900">Descarga HD sin costo</span>
            </div>
          } @else {
            <dl class="grid grid-cols-2 gap-2">
              <div class="price-box rounded-2xl bg-zinc-50 border border-zinc-200 px-3 py-2">
                <dt class="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Por foto</dt>
                <dd class="font-display text-xl font-extrabold text-zinc-950 leading-tight">\${{ formattedUnit() }}</dd>
              </div>
              <div class="price-box rounded-2xl px-3 py-2 border" [class]="toneTokens().packBox">
                <dt class="text-[10px] font-bold uppercase tracking-wider" [class]="toneTokens().packLabel">Álbum completo</dt>
                <dd class="font-display text-xl font-extrabold text-zinc-950 leading-tight">\${{ formattedPack() }}</dd>
                <dd class="text-[10px] font-semibold text-zinc-600">las {{ album().photosCount }} fotos</dd>
              </div>
            </dl>
          }
        </div>

        <!-- CTA visual (el click lo maneja el article; evita <button> anidado) -->
        <span aria-hidden="true" [class]="ctaClasses()">
          @if (isLocked()) {
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>{{ ctaLabel() }}</span>
          } @else {
            <span>{{ ctaLabel() }}</span>
            <svg class="w-4 h-4 shrink-0 transition-transform sm:group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          }
        </span>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    /* sport — separador «ticket»: línea punteada + muescas laterales */
    .divider-ticket {
      position: relative;
      height: 0;
      border-top: 2px dashed rgb(228 228 231);
      margin-inline: -1rem;
    }

    .divider-ticket::before,
    .divider-ticket::after {
      content: '';
      position: absolute;
      top: -9px;
      width: 16px;
      height: 16px;
      border-radius: 9999px;
      background: rgb(250 250 250);
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
    }

    .divider-ticket::before {
      left: -8px;
    }

    .divider-ticket::after {
      right: -8px;
    }

    /* social — línea fina con ✦ centrado */
    .divider-elegant {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: rgb(190 18 60 / 0.55);
      font-size: 10px;
    }

    .divider-elegant::before,
    .divider-elegant::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgb(228 228 231);
    }

    /* neutral */
    .divider-plain {
      height: 1px;
      background: rgb(228 228 231);
    }

    /* Portada de álbum privado bloqueado: blur visual + leve zoom para ocultar bordes nítidos */
    .cover-img.is-locked {
      filter: blur(24px) saturate(0.8);
      transform: scale(1.15);
    }

    @media (hover: hover) and (pointer: fine) {
      .album-card-root:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.12);
      }

      .album-card-root:hover .cover-img:not(.is-locked) {
        transform: scale(1.04);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .album-card-root,
      .album-card-root img {
        transition: none !important;
        transform: none !important;
      }
    }
  `]
})
export class AlbumCard3dComponent {
  // Inputs
  public readonly album = input.required<Album>();
  public readonly index = input<number>(0);
  public readonly isUnlocked = input<boolean>(false);
  public readonly isSelected = input<boolean>(false);

  // Outputs
  public readonly selectAlbum = output<Album>();
  public readonly openPinModal = output<Album>();
  public readonly downloadCourtesyZip = output<Album>();

  // Derivados de presentación y animación
  public readonly staggerDelay = computed<string>(() => ((this.index() % 8) * 45) + 'ms');

  public readonly viewTransitionName = computed<string>(() => 'album-cover-' + this.album().id);

  public readonly isLocked = computed<boolean>(() => !!this.album().isPrivate && !this.isUnlocked());

  public readonly tone = computed<AlbumTone>(() =>
    resolveAlbumTone(this.album().category, this.album().badge || '')
  );

  public readonly toneTokens = computed<AlbumToneTokens>(() => TONE_TOKENS[this.tone()]);

  public readonly categoryLabel = computed<string>(() => {
    const badge = this.album().badge?.trim();
    if (badge) return badge;
    const cat = (this.album().category || 'Evento').trim();
    return '📸 ' + cat.charAt(0).toUpperCase() + cat.slice(1);
  });

  public readonly metaLine = computed<string>(() =>
    [
      this.album().eventDate || this.album().date,
      this.album().eventTime ? `${this.album().eventTime} hs` : null,
      this.album().location || null
    ]
      .filter((value): value is string => !!value)
      .join(' · ')
  );

  public readonly ctaLabel = computed<string>(() => {
    if (this.isLocked()) return 'Ingresar PIN';
    if (this.album().isFreeDownload) return 'Ver y descargar gratis';
    return this.tone() === 'sport' ? 'Ver fotos' : 'Ver fotos del evento';
  });

  public readonly ctaClasses = computed<string>(() => {
    const base =
      'mt-3 min-h-[48px] w-full rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold transition-colors';
    if (this.isLocked()) {
      return `${base} bg-zinc-100 text-zinc-950 sm:group-hover:bg-zinc-200`;
    }
    if (this.album().isFreeDownload) {
      return `${base} bg-amber-400 text-zinc-950 sm:group-hover:bg-amber-300`;
    }
    return `${base} bg-zinc-950 text-white ${this.toneTokens().ctaHover}`;
  });

  public readonly ariaLabel = computed<string>(
    () => `Álbum ${this.album().title}` + (this.isLocked() ? ' (Privado, requiere PIN)' : '')
  );

  public readonly formattedUnit = computed<string>(() =>
    this.album().unitPrice.toLocaleString('es-AR')
  );

  public readonly formattedPack = computed<string>(() =>
    this.album().fullAlbumPrice.toLocaleString('es-AR')
  );

  /** Chip «NUEVO»: el álbum se subió hace menos de 72 h (usa createdAt; si no viene, false). */
  public readonly isNew = computed<boolean>(() => {
    const created = this.album().createdAt;
    if (!created) return false;
    const ms = Date.now() - new Date(created).getTime();
    return ms >= 0 && ms < NEW_ALBUM_WINDOW_MS;
  });

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
