import { Component, ChangeDetectionStrategy, inject, signal, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CartStore } from '../../core/state/cart.store';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        (click)="close.emit()"
      >
        <div
          class="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/[0.06] relative animate-float-cart-in"
          (click)="$event.stopPropagation()"
        >
          <!-- Botón Cerrar -->
          <button
            (click)="close.emit()"
            class="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 transition"
            aria-label="Cerrar modal"
          >
            ✕
          </button>

          @if (!preferenceCreated()) {
            <div>
              <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Finalizar Compra
              </span>
              <h3 class="font-display font-bold text-xl text-zinc-900">
                Descarga tus Fotografías
              </h3>
              <p class="text-xs text-zinc-500 mt-1 mb-5">
                Entrega inmediata y 100% automatizada vía Mercado Pago.
              </p>

              <!-- Resumen del Carrito -->
              <div class="bg-zinc-50 p-4 rounded-2xl mb-4 border border-black/[0.04]">
                <div class="flex justify-between items-center text-xs text-zinc-600 mb-1">
                  <span>
                    @if (cartStore.isFullAlbum()) {
                      Álbum completo
                    } @else {
                      {{ cartStore.totalItemsCount() }} foto{{ cartStore.totalItemsCount() > 1 ? 's' : '' }} seleccionada{{ cartStore.totalItemsCount() > 1 ? 's' : '' }}
                    }
                  </span>
                  <span class="font-bold text-zinc-950 text-sm">
                    \${{ cartStore.pricing().finalTotal.toLocaleString('es-AR') }} ARS
                  </span>
                </div>

                @if (cartStore.pricing().totalDiscount > 0) {
                  <div class="flex justify-between items-center text-[11px] text-emerald-600 font-semibold pt-1 border-t border-black/[0.03]">
                    <span>Descuento aplicado:</span>
                    <span>-\${{ cartStore.pricing().totalDiscount.toLocaleString('es-AR') }} ARS</span>
                  </div>
                }

                <p class="text-[10px] text-zinc-400 mt-2">
                  Archivos JPG originales en máxima resolución (4K) sin marcas de agua.
                </p>
              </div>

              <!-- Formulario de Entrega -->
              <form [formGroup]="form" (ngSubmit)="submitPayment()">
                <div class="mb-3">
                  <label class="block text-xs font-semibold text-zinc-700 mb-1.5" for="customerEmail">
                    Email para recibir las fotos de respaldo *
                  </label>
                  <input
                    id="customerEmail"
                    type="email"
                    formControlName="email"
                    placeholder="tunombre@gmail.com"
                    class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 transition"
                  >
                  @if (form.controls.email.touched && form.controls.email.invalid) {
                    <span class="text-[10px] text-rose-500 font-medium block mt-1">
                      Por favor, ingresa un email válido.
                    </span>
                  }
                </div>

                <div class="mb-4">
                  <label class="block text-xs font-semibold text-zinc-700 mb-1.5" for="customerPhone">
                    Teléfono o WhatsApp (opcional)
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    formControlName="phone"
                    placeholder="3804-123456"
                    class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 transition"
                  >
                </div>

                <!-- Cupón de Descuento -->
                <div class="flex gap-2 mb-5">
                  <input
                    type="text"
                    formControlName="coupon"
                    placeholder="Código de cupón (ej: YUYO10)"
                    class="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs uppercase text-zinc-900 focus:outline-none focus:border-zinc-950 transition"
                  >
                  <button
                    type="button"
                    (click)="applyCoupon()"
                    class="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition"
                  >
                    Aplicar
                  </button>
                </div>

                <!-- Error Message si ocurre -->
                @if (errorMessage()) {
                  <div class="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                    {{ errorMessage() }}
                  </div>
                }

                <!-- Botón Pagar con Mercado Pago -->
                <button
                  type="submit"
                  [disabled]="form.invalid || isSubmitting()"
                  class="w-full py-3.5 px-4 rounded-2xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                >
                  @if (isSubmitting()) {
                    <span class="animate-spin">⏳</span>
                    <span>Generando Checkout Seguro...</span>
                  } @else {
                    <span>💳 Pagar con Mercado Pago</span>
                  }
                </button>
              </form>
            </div>
          } @else {
            <!-- Pantalla con Enlace Directo a Mercado Pago -->
            <div class="text-center py-4">
              <div class="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                ✓
              </div>
              <h4 class="font-display font-bold text-lg text-zinc-900">
                ¡Preferencia Generada!
              </h4>
              <p class="text-xs text-zinc-500 mt-1 mb-5">
                Haz clic a continuación para abonar con Mercado Pago en pesos argentinos:
              </p>

              <a
                [href]="initPointUrl()"
                class="w-full py-3.5 px-4 rounded-2xl bg-[#009EE3] hover:bg-[#0081B8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 mb-3"
              >
                <span>Ir a Mercado Pago Checkout Pro →</span>
              </a>

              <button
                (click)="close.emit()"
                class="w-full py-2.5 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-semibold text-xs transition"
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
export class CheckoutModalComponent {
  public readonly cartStore = inject(CartStore);
  private readonly paymentService = inject(PaymentService);

  public readonly isOpen = input<boolean>(false);
  public readonly close = output<void>();

  public readonly isSubmitting = signal<boolean>(false);
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
    const code = this.form.controls.coupon.value;
    this.cartStore.applyCoupon(code);
  }

  public submitPayment(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const albumId = this.cartStore.activeAlbumId();
    if (!albumId) {
      this.errorMessage.set('Selecciona un álbum antes de continuar');
      this.isSubmitting.set(false);
      return;
    }

    this.paymentService.createPreference({
      albumId,
      photoIds: this.cartStore.selectedPhotoIds(),
      isFullAlbum: this.cartStore.isFullAlbum(),
      couponCode: this.cartStore.couponCode() ?? undefined,
      customer: {
        email: this.form.controls.email.value,
        phone: this.form.controls.phone.value || undefined
      }
    }).subscribe({
      next: (resp) => {
        this.isSubmitting.set(false);
        this.preferenceCreated.set(true);
        this.initPointUrl.set(resp.initPoint);
        // Intentar redirigir automáticamente
        window.location.href = resp.initPoint;
      },
      error: (err) => {
        console.error('Error al generar Checkout Pro:', err);
        this.errorMessage.set(err?.error?.error || 'No se pudo generar la preferencia de pago');
        this.isSubmitting.set(false);
      }
    });
  }
}
