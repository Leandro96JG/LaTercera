import { Component, ChangeDetectionStrategy, signal, computed, inject, DestroyRef, PLATFORM_ID, input, output } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Album } from '../../core/models/album.model';

export interface ShowcaseSlide {
  readonly url: string;
  readonly title: string;
  readonly subtitle: string;
  readonly album?: Album;
}

@Component({
  selector: 'app-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes slideUpFade {
      0% {
        opacity: 0;
        transform: translateY(10px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-slide-rotator {
      animation: slideUpFade 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `],
  template: `
    <section class="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 mb-8 max-w-full overflow-x-hidden">
      <!-- 1. CAJA PRINCIPAL DE PRESENTACIÓN (Blanca) - 7 Columnas en Desktop -->
      <div class="lg:col-span-7 bg-white rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 lg:p-8 border border-black/[0.05] shadow-bento flex flex-col justify-between h-full relative overflow-hidden animate-stagger-fade-in">
        <div>
          <!-- Badge Superior: Disponibilidad en La Rioja -->
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-900 text-xs font-semibold mb-3.5 max-w-full">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span class="truncate">Disponible en La Rioja, Argentina 🇦🇷</span>
          </div>

          <!-- Cabecera de Perfil Responsiva (Mobile: horizontal compacta / Desktop: amplia) -->
          <div class="flex items-center sm:items-start gap-4 sm:gap-6">
            <!-- Foto de Jenifer -->
            <div class="w-20 h-20 sm:w-36 sm:h-36 rounded-2xl sm:rounded-[26px] overflow-hidden shrink-0 shadow-md border-2 border-white ring-1 ring-black/[0.05]">
              <img
                src="assets/branding/fotografa.jpg"
                alt="Fotógrafa Jenifer 'Yuyo' Espeche"
                class="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500 ease-out"
              />
            </div>

            <!-- Identidad y Subtítulo -->
            <div class="flex-1 min-w-0">
              <h1 class="font-display font-black text-xl sm:text-2xl lg:text-3xl text-zinc-950 tracking-tight leading-tight truncate sm:whitespace-normal">
                Jenifer "Yuyo" Espeche
              </h1>
              <p class="text-xs sm:text-sm font-semibold text-zinc-500 mt-0.5 sm:mt-1">
                Fotografía Deportiva y Social • La Tercera
              </p>

              <!-- Texto Dinámico (Text Rotator) en Desktop (o visible en mobile abajo) -->
              <div class="hidden sm:inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-xl bg-zinc-100/90 border border-zinc-200/60 text-xs sm:text-sm font-medium text-zinc-700">
                <span class="text-zinc-500 shrink-0">Buscá tus fotos de</span>
                @for (category of [currentCategory()]; track currentCategoryIndex()) {
                  <span class="font-bold text-zinc-950 min-w-[110px] inline-block animate-slide-rotator">
                    {{ category }}
                  </span>
                }
              </div>
            </div>
          </div>

          <!-- Texto Dinámico en Mobile (visible solo en pantallas pequeñas) -->
          <div class="sm:hidden flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl bg-zinc-100/90 border border-zinc-200/60 text-xs font-medium text-zinc-700 w-fit max-w-full">
            <span class="text-zinc-500 shrink-0">Buscá tus fotos de</span>
            @for (category of [currentCategory()]; track currentCategoryIndex()) {
              <span class="font-bold text-zinc-950 truncate inline-block animate-slide-rotator">
                {{ category }}
              </span>
            }
          </div>

          <!-- Copy Corregido con Tipografía Intencional -->
          <p class="text-xs sm:text-sm lg:text-base text-zinc-600 mt-3 sm:mt-4 leading-relaxed max-w-xl">
            Transformando momentos efímeros en imágenes permanentes para que cada recuerdo sea inolvidable.
          </p>
        </div>

        <!-- Botones de Acción (Adaptados al pulgar en Mobile) -->
        <div class="mt-5 pt-4 border-t border-black/[0.05] flex flex-col gap-2.5">
          <!-- CTA Primario: Ancho completo en mobile, destacado con fondo oscuro -->
          <a
            href="#catalogo-albumes"
            (click)="scrollToGalleries($event)"
            class="w-full sm:w-fit min-h-[46px] py-3.5 px-6 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-2.5 shadow-md transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          >
            <svg class="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <span>Ver Galerías y Buscar mis Fotos</span>
          </a>

          <!-- CTAs Secundarios: Grilla de 2 columnas en mobile para no desbordar -->
          <div class="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full">
            <!-- Instagram -->
            <a
              href="https://www.instagram.com/la.tercera.es/"
              target="_blank"
              rel="noopener noreferrer"
              class="min-h-[42px] px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-950"
              aria-label="Seguir a Jenifer en Instagram"
            >
              <svg class="w-4 h-4 text-pink-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
              <span class="truncate">Instagram</span>
            </a>

            <!-- WhatsApp -->
            <a
              href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Te%20escribo%20desde%20la%20p%C3%A1gina%20de%20La%20Tercera"
              target="_blank"
              rel="noopener noreferrer"
              class="min-h-[42px] px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-950"
              aria-label="Escribir por WhatsApp a Jenifer"
            >
              <svg class="w-4 h-4 text-emerald-600 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <!-- En mobile 'WhatsApp', en desktop 'WhatsApp (3804-868714)' -->
              <span class="sm:hidden truncate">WhatsApp</span>
              <span class="hidden sm:inline truncate">WhatsApp (3804-868714)</span>
            </a>
          </div>
        </div>
      </div>

      <!-- 2. CAJA DE MUESTRA VISUAL (Destacados / Carrusel) - 5 Columnas en Desktop -->
      <div
        class="lg:col-span-5 h-48 sm:h-64 lg:h-full lg:min-h-[320px] rounded-[28px] sm:rounded-[32px] overflow-hidden relative shadow-bento border border-black/[0.05] bg-zinc-950 flex flex-col justify-between p-4 sm:p-6 animate-stagger-fade-in group cursor-pointer"
        (click)="onSlideClick(activeSlide())"
        title="Ver cobertura"
      >
        <!-- Diapositivas con efecto Ken Burns (Zoom Lento) -->
        @for (slide of slides(); track slide.url; let idx = $index) {
          <div
            class="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
            [class.opacity-100]="currentSlideIndex() === idx"
            [class.opacity-0]="currentSlideIndex() !== idx"
          >
            <img
              [src]="slide.url"
              [alt]="slide.title"
              class="w-full h-full object-cover transition-transform duration-[4000ms] ease-out will-change-transform"
              [class.scale-105]="currentSlideIndex() === idx"
              [class.scale-100]="currentSlideIndex() !== idx"
              [attr.loading]="idx === 0 ? 'eager' : 'lazy'"
              [attr.fetchpriority]="idx === 0 ? 'high' : 'auto'"
            />
          </div>
        }

        <!-- Capa de Sombra y Gradiente para Legibilidad Absoluta -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40 pointer-events-none"></div>

        <!-- Badge Flotante en Vidrio Esmerilado -->
        <div class="relative z-10 backdrop-blur-md bg-black/45 border border-white/20 text-white text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 w-fit shadow-md">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>📸 Últimas coberturas subidas</span>
        </div>

        <!-- Controles Inferiores e Información de la Diapositiva -->
        <div class="relative z-10 flex items-end justify-between gap-3">
          <!-- Título Dinámico de la Cobertura Activa -->
          <div class="text-white">
            <span class="text-[10px] sm:text-xs uppercase tracking-wider text-amber-300 font-bold block">
              {{ activeSlide().subtitle }}
            </span>
            <span class="font-display font-bold text-sm sm:text-base lg:text-lg block drop-shadow-sm leading-tight">
              {{ activeSlide().title }}
            </span>
          </div>

          <!-- Indicadores de Diapositiva (Pills interactivos) -->
          <div class="flex items-center gap-1.5" role="tablist" aria-label="Indicadores de carrusel" (click)="$event.stopPropagation()">
            @for (slide of slides(); track slide.url; let idx = $index) {
              <button
                type="button"
                (click)="goToSlide(idx)"
                [class]="currentSlideIndex() === idx ? 'w-5 sm:w-6 h-1.5 rounded-full bg-amber-400 transition-all duration-300' : 'w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/80 transition-all duration-300'"
                [attr.aria-label]="'Ver cobertura ' + (idx + 1)"
              ></button>
            }
          </div>
        </div>
      </div>

      <!-- 3. BLOQUE OSCURO DE COBERTURAS (#111111) - 12 Columnas en Desktop -->
      <div class="lg:col-span-12 bg-[#111111] text-white rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 lg:p-7 shadow-bento border border-white/5 relative overflow-hidden animate-stagger-fade-in">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div>
            <span class="text-[11px] font-semibold text-zinc-400 block mb-0.5">Coberturas fotográficas</span>
            <h2 class="font-display font-black text-lg sm:text-xl lg:text-2xl text-white tracking-tight">
              ¿Qué eventos cubro?
            </h2>
            <p class="text-xs text-zinc-400 mt-0.5">
              Eventos deportivos y sociales
            </p>
          </div>

          <!-- Selector de Pestañas en Mobile (Solución Anti-Scroll Eterno < 1024px) -->
          <div class="flex lg:hidden bg-zinc-900/90 p-1 rounded-2xl border border-white/10 w-full sm:w-auto">
            <button
              type="button"
              (click)="setCoverageTab('deportivos')"
              [class]="selectedCoverageTab() === 'deportivos' ? 'flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs shadow-sm transition' : 'flex-1 sm:flex-none px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-semibold text-xs transition'"
            >
              ⚽ Deportivos
            </button>
            <button
              type="button"
              (click)="setCoverageTab('sociales')"
              [class]="selectedCoverageTab() === 'sociales' ? 'flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs shadow-sm transition' : 'flex-1 sm:flex-none px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-semibold text-xs transition'"
            >
              ✨ Sociales
            </button>
          </div>

          <!-- Botón de Presupuesto en Desktop (Alineado a la derecha) -->
          <a
            href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Quiero%20pedir%20presupuesto%20para%20la%20cobertura%20de%20un%20evento"
            target="_blank"
            rel="noopener noreferrer"
            class="hidden lg:flex min-h-[44px] py-2.5 px-5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm items-center gap-2 transition active:scale-[0.98] shadow-md focus-visible:ring-2 focus-visible:ring-white shrink-0"
          >
            <svg class="w-4 h-4 text-emerald-600 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>Pedir presupuesto para mi evento</span>
          </a>
        </div>

        <!-- Vista de Chips en Desktop (Lado a Lado en 2 Columnas) -->
        <div class="hidden lg:grid lg:grid-cols-2 gap-6 my-4">
          <!-- Columna Deportivos -->
          <div>
            <div class="flex items-center gap-2 mb-2.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span class="text-xs font-bold text-white uppercase tracking-wider">Deportivos: Cancha & Torneos</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Fútbol
              </span>
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="M2.1 12h19.8"/><path d="M12 2.1a15 15 0 0 1 0 19.8"/><path d="M12 2.1a15 15 0 0 0 0 19.8"/>
                </svg>
                Básquet
              </span>
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 3 8 15a3 3 0 0 0 4.24 4.24L20 11"/><circle cx="5" cy="19" r="2"/>
                </svg>
                Hockey
              </span>
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 hover:-translate-y-0.5 hover:border-teal-400/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="m5 13 4-2 7 7"/><path d="m19 11-4 2-7-7"/><path d="M12 2v20"/>
                </svg>
                Vóley
              </span>
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-emerald-300 flex items-center gap-1.5 hover:-translate-y-0.5 hover:border-emerald-300/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                + Otras disciplinas
              </span>
            </div>
          </div>

          <!-- Columna Sociales -->
          <div>
            <div class="flex items-center gap-2 mb-2.5">
              <span class="w-2 h-2 rounded-full bg-pink-400"></span>
              <span class="text-xs font-bold text-white uppercase tracking-wider">Sociales: Fiestas & Familias</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 hover:-translate-y-0.5 hover:border-pink-400/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><circle cx="7" cy="4" r="1"/><circle cx="12" cy="4" r="1"/><circle cx="17" cy="4" r="1"/>
                </svg>
                Cumpleaños
              </span>
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 2v20"/><path d="M7 7h10"/>
                </svg>
                Comuniones
              </span>
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
                </svg>
                Bautismos
              </span>
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 hover:-translate-y-0.5 hover:border-purple-400/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
                Egresos
              </span>
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 hover:-translate-y-0.5 hover:border-rose-400/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>
                </svg>
                Casamientos
              </span>
              <span class="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-pink-300 flex items-center gap-1.5 hover:-translate-y-0.5 hover:border-pink-300/40 hover:bg-white/[0.09] transition-all duration-200 cursor-default">
                <svg class="w-3.5 h-3.5 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                + Eventos privados
              </span>
            </div>
          </div>
        </div>

        <!-- Vista de Chips en Mobile (< 1024px) con Tabs Interactivos (Ocupa menos de media pantalla) -->
        <div class="lg:hidden my-3">
          @if (selectedCoverageTab() === 'deportivos') {
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <span class="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <span class="truncate">Fútbol</span>
              </span>
              <span class="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="M2.1 12h19.8"/><path d="M12 2.1a15 15 0 0 1 0 19.8"/><path d="M12 2.1a15 15 0 0 0 0 19.8"/>
                </svg>
                <span class="truncate">Básquet</span>
              </span>
              <span class="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 3 8 15a3 3 0 0 0 4.24 4.24L20 11"/><circle cx="5" cy="19" r="2"/>
                </svg>
                <span class="truncate">Hockey</span>
              </span>
              <span class="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-teal-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="m5 13 4-2 7 7"/><path d="m19 11-4 2-7-7"/><path d="M12 2v20"/>
                </svg>
                <span class="truncate">Vóley</span>
              </span>
              <span class="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/[0.06] border border-emerald-400/30 text-xs font-medium text-emerald-300 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span class="truncate">+ Otras disciplinas</span>
              </span>
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <span class="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-pink-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><circle cx="7" cy="4" r="1"/><circle cx="12" cy="4" r="1"/><circle cx="17" cy="4" r="1"/>
                </svg>
                <span class="truncate">Cumpleaños</span>
              </span>
              <span class="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-amber-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 2v20"/><path d="M7 7h10"/>
                </svg>
                <span class="truncate">Comuniones</span>
              </span>
              <span class="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
                </svg>
                <span class="truncate">Bautismos</span>
              </span>
              <span class="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
                <span class="truncate">Egresos</span>
              </span>
              <span class="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>
                </svg>
                <span class="truncate">Casamientos</span>
              </span>
              <span class="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/[0.06] border border-pink-400/30 text-xs font-medium text-pink-300 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-pink-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span class="truncate">+ Eventos privados</span>
              </span>
            </div>
          }
        </div>

        <!-- Botón de Presupuesto en Mobile (Ancho Completo en la base) -->
        <div class="mt-4 pt-3 border-t border-white/10 lg:hidden">
          <a
            href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Quiero%20pedir%20presupuesto%20para%20la%20cobertura%20de%20un%20evento"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full min-h-[44px] py-3 px-4 rounded-xl sm:rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg class="w-4 h-4 text-emerald-600 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>Pedir presupuesto para mi evento</span>
          </a>
        </div>
      </div>
    </section>
  `
})
export class HeroComponent {
  // Rotador de categorías dinámico
  readonly rotatingCategories: readonly string[] = [
    'Fútbol',
    'Básquet',
    'Hockey',
    'Vóley',
    'Eventos Sociales'
  ];
  readonly currentCategoryIndex = signal<number>(0);
  readonly currentCategory = computed<string>(() => this.rotatingCategories[this.currentCategoryIndex()]);

  // Entrada opcional de álbumes reales y salida de selección
  readonly albums = input<readonly Album[]>([]);
  readonly selectAlbum = output<Album>();

  // Slides de muestra predeterminados (Fallback estético si no hay coberturas cargadas)
  readonly defaultSlides: readonly ShowcaseSlide[] = [
    {
      url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80',
      title: 'Fútbol en Cancha',
      subtitle: 'Torneos y Ligas Locales'
    },
    {
      url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=80',
      title: 'Básquet Riojano',
      subtitle: 'Acción y Retratos'
    },
    {
      url: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=1000&q=80',
      title: 'Hockey Provincial',
      subtitle: 'Momentos Clave'
    },
    {
      url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80',
      title: 'Eventos Sociales',
      subtitle: 'Quinceañeras y Fiestas'
    },
    {
      url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1000&q=80',
      title: 'Vóley en Vivo',
      subtitle: 'Remates y Festejos'
    }
  ];

  // Opción C: Prioriza álbumes destacados (isHeroFeatured), rellena con los más recientes publicados
  readonly slides = computed<readonly ShowcaseSlide[]>(() => {
    const list = (this.albums() || []).filter(a => a.isPublished !== false && !!a.coverUrl);
    if (!list.length) {
      return this.defaultSlides;
    }

    const featured = list.filter(a => a.isHeroFeatured);
    const nonFeatured = list.filter(a => !a.isHeroFeatured);
    const combined = [...featured, ...nonFeatured].slice(0, 5);

    if (!combined.length) {
      return this.defaultSlides;
    }

    return combined.map(album => ({
      url: album.coverUrl,
      title: album.title,
      subtitle: album.badge || album.category || 'Cobertura Destacada',
      album
    }));
  });

  readonly currentSlideIndex = signal<number>(0);
  readonly activeSlide = computed<ShowcaseSlide>(() => {
    const currentList = this.slides();
    const idx = this.currentSlideIndex();
    return currentList[idx] || currentList[0] || this.defaultSlides[0];
  });

  // Tabs de Coberturas en Móvil (< 1024px)
  readonly selectedCoverageTab = signal<'deportivos' | 'sociales'>('deportivos');

  constructor() {
    const platformId = inject(PLATFORM_ID);
    const destroyRef = inject(DestroyRef);

    if (isPlatformBrowser(platformId)) {
      // Rotador de texto cada 2.5s (2500ms)
      const rotatorInterval = setInterval(() => {
        this.currentCategoryIndex.update(idx => (idx + 1) % this.rotatingCategories.length);
      }, 2500);

      // Carrusel de imágenes cada 3.5s (3500ms)
      const carouselInterval = setInterval(() => {
        const total = this.slides().length;
        if (total > 0) {
          this.currentSlideIndex.update(idx => (idx + 1) % total);
        }
      }, 3500);

      destroyRef.onDestroy(() => {
        clearInterval(rotatorInterval);
        clearInterval(carouselInterval);
      });
    }
  }

  setCoverageTab(tab: 'deportivos' | 'sociales'): void {
    this.selectedCoverageTab.set(tab);
  }

  goToSlide(index: number): void {
    const total = this.slides().length;
    if (index >= 0 && index < total) {
      this.currentSlideIndex.set(index);
    }
  }

  onSlideClick(slide: ShowcaseSlide): void {
    if (slide.album) {
      this.selectAlbum.emit(slide.album);
    } else {
      this.scrollToGalleries();
    }
  }

  scrollToGalleries(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const element = document.getElementById('catalogo-albumes');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
