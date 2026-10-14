import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { CartStore } from '../../core/state/cart.store';

@Component({
  selector: 'app-floating-cart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cartStore.hasItems()) {
      <aside
        class="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none transition-all duration-300"
        aria-label="Carrito de fotos seleccionadas"
      >
        <div class="pointer-events-auto bg-zinc-950 text-white rounded-full px-5 py-3 shadow-2xl border border-white/20 flex items-center gap-4 sm:gap-6 backdrop-blur-xl animate-float-cart-in animate-cart-pulse">
          <!-- Contador Circular -->
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-full bg-white text-zinc-950 text-xs font-bold flex items-center justify-center animate-counter-pop">
              {{ cartStore.totalItemsCount() }}
            </span>
            <span class="text-xs sm:text-sm font-medium text-zinc-200">
              @if (cartStore.isFullAlbum()) {
                Álbum completo
              } @else {
                foto{{ cartStore.totalItemsCount() > 1 ? 's' : '' }} elegida{{ cartStore.totalItemsCount() > 1 ? 's' : '' }}
              }
            </span>
          </div>

          <div class="h-4 w-px bg-white/20"></div>

          <!-- Total Calculado Reactivamente -->
          <div>
            <span class="font-display font-extrabold text-sm sm:text-base text-white tracking-wide">
              &dollar;{{ cartStore.pricing().finalTotal.toLocaleString('es-AR') }} ARS
            </span>
            @if (cartStore.pricing().totalDiscount > 0) {
              <span class="hidden sm:inline-block ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                -&dollar;{{ cartStore.pricing().totalDiscount.toLocaleString('es-AR') }} desc
              </span>
            }
          </div>

          <!-- Botón Comprar con Micro-interacción -->
          <button
            (click)="checkout.emit()"
            class="px-4 sm:px-5 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md active:scale-95 group"
          >
            <span>Comprar</span>
            <span class="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </aside>
    }
  `
})
export class FloatingCartComponent {
  public readonly cartStore = inject(CartStore);
  public readonly checkout = output<void>();
}
