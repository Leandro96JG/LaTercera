import { Component, ChangeDetectionStrategy, output, input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-black/[0.05]">
      <!-- Logo Oficial -->
      <button (click)="goHome.emit()" class="flex items-center gap-3.5 group text-left focus:outline-none">
        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-zinc-950 p-1.5 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
          <img src="assets/branding/logo_la_tercera.jpg" alt="Logo La Tercera" class="w-full h-full object-cover rounded-xl">
        </div>
        <div>
          <span class="font-display font-black text-xl sm:text-2xl tracking-tight text-zinc-900 block leading-tight">
            LA TERCERA
          </span>
          <span class="text-[11px] text-zinc-400 font-medium tracking-wide">Fotografía Profesional • Deportes & Eventos</span>
        </div>
      </button>

      <!-- Navegación Minimalista -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <div class="bg-zinc-200/70 p-1 rounded-2xl flex items-center text-xs font-semibold">
          <button
            (click)="changeView.emit('portfolio')"
            [class]="currentView() === 'portfolio' ? 'px-3.5 py-1.5 rounded-xl bg-white text-zinc-900 shadow-sm transition' : 'px-3.5 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-950 transition'"
          >
            Portfolio & Álbumes
          </button>
          <button
            (click)="changeView.emit('admin')"
            [class]="currentView() === 'admin' ? 'px-3.5 py-1.5 rounded-xl bg-white text-zinc-900 shadow-sm transition' : 'px-3.5 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-950 transition'"
          >
            Panel Fotógrafa
          </button>
        </div>

        <!-- Botón Contacto WhatsApp para Contrataciones -->
        <a
          href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Me%20gustar%C3%ADa%20consultar%20por%20cobertura%20fotogr%C3%A1fica%20para%20un%20evento"
          target="_blank"
          rel="noopener noreferrer"
          class="px-3.5 py-2 rounded-2xl bg-white hover:bg-zinc-100 border border-black/[0.06] flex items-center gap-2 text-zinc-800 text-xs font-semibold shadow-sm transition active:scale-95"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Contratar a Yuyo</span>
        </a>
      </div>
    </header>
  `
})
export class HeaderComponent {
  public readonly currentView = input<'portfolio' | 'album' | 'admin'>('portfolio');
  public readonly goHome = output<void>();
  public readonly changeView = output<'portfolio' | 'admin'>();
}
