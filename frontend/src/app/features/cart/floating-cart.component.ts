import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { CartStore } from '../../core/state/cart.store';

@Component({
  selector: 'app-floating-cart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cartStore.hasItems()) {
      <!-- ============================================================ -->
      <!-- MODAL / DRAWER EXPANDIDO: VISTA DE FOTOS PROTEGIDAS Y GESTIÓN -->
      <!-- ============================================================ -->
      @if (isExpanded()) {
        <!-- Backdrop oscuro con blur -->
        <div
          class="fixed inset-0 z-40 bg-zinc-950/70 backdrop-blur-sm animate-fadeIn"
          (click)="closeExpanded()"
          aria-hidden="true"
        ></div>

        <!-- Drawer Bento Deslizable -->
        <aside
          class="fixed inset-x-0 bottom-0 z-50 flex justify-center p-2 sm:p-6 pointer-events-none w-full max-w-[100vw] overflow-x-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de fotos seleccionadas en el carrito"
        >
          <div
            class="pointer-events-auto bg-zinc-950 text-white w-full max-w-2xl rounded-t-[32px] sm:rounded-[32px] border border-white/20 shadow-2xl p-5 sm:p-6 flex flex-col max-h-[85vh] animate-float-cart-in"
            (click)="$event.stopPropagation()"
          >
            <!-- Cabecera del Drawer -->
            <div class="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-full bg-white text-zinc-950 font-display font-extrabold text-sm flex items-center justify-center">
                  {{ cartStore.totalItemsCount() }}
                </span>
                <div>
                  <h3 class="font-display font-extrabold text-base sm:text-lg text-white">
                    @if (cartStore.isFullAlbum()) {
                      Álbum Completo Seleccionado
                    } @else {
                      Fotos en el Carrito ({{ cartStore.totalItemsCount() }})
                    }
                  </h3>
                  <p class="text-[11px] text-zinc-400">
                    Muestras protegidas con marca de agua • Originales HD tras el pago
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                @if (cartStore.hasItems()) {
                  <button
                    type="button"
                    (click)="clearCart()"
                    class="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 text-[11px] font-semibold transition"
                    title="Vaciar selección"
                  >
                    Vaciar
                  </button>
                }
                <button
                  type="button"
                  (click)="closeExpanded()"
                  class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center justify-center active:scale-90"
                  aria-label="Cerrar detalle del carrito"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Cuerpo Desplazable: Fotos Seleccionadas -->
            <div class="py-4 overflow-y-auto max-h-[48vh] space-y-3 pr-1">
              @if (cartStore.isFullAlbum()) {
                <!-- Tarjeta Destacada de Álbum Completo -->
                <div class="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div class="space-y-1">
                    <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-extrabold uppercase tracking-wider">
                      ★ Máximo Ahorro
                    </span>
                    <h4 class="font-display font-extrabold text-base text-amber-200">
                      Todas las fotografías del evento
                    </h4>
                    <p class="text-xs text-zinc-300">
                      Incluye la totalidad de las tomas del partido/evento en su resolución original máxima sin marcas de agua, empaquetadas en archivo ZIP.
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <span class="block text-xs text-zinc-400 line-through">
                      &dollar;{{ (cartStore.unitPrice() * 48).toLocaleString('es-AR') }} ARS
                    </span>
                    <span class="font-display font-extrabold text-xl text-amber-300">
                      &dollar;{{ cartStore.fullAlbumPrice().toLocaleString('es-AR') }} ARS
                    </span>
                  </div>
                </div>

                <!-- Botón Deseleccionar Álbum Completo -->
                <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span class="text-xs text-zinc-300">¿Prefieres no llevar el álbum completo?</span>
                  <button
                    type="button"
                    (click)="removeFullAlbum()"
                    class="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                    title="Quitar álbum completo del carrito"
                  >
                    <span>🗑️ Quitar Álbum</span>
                  </button>
                </div>
              } @else {
                <!-- Sugerencia Inteligente para Pasar a Pack Álbum Completo -->
                @if (cartStore.shouldRecommendFullAlbum()) {
                  <div class="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div class="space-y-0.5">
                      <span class="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <span>💡</span>
                        <span>¡Te conviene el Pack Álbum Completo!</span>
                      </span>
                      <p class="text-[11px] text-zinc-300">
                        Llevas {{ cartStore.selectedPhotosArray().length }} fotos. Por solo &dollar;{{ cartStore.fullAlbumPrice().toLocaleString('es-AR') }} ARS te llevas la totalidad de las fotos del evento en resolución original 4K sin marcas de agua.
                      </p>
                    </div>
                    <button
                      type="button"
                      (click)="cartStore.switchToFullAlbum()"
                      class="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition active:scale-95 shrink-0 shadow-md"
                    >
                      Cambiar a Pack ⚡
                    </button>
                  </div>
                }

                <!-- Lista de Fotos Individuales con Preview WebP Protectora -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  @for (photo of cartStore.selectedPhotosArray(); track photo.id) {
                    <div class="p-2.5 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center justify-between gap-3 group hover:border-white/25 transition">
                      <div class="flex items-center gap-3 min-w-0">
                        <!-- Miniatura con Insignia de Protección -->
                        <div class="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                          <img
                            [src]="photo.previewUrl"
                            [alt]="photo.title || 'Foto de muestra'"
                            class="w-full h-full object-cover select-none pointer-events-none"
                            loading="lazy"
                          />
                          <div class="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                            <span class="text-[8px] font-extrabold text-white/90 bg-black/60 px-1 py-0.5 rounded tracking-tighter">
                              MUESTRA
                            </span>
                          </div>
                        </div>

                        <!-- Metadatos de la Foto -->
                        <div class="min-w-0">
                          <h5 class="text-xs font-bold text-zinc-100 truncate">
                            {{ photo.title || ('Foto #' + photo.id) }}
                          </h5>
                          <span class="text-[11px] font-semibold text-zinc-400 block mt-0.5">
                            &dollar;{{ cartStore.unitPrice().toLocaleString('es-AR') }} ARS
                          </span>
                        </div>
                      </div>

                      <!-- Botón Quitar Foto Individual -->
                      <button
                        type="button"
                        (click)="removePhoto(photo.id)"
                        class="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 text-xs font-semibold transition flex items-center gap-1 active:scale-95 shrink-0"
                        title="Quitar esta foto"
                      >
                        <span>✕</span>
                        <span class="hidden sm:inline">Quitar</span>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Footer con Resumen y Checkout -->
            <div class="pt-4 border-t border-white/10 shrink-0 space-y-3">
              <!-- Desglose de Descuentos -->
              @if (cartStore.pricing().totalDiscount > 0) {
                <div class="flex items-center justify-between text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">
                  <span class="font-semibold flex items-center gap-1.5">
                    <span>🎉</span>
                    <span>
                      @if (cartStore.pricing().couponCode) {
                        Cupón {{ cartStore.pricing().couponCode }} aplicado
                      } @else {
                        {{ cartStore.pricing().baseDiscountPercentage }}% OFF por cantidad ({{ cartStore.pricing().photoCount }} fotos)
                      }
                    </span>
                  </span>
                  <span class="font-bold">
                    -&dollar;{{ cartStore.pricing().totalDiscount.toLocaleString('es-AR') }} ARS
                  </span>
                </div>
              } @else if (!cartStore.isFullAlbum() && cartStore.tierConfig().enableTierDiscounts) {
                <div class="flex items-center justify-between text-[11px] text-zinc-400 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                  <span class="flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Beneficio activo:</span>
                  </span>
                  <span class="font-semibold text-amber-300">
                    {{ cartStore.tier3DiscountPercent() }}% OFF en 3+ fotos • {{ cartStore.tier5DiscountPercent() }}% OFF en 5+ fotos
                  </span>
                </div>
              }

              <!-- Subtotal y Botón Pagar -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div>
                  <span class="text-xs text-zinc-400 block">Total a pagar</span>
                  <span class="font-display font-extrabold text-xl sm:text-2xl text-white">
                    &dollar;{{ cartStore.pricing().finalTotal.toLocaleString('es-AR') }} ARS
                  </span>
                </div>

                <div class="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    (click)="closeExpanded()"
                    class="flex-1 sm:flex-none px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-bold transition"
                  >
                    Seguir viendo
                  </button>
                  <button
                    type="button"
                    (click)="onCheckout()"
                    class="flex-1 sm:flex-none px-6 py-3 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-display font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg active:scale-95 group"
                  >
                    <span>Pagar con Mercado Pago</span>
                    <span class="transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      }

      <!-- ============================================================ -->
      <!-- PÍLDORA FLOTANTE COMPACTA (BARRA INFERIOR)                   -->
      <!-- ============================================================ -->
      @if (!isExpanded()) {
        <aside
          class="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 w-full max-w-[100vw] overflow-x-hidden px-3 sm:px-6 flex flex-col items-center pointer-events-none transition-all duration-300"
          aria-label="Carrito de fotos seleccionadas"
        >
          <!-- BANNER FLOTANTE DE RECOMENDACIÓN INTELIGENTE DE PACK -->
          @if (cartStore.shouldRecommendFullAlbum()) {
            <div class="pointer-events-auto mb-2.5 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-zinc-950 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-2 text-[11px] sm:text-xs font-bold border border-amber-500/30 animate-float-cart-in box-border">
              <div class="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                <span class="shrink-0">💡</span>
                <span class="truncate block">Llevas <strong>{{ cartStore.selectedPhotosArray().length }} fotos</strong>: ¡Te conviene el <strong>Pack</strong>!</span>
              </div>
              <button
                type="button"
                (click)="cartStore.switchToFullAlbum()"
                class="shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] sm:text-[11px] font-black uppercase transition active:scale-95"
              >
                Pasar a Pack ⚡
              </button>
            </div>
          }

          <div class="pointer-events-auto w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-fit bg-zinc-950/95 text-white rounded-full p-1.5 pl-3 sm:px-5 sm:py-3 shadow-2xl border border-white/20 flex items-center justify-between gap-2 sm:gap-5 backdrop-blur-xl box-border overflow-hidden animate-float-cart-in">
            <!-- Zona Clickeable para Expandir Selección -->
            <button
              type="button"
              (click)="toggleExpanded()"
              class="flex items-center gap-1.5 sm:gap-3 text-left hover:opacity-85 transition pl-1 sm:pl-0 group min-w-0 shrink"
              title="Haz clic para ver las fotos en tu carrito"
            >
              <!-- Contador Circular -->
              <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-zinc-950 text-[11px] sm:text-xs font-bold flex items-center justify-center animate-counter-pop group-hover:scale-105 transition-transform shrink-0">
                {{ cartStore.totalItemsCount() }}
              </span>

              <div class="flex flex-col min-w-0">
                <span class="text-[11px] sm:text-sm font-medium text-zinc-200 flex items-center gap-1 truncate">
                  @if (cartStore.isFullAlbum()) {
                    <span class="truncate max-w-[80px] sm:max-w-none">Álbum completo</span>
                  } @else {
                    <span class="truncate">foto{{ cartStore.totalItemsCount() > 1 ? 's' : '' }} <span class="hidden xs:inline">elegida{{ cartStore.totalItemsCount() > 1 ? 's' : '' }}</span></span>
                  }
                  <span class="text-[9px] sm:text-[10px] text-zinc-400 group-hover:text-amber-300 transition-colors shrink-0">▴ Ver</span>
                </span>
              </div>
            </button>

            <div class="h-4 w-px bg-white/20 shrink-0"></div>

            <!-- Total Calculado Reactivamente -->
            <button
              type="button"
              (click)="toggleExpanded()"
              class="text-left hover:opacity-85 transition shrink-0"
            >
              <span class="font-display font-extrabold text-xs sm:text-base text-white tracking-tight sm:tracking-wide">
                &dollar;{{ cartStore.pricing().finalTotal.toLocaleString('es-AR') }}<span class="hidden sm:inline"> ARS</span>
              </span>
              @if (cartStore.pricing().totalDiscount > 0) {
                <span class="hidden sm:inline-block ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  -&dollar;{{ cartStore.pricing().totalDiscount.toLocaleString('es-AR') }} desc
                </span>
              }
            </button>

            <!-- Botón Comprar con Micro-interacción Directa -->
            <button
              (click)="checkout.emit()"
              class="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs sm:text-sm transition flex items-center gap-1 sm:gap-1.5 shadow-md active:scale-95 group shrink-0"
            >
              <span>Comprar</span>
              <span class="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        </aside>
      }
    }
  `
})
export class FloatingCartComponent {
  public readonly cartStore = inject(CartStore);
  public readonly checkout = output<void>();

  public readonly isExpanded = signal<boolean>(false);

  public toggleExpanded(): void {
    this.isExpanded.update(v => !v);
  }

  public closeExpanded(): void {
    this.isExpanded.set(false);
  }

  public removePhoto(photoId: string): void {
    this.cartStore.removePhoto(photoId);
  }

  public removeFullAlbum(): void {
    this.cartStore.removeFullAlbum();
    if (!this.cartStore.hasItems()) {
      this.isExpanded.set(false);
    }
  }

  public clearCart(): void {
    this.cartStore.clearCart();
    this.isExpanded.set(false);
  }

  public onCheckout(): void {
    this.isExpanded.set(false);
    this.checkout.emit();
  }
}
