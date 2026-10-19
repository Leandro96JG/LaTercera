import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">
      <!-- Tarjeta Perfil de la Fotógrafa (Grande) -->
      <div class="md:col-span-7 bg-white rounded-[32px] p-6 sm:p-8 border border-black/[0.05] shadow-bento flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        <!-- Foto de la fotógrafa en marco bento -->
        <div class="w-36 h-36 sm:w-44 sm:h-44 rounded-[26px] overflow-hidden flex-shrink-0 shadow-md border-2 border-white">
          <img
            src="assets/branding/fotografa.jpg"
            alt="Fotógrafa Jenifer 'Yuyo' Espeche"
            class="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
          >
        </div>

        <div class="flex-1 text-center sm:text-left">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-semibold mb-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Disponible para Coberturas en La Rioja
          </div>

          <h1 class="font-display font-extrabold text-2xl sm:text-3xl text-zinc-900 tracking-tight leading-tight">
            Jenifer "Yuyo" Espeche
          </h1>
          <p class="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-0.5 mb-2">
            Fotografía Deportiva & Social • La Tercera
          </p>

          <p class="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed">
            Capturando la pasión del fútbol, hockey y básquet riojano a ras de cancha, y la emoción inolvidable de tus cumpleaños, fiestas y eventos especiales.
          </p>

          <!-- Redes Sociales de la Fotógrafa -->
          <div class="flex items-center justify-center sm:justify-start gap-2.5 mt-4 pt-3 border-t border-black/[0.04]">
            <a
              href="https://www.instagram.com/la.tercera.es/"
              target="_blank"
              rel="noopener noreferrer"
              class="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              📷 Instagram
            </a>
            <a
              href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Te%20escribo%20desde%20la%20p%C3%A1gina%20de%20La%20Tercera"
              target="_blank"
              rel="noopener noreferrer"
              class="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              💬 WhatsApp (3804-868714)
            </a>
          </div>
        </div>
      </div>

      <!-- Tarjeta Disciplinas & Coberturas (Bento Oscuro) -->
      <div class="md:col-span-5 bg-surface-darkCard text-white rounded-[32px] p-6 sm:p-8 shadow-bento flex flex-col justify-between">
        <div>
          <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Servicios Fotográficos</span>
          <h3 class="font-display font-bold text-xl sm:text-2xl text-white">¿Qué eventos cubro?</h3>
          <p class="text-xs text-zinc-400 mt-1.5">
            Desde partidos oficiales de fin de semana hasta fiestas privadas.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2.5 my-4">
          <div class="bg-surface-darkPill p-3 rounded-2xl border border-white/5">
            <span class="text-xs font-bold text-white block">⚽ Fútbol & Cancha</span>
            <span class="text-[10px] text-zinc-400">Torneos y ligas locales</span>
          </div>
          <div class="bg-surface-darkPill p-3 rounded-2xl border border-white/5">
            <span class="text-xs font-bold text-white block">🏑 Hockey & Básquet</span>
            <span class="text-[10px] text-zinc-400">Acción y retratos</span>
          </div>
          <div class="bg-surface-darkPill p-3 rounded-2xl border border-white/5">
            <span class="text-xs font-bold text-white block">🎉 Cumpleaños & 15s</span>
            <span class="text-[10px] text-zinc-400">Momentos inolvidables</span>
          </div>
          <div class="bg-surface-darkPill p-3 rounded-2xl border border-white/5">
            <span class="text-xs font-bold text-white block">🏆 Entregas de Premios</span>
            <span class="text-[10px] text-zinc-400">Festejos y podios</span>
          </div>
        </div>

        <a
          href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Quiero%20pedir%20presupuesto%20para%20la%20cobertura%20de%20un%20evento"
          target="_blank"
          rel="noopener noreferrer"
          class="w-full py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs text-center transition active:scale-95 shadow-md"
        >
          Pedir presupuesto para mi evento →
        </a>
      </div>
    </section>
  `
})
export class HeroComponent {}
