import { Component, ChangeDetectionStrategy, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../core/services/payment.service';
import { RecoveredOrder } from '../../core/models/order.model';

@Component({
  selector: 'app-order-recovery-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in"
        (click)="onBackdropClick($event)"
        (keydown.escape)="closeModal()"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-label="Recuperar mis fotos compradas"
      >
        <div
          class="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white transform transition-all max-h-[90vh] overflow-y-auto"
          (click)="$event.stopPropagation()"
        >
          <!-- Botón de Cerrar -->
          <button
            type="button"
            class="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            (click)="closeModal()"
            aria-label="Cerrar modal de recuperación"
          >
            ✕
          </button>

          <!-- Encabezado Bento -->
          <div class="flex items-center gap-4 mb-5">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl text-amber-400">
              📥
            </div>
            <div>
              <span class="inline-block text-[11px] font-mono tracking-wider uppercase text-amber-400 font-semibold mb-0.5">
                Acceso a Tus Fotografías
              </span>
              <h2 class="text-xl font-bold tracking-tight text-white leading-tight">
                Recuperar Mis Compras
              </h2>
            </div>
          </div>

          <p class="text-xs text-zinc-400 mb-6 leading-relaxed">
            ¿Pagaste tus fotos pero cerraste la ventana o no pudiste guardarlas? Ingresa el correo electrónico que utilizaste en Mercado Pago para recuperar tus enlaces de descarga activos (últimas 72 horas).
          </p>

          <!-- Formulario de Búsqueda -->
          <form (ngSubmit)="recoverOrders()" class="space-y-4 mb-6">
            <div>
              <label for="recoveryEmailInput" class="block text-xs font-medium text-zinc-300 mb-2">
                Correo Electrónico de Compra
              </label>
              <input
                id="recoveryEmailInput"
                type="email"
                [(ngModel)]="emailInput"
                name="email"
                placeholder="ejemplo@gmail.com"
                autocomplete="email"
                required
                [disabled]="isLoading()"
                class="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
              />
            </div>

            <div>
              <label for="recoveryPaymentIdInput" class="block text-xs font-medium text-zinc-300 mb-2">
                N° de Operación de Mercado Pago o ID de Orden (opcional)
              </label>
              <input
                id="recoveryPaymentIdInput"
                type="text"
                [(ngModel)]="paymentIdInput"
                name="paymentId"
                placeholder="Ej: 8945123456"
                [disabled]="isLoading()"
                class="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
              />
            </div>

            <button
              type="submit"
              [disabled]="isLoading() || !emailInput.trim()"
              class="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-amber-400/20 active:scale-95 flex items-center justify-center gap-2"
            >
              @if (isLoading()) {
                <span class="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin"></span>
                <span>Buscando...</span>
              } @else {
                <span>Buscar</span>
              }
            </button>

            @if (errorMessage()) {
              <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-shake">
                <span>⚠️</span>
                <span>{{ errorMessage() }}</span>
              </div>
            }
          </form>

          <!-- Lista de Órdenes Recuperadas -->
          @if (searched() && recoveredOrders().length > 0) {
            <div class="space-y-3 pt-2">
              <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Compras Encontradas ({{ recoveredOrders().length }})
              </span>

              @for (order of recoveredOrders(); track order.orderId) {
                <div class="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <h3 class="text-sm font-bold text-white leading-snug">
                        {{ order.albumTitle }}
                      </h3>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Acreditada
                      </span>
                    </div>
                    <p class="text-xs text-zinc-400">
                      {{ order.isFullAlbum ? 'Álbum Completo (ZIP HD)' : (order.photoCount + ' fotografía(s) HD') }}
                    </p>
                    <span class="text-[11px] text-zinc-500 block">
                      Comprado: {{ order.createdAt | date:'d/M/yyyy, HH:mm' }}
                    </span>
                  </div>

                  <a
                    [href]="order.redirectUrl"
                    class="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 text-center whitespace-nowrap"
                  >
                    <span>⬇️ Descargar Fotos</span>
                  </a>
                </div>
              }
            </div>
          } @else if (searched() && !isLoading() && recoveredOrders().length === 0 && !errorMessage()) {
            <div class="p-6 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl text-center space-y-2">
              <span class="text-2xl block">🔍</span>
              <p class="text-xs font-medium text-zinc-300">
                No encontramos compras activas asociadas a este correo en las últimas 72 horas.
              </p>
              <p class="text-[11px] text-zinc-500">
                Por favor corrobora que hayas ingresado el mismo email con el que abonaste en Mercado Pago.
              </p>
            </div>
          }

          <!-- Soporte WhatsApp en pie de modal -->
          <div class="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>¿Problemas con tu descarga?</span>
            <a
              href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Necesito%20ayuda%20para%20recuperar%20mis%20fotos%20compradas"
              target="_blank"
              rel="noopener noreferrer"
              class="text-amber-400 hover:text-amber-300 font-semibold transition"
            >
              💬 Contactar Soporte
            </a>
          </div>

        </div>
      </div>
    }
  `
})
export class OrderRecoveryModalComponent {
  private readonly paymentService = inject(PaymentService);

  public readonly isOpen = input<boolean>(false);
  public readonly close = output<void>();

  public emailInput = '';
  public paymentIdInput = '';
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly searched = signal<boolean>(false);
  public readonly recoveredOrders = signal<readonly RecoveredOrder[]>([]);

  public closeModal(): void {
    this.errorMessage.set(null);
    this.close.emit();
  }

  public onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  public recoverOrders(): void {
    const trimmed = this.emailInput.trim();
    if (!trimmed) {
      this.errorMessage.set('Por favor ingresa un correo electrónico');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const cleanPaymentId = this.paymentIdInput.trim() || undefined;
    const req$ = cleanPaymentId
      ? this.paymentService.recoverOrdersByEmail(trimmed, cleanPaymentId)
      : this.paymentService.recoverOrdersByEmail(trimmed);

    req$.subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.searched.set(true);
        if (response.success && response.orders && response.orders.length > 0) {
          this.recoveredOrders.set(response.orders);
        } else {
          this.recoveredOrders.set([]);
          if (response.message && !response.success) {
            this.errorMessage.set(response.message);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.searched.set(true);
        const msg = err?.error?.message || err?.message || 'Error al conectar con el servidor';
        this.errorMessage.set(msg);
      }
    });
  }
}
