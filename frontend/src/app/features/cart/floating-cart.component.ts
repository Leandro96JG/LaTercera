import { Component, ChangeDetectionStrategy, inject, signal, computed, input, output } from '@angular/core';
import { CartStore } from '../../core/state/cart.store';
import { AlbumService } from '../../core/services/album.service';

@Component({
  selector: 'app-floating-cart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shouldShowCart()) {
      <!-- ============================================================ -->
      <!-- CASO A: BANDEJA DE CORTESÍA GRATUITA (isFreeAlbum === true) -->
      <!-- ============================================================ -->
      @if (isFreeMode()) {
        <!-- MODAL / DRAWER EXPANDIDO DE CORTESÍA -->
        @if (isExpanded()) {
          <div
            class="fixed inset-0 z-40 bg-zinc-950/70 backdrop-blur-sm animate-fadeIn"
            (click)="closeExpanded()"
            aria-hidden="true"
          ></div>

          <aside
            class="fixed inset-x-0 bottom-0 z-50 flex justify-center p-2 sm:p-6 pointer-events-none w-full max-w-[100vw] overflow-x-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de fotos de cortesía seleccionadas"
          >
            <div
              class="pointer-events-auto bg-zinc-950 text-white w-full max-w-2xl rounded-t-[32px] sm:rounded-[32px] border border-emerald-500/30 shadow-2xl p-5 sm:p-6 flex flex-col max-h-[85vh] animate-float-cart-in"
              (click)="$event.stopPropagation()"
            >
              <!-- Cabecera del Drawer Gratuito -->
              <div class="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                <div class="flex items-center gap-3">
                  <span class="w-8 h-8 rounded-full bg-emerald-500 text-zinc-950 font-display font-extrabold text-sm flex items-center justify-center shrink-0">
                    {{ cartStore.freeSelectedCount() }}
                  </span>
                  <div>
                    <h3 class="font-display font-extrabold text-base sm:text-lg text-emerald-300">
                      Lote de Cortesía ({{ cartStore.freeSelectedCount() }} fotos)
                    </h3>
                    <p class="text-[11px] text-zinc-400">
                      Originales 4K sin marcas de agua liberados por Jenifer Espeche
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  @if (cartStore.hasFreeItems()) {
                    <button
                      type="button"
                      (click)="clearFreeSelection()"
                      class="min-h-[36px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 text-xs font-semibold transition active:scale-95 focus-visible:ring-2 focus-visible:ring-white"
                      title="Vaciar selección gratuita"
                    >
                      Vaciar
                    </button>
                  }
                  <button
                    type="button"
                    (click)="closeExpanded()"
                    class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center active:scale-90 focus-visible:ring-2 focus-visible:ring-white shrink-0"
                    aria-label="Cerrar bandeja gratuita"
                  >
                    <svg class="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Cuerpo Desplazable: Fotos Seleccionadas Gratis -->
              <div class="py-4 overflow-y-auto max-h-[48vh] space-y-3 pr-1">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  @for (photo of cartStore.freeSelectedPhotosArray(); track photo.id) {
                    <div class="p-2.5 rounded-2xl bg-zinc-900/90 border border-emerald-500/20 flex items-center justify-between gap-3 group hover:border-emerald-500/40 transition">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                          <img
                            [src]="photo.previewUrl"
                            [alt]="photo.title || 'Foto de cortesía'"
                            class="w-full h-full object-cover select-none pointer-events-none"
                            loading="lazy"
                          />
                          <div class="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                            <span class="text-[8px] font-extrabold text-emerald-300 bg-black/60 px-1 py-0.5 rounded tracking-tighter">
                              GRATIS
                            </span>
                          </div>
                        </div>

                        <div class="min-w-0">
                          <h5 class="text-xs font-bold text-zinc-100 truncate">
                            {{ photo.title || ('Foto #' + photo.id) }}
                          </h5>
                          <span class="text-[11px] font-semibold text-emerald-400 block mt-0.5">
                            Descarga Oficial Gratuita
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        (click)="removeFreePhoto(photo.id)"
                        class="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-rose-400"
                        title="Quitar foto del lote"
                        aria-label="Quitar foto del lote de cortesía"
                      >
                        <svg class="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        <span class="hidden sm:inline">Quitar</span>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- Footer con Acciones de Descarga ZIP -->
              <div class="pt-4 border-t border-white/10 shrink-0 space-y-3">
                <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    (click)="downloadFullAlbumZip()"
                    class="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-bold transition active:scale-98 flex items-center justify-center gap-2 border border-white/10 focus-visible:ring-2 focus-visible:ring-white"
                    title="Descargar el álbum completo en ZIP sin seleccionar fotos"
                  >
                    <span>Descargar Todo el Álbum (ZIP)</span>
                  </button>

                  <div class="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      (click)="closeExpanded()"
                      class="flex-1 sm:flex-none min-h-[44px] px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-bold transition active:scale-98 focus-visible:ring-2 focus-visible:ring-white"
                    >
                      Seguir viendo
                    </button>
                    <button
                      type="button"
                      (click)="downloadSelectiveZip()"
                      class="flex-1 sm:flex-none min-h-[44px] px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-display font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg active:scale-98 focus-visible:ring-2 focus-visible:ring-emerald-400 group"
                    >
                      <span>Descargar Selección ({{ cartStore.freeSelectedCount() }} Fotos ZIP)</span>
                      <svg class="w-4 h-4 text-zinc-950 shrink-0 group-hover:translate-y-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        }

        <!-- PÍLDORA FLOTANTE COMPACTA DE CORTESÍA -->
        @if (!isExpanded()) {
          <aside
            class="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 w-full max-w-[100vw] overflow-x-hidden px-3 sm:px-6 flex flex-col items-center pointer-events-none transition-all duration-300"
            aria-label="Bandeja de fotos de cortesía seleccionadas"
          >
            <div class="pointer-events-auto w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-fit bg-zinc-950/95 text-white rounded-full p-1.5 pl-3 sm:px-5 sm:py-2.5 shadow-2xl border border-emerald-500/40 flex items-center justify-between gap-2 sm:gap-4 backdrop-blur-xl box-border overflow-hidden animate-float-cart-in">
              <button
                type="button"
                (click)="toggleExpanded()"
                class="flex items-center gap-1.5 sm:gap-2.5 text-left hover:opacity-85 transition pl-1 sm:pl-0 group min-w-0 shrink min-h-[44px] focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-full"
                title="Haz clic para ver las fotos en tu selección gratuita"
              >
                <span class="w-6 h-6 rounded-full bg-emerald-500 text-zinc-950 text-xs font-black flex items-center justify-center animate-counter-pop group-hover:scale-105 transition-transform shrink-0">
                  {{ cartStore.freeSelectedCount() }}
                </span>
                <div class="flex flex-col min-w-0">
                  <span class="text-[11px] sm:text-xs font-bold text-emerald-300 flex items-center gap-1 truncate">
                    <span>🎁 {{ cartStore.freeSelectedCount() }} foto{{ cartStore.freeSelectedCount() > 1 ? 's' : '' }} • Cortesía Gratis</span>
                    <span class="text-[9px] sm:text-[10px] text-zinc-400 group-hover:text-emerald-300 transition-colors shrink-0">▴ Ver</span>
                  </span>
                </div>
              </button>

              <div class="h-4 w-px bg-white/20 shrink-0"></div>

              <button
                type="button"
                (click)="downloadSelectiveZip()"
                class="min-h-[44px] px-4 sm:px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <svg class="w-3.5 h-3.5 text-zinc-950 stroke-[2.5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Descargar Selección (ZIP)</span>
              </button>
            </div>
          </aside>
        }
      } @else {
        <!-- ============================================================ -->
        <!-- CASO B: CARRITO DE COMPRA PAGO HABITUAL                       -->
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
                  <span class="w-8 h-8 rounded-full bg-white text-zinc-950 font-display font-extrabold text-sm flex items-center justify-center shrink-0">
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
                      class="min-h-[36px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 text-xs font-semibold transition active:scale-95 focus-visible:ring-2 focus-visible:ring-white"
                      title="Vaciar selección"
                    >
                      Vaciar
                    </button>
                  }
                  <button
                    type="button"
                    (click)="closeExpanded()"
                    class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center active:scale-90 focus-visible:ring-2 focus-visible:ring-white shrink-0"
                    aria-label="Cerrar detalle del carrito"
                  >
                    <svg class="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Cuerpo Desplazable: Fotos Seleccionadas -->
              <div class="py-4 overflow-y-auto max-h-[48vh] space-y-3 pr-1">
                @if (cartStore.isFullAlbum()) {
                  <!-- Tarjeta Destacada de Álbum Completo -->
                  <div class="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="space-y-1">
                      <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1">
                        <svg class="w-2.5 h-2.5 text-zinc-950 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z"/>
                        </svg>
                        <span>Máximo Ahorro</span>
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
                      class="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-400"
                      title="Quitar álbum completo del carrito"
                    >
                      <svg class="w-3.5 h-3.5 text-rose-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                      <span>Quitar Álbum</span>
                    </button>
                  </div>
                } @else {
                  <!-- Sugerencia Inteligente para Pasar a Pack Álbum Completo -->
                  @if (cartStore.shouldRecommendFullAlbum()) {
                    <div class="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                      <div class="space-y-0.5">
                        <span class="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <svg class="w-3.5 h-3.5 text-amber-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                            <path d="M9 18h6"/>
                            <path d="M10 22h4"/>
                          </svg>
                          <span>¡Te conviene el Pack Álbum Completo!</span>
                        </span>
                        <p class="text-[11px] text-zinc-300">
                          Llevas {{ cartStore.selectedPhotosArray().length }} fotos. Por solo &dollar;{{ cartStore.fullAlbumPrice().toLocaleString('es-AR') }} ARS te llevas la totalidad de las fotos del evento en resolución original 4K sin marcas de agua.
                        </p>
                      </div>
                      <button
                        type="button"
                        (click)="cartStore.switchToFullAlbum()"
                        class="min-h-[40px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition active:scale-95 shrink-0 shadow-md flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        <svg class="w-3 h-3 text-zinc-950 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                        </svg>
                        <span>Cambiar a Pack</span>
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
                          class="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-rose-400"
                          title="Quitar esta foto"
                          aria-label="Quitar foto de la selección"
                        >
                          <svg class="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
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
                      <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                        <line x1="7" y1="7" x2="7.01" y2="7"/>
                      </svg>
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
                      <svg class="w-3 h-3 text-amber-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                      <span>Beneficio activo:</span>
                    </span>
                    <span class="font-semibold text-amber-300">
                      {{ cartStore.tier3DiscountPercent() }}% OFF en 3+ fotos • {{ cartStore.tier5DiscountPercent() }}% OFF en 5+ fotos
                    </span>
                  </div>
                }

                <!-- Subtotal y Botón Pagar con Ergonomía Táctil (44px) -->
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
                      class="flex-1 sm:flex-none min-h-[44px] px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-bold transition active:scale-98 focus-visible:ring-2 focus-visible:ring-white"
                    >
                      Seguir viendo
                    </button>
                    <button
                      type="button"
                      (click)="onCheckout()"
                      class="flex-1 sm:flex-none min-h-[44px] px-6 py-3 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-display font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg active:scale-98 focus-visible:ring-2 focus-visible:ring-white group"
                    >
                      <span>Pagar con Mercado Pago</span>
                      <svg class="w-4 h-4 text-zinc-950 shrink-0 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        }

        <!-- PÍLDORA FLOTANTE COMPACTA (BARRA INFERIOR PAGA) -->
        @if (!isExpanded()) {
          <aside
            class="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 w-full max-w-[100vw] overflow-x-hidden px-3 sm:px-6 flex flex-col items-center pointer-events-none transition-all duration-300"
            aria-label="Carrito de fotos seleccionadas"
          >
            <!-- BANNER FLOTANTE DE RECOMENDACIÓN INTELIGENTE DE PACK -->
            @if (cartStore.shouldRecommendFullAlbum()) {
              <div class="pointer-events-auto mb-2.5 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-zinc-950 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-2 text-[11px] sm:text-xs font-bold border border-amber-500/30 animate-float-cart-in box-border">
                <div class="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                  <svg class="w-4 h-4 text-zinc-950 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                    <path d="M9 18h6"/>
                    <path d="M10 22h4"/>
                  </svg>
                  <span class="truncate block">Llevas <strong>{{ cartStore.selectedPhotosArray().length }} fotos</strong>: ¡Te conviene el <strong>Pack</strong>!</span>
                </div>
                <button
                  type="button"
                  (click)="cartStore.switchToFullAlbum()"
                  class="min-h-[36px] shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] sm:text-[11px] font-black uppercase transition active:scale-95 flex items-center gap-1"
                >
                  <svg class="w-3 h-3 text-amber-400 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <span>Pasar a Pack</span>
                </button>
              </div>
            }

            <div class="pointer-events-auto w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-fit bg-zinc-950/95 text-white rounded-full p-1.5 pl-3 sm:px-5 sm:py-2.5 shadow-2xl border border-white/20 flex items-center justify-between gap-2 sm:gap-5 backdrop-blur-xl box-border overflow-hidden animate-float-cart-in">
              <!-- Zona Clickeable para Expandir Selección -->
              <button
                type="button"
                (click)="toggleExpanded()"
                class="flex items-center gap-1.5 sm:gap-3 text-left hover:opacity-85 transition pl-1 sm:pl-0 group min-w-0 shrink min-h-[44px] focus-visible:ring-2 focus-visible:ring-white rounded-full"
                title="Haz clic para ver las fotos en tu carrito"
              >
                <!-- Contador Circular -->
                <span class="w-6 h-6 rounded-full bg-white text-zinc-950 text-xs font-bold flex items-center justify-center animate-counter-pop group-hover:scale-105 transition-transform shrink-0">
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
                class="text-left hover:opacity-85 transition shrink-0 min-h-[44px] flex flex-col justify-center focus-visible:ring-2 focus-visible:ring-white rounded-xl"
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

              <!-- Botón Comprar con Micro-interacción Directa (44px) -->
              <button
                type="button"
                (click)="checkout.emit()"
                class="min-h-[44px] px-4 sm:px-5 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md active:scale-95 group shrink-0 focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>Comprar</span>
                <svg class="w-3.5 h-3.5 text-zinc-950 shrink-0 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>
          </aside>
        }
      }
    }
  `
})
export class FloatingCartComponent {
  public readonly cartStore = inject(CartStore);
  private readonly albumService = inject(AlbumService);

  // Inputs
  public readonly isFreeAlbum = input<boolean>(false);
  public readonly activeAlbumId = input<string | null>(null);
  public readonly activeAlbumTitle = input<string | null>(null);

  // Outputs
  public readonly checkout = output<void>();

  public readonly isExpanded = signal<boolean>(false);

  public readonly isFreeMode = computed<boolean>(() => this.isFreeAlbum());

  public readonly shouldShowCart = computed<boolean>(() => {
    if (this.isFreeMode()) {
      return this.cartStore.hasFreeItems();
    }
    return this.cartStore.hasItems();
  });

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

  // --- Métodos de Selección Gratuita ---

  public removeFreePhoto(photoId: string): void {
    this.cartStore.removeFreePhoto(photoId);
    if (!this.cartStore.hasFreeItems()) {
      this.isExpanded.set(false);
    }
  }

  public clearFreeSelection(): void {
    this.cartStore.clearFreeSelection();
    this.isExpanded.set(false);
  }

  public downloadSelectiveZip(): void {
    const albumId = this.activeAlbumId() || this.cartStore.freeActiveAlbumId();
    const photoIds = [...this.cartStore.freeSelectedPhotoIds()];
    if (!albumId || photoIds.length === 0) return;
    const url = this.albumService.getFreeAlbumZipUrl(albumId, photoIds);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }

  public downloadFullAlbumZip(): void {
    const albumId = this.activeAlbumId() || this.cartStore.freeActiveAlbumId();
    if (!albumId) return;
    const url = this.albumService.getFreeAlbumZipUrl(albumId);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }
}
