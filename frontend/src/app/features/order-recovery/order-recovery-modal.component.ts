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
            class="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
            (click)="closeModal()"
            aria-label="Cerrar modal de recuperación"
          >
            <svg class="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- Encabezado Bento -->
          <div class="flex items-center gap-4 mb-5">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <svg class="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                <path d="M16 8h-8"/>
                <path d="M16 12h-8"/>
                <path d="M13 16h-5"/>
              </svg>
            </div>
            <div>
              <span class="inline-block text-xs font-mono text-amber-400 font-semibold mb-0.5">
                Acceso a tus fotografías
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
                inputmode="email"
                [(ngModel)]="emailInput"
                name="email"
                placeholder="ejemplo@gmail.com"
                autocomplete="email"
                required
                [disabled]="isLoading()"
                class="w-full min-h-[44px] bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
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
                class="w-full min-h-[44px] bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
              />
            </div>

            <button
              type="submit"
              [disabled]="isLoading() || !emailInput.trim()"
              class="w-full min-h-[44px] py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-amber-400/20 active:scale-95 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              @if (isLoading()) {
                <span class="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin"></span>
                <span>Buscando compras...</span>
              } @else {
                <svg class="w-4 h-4 text-zinc-950 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" x2="16.65" y1="21" y2="16.65"/>
                </svg>
                <span>Buscar</span>
              }
            </button>

            @if (errorMessage()) {
              <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-shake">
                <svg class="w-4 h-4 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }
          </form>

          <!-- Lista de Órdenes Recuperadas -->
          @if (searched() && recoveredOrders().length > 0) {
            <div class="space-y-3 pt-2">
              <span class="text-xs font-semibold text-zinc-400 block">
                Compras encontradas ({{ recoveredOrders().length }})
              </span>

              @for (order of recoveredOrders(); track order.orderId) {
                <div class="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <h3 class="text-sm font-bold text-white leading-snug">
                        {{ order.albumTitle }}
                      </h3>
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
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
                    class="min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 text-center whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <svg class="w-3.5 h-3.5 text-zinc-950 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>Descargar Fotos</span>
                  </a>
                </div>
              }
            </div>
          }

          <!-- Contacto Soporte WhatsApp -->
          <div class="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <p class="text-xs text-zinc-400">
              ¿No encuentras tu compra? 
              <a
                href="https://wa.me/5493804868714?text=Hola%20Yuyo!%20Tengo%20una%20consulta%20sobre%20la%20recuperación%20de%20mis%20fotos%20compradas"
                target="_blank"
                rel="noopener noreferrer"
                class="text-amber-400 hover:underline inline-flex items-center gap-1 font-semibold ml-1"
              >
                <span>Contáctate con Yuyo por WhatsApp</span>
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </p>
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
  public readonly searched = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly recoveredOrders = signal<readonly RecoveredOrder[]>([]);

  public onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  public closeModal(): void {
    this.emailInput = '';
    this.paymentIdInput = '';
    this.errorMessage.set(null);
    this.searched.set(false);
    this.recoveredOrders.set([]);
    this.close.emit();
  }

  public recoverOrders(): void {
    const email = this.emailInput.trim();
    if (!email) {
      this.errorMessage.set('Por favor ingresa un correo electrónico válido');
      return;
    }

    const cleanPaymentId = this.paymentIdInput.trim() || undefined;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const req$ = cleanPaymentId
      ? this.paymentService.recoverOrdersByEmail(email, cleanPaymentId)
      : this.paymentService.recoverOrdersByEmail(email);

    req$.subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.searched.set(true);
        if (res.success && res.orders && res.orders.length > 0) {
          this.recoveredOrders.set(res.orders);
        } else {
          this.recoveredOrders.set([]);
          this.errorMessage.set(
            res.message || 'No se encontraron compras vigentes asociadas a este correo en las últimas 72 horas.'
          );
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.searched.set(true);
        this.recoveredOrders.set([]);
        const msg = err.error?.message || err.message || 'Error de conexión al recuperar compras. Intenta nuevamente.';
        this.errorMessage.set(msg);
      }
    });
  }
}
