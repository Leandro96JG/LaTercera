import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Album } from '../../../core/models/album.model';
import { AdminOrder, AdminOrderStatus } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-orders-tab',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fadeIn">
      <!-- Cabecera de Ventas & Entregas -->
      <div class="bg-white rounded-[32px] p-6 sm:p-8 border border-black/[0.05] shadow-bento flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
              💳 Ventas & Cobros
            </span>
            <span class="text-xs text-zinc-500 font-mono">• Mercado Pago Live</span>
          </div>
          <h3 class="font-display font-extrabold text-xl sm:text-2xl text-zinc-900 tracking-tight">
            Ventas, Cobros & Entregas de Fotos
          </h3>
          <p class="text-xs text-zinc-600 mt-0.5">
            Supervisa cobros en ARS, controla descargas y vencimientos de 72h, verifica pagos y reenvía enlaces en 1 clic.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            (click)="exportCsv.emit()"
            [disabled]="filteredCount() === 0"
            class="min-h-[44px] px-4 py-2.5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-800 border border-black/[0.08] font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
            title="Descargar las órdenes filtradas en CSV para Excel"
          >
            <span>📊 Exportar CSV</span>
          </button>

          <button
            type="button"
            (click)="syncOrders.emit()"
            [disabled]="isLoadingOrders()"
            class="min-h-[44px] px-5 py-2.5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-display font-extrabold text-xs shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            @if (isLoadingOrders()) {
              <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Sincronizando...</span>
            } @else {
              <span>🔄 Sincronizar Ventas</span>
            }
          </button>
        </div>
      </div>

      <!-- KPIs de Ventas -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-[24px] p-5 border border-black/[0.05] shadow-bento flex flex-col justify-between">
          <span class="text-zinc-600 text-xs font-semibold">Total Recaudado (ARS)</span>
          <div class="my-2">
            <span class="font-display font-black text-2xl sm:text-3xl text-zinc-900">&dollar;{{ totalPaidRevenue().toLocaleString('es-AR') }}</span>
            <span class="text-xs text-zinc-500 block mt-0.5">cobrados netos en Mercado Pago</span>
          </div>
          <span class="text-[10px] text-emerald-700 font-bold">100% verificado en servidor</span>
        </div>

        <div class="bg-white rounded-[24px] p-5 border border-black/[0.05] shadow-bento flex flex-col justify-between">
          <span class="text-zinc-600 text-xs font-semibold">Órdenes Acreditadas</span>
          <div class="my-2">
            <div class="flex items-baseline gap-2">
              <span class="font-display font-black text-2xl sm:text-3xl text-emerald-600">{{ paidMpOrdersCount() }}</span>
              <span class="text-xs font-bold text-zinc-600">ventas cobradas</span>
            </div>
            @if (freeRedemptionOrdersCount() > 0) {
              <div class="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-200/60 text-[11px] font-bold text-violet-700">
                <span>🎁</span>
                <span>{{ freeRedemptionOrdersCount() }} sorteos canjeados ($0)</span>
              </div>
            } @else {
              <span class="text-xs text-zinc-500 block mt-0.5">0 sorteos canjeados ($0)</span>
            }
          </div>
          <span class="text-[10px] text-zinc-500">Total: {{ paidOrdersCount() }} pagadas de {{ totalOrdersCount() }}</span>
        </div>

        <div class="bg-white rounded-[24px] p-5 border border-black/[0.05] shadow-bento flex flex-col justify-between">
          <span class="text-zinc-600 text-xs font-semibold">Fotos Sueltas Vendidas</span>
          <div class="my-2">
            <span class="font-display font-black text-2xl sm:text-3xl text-zinc-900">{{ photosSold() }}</span>
            <span class="text-xs text-zinc-500 block mt-0.5">archivos entregados en 4K</span>
          </div>
          <span class="text-[10px] text-zinc-500">Descargas individuales</span>
        </div>

        <div class="bg-white rounded-[24px] p-5 border border-black/[0.05] shadow-bento flex flex-col justify-between">
          <span class="text-zinc-600 text-xs font-semibold">Packs Completos Vendidos</span>
          <div class="my-2">
            <span class="font-display font-black text-2xl sm:text-3xl text-amber-600">{{ albumsSold() }}</span>
            <span class="text-xs text-zinc-500 block mt-0.5">álbumes empaquetados en ZIP</span>
          </div>
          <span class="text-[10px] text-zinc-500">Entregas de eventos completos</span>
        </div>
      </div>

      <!-- Error visible de sincronización -->
      @if (ordersError(); as errMsg) {
        <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2 font-semibold">
            <span>⚠️</span>
            <span>{{ errMsg }}</span>
          </div>
          <button
            type="button"
            (click)="syncOrders.emit()"
            class="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition self-start sm:self-auto"
          >
            Reintentar
          </button>
        </div>
      }

      <!-- Barra de Filtros y Búsqueda Avanzada -->
      <div class="bg-white rounded-[28px] p-4 sm:p-5 border border-black/[0.05] shadow-bento space-y-3.5">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div class="relative md:col-span-5">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            <input
              type="text"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              placeholder="Buscar por ID, email, nombre, álbum, tel o Pago MP..."
              class="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
            />
          </div>

          <div class="md:col-span-3">
            <select
              [value]="albumFilter()"
              (change)="onAlbumSelectChange($event)"
              class="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-semibold focus:outline-none focus:border-zinc-950 transition"
              aria-label="Filtrar ventas por álbum"
            >
              <option value="ALL">🌐 Todos los eventos / álbumes</option>
              @for (alb of albums(); track alb.id) {
                <option [value]="alb.id">{{ alb.title }}</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2 md:col-span-4">
            <input
              type="date"
              [value]="dateFrom()"
              (input)="onDateFromInput($event)"
              aria-label="Fecha desde"
              title="Filtrar desde fecha"
              class="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs focus:outline-none focus:border-zinc-950"
            />
            <input
              type="date"
              [value]="dateTo()"
              (input)="onDateToInput($event)"
              aria-label="Fecha hasta"
              title="Filtrar hasta fecha"
              class="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>
        </div>

        <!-- Filtros por Todos los Estados + Tipo de Entrega -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            <button
              type="button"
              (click)="statusFilterChange.emit('ALL')"
              [class]="statusFilter() === 'ALL'
                ? 'min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-950 text-white font-bold text-xs whitespace-nowrap'
                : 'min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-xs whitespace-nowrap transition'"
            >
              Todas ({{ totalOrdersCount() }})
            </button>
            <button
              type="button"
              (click)="statusFilterChange.emit('PAID')"
              [class]="statusFilter() === 'PAID'
                ? 'min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs whitespace-nowrap'
                : 'min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-medium text-xs whitespace-nowrap transition'"
            >
              ✅ Pagadas ({{ paidOrdersCount() }})
            </button>
            <button
              type="button"
              (click)="statusFilterChange.emit('PENDING')"
              [class]="statusFilter() === 'PENDING'
                ? 'min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs whitespace-nowrap'
                : 'min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium text-xs whitespace-nowrap transition'"
            >
              ⏳ Pendientes
            </button>
            <button
              type="button"
              (click)="statusFilterChange.emit('FRAUD_ALERT_PRICE_MISMATCH')"
              [class]="statusFilter() === 'FRAUD_ALERT_PRICE_MISMATCH'
                ? 'min-h-[36px] px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs whitespace-nowrap'
                : 'min-h-[36px] px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-medium text-xs whitespace-nowrap transition'"
            >
              ⚠️ Alertas
            </button>
            <button
              type="button"
              (click)="statusFilterChange.emit('REJECTED')"
              [class]="statusFilter() === 'REJECTED'
                ? 'min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-700 text-white font-bold text-xs whitespace-nowrap'
                : 'min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-xs whitespace-nowrap transition'"
            >
              ✖ Rechazadas
            </button>
            <button
              type="button"
              (click)="statusFilterChange.emit('CANCELLED')"
              [class]="statusFilter() === 'CANCELLED'
                ? 'min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-700 text-white font-bold text-xs whitespace-nowrap'
                : 'min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-xs whitespace-nowrap transition'"
            >
              ↩ Canceladas
            </button>
          </div>

          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            <button
              type="button"
              (click)="deliveryTypeFilterChange.emit('ALL')"
              [class]="deliveryTypeFilter() === 'ALL'
                ? 'min-h-[36px] px-2.5 py-1.5 rounded-xl bg-zinc-900 text-white font-bold text-[11px] whitespace-nowrap'
                : 'min-h-[36px] px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-[11px] whitespace-nowrap transition'"
            >
              Cualquier Entrega
            </button>
            <button
              type="button"
              (click)="deliveryTypeFilterChange.emit('FULL_ALBUM')"
              [class]="deliveryTypeFilter() === 'FULL_ALBUM'
                ? 'min-h-[36px] px-2.5 py-1.5 rounded-xl bg-amber-400 text-zinc-950 font-bold text-[11px] whitespace-nowrap'
                : 'min-h-[36px] px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-[11px] whitespace-nowrap transition'"
            >
              📦 Álbum Completo
            </button>
            <button
              type="button"
              (click)="deliveryTypeFilterChange.emit('SINGLE_PHOTOS')"
              [class]="deliveryTypeFilter() === 'SINGLE_PHOTOS'
                ? 'min-h-[36px] px-2.5 py-1.5 rounded-xl bg-amber-400 text-zinc-950 font-bold text-[11px] whitespace-nowrap'
                : 'min-h-[36px] px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-[11px] whitespace-nowrap transition'"
            >
              🖼️ Fotos Sueltas
            </button>
            <button
              type="button"
              (click)="deliveryTypeFilterChange.emit('FREE_REDEMPTION')"
              [class]="deliveryTypeFilter() === 'FREE_REDEMPTION'
                ? 'min-h-[36px] px-2.5 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-[11px] whitespace-nowrap'
                : 'min-h-[36px] px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium text-[11px] whitespace-nowrap transition'"
            >
              🎁 Canje 100%
            </button>
          </div>
        </div>
      </div>

      <!-- Feedback de acciones de soporte sobre órdenes -->
      @if (renewFeedback(); as fb) {
        <div
          [class]="fb.success
            ? 'p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 animate-fadeIn'
            : 'p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 animate-fadeIn'"
        >
          <div class="flex items-center gap-2">
            <span>{{ fb.success ? '✅' : '⚠️' }}</span>
            <span class="font-medium">{{ fb.message }}</span>
          </div>
          <button
            type="button"
            (click)="dismissFeedback.emit()"
            class="text-xs text-zinc-600 hover:text-zinc-900 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      }

      <!-- Lista de Órdenes -->
      @if (isLoadingOrders() && totalOrdersCount() === 0) {
        <div class="p-16 text-center text-zinc-500 text-xs bg-white rounded-[32px] border border-black/[0.05] shadow-bento">
          <span class="inline-block w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mb-3"></span>
          <p class="font-medium text-zinc-700">Cargando ventas y órdenes registradas...</p>
        </div>
      } @else if (filteredCount() === 0) {
        <div class="p-16 text-center text-zinc-500 text-xs bg-white rounded-[32px] border border-black/[0.05] shadow-bento">
          <span class="text-4xl mb-3 block">💳</span>
          <h4 class="font-display font-bold text-base text-zinc-900 mb-1">No se encontraron ventas</h4>
          <p class="text-zinc-600 max-w-sm mx-auto">
            @if (hasActiveFilters()) {
              No hay órdenes que coincidan con los filtros aplicados.
            } @else {
              Aún no hay compras registradas en la plataforma.
            }
          </p>
          @if (hasActiveFilters()) {
            <button
              type="button"
              (click)="clearFilters.emit()"
              class="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition"
            >
              Limpiar Filtros
            </button>
          }
        </div>
      } @else {
        <div class="space-y-4">
          @for (order of paginatedOrders(); track order.id) {
            <div class="bg-white rounded-[28px] border border-black/[0.06] shadow-bento p-5 sm:p-6 space-y-4 hover:border-black/[0.12] transition">
              <!-- Fila Superior -->
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.04] pb-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-900 font-mono text-[11px] font-bold">
                    #{{ order.id.slice(0, 8) }}
                  </span>
                  <span class="text-xs text-zinc-600">
                    {{ order.createdAt | date:'dd/MM/yyyy • HH:mm' }} hs
                  </span>
                  @if (order.status === 'PAID') {
                    <span
                      [class]="order.isTokenExpired
                        ? 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200'
                        : 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200'"
                    >
                      {{ order.isTokenExpired ? '⌛ Enlace expirado (>72h)' : '🕒 Link vigente 72h' }}
                    </span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                      📥 {{ order.downloadCount ?? 0 }} descarga{{ (order.downloadCount ?? 0) === 1 ? '' : 's' }}
                    </span>
                  }
                </div>

                <div>
                  @if (order.status === 'PAID') {
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center gap-1.5">
                      <span>✅</span>
                      <span>Pagado</span>
                    </span>
                  } @else if (order.status === 'PENDING' || order.status === 'PROCESSING') {
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 flex items-center gap-1.5">
                      <span>⏳</span>
                      <span>{{ order.status === 'PROCESSING' ? 'Procesando' : 'Pendiente' }}</span>
                    </span>
                  } @else if (order.status === 'FRAUD_ALERT_PRICE_MISMATCH') {
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200/80 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Discrepancia / Alerta</span>
                    </span>
                  } @else {
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center gap-1">
                      <span>•</span>
                      <span>{{ order.status }}</span>
                    </span>
                  }
                </div>
              </div>

              <!-- Cliente / Álbum / Monto -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div class="bg-zinc-50/80 rounded-2xl p-3.5 border border-black/[0.03] space-y-1">
                  <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Datos del Cliente</span>
                  <div class="font-bold text-zinc-900 text-sm">
                    {{ order.customer.name || 'Cliente sin nombre' }}
                  </div>
                  <div class="text-zinc-700 font-mono text-[11px] break-all">
                    ✉️ {{ order.customer.email }}
                  </div>
                  <div class="pt-1">
                    @if (order.customer.phone) {
                      <button
                        type="button"
                        (click)="openCustomerWhatsApp.emit(order.customer.phone)"
                        class="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-[11px] border border-emerald-200/70 transition"
                      >
                        <span>📱</span>
                        <span>{{ order.customer.phone }}</span>
                        <span class="text-[10px] text-emerald-700 underline ml-0.5">Chat ↗</span>
                      </button>
                    } @else {
                      <span class="text-zinc-500 text-[11px] italic">Sin teléfono registrado</span>
                    }
                  </div>
                </div>

                <div class="bg-zinc-50/80 rounded-2xl p-3.5 border border-black/[0.03] space-y-1">
                  <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Evento / Álbum</span>
                  <div class="font-bold text-zinc-900 text-sm truncate" [title]="order.albumTitle || order.albumId || 'Álbum archivado / eliminado'">
                    📁 {{ order.albumTitle || order.albumId || 'Álbum archivado / eliminado' }}
                  </div>
                  <div class="pt-1">
                    @if (order.isFullAlbum) {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                        <span>🌟</span>
                        <span>Pack Álbum Completo</span>
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-lg border border-black/[0.04]">
                        <span>📸</span>
                        <span>{{ order.photoCount }} foto(s) individual(es)</span>
                      </span>
                    }
                  </div>
                </div>

                <div class="bg-zinc-50/80 rounded-2xl p-3.5 border border-black/[0.03] space-y-1">
                  <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Monto Total</span>
                  <div class="font-display font-black text-zinc-900 text-lg">
                    &dollar;{{ order.totalAmount.toLocaleString('es-AR') }} <span class="text-xs font-normal text-zinc-600">ARS</span>
                  </div>
                  @if (order.paymentId) {
                    <div class="text-[10px] text-zinc-600 font-mono">
                      MP Pago: #{{ order.paymentId }}
                    </div>
                  }
                  @if (order.preferenceId) {
                    <div class="text-[10px] text-zinc-500 font-mono truncate" [title]="order.preferenceId">
                      Pref: {{ order.preferenceId }}
                    </div>
                  }
                  @if (order.couponApplied) {
                    <div class="text-[10px] text-amber-800 font-semibold">
                      🏷️ Descuento: {{ order.couponApplied }} (-{{ order.discountPercentage }}%)
                    </div>
                  }
                </div>
              </div>

              <!-- Acciones -->
              <div class="pt-2">
                @if (order.status === 'PAID') {
                  <div class="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      (click)="renewToken.emit(order)"
                      [disabled]="renewingOrderId() === order.id"
                      class="min-h-[44px] px-4 py-2 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      title="Genera un nuevo link de descarga válido por otras 72 horas y lo copia"
                    >
                      @if (renewingOrderId() === order.id) {
                        <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Renovando...</span>
                      } @else if (copiedTokenOrderId() === order.id) {
                        <span>✅ ¡Copiado!</span>
                      } @else {
                        <span>🔄 Renovar 72h</span>
                      }
                    </button>

                    <button
                      type="button"
                      (click)="resendEmail.emit(order)"
                      [disabled]="resendingEmailOrderId() === order.id"
                      class="min-h-[44px] px-4 py-2 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                      title="Reenviar correo oficial con enlace directo de descarga"
                    >
                      @if (resendingEmailOrderId() === order.id) {
                        <span>Enviando...</span>
                      } @else {
                        <span>✉️ Reenviar Email</span>
                      }
                    </button>

                    <button
                      type="button"
                      (click)="sendWhatsApp.emit(order)"
                      class="min-h-[44px] px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-2"
                    >
                      <span>💬 Enviar Fotos por WhatsApp</span>
                    </button>

                    @if (order.downloadToken) {
                      <button
                        type="button"
                        (click)="copyLink.emit(order)"
                        class="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-800 font-semibold text-xs border border-black/[0.08] shadow-sm transition active:scale-95 flex items-center gap-1.5"
                      >
                        <span>📋</span>
                        <span>Copiar Enlace</span>
                      </button>
                    }
                  </div>
                } @else if (order.status === 'PENDING' || order.status === 'PROCESSING') {
                  <div class="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span>⏳</span>
                      <span>Esperando confirmación de cobro de Mercado Pago.</span>
                    </div>
                    <button
                      type="button"
                      (click)="verifyMp.emit(order)"
                      [disabled]="verifyingOrderId() === order.id"
                      class="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-950 hover:bg-zinc-800 text-white font-bold text-xs transition active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      @if (verifyingOrderId() === order.id) {
                        <span>Consultando MP...</span>
                      } @else {
                        <span>🔍 Verificar cobro en MP</span>
                      }
                    </button>
                  </div>
                } @else if (order.status === 'FRAUD_ALERT_PRICE_MISMATCH') {
                  <div class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    <span><strong>Alerta de Discrepancia:</strong> El monto pagado en Mercado Pago no coincide con el total. Verifica el comprobante antes de emitir un enlace.</span>
                  </div>
                }
              </div>
            </div>
          }

          @if (totalPages() > 1) {
            <div class="bg-white rounded-[24px] border border-black/[0.06] shadow-bento p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div class="text-xs text-zinc-600 font-medium">
                Mostrando <strong class="text-zinc-900 font-bold">{{ showingFrom() }}</strong> a <strong class="text-zinc-900 font-bold">{{ showingTo() }}</strong> de <strong class="text-zinc-900 font-bold">{{ filteredCount() }}</strong> órdenes
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  (click)="prevPage.emit()"
                  [disabled]="currentPage() === 1"
                  class="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-black/[0.08] bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-700 transition flex items-center justify-center"
                  aria-label="Página anterior de órdenes"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>

                @for (p of paginationPages(); track p) {
                  <button
                    type="button"
                    (click)="goToPage.emit(p)"
                    [class]="p === currentPage()
                      ? 'min-w-[44px] min-h-[44px] rounded-xl bg-zinc-900 text-white font-bold text-xs shadow-sm transition'
                      : 'min-w-[44px] min-h-[44px] rounded-xl border border-black/[0.08] bg-white hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition'"
                    [attr.aria-label]="'Ir a página ' + p"
                  >
                    {{ p }}
                  </button>
                }

                <button
                  type="button"
                  (click)="nextPage.emit()"
                  [disabled]="currentPage() === totalPages()"
                  class="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-black/[0.08] bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-700 transition flex items-center justify-center"
                  aria-label="Página siguiente de órdenes"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AdminOrdersTabComponent {
  public readonly albums = input<readonly Album[]>([]);
  public readonly paginatedOrders = input<readonly AdminOrder[]>([]);
  public readonly filteredCount = input<number>(0);
  public readonly totalOrdersCount = input<number>(0);
  public readonly isLoadingOrders = input<boolean>(false);
  public readonly ordersError = input<string | null>(null);
  public readonly renewFeedback = input<{ orderId: string; message: string; success: boolean } | null>(null);
  public readonly renewingOrderId = input<string | null>(null);
  public readonly verifyingOrderId = input<string | null>(null);
  public readonly resendingEmailOrderId = input<string | null>(null);
  public readonly copiedTokenOrderId = input<string | null>(null);

  public readonly totalPaidRevenue = input<number>(0);
  public readonly paidOrdersCount = input<number>(0);
  public readonly paidMpOrdersCount = input<number>(0);
  public readonly freeRedemptionOrdersCount = input<number>(0);
  public readonly photosSold = input<number>(0);
  public readonly albumsSold = input<number>(0);

  public readonly searchQuery = input<string>('');
  public readonly albumFilter = input<string>('ALL');
  public readonly statusFilter = input<'ALL' | AdminOrderStatus>('ALL');
  public readonly deliveryTypeFilter = input<'ALL' | 'FULL_ALBUM' | 'SINGLE_PHOTOS' | 'FREE_REDEMPTION'>('ALL');
  public readonly dateFrom = input<string>('');
  public readonly dateTo = input<string>('');
  public readonly hasActiveFilters = input<boolean>(false);

  public readonly currentPage = input<number>(1);
  public readonly totalPages = input<number>(1);
  public readonly showingFrom = input<number>(0);
  public readonly showingTo = input<number>(0);
  public readonly paginationPages = input<readonly number[]>([]);

  public readonly syncOrders = output<void>();
  public readonly exportCsv = output<void>();
  public readonly searchQueryChange = output<string>();
  public readonly albumFilterChange = output<string>();
  public readonly statusFilterChange = output<'ALL' | AdminOrderStatus>();
  public readonly deliveryTypeFilterChange = output<'ALL' | 'FULL_ALBUM' | 'SINGLE_PHOTOS' | 'FREE_REDEMPTION'>();
  public readonly dateFromChange = output<string>();
  public readonly dateToChange = output<string>();
  public readonly clearFilters = output<void>();
  public readonly dismissFeedback = output<void>();
  public readonly renewToken = output<AdminOrder>();
  public readonly verifyMp = output<AdminOrder>();
  public readonly resendEmail = output<AdminOrder>();
  public readonly sendWhatsApp = output<AdminOrder>();
  public readonly copyLink = output<AdminOrder>();
  public readonly openCustomerWhatsApp = output<string>();
  public readonly prevPage = output<void>();
  public readonly nextPage = output<void>();
  public readonly goToPage = output<number>();

  public onSearchInput(event: Event): void {
    this.searchQueryChange.emit((event.target as HTMLInputElement).value);
  }

  public onAlbumSelectChange(event: Event): void {
    this.albumFilterChange.emit((event.target as HTMLSelectElement).value);
  }

  public onDateFromInput(event: Event): void {
    this.dateFromChange.emit((event.target as HTMLInputElement).value);
  }

  public onDateToInput(event: Event): void {
    this.dateToChange.emit((event.target as HTMLInputElement).value);
  }
}
