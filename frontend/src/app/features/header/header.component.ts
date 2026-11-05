import { Component, ChangeDetectionStrategy, output, input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-black/[0.06]">
      <!-- Logo Oficial y Marca de La Tercera -->
      <button
        type="button"
        (click)="goHome.emit()"
        class="flex items-center gap-3.5 group text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 transition"
      >
        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-zinc-950 p-1 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
          <img
            src="assets/branding/logo_la_tercera.jpg"
            alt="Logo La Tercera"
            class="w-full h-full object-cover rounded-xl"
          />
        </div>
        <div>
          <span class="font-display font-black text-xl sm:text-2xl tracking-tight text-zinc-950 block leading-tight">
            LA TERCERA
          </span>
          <span class="text-xs text-zinc-500 font-medium tracking-normal">
            Fotografía deportiva y social • La Rioja
          </span>
        </div>
      </button>

      <!-- Navegación & Acciones Ergonomicas (Mobile & Desktop) -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Navegación Administrativa (Solo visible para sesiones autenticadas) -->
        @if (isAuthenticated()) {
          <div class="bg-zinc-200/70 p-1 rounded-2xl flex items-center text-xs font-semibold">
            <button
              type="button"
              (click)="changeView.emit('portfolio')"
              [class]="currentView() === 'portfolio' ? 'px-3.5 py-1.5 rounded-xl bg-white text-zinc-950 shadow-xs transition' : 'px-3.5 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-950 transition'"
            >
              Portfolio & Álbumes
            </button>
            <button
              type="button"
              (click)="changeView.emit('admin')"
              [class]="currentView() === 'admin' ? 'px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white shadow-xs transition' : 'px-3.5 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-950 transition'"
            >
              Panel Fotógrafa
            </button>
          </div>

          <button
            type="button"
            (click)="logout.emit()"
            class="min-h-[44px] px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200/60 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500"
            title="Cerrar sesión de fotógrafa"
          >
            Salir
          </button>
        }

        <!-- Botón Recuperar Fotos Compradas (Mis Compras) -->
        <button
          type="button"
          (click)="openRecoveryModal.emit()"
          class="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white hover:bg-zinc-100 border border-black/[0.06] flex items-center gap-2 text-zinc-900 text-xs font-semibold shadow-xs transition active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-950"
          title="Recuperar fotos de compras anteriores"
          aria-label="Recuperar fotos de compras anteriores"
        >
          <svg class="w-4 h-4 text-zinc-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
            <path d="M16 8h-8"/>
            <path d="M16 12h-8"/>
            <path d="M13 16h-5"/>
          </svg>
          <span>Mis Compras</span>
        </button>

        <!-- Botón Contacto WhatsApp para Contrataciones -->
        <a
          href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Me%20gustar%C3%ADa%20consultar%20por%20cobertura%20fotogr%C3%A1fica%20para%20un%20evento"
          target="_blank"
          rel="noopener noreferrer"
          class="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white hover:bg-zinc-100 border border-black/[0.06] flex items-center gap-2 text-zinc-900 text-xs font-semibold shadow-xs transition active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-950"
          aria-label="Contactar a Yuyo por WhatsApp para coberturas de eventos"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <svg class="w-4 h-4 text-emerald-600 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>Contratar a Yuyo</span>
        </a>
      </div>
    </header>
  `
})
export class HeaderComponent {
  public readonly currentView = input<'portfolio' | 'album' | 'admin' | 'admin-login' | 'payment-success'>('portfolio');
  public readonly isAuthenticated = input<boolean>(false);
  public readonly goHome = output<void>();
  public readonly changeView = output<'portfolio' | 'admin'>();
  public readonly logout = output<void>();
  public readonly openRecoveryModal = output<void>();
}
