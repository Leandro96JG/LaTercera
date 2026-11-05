import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">
      <!-- Tarjeta Perfil de la Fotógrafa (Grande) -->
      <div class="md:col-span-7 bg-white rounded-[32px] p-6 sm:p-8 border border-black/[0.05] shadow-bento flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        <!-- Foto de la fotógrafa en marco bento con micro-borde -->
        <div class="w-32 h-32 sm:w-44 sm:h-44 rounded-2xl sm:rounded-[26px] overflow-hidden flex-shrink-0 shadow-md border-2 border-white ring-1 ring-black/[0.05]">
          <img
            src="assets/branding/fotografa.jpg"
            alt="Fotógrafa Jenifer 'Yuyo' Espeche"
            class="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500 ease-out"
          />
        </div>

        <div class="flex-1 text-center sm:text-left">
          <!-- Insignia de Disponibilidad con Micro-pulso -->
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-900 text-xs font-semibold mb-3">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span>Disponible para coberturas en La Rioja</span>
          </div>

          <h1 class="font-display font-black text-2xl sm:text-3xl text-zinc-950 tracking-tight leading-tight">
            Jenifer "Yuyo" Espeche
          </h1>
          <p class="text-xs sm:text-sm font-semibold text-zinc-500 mt-1">
            Fotografía deportiva y social • La Tercera
          </p>

          <p class="text-xs sm:text-sm text-zinc-600 mt-2.5 leading-relaxed max-w-xl">
            Capturando la pasión del fútbol, hockey y básquet riojano a ras de cancha, y la emoción inolvidable de tus cumpleaños, fiestas y eventos especiales.
          </p>

          <!-- Redes Sociales y Contacto Directo -->
          <div class="flex items-center justify-center sm:justify-start gap-2.5 mt-4 pt-3.5 border-t border-black/[0.05] flex-wrap">
            <a
              href="https://www.instagram.com/la.tercera.es/"
              target="_blank"
              rel="noopener noreferrer"
              class="min-h-[40px] px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 text-xs font-semibold flex items-center gap-2 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-950"
              aria-label="Seguir a Jenifer en Instagram"
            >
              <svg class="w-4 h-4 text-zinc-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
              <span>Instagram</span>
            </a>
            <a
              href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Te%20escribo%20desde%20la%20p%C3%A1gina%20de%20La%20Tercera"
              target="_blank"
              rel="noopener noreferrer"
              class="min-h-[40px] px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 text-xs font-semibold flex items-center gap-2 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-950"
              aria-label="Escribir por WhatsApp a Jenifer"
            >
              <svg class="w-4 h-4 text-emerald-600 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>WhatsApp (3804-868714)</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Tarjeta Disciplinas & Coberturas (Bento Oscuro) -->
      <div class="md:col-span-5 bg-surface-darkCard text-white rounded-[32px] p-6 sm:p-8 shadow-bento flex flex-col justify-between border border-white/5 relative overflow-hidden">
        <div>
          <span class="text-xs font-medium text-zinc-400 block mb-1.5">Coberturas fotográficas</span>
          <h2 class="font-display font-black text-xl sm:text-2xl text-white tracking-tight">¿Qué eventos cubro?</h2>
          <p class="text-xs text-zinc-400 mt-1 leading-relaxed">
            Presencia en cancha durante todo el torneo o cobertura de tus eventos privados.
          </p>
        </div>

        <!-- Bento Grid de Disciplinas con Iconografía Específica -->
        <div class="grid grid-cols-2 gap-2.5 my-5">
          <div class="bg-surface-darkPill p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1 transition-colors hover:border-white/10">
            <div class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="m4.93 4.93 4.24 4.24"/>
                <path d="m14.83 9.17 4.24-4.24"/>
                <path d="m14.83 14.83 4.24 4.24"/>
                <path d="m9.17 14.83-4.24 4.24"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span class="text-xs font-bold text-white">Fútbol & Cancha</span>
            </div>
            <span class="text-[11px] text-zinc-400">Torneos y ligas locales</span>
          </div>

          <div class="bg-surface-darkPill p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1 transition-colors hover:border-white/10">
            <div class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/>
                <path d="M2.1 12h19.8"/>
                <path d="M12 2.1a15 15 0 0 1 0 19.8"/>
                <path d="M12 2.1a15 15 0 0 0 0 19.8"/>
              </svg>
              <span class="text-xs font-bold text-white">Hockey & Básquet</span>
            </div>
            <span class="text-[11px] text-zinc-400">Acción y retratos</span>
          </div>

          <div class="bg-surface-darkPill p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1 transition-colors hover:border-white/10">
            <div class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
              </svg>
              <span class="text-xs font-bold text-white">Cumpleaños & 15s</span>
            </div>
            <span class="text-[11px] text-zinc-400">Momentos inolvidables</span>
          </div>

          <div class="bg-surface-darkPill p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1 transition-colors hover:border-white/10">
            <div class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-yellow-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
              <span class="text-xs font-bold text-white">Premiaciones & Podios</span>
            </div>
            <span class="text-[11px] text-zinc-400">Festejos y podios</span>
          </div>
        </div>

        <!-- Botón de Presupuesto con Voz Activa (Sin flecha genérica de IA) -->
        <a
          href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Quiero%20pedir%20presupuesto%20para%20la%20cobertura%20de%20un%20evento"
          target="_blank"
          rel="noopener noreferrer"
          class="w-full min-h-[44px] py-3 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm text-center transition active:scale-[0.98] shadow-md flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          <svg class="w-4 h-4 text-emerald-600 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>Pedir presupuesto para mi evento</span>
        </a>
      </div>
    </section>
  `
})
export class HeroComponent {}
