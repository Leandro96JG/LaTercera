import { Component, ChangeDetectionStrategy, inject, signal, input, output, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CartStore } from '../../core/state/cart.store';
import { PaymentService } from '../../core/services/payment.service';
import { AlbumAccessStore } from '../../core/state/album-access.store';

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        (click)="close.emit()"
      >
        <div
          class="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/[0.06] relative animate-float-cart-in"
          (click)="$event.stopPropagation()"
        >
          <!-- Botón Cerrar (Accesible y con icono SVG) -->
          <button
            type="button"
            (click)="close.emit()"
            class="absolute top-5 right-5 w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition flex items-center justify-center active:scale-90 focus-visible:ring-2 focus-visible:ring-zinc-950"
            aria-label="Cerrar modal"
          >
            <svg class="w-4 h-4 text-zinc-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          @if (!preferenceCreated()) {
            <div>
              <span class="text-xs font-semibold text-zinc-500 block mb-1">
                Finalizar compra
              </span>
              <h3 class="font-display font-black text-xl text-zinc-950 tracking-tight">
                Descarga tus Fotografías
              </h3>
              <p class="text-xs text-zinc-600 mt-1 mb-5">
                Entrega inmediata y automatizada vía Mercado Pago.
              </p>

              <!-- Resumen del Carrito -->
              <div class="bg-zinc-50 p-4 rounded-2xl mb-4 border border-black/[0.04]">
                <div class="flex justify-between items-center text-xs text-zinc-700 mb-1">
                  <span class="font-medium">
                    @if (cartStore.isFullAlbum()) {
                      Álbum completo
                    } @else {
                      {{ cartStore.totalItemsCount() }} foto{{ cartStore.totalItemsCount() > 1 ? 's' : '' }} seleccionada{{ cartStore.totalItemsCount() > 1 ? 's' : '' }}
                    }
                  </span>
                  <span class="font-extrabold text-zinc-950 text-sm">
                    &dollar;{{ cartStore.pricing().finalTotal.toLocaleString('es-AR') }} ARS
                  </span>
                </div>

                @if (cartStore.pricing().totalDiscount > 0) {
                  <div class="flex justify-between items-center text-[11px] text-emerald-700 font-semibold pt-1.5 border-t border-black/[0.05]">
                    <span class="flex items-center gap-1">
                      <svg class="w-3 h-3 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                        <line x1="7" y1="7" x2="7.01" y2="7"/>
                      </svg>
                      <span>Descuento aplicado:</span>
                    </span>
                    <span>-&dollar;{{ cartStore.pricing().totalDiscount.toLocaleString('es-AR') }} ARS</span>
                  </div>
                }

                <p class="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                  Archivos JPG originales en máxima resolución sin marcas de agua.
                  @if (!cartStore.isFullAlbum() && cartStore.tierConfig().enableTierDiscounts) {
                    <span class="block text-emerald-700 font-semibold mt-1">
                      Promoción por volumen: {{ cartStore.tier3DiscountPercent() }}% OFF en 3+ fotos • {{ cartStore.tier5DiscountPercent() }}% OFF en 5+ fotos
                    </span>
                  }
                </p>
              </div>

              <!-- Formulario de Entrega -->
              <form [formGroup]="form" (ngSubmit)="submitPayment()">
                <div class="mb-3">
                  <label class="block text-xs font-semibold text-zinc-800 mb-1.5" for="customerEmail">
                    Email para recibir las fotos de respaldo *
                  </label>
                  <input
                    id="customerEmail"
                    type="email"
                    inputmode="email"
                    formControlName="email"
                    placeholder="tunombre@gmail.com"
                    class="w-full min-h-[44px] bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition"
                  >
                  @if (form.controls.email.touched && form.controls.email.invalid) {
                    <span class="text-[11px] text-rose-600 font-medium block mt-1">
                      Por favor, ingresa un email válido.
                    </span>
                  }
                </div>

                <div class="mb-4">
                  <label class="block text-xs font-semibold text-zinc-800 mb-1.5" for="customerPhone">
                    Teléfono o WhatsApp (opcional)
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    inputmode="tel"
                    formControlName="phone"
                    placeholder="3804-123456"
                    class="w-full min-h-[44px] bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition"
                  >
                </div>

                <!-- Cupón de Descuento -->
                <div class="mb-4">
                  <div class="flex gap-2">
                    <input
                      type="text"
                      formControlName="coupon"
                      placeholder="Código promocional (opcional)"
                      class="flex-1 min-h-[44px] bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs uppercase font-mono text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition"
                    >
                    <button
                      type="button"
                      (click)="applyCoupon()"
                      [disabled]="isValidatingCoupon()"
                      class="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-900 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-950"
                    >
                      @if (isValidatingCoupon()) {
                        <svg class="w-3.5 h-3.5 animate-spin text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                          <path d="M12 2a10 10 0 0 1 10 10"/>
                        </svg>
                      }
                      <span>Aplicar</span>
                    </button>
                  </div>

                  @if (couponFeedback(); as feedback) {
                    <div
                      class="mt-2 text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-2 border transition"
                      [class.bg-emerald-50]="feedback.success"
                      [class.text-emerald-800]="feedback.success"
                      [class.border-emerald-200]="feedback.success"
                      [class.bg-rose-50]="!feedback.success"
                      [class.text-rose-800]="!feedback.success"
                      [class.border-rose-200]="!feedback.success"
                    >
                      @if (feedback.success) {
                        <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      } @else {
                        <svg class="w-3.5 h-3.5 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                      }
                      <span>{{ feedback.message }}</span>
                    </div>
                  }
                </div>

                <!-- Error Message si ocurre -->
                @if (errorMessage()) {
                  <div class="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <svg class="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>{{ errorMessage() }}</span>
                  </div>
                }

                <!-- Botón Pagar con Mercado Pago o Canjear Fotos Gratis -->
                <button
                  type="submit"
                  [disabled]="form.invalid || isSubmitting()"
                  class="w-full min-h-[44px] py-3.5 px-4 rounded-2xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-98 focus-visible:ring-2 focus-visible:ring-zinc-950"
                >
                  @if (isSubmitting()) {
                    <svg class="w-4 h-4 animate-spin text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                      <path d="M12 2a10 10 0 0 1 10 10"/>
                    </svg>
                    <span>Generando Checkout Seguro...</span>
                  } @else if (cartStore.pricing().finalTotal === 0) {
                    <svg class="w-4 h-4 text-amber-400 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z"/>
                    </svg>
                    <span>Canjear Fotos Gratis (Cupón 100%)</span>
                  } @else {
                    <svg class="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="20" height="14" x="2" y="5" rx="2"/>
                      <line x1="2" x2="22" y1="10" y2="10"/>
                    </svg>
                    <span>Pagar con Mercado Pago</span>
                  }
                </button>
              </form>
            </div>
          } @else {
            <!-- Pantalla con Enlace Directo a Mercado Pago -->
            <div class="text-center py-4">
              <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <svg class="w-6 h-6 text-emerald-600 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h4 class="font-display font-black text-lg text-zinc-950">
                ¡Preferencia Generada!
              </h4>
              <p class="text-xs text-zinc-600 mt-1 mb-5">
                Haz clic a continuación para abonar con Mercado Pago en pesos argentinos:
              </p>

              <a
                [href]="initPointUrl()"
                class="w-full min-h-[44px] py-3.5 px-4 rounded-2xl bg-[#009EE3] hover:bg-[#0081B8] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-98 mb-3 focus-visible:ring-2 focus-visible:ring-sky-500 group"
              >
                <span>Ir a Mercado Pago Checkout Pro</span>
                <svg class="w-4 h-4 text-white shrink-0 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </a>

              <button
                type="button"
                (click)="close.emit()"
                class="w-full min-h-[44px] py-2.5 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-semibold text-xs transition active:scale-98"
              >
                Cancelar y volver
              </button>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class CheckoutModalComponent implements OnInit {
  public readonly cartStore = inject(CartStore);
  private readonly paymentService = inject(PaymentService);
  private readonly albumAccessStore = inject(AlbumAccessStore);

  public ngOnInit(): void {
    this.cartStore.refreshPricingConfig();
  }

  public readonly isOpen = input<boolean>(false);
  public readonly close = output<void>();

  public readonly isSubmitting = signal<boolean>(false);
  public readonly isValidatingCoupon = signal<boolean>(false);
  public readonly couponFeedback = signal<{ success: boolean; message: string } | null>(null);
  public readonly errorMessage = signal<string | null>(null);
  public readonly preferenceCreated = signal<boolean>(false);
  public readonly initPointUrl = signal<string>('');

  public readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    phone: new FormControl('', { nonNullable: true }),
    coupon: new FormControl('', { nonNullable: true })
  });

  public applyCoupon(): void {
    const rawCode = this.form.controls.coupon.value.trim();
    if (!rawCode) {
      this.cartStore.applyCoupon(null);
      this.couponFeedback.set(null);
      return;
    }

    this.isValidatingCoupon.set(true);
    this.couponFeedback.set(null);
    const albumId = this.cartStore.activeAlbumId() ?? undefined;
    const photoCount = this.cartStore.totalItemsCount();
    const isFullAlbum = this.cartStore.isFullAlbum();

    this.paymentService.validateCoupon(rawCode, albumId, photoCount, isFullAlbum).subscribe({
      next: (resp) => {
        this.isValidatingCoupon.set(false);
        if (resp.valid) {
          const discountPct = resp.discountPercentage ?? 10;
          this.cartStore.applyCoupon(resp.code || rawCode, discountPct);
          this.couponFeedback.set({
            success: true,
            message: `Cupón aplicado: -${discountPct}%`
          });
        } else {
          this.cartStore.applyCoupon(null);
          this.couponFeedback.set({
            success: false,
            message: `${resp.message || 'Cupón inválido o expirado'}`
          });
        }
      },
      error: (err) => {
        this.isValidatingCoupon.set(false);
        this.cartStore.applyCoupon(null);
        this.couponFeedback.set({
          success: false,
          message: err.error?.message || 'Error al validar cupón. Verifica e intenta nuevamente.'
        });
      }
    });
  }

  public submitPayment(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const albumId = this.cartStore.activeAlbumId();
    if (!albumId) {
      this.errorMessage.set('Selecciona un álbum antes de continuar');
      this.isSubmitting.set(false);
      return;
    }

    const email = this.form.controls.email.value.trim();
    const phone = this.form.controls.phone.value.trim() || undefined;
    this.cartStore.updateCustomer({ email, phone });

    const accessToken = this.albumAccessStore.getAccessToken(albumId);

    this.paymentService.createPreference({
      albumId,
      photoIds: this.cartStore.selectedPhotoIds(),
      isFullAlbum: this.cartStore.isFullAlbum(),
      couponCode: this.cartStore.couponCode() ?? undefined,
      accessToken,
      customer: {
        email,
        phone
      }
    }).subscribe({
      next: (resp) => {
        this.isSubmitting.set(false);
        // Si es canje directo 100% OFF (gratis), limpiar carrito y redirigir inmediatamente a entrega de descarga
        if (resp.isFreeRedemption && resp.downloadToken) {
          this.close.emit();
          this.cartStore.clearCart();
          const targetUrl = resp.redirectUrl || `/pago-exitoso?token=${resp.downloadToken}`;
          if (typeof window !== 'undefined') {
            window.location.href = targetUrl;
          }
          return;
        }

        this.preferenceCreated.set(true);
        this.initPointUrl.set(resp.initPoint || '');
        if (resp.initPoint && typeof window !== 'undefined') {
          window.location.href = resp.initPoint;
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.error || err.error?.message || 'Error al comunicarse con Mercado Pago';
        this.errorMessage.set(msg);
      }
    });
  }
}
