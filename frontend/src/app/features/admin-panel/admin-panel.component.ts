import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, untracked, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import QRCode from 'qrcode';
import { AdminAuthStore } from '../../core/state/admin-auth.store';
import { CartStore } from '../../core/state/cart.store';
import { AdminService } from '../../core/services/admin.service';
import { AlbumService } from '../../core/services/album.service';
import { CategoryService } from '../../core/services/category.service';
import { CategoryDTO, DEFAULT_CATEGORIES } from '../../core/models/category.model';
import { Album, AlbumCategory } from '../../core/models/album.model';
import {
  AdminStats,
  DriveImportResponse,
  BulkUploadResponse,
  ProcessedPhotoSummary,
  RegisterPhotographerResponse,
  CreateAlbumRequest,
  UpdateAlbumRequest,
  TrashAlbum,
  AdminOrder,
  AdminOrderStatus,
  AdminAlbumPhoto,
  PricingTierConfig,
  CouponDTO,
  CreateCouponRequest
} from '../../core/models/admin.model';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css'
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  public readonly adminAuthStore = inject(AdminAuthStore);
  public readonly cartStore = inject(CartStore);
  public readonly adminService = inject(AdminService);
  public readonly albumService = inject(AlbumService);
  public readonly categoryService = inject(CategoryService);

  // Eventos hacia el contenedor principal
  public readonly goHome = output<void>();
  public readonly logout = output<void>();

  // Pestaña activa: 'albums' | 'orders' | 'promotions' | 'trash' | 'drive' | 'upload' | 'photographers'
  public readonly activeTab = signal<'albums' | 'orders' | 'promotions' | 'trash' | 'drive' | 'upload' | 'photographers'>('albums');

  // Gestor Dinámico de Categorías e Insignias (Frente 2)
  public readonly categories = signal<readonly CategoryDTO[]>(DEFAULT_CATEGORIES);
  public readonly isLoadingCategories = signal<boolean>(false);
  public readonly isCategoryModalOpen = signal<boolean>(false);
  public readonly isSavingCategory = signal<boolean>(false);
  public readonly isDeletingCategoryId = signal<string | null>(null);
  public readonly confirmingDeleteCategoryId = signal<string | null>(null);
  private deleteCategoryTimer: any = null;
  public readonly editingCategory = signal<CategoryDTO | null>(null);
  public readonly categoryFeedback = signal<{ message: string; success: boolean } | null>(null);

  public readonly CURATED_ICONS: readonly string[] = [
    '⚽', '🏍️', '🏎️', '🏑', '🏀', '🏉', '🏐', '🎾', '🚴', '🏃',
    '🥊', '🏊', '🏆', '🥇', '🎉', '🎂', '💍', '🎓', '🎸', '💃',
    '📸', '✨', '🔥', '⭐'
  ];

  public readonly categoryForm = this.fb.nonNullable.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    icon: ['📸', [Validators.required]],
    badgeLabel: [''],
    order: [1],
    isActive: [true]
  });

  // Órdenes y Entregas (Ventas Mercado Pago - Frente 4)
  public readonly orders = signal<readonly AdminOrder[]>([]);
  public readonly isLoadingOrders = signal<boolean>(false);
  public readonly ordersError = signal<string | null>(null);
  public readonly renewingOrderId = signal<string | null>(null);
  public readonly copiedTokenOrderId = signal<string | null>(null);
  public readonly renewFeedback = signal<{ orderId: string; message: string; success: boolean } | null>(null);
  public readonly orderStatusFilter = signal<'ALL' | AdminOrderStatus>('ALL');
  public readonly orderSearchQuery = signal<string>('');
  public readonly ordersAlbumFilter = signal<string>('ALL');
  public readonly ordersDeliveryTypeFilter = signal<'ALL' | 'FULL_ALBUM' | 'SINGLE_PHOTOS' | 'FREE_REDEMPTION'>('ALL');

  // Paginación de ventas y entregas (6 órdenes por página)
  public readonly ordersCurrentPage = signal<number>(1);
  public readonly ordersPageSize = signal<number>(6);

  public readonly filteredOrders = computed(() => {
    let list = this.orders();
    const filter = this.orderStatusFilter();
    const query = this.orderSearchQuery().toLowerCase().trim();
    const albumFilter = this.ordersAlbumFilter();
    const deliveryFilter = this.ordersDeliveryTypeFilter();

    if (filter !== 'ALL') {
      list = list.filter(o => o.status === filter);
    }

    if (albumFilter !== 'ALL') {
      list = list.filter(o => o.albumId === albumFilter);
    }

    if (deliveryFilter === 'FULL_ALBUM') {
      list = list.filter(o => Boolean(o.isFullAlbum));
    } else if (deliveryFilter === 'SINGLE_PHOTOS') {
      list = list.filter(o => !o.isFullAlbum && (o.totalAmount || 0) > 0);
    } else if (deliveryFilter === 'FREE_REDEMPTION') {
      list = list.filter(o => (o.totalAmount || 0) === 0);
    }

    if (query) {
      list = list.filter(o =>
        o.id.toLowerCase().includes(query) ||
        o.customer.email.toLowerCase().includes(query) ||
        (o.customer.name && o.customer.name.toLowerCase().includes(query)) ||
        (o.albumTitle && o.albumTitle.toLowerCase().includes(query)) ||
        (o.customer.phone && o.customer.phone.includes(query))
      );
    }

    return list;
  });

  public readonly ordersTotalPages = computed(() => {
    const total = this.filteredOrders().length;
    return Math.max(1, Math.ceil(total / this.ordersPageSize()));
  });

  public readonly paginatedAdminOrders = computed(() => {
    const list = this.filteredOrders();
    const page = this.ordersCurrentPage();
    const size = this.ordersPageSize();
    const from = (page - 1) * size;
    return list.slice(from, from + size);
  });

  public readonly ordersPaginationPages = computed<number[]>(() => {
    const total = this.ordersTotalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  public readonly ordersShowingFrom = computed(() => {
    const total = this.filteredOrders().length;
    if (total === 0) return 0;
    return (this.ordersCurrentPage() - 1) * this.ordersPageSize() + 1;
  });

  public readonly ordersShowingTo = computed(() => {
    const total = this.filteredOrders().length;
    return Math.min(this.ordersCurrentPage() * this.ordersPageSize(), total);
  });

  public goToOrdersPage(page: number): void {
    if (page >= 1 && page <= this.ordersTotalPages()) {
      this.ordersCurrentPage.set(page);
    }
  }

  public nextOrdersPage(): void {
    if (this.ordersCurrentPage() < this.ordersTotalPages()) {
      this.goToOrdersPage(this.ordersCurrentPage() + 1);
    }
  }

  public prevOrdersPage(): void {
    if (this.ordersCurrentPage() > 1) {
      this.goToOrdersPage(this.ordersCurrentPage() - 1);
    }
  }

  // KPIs matemáticos sincronizados con exactitud contable
  public readonly totalPaidRevenue = computed(() => {
    return this.orders()
      .filter(o => o.status === 'PAID')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  });

  public readonly paidOrdersCount = computed(() => {
    return this.orders().filter(o => o.status === 'PAID').length;
  });

  public readonly paidMpOrdersCount = computed(() => {
    return this.orders().filter(o => o.status === 'PAID' && (o.totalAmount || 0) > 0).length;
  });

  public readonly freeRedemptionOrdersCount = computed(() => {
    return this.orders().filter(o => o.status === 'PAID' && (o.totalAmount || 0) === 0).length;
  });

  public readonly photosSold = computed(() => {
    return this.orders()
      .filter(o => o.status === 'PAID' && !o.isFullAlbum)
      .reduce((sum, o) => sum + (o.photoCount || o.photoIds?.length || 1), 0);
  });

  public readonly albumsSold = computed(() => {
    return this.orders().filter(o => o.status === 'PAID' && Boolean(o.isFullAlbum)).length;
  });

  // Álbumes disponibles en el sistema (vista administrativa y formularios)
  public readonly albums = signal<readonly Album[]>([]);
  public readonly isLoadingAlbums = signal<boolean>(false);

  // Papelera de reciclaje (30 días de gracia)
  public readonly trashAlbums = signal<readonly TrashAlbum[]>([]);
  public readonly isLoadingTrash = signal<boolean>(false);
  public readonly isRestoringId = signal<string | null>(null);
  public readonly isPurgingId = signal<string | null>(null);
  public readonly albumToPurge = signal<TrashAlbum | null>(null);
  public readonly isPurgeModalOpen = signal<boolean>(false);
  public readonly isMovingToTrashId = signal<string | null>(null);
  public readonly isTogglingCourtesyId = signal<string | null>(null);
  public readonly isUpdatingPrivacyId = signal<string | null>(null);
  public readonly editingPrivacyAlbumId = signal<string | null>(null);
  public readonly privacyAccessCodeInput = signal<string>('');
  public readonly privacyError = signal<string | null>(null);

  // Modal de Confirmación Bento: Mover a Papelera
  public readonly albumToTrash = signal<Album | null>(null);
  public readonly isTrashModalOpen = signal<boolean>(false);

  // Difusión WhatsApp en 1 clic
  public readonly copiedWhatsAppAlbumId = signal<string | null>(null);

  // Modal Bento de Código QR para Eventos
  public readonly isQrModalOpen = signal<boolean>(false);
  public readonly qrAlbum = signal<Album | null>(null);
  public readonly qrDataUrl = signal<string>('');
  public readonly isGeneratingQr = signal<boolean>(false);
  public readonly qrCopied = signal<boolean>(false);

  // Previsualizaciones locales de imágenes en Subida Masiva
  public readonly filePreviewUrls = signal<readonly string[]>([]);

  // Sistema de Toast Bento Flotante
  public readonly toast = signal<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  private toastTimer: any = null;

  // Modal de Gestión de Fotos del Álbum
  public readonly isPhotosModalOpen = signal<boolean>(false);
  public readonly selectedAlbumForPhotos = signal<Album | null>(null);
  public readonly albumPhotos = signal<readonly AdminAlbumPhoto[]>([]);
  public readonly isLoadingAlbumPhotos = signal<boolean>(false);
  public readonly photosModalError = signal<string | null>(null);
  public readonly photosModalFeedback = signal<{ message: string; success: boolean } | null>(null);
  public readonly updatingPhotoId = signal<string | null>(null);
  public readonly deletingPhotoId = signal<string | null>(null);
  public readonly confirmingDeletePhotoId = signal<string | null>(null);
  private deletePhotoTimer: any = null;

  // Reordenamiento interactivo de fotos gestionadas
  public readonly draggedPhotoIndex = signal<number | null>(null);
  public readonly dragOverPhotoIndex = signal<number | null>(null);
  public readonly isPhotosOrderDirty = signal<boolean>(false);
  public readonly isSavingPhotosOrder = signal<boolean>(false);

  // Estado de actualización de visibilidad (Ocultar/Publicar) por tarjeta
  public readonly isTogglingPublishId = signal<string | null>(null);

  // --- Barra de Búsqueda y Filtros Reactivos de Álbumes ---
  public readonly albumSearchQuery = signal<string>('');
  public readonly albumCategoryFilter = signal<string>('todos');
  public readonly albumStatusFilter = signal<'todos' | 'publicados' | 'ocultos' | 'privados' | 'cortesia'>('todos');
  public readonly albumSortBy = signal<'recientes' | 'antiguos' | 'mas_fotos' | 'menos_fotos'>('recientes');

  public readonly hasActiveAlbumFilters = computed<boolean>(() => {
    return Boolean(
      this.albumSearchQuery().trim() ||
      this.albumCategoryFilter() !== 'todos' ||
      this.albumStatusFilter() !== 'todos' ||
      this.albumSortBy() !== 'recientes'
    );
  });

  public readonly filteredAdminAlbums = computed<Album[]>(() => {
    let result = [...this.albums()];

    // 1. Filtro por texto de búsqueda (título, subtítulo, id, fecha, ubicación)
    const query = this.albumSearchQuery().trim().toLowerCase();
    if (query) {
      result = result.filter(a =>
        a.title.toLowerCase().includes(query) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(query)) ||
        a.id.toLowerCase().includes(query) ||
        (a.date && a.date.toLowerCase().includes(query)) ||
        (a.location && a.location.toLowerCase().includes(query))
      );
    }

    // 2. Filtro por categoría
    const cat = this.albumCategoryFilter();
    if (cat !== 'todos') {
      result = result.filter(a => a.category === cat);
    }

    // 3. Filtro por estado
    const status = this.albumStatusFilter();
    if (status === 'publicados') {
      result = result.filter(a => a.isPublished !== false);
    } else if (status === 'ocultos') {
      result = result.filter(a => a.isPublished === false);
    } else if (status === 'privados') {
      result = result.filter(a => Boolean(a.isPrivate));
    } else if (status === 'cortesia') {
      result = result.filter(a => Boolean(a.isFreeDownload));
    }

    // 4. Criterio de ordenamiento
    const sort = this.albumSortBy();
    if (sort === 'recientes') {
      result.sort((a, b) => (b.eventDate || b.date || '').localeCompare(a.eventDate || a.date || ''));
    } else if (sort === 'antiguos') {
      result.sort((a, b) => (a.eventDate || a.date || '').localeCompare(b.eventDate || b.date || ''));
    } else if (sort === 'mas_fotos') {
      result.sort((a, b) => (b.photosCount || 0) - (a.photosCount || 0));
    } else if (sort === 'menos_fotos') {
      result.sort((a, b) => (a.photosCount || 0) - (b.photosCount || 0));
    }

    return result;
  });

  public clearAlbumFilters(): void {
    this.albumSearchQuery.set('');
    this.albumCategoryFilter.set('todos');
    this.albumStatusFilter.set('todos');
    this.albumSortBy.set('recientes');
    this.currentPage.set(1);
  }

  // Paginación en pestaña de álbumes administrativos
  public readonly currentPage = signal<number>(1);
  public readonly pageSize = signal<number>(6);

  public readonly totalPages = computed(() => {
    const total = this.filteredAdminAlbums().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  public readonly paginatedAlbums = computed(() => {
    const list = this.filteredAdminAlbums();
    const page = this.currentPage();
    const size = this.pageSize();
    const from = (page - 1) * size;
    return list.slice(from, from + size);
  });

  public readonly paginationPages = computed<number[]>(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  public readonly showingFrom = computed(() => {
    const total = this.filteredAdminAlbums().length;
    if (total === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  public readonly showingTo = computed(() => {
    const total = this.filteredAdminAlbums().length;
    return Math.min(this.currentPage() * this.pageSize(), total);
  });

  public goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  public nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  public prevPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  // Estado de Modal de Creación de Álbum
  public readonly isCreateModalOpen = signal<boolean>(false);
  public readonly isCreatingAlbum = signal<boolean>(false);
  public readonly createAlbumError = signal<string | null>(null);
  public readonly createAlbumSuccess = signal<string | null>(null);
  public readonly pendingTargetForm = signal<'drive' | 'bulk' | null>(null);

  // Modal Bento de Edición de Álbum
  public readonly isEditAlbumModalOpen = signal<boolean>(false);
  public readonly editingAlbum = signal<Album | null>(null);
  public readonly isUpdatingAlbum = signal<boolean>(false);
  public readonly editAlbumError = signal<string | null>(null);

  // Borradores de edición de precios por tarjeta: { [albumId]: { unitPrice, fullAlbumPrice } }
  public readonly priceDrafts = signal<Record<string, { unitPrice: number; fullAlbumPrice: number }>>({});
  public readonly updatingAlbumId = signal<string | null>(null);
  public readonly updateFeedback = signal<{ albumId: string; message: string; success: boolean } | null>(null);

  // Estadísticas en vivo
  public readonly stats = signal<AdminStats>({
    photosSold: 43,
    albumsSold: 3,
    revenueARS: 64200,
    storageUsedGB: 0,
    storageLimitGB: 10,
    activeAlbumsCount: 4,
    lastUpdated: new Date().toISOString()
  });

  // Estados de carga de operaciones
  public readonly isDriveImporting = signal<boolean>(false);
  public readonly isBulkUploading = signal<boolean>(false);
  public readonly uploadProgress = signal<number>(0);
  public readonly isRegisteringPhotographer = signal<boolean>(false);

  // Respuestas y feedback
  public readonly driveResult = signal<DriveImportResponse | null>(null);
  public readonly driveError = signal<string | null>(null);

  public readonly bulkResult = signal<BulkUploadResponse | null>(null);
  public readonly bulkError = signal<string | null>(null);

  public readonly photographerResult = signal<RegisterPhotographerResponse | null>(null);
  public readonly photographerError = signal<string | null>(null);

  // Archivos seleccionados para subida masiva
  public readonly selectedFiles = signal<File[]>([]);
  public readonly hdIndices = signal<number[]>([0, 1]);
  public readonly draggedQueueIndex = signal<number | null>(null);
  public readonly dragOverQueueIndex = signal<number | null>(null);
  public readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB límite Supabase Storage

  public readonly oversizedFiles = computed(() =>
    this.selectedFiles().filter(f => f.size > this.MAX_FILE_SIZE_BYTES)
  );

  public readonly hasOversizedFiles = computed(() => this.oversizedFiles().length > 0);

  // Helper para fecha ISO de hoy (YYYY-MM-DD)
  public getTodayIsoDate(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper para previsualización amigable de fecha y hora
  public formatEventDatePreview(dateIso?: string, time?: string): string {
    if (!dateIso) return '';
    try {
      const parts = dateIso.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        const dateObj = new Date(year, month - 1, day);
        const formatted = dateObj.toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        return time ? `${formatted} • ${time} hs` : formatted;
      }
      return dateIso;
    } catch {
      return dateIso;
    }
  }

  // Formulario de Creación de Nuevo Álbum
  public readonly createAlbumForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(4)]],
    category: ['futbol' as AlbumCategory, [Validators.required]],
    subtitle: ['', [Validators.required]],
    date: [''],
    eventDate: [this.getTodayIsoDate(), [Validators.required]],
    eventTime: ['16:30', [Validators.required]],
    location: ['Estadio Carlos A. Mercado Luna, La Rioja', [Validators.required]],
    unitPrice: [1200, [Validators.required, Validators.min(100)]],
    fullAlbumPrice: [9500, [Validators.required, Validators.min(500)]],
    badge: ['⚽ Fútbol', [Validators.required]],
    coverUrl: [''],
    isPublished: [true],
    isFreeDownload: [false],
    isPrivate: [false],
    accessCode: ['']
  });

  // Formulario de Edición de Datos del Álbum
  public readonly editAlbumForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    subtitle: [''],
    category: ['futbol' as AlbumCategory, [Validators.required]],
    badge: [''],
    eventDate: [''],
    eventTime: [''],
    location: ['']
  });

  // Formulario de Importación de Google Drive
  public readonly driveForm = this.fb.nonNullable.group({
    albumId: ['album-1', [Validators.required]],
    driveUrl: ['', [Validators.required, Validators.pattern(/https:\/\/(drive\.google\.com|docs\.google\.com)\/.+/)]],
    watermarkText: ['LA TERCERA • MUESTRA', [Validators.required]],
    concurrencyLimit: [3, [Validators.min(1), Validators.max(10)]],
    markHdFirstN: [2, [Validators.min(0), Validators.max(10)]]
  });

  // Formulario de Subida Masiva Directa
  public readonly bulkForm = this.fb.nonNullable.group({
    albumId: ['album-1', [Validators.required]],
    watermarkText: ['LA TERCERA • MUESTRA', [Validators.required]],
    concurrencyLimit: [3, [Validators.min(1), Validators.max(10)]]
  });

  // Formulario de Registro de Fotógrafo
  public readonly photographerForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['photographer', [Validators.required]]
  });

  // --- Promociones & Descuentos por Cantidad ---
  public readonly pricingConfig = signal<PricingTierConfig>({
    enableTierDiscounts: true,
    tier3DiscountPercent: 20,
    tier5DiscountPercent: 30,
    capAtFullAlbumPrice: true
  });
  public readonly coupons = signal<readonly CouponDTO[]>([]);
  public readonly isLoadingPromotions = signal<boolean>(false);
  public readonly isSavingPricingConfig = signal<boolean>(false);
  public readonly isCreatingCoupon = signal<boolean>(false);
  public readonly isTogglingCouponCode = signal<string | null>(null);
  public readonly isDeletingCouponCode = signal<string | null>(null);
  public readonly promotionsFeedback = signal<{ message: string; success: boolean } | null>(null);

  // Filtros, búsqueda y paginación para Cupones (Frente 3)
  public readonly couponSearchQuery = signal<string>('');
  public readonly couponStatusFilter = signal<'ALL' | 'ACTIVE' | 'GIVEAWAY' | 'EXHAUSTED'>('ALL');
  public readonly couponsCurrentPage = signal<number>(1);
  public readonly couponsPageSize = signal<number>(6);

  public readonly filteredCoupons = computed(() => {
    let list = this.coupons();
    const query = this.couponSearchQuery().trim().toUpperCase();
    const filter = this.couponStatusFilter();

    if (query) {
      list = list.filter(c =>
        c.code.toUpperCase().includes(query) ||
        (c.albumId && c.albumId.toLowerCase().includes(query.toLowerCase()))
      );
    }

    if (filter === 'ACTIVE') {
      list = list.filter(c => c.isActive && (c.maxUses == null || c.usedCount < c.maxUses));
    } else if (filter === 'GIVEAWAY') {
      list = list.filter(c => c.discountPercent === 100);
    } else if (filter === 'EXHAUSTED') {
      list = list.filter(c => c.maxUses != null && c.usedCount >= c.maxUses);
    }

    return list;
  });

  public readonly couponsTotalPages = computed(() => {
    const total = this.filteredCoupons().length;
    return Math.max(1, Math.ceil(total / this.couponsPageSize()));
  });

  public readonly paginatedCoupons = computed(() => {
    const list = this.filteredCoupons();
    const page = this.couponsCurrentPage();
    const size = this.couponsPageSize();
    const from = (page - 1) * size;
    return list.slice(from, from + size);
  });

  public readonly couponsPaginationPages = computed<number[]>(() => {
    const total = this.couponsTotalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  public goToCouponsPage(page: number): void {
    if (page >= 1 && page <= this.couponsTotalPages()) {
      this.couponsCurrentPage.set(page);
    }
  }

  public nextCouponsPage(): void {
    if (this.couponsCurrentPage() < this.couponsTotalPages()) {
      this.goToCouponsPage(this.couponsCurrentPage() + 1);
    }
  }

  public prevCouponsPage(): void {
    if (this.couponsCurrentPage() > 1) {
      this.goToCouponsPage(this.couponsCurrentPage() - 1);
    }
  }

  // Formulario de Configuración de Descuentos por Cantidad
  public readonly pricingConfigForm = this.fb.nonNullable.group({
    enableTierDiscounts: [true],
    tier3DiscountPercent: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
    tier5DiscountPercent: [30, [Validators.required, Validators.min(0), Validators.max(100)]],
    capAtFullAlbumPrice: [true]
  });

  // Formulario de Creación de Cupones
  public readonly createCouponForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(3)]],
    discountPercent: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    maxUses: [null as number | null],
    albumId: [null as string | null],
    maxPhotos: [null as number | null]
  });

  public presetGiveawayCoupon(): void {
    const currentCode = this.createCouponForm.get('code')?.value?.trim();
    this.createCouponForm.patchValue({
      code: currentCode && currentCode.length > 0 ? currentCode : 'SORTEO100',
      discountPercent: 100,
      maxUses: 1,
      maxPhotos: 1
    });
  }

  constructor() {
    // Resetear a página 1 al modificar cualquier criterio de búsqueda o filtro de álbumes
    effect(() => {
      this.albumSearchQuery();
      this.albumCategoryFilter();
      this.albumStatusFilter();
      this.albumSortBy();
      untracked(() => {
        this.currentPage.set(1);
      });
    });

    // Auto-ajustar currentPage si supera totalPages tras borrados o filtrados
    effect(() => {
      const maxPages = this.totalPages();
      const current = this.currentPage();
      if (current > maxPages) {
        untracked(() => {
          this.currentPage.set(maxPages);
        });
      }
    });

    // Resetear a página 1 al cambiar filtros de órdenes
    effect(() => {
      this.orderStatusFilter();
      this.orderSearchQuery();
      this.ordersAlbumFilter();
      this.ordersDeliveryTypeFilter();
      untracked(() => {
        this.ordersCurrentPage.set(1);
      });
    });

    // Auto-ajustar ordersCurrentPage si supera ordersTotalPages
    effect(() => {
      const maxPages = this.ordersTotalPages();
      const current = this.ordersCurrentPage();
      if (current > maxPages) {
        untracked(() => {
          this.ordersCurrentPage.set(maxPages);
        });
      }
    });

    // Resetear a página 1 al cambiar filtros de cupones
    effect(() => {
      this.couponSearchQuery();
      this.couponStatusFilter();
      untracked(() => {
        this.couponsCurrentPage.set(1);
      });
    });

    // Auto-ajustar couponsCurrentPage si supera couponsTotalPages
    effect(() => {
      const maxPages = this.couponsTotalPages();
      const current = this.couponsCurrentPage();
      if (current > maxPages) {
        untracked(() => {
          this.couponsCurrentPage.set(maxPages);
        });
      }
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadAlbums();
    this.loadTrashAlbums();
    this.loadStats();
    this.loadOrders();
    this.loadPromotions();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrls();
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    if (this.deletePhotoTimer) {
      clearTimeout(this.deletePhotoTimer);
    }
  }

  // --- Sistema de Toast Bento Flotante ---
  public showToast(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    durationMs: number = 4000
  ): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toast.set({ message, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, durationMs);
  }

  public dismissToast(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toast.set(null);
  }

  // --- Difusión de Enlaces para WhatsApp en 1 Clic ---
  public copyWhatsAppShareText(album: Album): void {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
    const albumUrl = `${origin}/?album=${encodeURIComponent(album.id)}`;

    let shareMessage = `📸 ¡Ya están las fotos de ${album.title} en LA TERCERA! Mirá las muestras y descargá las tuyas en 4K acá: ${albumUrl} (Foto suelta: $${album.unitPrice} | Pack completo: $${album.fullAlbumPrice})`;

    if (album.isPrivate && album.accessCode && album.accessCode !== '********') {
      shareMessage += ` • 🔒 PIN de acceso: ${album.accessCode}`;
    }

    this.copiedWhatsAppAlbumId.set(album.id);
    this.showToast('¡Texto para WhatsApp copiado al portapapeles!', 'success');
    setTimeout(() => {
      if (this.copiedWhatsAppAlbumId() === album.id) {
        this.copiedWhatsAppAlbumId.set(null);
      }
    }, 2500);

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareMessage).catch(() => {
        this.copiedWhatsAppAlbumId.set(null);
        this.showToast('No se pudo copiar al portapapeles', 'error');
      });
    }
  }

  // --- Generador de Código QR por Álbum ---

  public async openQrModal(album: Album): Promise<void> {
    this.qrAlbum.set(album);
    this.isQrModalOpen.set(true);
    this.isGeneratingQr.set(true);
    this.qrCopied.set(false);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://latercera.com.ar';
    const url = `${origin}/?album=${encodeURIComponent(album.id)}`;

    try {
      const qr = (QRCode as any).default || QRCode;
      const dataUrl = await qr.toDataURL(url, {
        width: 360,
        margin: 2,
        color: {
          dark: '#131316',
          light: '#FFFFFF'
        }
      });
      this.qrDataUrl.set(dataUrl);
    } catch {
      this.showToast('No se pudo generar el código QR', 'error');
    } finally {
      this.isGeneratingQr.set(false);
    }
  }

  public closeQrModal(): void {
    this.isQrModalOpen.set(false);
    this.qrAlbum.set(null);
    this.qrDataUrl.set('');
    this.qrCopied.set(false);
  }

  public async copyQrAlbumLink(): Promise<void> {
    const album = this.qrAlbum();
    if (!album) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://latercera.com.ar';
    const url = `${origin}/?album=${encodeURIComponent(album.id)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        this.qrCopied.set(true);
        this.showToast('¡Enlace directo del álbum copiado al portapapeles!', 'success');
        setTimeout(() => this.qrCopied.set(false), 2500);
      } catch {
        this.showToast('No se pudo copiar el enlace', 'error');
      }
    }
  }

  public async downloadQrCard(album: Album): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const qrDataUrl = this.qrDataUrl();
      if (!qrDataUrl) return;

      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1050;
      const ctx = canvas.getContext ? canvas.getContext('2d') : null;
      if (!ctx) {
        // Fallback defensivo para entornos sin Canvas 2D completo (ej. jsdom)
        const fallbackLink = document.createElement('a');
        fallbackLink.download = `tarjeta-qr-${album.id}.png`;
        fallbackLink.href = qrDataUrl;
        fallbackLink.click();
        this.showToast('Tarjeta QR descargada en PNG para imprimir o compartir', 'success');
        return;
      }

      // 1. Fondo elegante oscuro #131316
      ctx.fillStyle = '#131316';
      ctx.fillRect(0, 0, 800, 1050);

      // Franja dorada superior
      const gradHeader = ctx.createLinearGradient(0, 0, 800, 0);
      gradHeader.addColorStop(0, '#FDB813');
      gradHeader.addColorStop(0.5, '#F59E0B');
      gradHeader.addColorStop(1, '#D97706');
      ctx.fillStyle = gradHeader;
      ctx.fillRect(0, 0, 800, 12);

      // 2. Encabezado Branding
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LA TERCERA • FOTOGRAFÍA', 400, 72);

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '500 18px sans-serif';
      ctx.fillText('Jenifer "Yuyo" Espeche • Coberturas Deportivas & Sociales', 400, 104);

      // Separador fino
      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 128);
      ctx.lineTo(720, 128);
      ctx.stroke();

      // 3. Tarjeta Bento del Evento
      ctx.fillStyle = '#1E1E24';
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(80, 150, 640, 125, 16);
      } else {
        ctx.rect(80, 150, 640, 125);
      }
      ctx.fill();
      ctx.strokeStyle = '#2E2E36';
      ctx.stroke();

      // Badge del Álbum
      ctx.fillStyle = '#FDB813';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(album.badge ? album.badge.toUpperCase() : 'COBERTURA OFICIAL', 400, 185);

      // Título del Álbum
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      const title = album.title.length > 40 ? album.title.substring(0, 38) + '...' : album.title;
      ctx.fillText(title, 400, 222);

      // Subtítulo y Fecha
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px sans-serif';
      const meta = [album.subtitle, album.date].filter(Boolean).join(' • ');
      ctx.fillText(meta, 400, 252);

      // 4. Marco Blanco para el Código QR
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(190, 305, 420, 420, 24);
      } else {
        ctx.rect(190, 305, 420, 420);
      }
      ctx.fill();

      // Dibujar imagen del QR
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
      });
      ctx.drawImage(img, 220, 335, 360, 360);

      // 5. Llamado a la acción (CTA)
      ctx.fillStyle = '#FDB813';
      ctx.font = 'bold 21px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESCANEÁ CON TU CELULAR', 400, 765);

      ctx.fillStyle = '#E4E4E7';
      ctx.font = '15px sans-serif';
      ctx.fillText('Para ver y descargar tus fotos en máxima calidad 4K', 400, 796);

      // 6. Si es privado, bloque de PIN destacado
      if (album.isPrivate && album.accessCode) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(200, 825, 400, 52, 12);
        } else {
          ctx.rect(200, 825, 400, 52);
        }
        ctx.fill();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`🔒 PIN DE ACCESO: ${album.accessCode}`, 400, 858);
      } else {
        ctx.fillStyle = '#71717A';
        ctx.font = '14px sans-serif';
        if (album.isFreeDownload) {
          ctx.fillText('🎁 Álbum Liberado de Cortesía Oficial • Descarga 100% Gratuita', 400, 855);
        } else {
          ctx.fillText(`Foto Individual: $${album.unitPrice.toLocaleString('es-AR')} • Pack Álbum Completo: $${album.fullAlbumPrice.toLocaleString('es-AR')}`, 400, 855);
        }
      }

      // 7. Pie de Tarjeta
      ctx.fillStyle = '#52525B';
      ctx.font = '13px sans-serif';
      ctx.fillText('WhatsApp: +54 9 380 486-8714  •  www.latercera.com.ar', 400, 1000);

      // 8. Disparar Descarga PNG
      const link = document.createElement('a');
      link.download = `tarjeta-qr-${album.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast('Tarjeta QR descargada en PNG para imprimir o compartir', 'success');
    } catch {
      this.showToast('No fue posible generar la imagen de la tarjeta QR', 'error');
    }
  }

  public loadOrders(): void {
    this.isLoadingOrders.set(true);
    this.ordersError.set(null);
    this.adminService.getAdminOrders().subscribe({
      next: (res) => {
        this.isLoadingOrders.set(false);
        if (res.success && res.orders) {
          const albumMap = new Map(this.albums().map(a => [a.id, a.title]));
          const enriched = res.orders.map(o => ({
            ...o,
            albumTitle: o.albumTitle || albumMap.get(o.albumId) || (o.albumId ? o.albumId : 'Álbum archivado / eliminado')
          }));
          this.orders.set(enriched);
        }
      },
      error: (err) => {
        this.isLoadingOrders.set(false);
        this.ordersError.set(err.error?.error || 'Error al sincronizar las ventas.');
      }
    });
  }

  public renewOrderToken(order: AdminOrder): void {
    this.renewingOrderId.set(order.id);
    this.renewFeedback.set(null);

    this.adminService.regenerateOrderToken(order.id).subscribe({
      next: (res) => {
        this.renewingOrderId.set(null);
        if (res.success) {
          this.orders.update(list =>
            list.map(o =>
              o.id === order.id
                ? { ...o, downloadToken: res.downloadToken, downloadUrl: res.downloadUrl }
                : o
            )
          );

          if (typeof navigator !== 'undefined' && navigator.clipboard && res.downloadUrl) {
            navigator.clipboard.writeText(res.downloadUrl).catch(() => {});
          }

          this.copiedTokenOrderId.set(order.id);
          this.renewFeedback.set({
            orderId: order.id,
            message: '¡Enlace renovado por 72h y copiado al portapapeles! 📋',
            success: true
          });

          setTimeout(() => {
            if (this.copiedTokenOrderId() === order.id) {
              this.copiedTokenOrderId.set(null);
            }
          }, 4000);
        }
      },
      error: (err) => {
        this.renewingOrderId.set(null);
        this.renewFeedback.set({
          orderId: order.id,
          message: err.error?.error || 'Error al renovar el enlace de descarga.',
          success: false
        });
      }
    });
  }

  public sendWhatsApp(order: AdminOrder): void {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
    const downloadUrl = order.downloadUrl || `${origin}/pago-exitoso?token=${order.downloadToken}`;
    const customerName = order.customer.name ? ` ${order.customer.name}` : '';
    const albumName = order.albumTitle || 'tus fotos';

    const message = `¡Hola${customerName}! Te compartimos el enlace para descargar tus fotos en máxima calidad de "${albumName}" en La Tercera:\n\n${downloadUrl}\n\n⚠️ El enlace tiene una vigencia de 72 horas. ¡Muchas gracias por tu compra! 📸⚽`;
    const encodedMessage = encodeURIComponent(message);

    if (order.customer.phone) {
      const cleanPhone = order.customer.phone.replace(/[^0-9]/g, '');
      if (typeof window !== 'undefined') {
        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
      }
    } else {
      if (typeof window !== 'undefined') {
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
      }
    }
  }

  public copyDownloadLink(order: AdminOrder): void {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
    const downloadUrl = order.downloadUrl || `${origin}/pago-exitoso?token=${order.downloadToken}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard && downloadUrl) {
      navigator.clipboard.writeText(downloadUrl).then(() => {
        this.copiedTokenOrderId.set(order.id);
        setTimeout(() => {
          if (this.copiedTokenOrderId() === order.id) {
            this.copiedTokenOrderId.set(null);
          }
        }, 3000);
      }).catch(() => {});
    }
  }

  // --- Gestión de Promociones & Cupones ---
  public loadPromotions(): void {
    this.isLoadingPromotions.set(true);
    this.adminService.getPromotions().subscribe({
      next: (resp) => {
        this.isLoadingPromotions.set(false);
        if (resp && resp.success) {
          this.pricingConfig.set(resp.config);
          this.cartStore.setTierConfig(resp.config);
          this.coupons.set(resp.coupons);
          this.pricingConfigForm.patchValue({
            enableTierDiscounts: resp.config.enableTierDiscounts,
            tier3DiscountPercent: resp.config.tier3DiscountPercent,
            tier5DiscountPercent: resp.config.tier5DiscountPercent,
            capAtFullAlbumPrice: resp.config.capAtFullAlbumPrice
          });
        }
      },
      error: (err) => {
        this.isLoadingPromotions.set(false);
        console.error('Error al cargar promociones:', err);
      }
    });
  }

  public savePricingConfig(): void {
    if (this.pricingConfigForm.invalid || this.isSavingPricingConfig()) return;
    this.isSavingPricingConfig.set(true);
    this.promotionsFeedback.set(null);

    const val = this.pricingConfigForm.getRawValue();
    this.adminService.updatePricingConfig(val).subscribe({
      next: (resp) => {
        this.isSavingPricingConfig.set(false);
        if (resp && resp.success) {
          this.pricingConfig.set(resp.config);
          this.cartStore.setTierConfig(resp.config);
          this.promotionsFeedback.set({
            message: 'Configuración de descuentos por cantidad actualizada con éxito.',
            success: true
          });
          setTimeout(() => this.promotionsFeedback.set(null), 4000);
        }
      },
      error: (err) => {
        this.isSavingPricingConfig.set(false);
        this.promotionsFeedback.set({
          message: err?.error?.error || 'Error al guardar la configuración de descuentos.',
          success: false
        });
      }
    });
  }

  public createNewCoupon(): void {
    if (this.createCouponForm.invalid || this.isCreatingCoupon()) return;
    this.isCreatingCoupon.set(true);
    this.promotionsFeedback.set(null);

    const val = this.createCouponForm.getRawValue();
    const code = val.code.trim().toUpperCase();

    const cleanAlbumId = val.albumId && typeof val.albumId === 'string' && val.albumId.trim() !== '' ? val.albumId.trim() : null;
    const cleanMaxUses = val.maxUses !== null && val.maxUses !== undefined && String(val.maxUses).trim() !== '' ? Number(val.maxUses) : null;
    const cleanMaxPhotos = val.maxPhotos !== null && val.maxPhotos !== undefined && String(val.maxPhotos).trim() !== '' ? Number(val.maxPhotos) : null;

    const payload: CreateCouponRequest = {
      code,
      discountPercent: Number(val.discountPercent),
      maxUses: cleanMaxUses,
      ...(cleanAlbumId !== null ? { albumId: cleanAlbumId } : {}),
      ...(cleanMaxPhotos !== null ? { maxPhotos: cleanMaxPhotos } : {})
    };

    this.adminService.createCoupon(payload).subscribe({
      next: (resp) => {
        this.isCreatingCoupon.set(false);
        if (resp && resp.success) {
          this.coupons.update(prev => [resp.coupon, ...prev]);
          this.createCouponForm.reset({
            code: '',
            discountPercent: 10,
            maxUses: null,
            albumId: null,
            maxPhotos: null
          });
          this.promotionsFeedback.set({
            message: `¡Cupón ${resp.coupon.code} creado exitosamente!`,
            success: true
          });
          setTimeout(() => this.promotionsFeedback.set(null), 4000);
        }
      },
      error: (err) => {
        this.isCreatingCoupon.set(false);
        this.promotionsFeedback.set({
          message: err?.error?.error || 'Error al crear el cupón.',
          success: false
        });
      }
    });
  }

  public toggleCouponActive(coupon: CouponDTO): void {
    if (this.isTogglingCouponCode()) return;
    this.isTogglingCouponCode.set(coupon.code);

    const newActive = !coupon.isActive;
    this.adminService.updateCoupon(coupon.code, { isActive: newActive }).subscribe({
      next: (resp) => {
        this.isTogglingCouponCode.set(null);
        if (resp && resp.success) {
          this.coupons.update(prev =>
            prev.map(c => c.code === coupon.code ? { ...c, isActive: newActive } : c)
          );
        }
      },
      error: (err) => {
        this.isTogglingCouponCode.set(null);
        console.error('Error al cambiar estado del cupón:', err);
      }
    });
  }

  public deleteCoupon(coupon: CouponDTO): void {
    if (this.isDeletingCouponCode()) return;
    this.isDeletingCouponCode.set(coupon.code);

    this.adminService.deleteCoupon(coupon.code).subscribe({
      next: (resp) => {
        this.isDeletingCouponCode.set(null);
        if (resp && resp.success) {
          this.coupons.update(prev => prev.filter(c => c.code !== coupon.code));
          this.promotionsFeedback.set({
            message: `Cupón ${coupon.code} eliminado correctamente.`,
            success: true
          });
          setTimeout(() => this.promotionsFeedback.set(null), 4000);
        }
      },
      error: (err) => {
        this.isDeletingCouponCode.set(null);
        this.promotionsFeedback.set({
          message: err?.error?.error || 'Error al eliminar el cupón.',
          success: false
        });
      }
    });
  }

  public copyCouponCode(code: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.promotionsFeedback.set({
          message: `¡Código ${code} copiado al portapapeles! 📋`,
          success: true
        });
        setTimeout(() => this.promotionsFeedback.set(null), 3000);
      }).catch(() => {
        this.promotionsFeedback.set({
          message: `Código: ${code}`,
          success: true
        });
      });
    }
  }

  public shareCouponWhatsApp(coupon: CouponDTO): void {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://latercera.com.ar';
    const msg = encodeURIComponent(
      `¡Hola! Tenés un beneficio exclusivo en La Tercera Fotos: Usá el cupón *${coupon.code}* para obtener un *${coupon.discountPercent}% OFF* en tus fotografías deportivas y sociales. Ingresá en: ${origin}`
    );
    if (typeof window !== 'undefined') {
      window.open(`https://wa.me/?text=${msg}`, '_blank');
    }
  }

  // --- Gestor Dinámico de Categorías e Insignias (Frente 2) ---

  public loadCategories(): void {
    this.isLoadingCategories.set(true);
    this.categoryService.getAdminCategories().subscribe({
      next: (list) => {
        this.isLoadingCategories.set(false);
        if (list && list.length > 0) {
          this.categories.set(list);
        }
      },
      error: () => {
        this.isLoadingCategories.set(false);
      }
    });
  }

  public openCategoryModal(): void {
    this.editingCategory.set(null);
    this.categoryFeedback.set(null);
    this.categoryForm.reset({
      id: '',
      name: '',
      icon: '📸',
      badgeLabel: '',
      order: this.categories().length + 1,
      isActive: true
    });
    this.isCategoryModalOpen.set(true);
  }

  public closeCategoryModal(): void {
    this.isCategoryModalOpen.set(false);
    this.editingCategory.set(null);
    this.categoryFeedback.set(null);
  }

  public selectIcon(icon: string): void {
    this.categoryForm.patchValue({ icon });
    const name = this.categoryForm.get('name')?.value?.trim();
    if (name) {
      this.categoryForm.patchValue({ badgeLabel: `${icon} ${name}` });
    }
  }

  public onCategoryNameInput(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    const icon = this.categoryForm.get('icon')?.value || '📸';
    this.categoryForm.patchValue({ badgeLabel: `${icon} ${name.trim()}` });
  }

  public startEditCategory(cat: CategoryDTO): void {
    this.editingCategory.set(cat);
    this.categoryFeedback.set(null);
    this.categoryForm.patchValue({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      badgeLabel: cat.badgeLabel,
      order: cat.order,
      isActive: cat.isActive
    });
  }

  public cancelEditCategory(): void {
    this.editingCategory.set(null);
    this.categoryFeedback.set(null);
    this.categoryForm.reset({
      id: '',
      name: '',
      icon: '📸',
      badgeLabel: '',
      order: this.categories().length + 1,
      isActive: true
    });
  }

  public saveCategory(): void {
    if (this.categoryForm.invalid || this.isSavingCategory()) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isSavingCategory.set(true);
    this.categoryFeedback.set(null);

    const val = this.categoryForm.getRawValue();
    const editing = this.editingCategory();

    if (editing) {
      this.categoryService.updateCategory(editing.id, {
        name: val.name.trim(),
        icon: val.icon.trim(),
        badgeLabel: val.badgeLabel?.trim() || `${val.icon.trim()} ${val.name.trim()}`,
        order: Number(val.order) || editing.order,
        isActive: Boolean(val.isActive)
      }).subscribe({
        next: (res) => {
          this.isSavingCategory.set(false);
          if (res.success && res.category) {
            this.categories.update(prev =>
              prev.map(c => c.id === editing.id ? res.category : c)
            );
            this.categoryFeedback.set({
              message: `Categoría "${res.category.name}" actualizada con éxito.`,
              success: true
            });
            this.cancelEditCategory();
            this.loadAlbums();
          }
        },
        error: (err) => {
          this.isSavingCategory.set(false);
          this.categoryFeedback.set({
            message: err?.error?.error || 'Error al actualizar la categoría.',
            success: false
          });
        }
      });
    } else {
      this.categoryService.createCategory({
        id: val.id?.trim() || undefined,
        name: val.name.trim(),
        icon: val.icon.trim(),
        badgeLabel: val.badgeLabel?.trim() || `${val.icon.trim()} ${val.name.trim()}`,
        order: Number(val.order) || this.categories().length + 1,
        isActive: Boolean(val.isActive)
      }).subscribe({
        next: (res) => {
          this.isSavingCategory.set(false);
          if (res.success && res.category) {
            this.categories.update(prev => [...prev, res.category]);
            this.categoryFeedback.set({
              message: `¡Categoría "${res.category.name}" creada exitosamente!`,
              success: true
            });
            this.cancelEditCategory();
          }
        },
        error: (err) => {
          this.isSavingCategory.set(false);
          this.categoryFeedback.set({
            message: err?.error?.error || 'Error al crear la categoría.',
            success: false
          });
        }
      });
    }
  }

  public deleteCategory(cat: CategoryDTO): void {
    if (cat.id === 'otros') {
      this.categoryFeedback.set({
        message: 'No es posible eliminar la categoría "Otros" (es requerida por el sistema).',
        success: false
      });
      return;
    }

    // Primer clic: activar confirmación inline por 3 segundos
    if (this.confirmingDeleteCategoryId() !== cat.id) {
      this.confirmingDeleteCategoryId.set(cat.id);
      if (this.deleteCategoryTimer) {
        clearTimeout(this.deleteCategoryTimer);
      }
      this.deleteCategoryTimer = setTimeout(() => {
        if (this.confirmingDeleteCategoryId() === cat.id) {
          this.confirmingDeleteCategoryId.set(null);
        }
      }, 3000);
      return;
    }

    // Segundo clic dentro de los 3 segundos: limpiar temporizador y ejecutar borrado
    if (this.deleteCategoryTimer) {
      clearTimeout(this.deleteCategoryTimer);
      this.deleteCategoryTimer = null;
    }
    this.confirmingDeleteCategoryId.set(null);

    this.isDeletingCategoryId.set(cat.id);
    this.categoryService.deleteCategory(cat.id).subscribe({
      next: (res) => {
        this.isDeletingCategoryId.set(null);
        if (res.success) {
          this.categories.update(prev => prev.filter(c => c.id !== cat.id));
          this.categoryFeedback.set({
            message: `Categoría "${cat.name}" eliminada. Álbumes reasignados a "Otros".`,
            success: true
          });
          this.loadAlbums();
        }
      },
      error: (err) => {
        this.isDeletingCategoryId.set(null);
        this.categoryFeedback.set({
          message: err?.error?.error || 'Error al eliminar la categoría.',
          success: false
        });
      }
    });
  }

  public openCustomerWhatsApp(phone: string): void {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (typeof window !== 'undefined' && cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  }

  public loadAlbums(): void {
    this.isLoadingAlbums.set(true);
    // Intentamos cargar desde la API administrativa (incluye borradores)
    this.adminService.getAdminAlbums().subscribe({
      next: (res) => {
        this.isLoadingAlbums.set(false);
        if (res.success && res.albums) {
          this.setAlbumsData(res.albums);
        } else {
          this.fallbackPublicAlbums();
        }
      },
      error: () => {
        this.fallbackPublicAlbums();
      }
    });
  }

  private fallbackPublicAlbums(): void {
    this.albumService.getAlbums().subscribe({
      next: (list) => {
        this.isLoadingAlbums.set(false);
        this.setAlbumsData(list);
      },
      error: () => {
        this.isLoadingAlbums.set(false);
        this.setAlbumsData([]);
      }
    });
  }

  private setAlbumsData(list: readonly Album[]): void {
    this.albums.set(list);
    const drafts: Record<string, { unitPrice: number; fullAlbumPrice: number }> = {};
    for (const a of list) {
      drafts[a.id] = { unitPrice: a.unitPrice, fullAlbumPrice: a.fullAlbumPrice };
    }
    this.priceDrafts.set(drafts);

    if (list.length > 0) {
      const firstId = list[0].id;
      const currentDriveAlbumId = this.driveForm.get('albumId')?.value;
      if (!currentDriveAlbumId || !list.some(a => a.id === currentDriveAlbumId)) {
        this.driveForm.patchValue({ albumId: firstId });
      }
      const currentBulkAlbumId = this.bulkForm.get('albumId')?.value;
      if (!currentBulkAlbumId || !list.some(a => a.id === currentBulkAlbumId)) {
        this.bulkForm.patchValue({ albumId: firstId });
      }
    }
  }


  public loadStats(): void {
    this.adminService.getStats().subscribe({
      next: (res) => {
        if (res.success && res.stats) {
          this.stats.set(res.stats);
        }
      },
      error: () => {
        // Silencioso; mantiene valores default locales
      }
    });
  }

  // --- Modal de Creación de Álbum ---
  public openCreateModal(targetForm?: 'drive' | 'bulk'): void {
    this.pendingTargetForm.set(targetForm || null);
    this.createAlbumError.set(null);
    this.createAlbumSuccess.set(null);
    this.createAlbumForm.reset({
      title: '',
      category: 'futbol',
      subtitle: '',
      date: new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }),
      location: 'La Rioja, Argentina',
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      badge: '⚽ Fútbol',
      coverUrl: '',
      isPublished: true
    });
    this.isCreateModalOpen.set(true);
  }

  public closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.pendingTargetForm.set(null);
  }

  public onCategoryChange(event: Event): void {
    const catId = (event.target as HTMLSelectElement).value;
    const found = this.categories().find(c => c.id === catId);
    if (found) {
      this.createAlbumForm.patchValue({
        badge: found.badgeLabel || `${found.icon} ${found.name}`
      });
    } else {
      this.createAlbumForm.patchValue({
        badge: '📸 Evento'
      });
    }
  }

  public submitCreateAlbum(): void {
    if (this.createAlbumForm.invalid) {
      this.createAlbumForm.markAllAsTouched();
      return;
    }

    const val = this.createAlbumForm.getRawValue();

    if (Number(val.unitPrice) > Number(val.fullAlbumPrice)) {
      this.createAlbumError.set('El precio por foto individual no puede ser mayor al precio del álbum completo');
      return;
    }

    this.isCreatingAlbum.set(true);
    this.createAlbumError.set(null);
    this.createAlbumSuccess.set(null);

    const displayDate = val.date?.trim()
      ? val.date.trim()
      : this.formatEventDatePreview(val.eventDate, val.eventTime);

    this.adminService.createAlbum({
      title: val.title,
      category: val.category,
      subtitle: val.subtitle,
      date: displayDate,
      eventDate: val.eventDate,
      eventTime: val.eventTime,
      location: val.location,
      unitPrice: Number(val.unitPrice),
      fullAlbumPrice: Number(val.fullAlbumPrice),
      badge: val.badge,
      coverUrl: val.coverUrl || undefined,
      isPublished: val.isPublished,
      isFreeDownload: val.isFreeDownload,
      isPrivate: val.isPrivate,
      accessCode: val.isPrivate && val.accessCode?.trim() ? val.accessCode.trim() : null
    }).subscribe({
      next: (res) => {
        this.isCreatingAlbum.set(false);
        if (res.success && res.album) {
          const newAlbum = res.album;
          // Actualizamos la lista local reactiva
          const updatedList = [newAlbum, ...this.albums()];
          this.setAlbumsData(updatedList);
          this.currentPage.set(1);

          // Si se abrió desde un formulario de subida, autoseleccionar el nuevo álbum
          const target = this.pendingTargetForm();
          if (target === 'drive') {
            this.driveForm.patchValue({ albumId: newAlbum.id });
            this.activeTab.set('drive');
          } else if (target === 'bulk') {
            this.bulkForm.patchValue({ albumId: newAlbum.id });
            this.activeTab.set('upload');
          }

          this.closeCreateModal();
        }
      },
      error: (err) => {
        this.isCreatingAlbum.set(false);
        this.createAlbumError.set(err.error?.error || err.message || 'Error al crear el álbum');
      }
    });
  }

  // --- Modal de Edición de Metadatos del Álbum ---
  public openEditAlbumModal(album: Album): void {
    this.editingAlbum.set(album);
    this.editAlbumError.set(null);
    this.editAlbumForm.reset({
      title: album.title,
      subtitle: album.subtitle || '',
      category: (album.category as AlbumCategory) || 'futbol',
      badge: album.badge || '',
      eventDate: album.eventDate || album.date || '',
      eventTime: album.eventTime || '',
      location: album.location || ''
    });
    this.isEditAlbumModalOpen.set(true);
  }

  public closeEditAlbumModal(): void {
    this.isEditAlbumModalOpen.set(false);
    this.editingAlbum.set(null);
    this.editAlbumError.set(null);
  }

  public onEditCategoryChange(event: Event): void {
    const selectedCatId = (event.target as HTMLSelectElement).value;
    const cat = this.categories().find(c => c.id === selectedCatId);
    if (cat) {
      this.editAlbumForm.patchValue({
        badge: cat.badgeLabel || `${cat.icon} ${cat.name}`
      });
    }
  }

  public submitUpdateAlbum(): void {
    if (this.editAlbumForm.invalid || this.isUpdatingAlbum()) {
      this.editAlbumForm.markAllAsTouched();
      return;
    }

    const album = this.editingAlbum();
    if (!album) return;

    this.isUpdatingAlbum.set(true);
    this.editAlbumError.set(null);

    const formVal = this.editAlbumForm.getRawValue();

    this.adminService.updateAlbum(album.id, {
      title: formVal.title.trim(),
      subtitle: formVal.subtitle.trim() || undefined,
      category: formVal.category,
      badge: formVal.badge.trim() || undefined,
      eventDate: formVal.eventDate || undefined,
      eventTime: formVal.eventTime.trim() || undefined,
      location: formVal.location.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.isUpdatingAlbum.set(false);
        if (res.success && res.album) {
          const updated = res.album;
          this.albums.update(list =>
            list.map(a => a.id === album.id ? { ...a, ...updated } : a)
          );
          this.closeEditAlbumModal();
          this.showToast(`¡Álbum "${updated.title}" actualizado con éxito!`, 'success');
        }
      },
      error: (err) => {
        this.isUpdatingAlbum.set(false);
        this.editAlbumError.set(this.extractErrorMessage(err, 'Error al actualizar el álbum.'));
      }
    });
  }

  // --- Edición de Precios en Línea ---
  public onPriceDraftChange(albumId: string, field: 'unitPrice' | 'fullAlbumPrice', event: Event): void {
    const rawVal = (event.target as HTMLInputElement).value;
    const num = Math.max(0, Number(rawVal) || 0);
    const current = { ...(this.priceDrafts()[albumId] || { unitPrice: 1200, fullAlbumPrice: 9500 }) };
    current[field] = num;
    this.priceDrafts.set({ ...this.priceDrafts(), [albumId]: current });
  }

  public saveAlbumPrices(albumId: string): void {
    const draft = this.priceDrafts()[albumId];
    if (!draft || draft.unitPrice <= 0 || draft.fullAlbumPrice <= 0) {
      this.updateFeedback.set({
        albumId,
        message: 'Los precios deben ser mayores a $0',
        success: false
      });
      return;
    }

    if (draft.unitPrice > draft.fullAlbumPrice) {
      this.updateFeedback.set({
        albumId,
        message: 'La foto individual no puede ser más cara que el álbum completo',
        success: false
      });
      return;
    }

    this.updatingAlbumId.set(albumId);
    this.updateFeedback.set(null);

    this.adminService.updateAlbum(albumId, {
      unitPrice: draft.unitPrice,
      fullAlbumPrice: draft.fullAlbumPrice
    }).subscribe({
      next: (res) => {
        this.updatingAlbumId.set(null);
        if (res.success && res.album) {
          this.updateFeedback.set({
            albumId,
            message: '¡Precios actualizados!',
            success: true
          });
          // Actualizar álbum en la señal
          this.albums.set(this.albums().map(a => a.id === albumId ? res.album : a));
          setTimeout(() => {
            if (this.updateFeedback()?.albumId === albumId) {
              this.updateFeedback.set(null);
            }
          }, 3500);
        }
      },
      error: (err) => {
        this.updatingAlbumId.set(null);
        this.updateFeedback.set({
          albumId,
          message: err.error?.error || 'Error al guardar precios',
          success: false
        });
      }
    });
  }

  public togglePublishStatus(album: Album): void {
    const newStatus = !album.isPublished;
    this.isTogglingPublishId.set(album.id);
    this.adminService.updateAlbum(album.id, { isPublished: newStatus }).subscribe({
      next: (res) => {
        this.isTogglingPublishId.set(null);
        if (res.success && res.album) {
          this.albums.set(this.albums().map(a => a.id === album.id ? res.album : a));
          this.updateFeedback.set({
            albumId: album.id,
            message: newStatus ? 'Álbum publicado en el portfolio' : 'Álbum ocultado del portfolio',
            success: true
          });
          setTimeout(() => {
            if (this.updateFeedback()?.albumId === album.id) {
              this.updateFeedback.set(null);
            }
          }, 3500);
        }
      },
      error: (err) => {
        this.isTogglingPublishId.set(null);
        this.updateFeedback.set({
          albumId: album.id,
          message: err.error?.error || 'Error al actualizar visibilidad',
          success: false
        });
      }
    });
  }

  // --- Métodos de Papelera de Reciclaje (Soft Delete, Restore y Hard Delete) ---
  public loadTrashAlbums(): void {
    this.isLoadingTrash.set(true);
    this.adminService.getTrashAlbums().subscribe({
      next: (res) => {
        this.isLoadingTrash.set(false);
        if (res.success && res.trashAlbums) {
          this.trashAlbums.set(res.trashAlbums);
        }
      },
      error: () => {
        this.isLoadingTrash.set(false);
      }
    });
  }

  public moveToTrash(album: Album): void {
    this.albumToTrash.set(album);
    this.isTrashModalOpen.set(true);
  }

  public closeTrashModal(): void {
    this.isTrashModalOpen.set(false);
    this.albumToTrash.set(null);
  }

  public confirmMoveToTrash(): void {
    const album = this.albumToTrash();
    if (!album) return;

    this.isMovingToTrashId.set(album.id);
    this.adminService.moveToTrash(album.id).subscribe({
      next: (res) => {
        this.isMovingToTrashId.set(null);
        this.closeTrashModal();
        if (res.success) {
          this.albums.set(this.albums().filter(a => a.id !== album.id));
          this.loadTrashAlbums();
          this.showToast(`Álbum "${album.title}" movido a la papelera (se purgará en 30 días)`, 'success');
        }
      },
      error: (err) => {
        this.isMovingToTrashId.set(null);
        this.showToast(err.error?.error || 'Error al mover a papelera', 'error');
      }
    });
  }

  public restoreAlbum(trashAlbum: TrashAlbum): void {
    this.isRestoringId.set(trashAlbum.id);
    this.adminService.restoreFromTrash(trashAlbum.id).subscribe({
      next: (res) => {
        this.isRestoringId.set(null);
        if (res.success) {
          this.trashAlbums.set(this.trashAlbums().filter(a => a.id !== trashAlbum.id));
          this.loadAlbums();
        }
      },
      error: () => {
        this.isRestoringId.set(null);
      }
    });
  }

  public openPurgeModal(trashAlbum: TrashAlbum): void {
    this.albumToPurge.set(trashAlbum);
    this.isPurgeModalOpen.set(true);
  }

  public closePurgeModal(): void {
    this.albumToPurge.set(null);
    this.isPurgeModalOpen.set(false);
  }

  public confirmPermanentDelete(): void {
    const alb = this.albumToPurge();
    if (!alb) return;

    this.isPurgingId.set(alb.id);
    this.adminService.permanentDeleteAlbum(alb.id).subscribe({
      next: (res) => {
        this.isPurgingId.set(null);
        if (res.success) {
          this.trashAlbums.set(this.trashAlbums().filter(a => a.id !== alb.id));
          this.closePurgeModal();
        }
      },
      error: () => {
        this.isPurgingId.set(null);
      }
    });
  }

  // --- Cortesía Oficial (Descarga Gratuita Máxima Calidad) ---
  public toggleCourtesyDownload(album: Album): void {
    const newStatus = !album.isFreeDownload;
    this.isTogglingCourtesyId.set(album.id);
    this.adminService.toggleCourtesyDownload(album.id, newStatus).subscribe({
      next: (res) => {
        this.isTogglingCourtesyId.set(null);
        if (res.success && res.album) {
          this.albums.set(this.albums().map(a => a.id === album.id ? res.album : a));
          this.updateFeedback.set({
            albumId: album.id,
            message: newStatus ? '🎁 ¡Álbum liberado gratis en máxima calidad!' : 'Descarga gratuita desactivada',
            success: true
          });
          setTimeout(() => {
            if (this.updateFeedback()?.albumId === album.id) {
              this.updateFeedback.set(null);
            }
          }, 3500);
        }
      },
      error: (err) => {
        this.isTogglingCourtesyId.set(null);
        this.updateFeedback.set({
          albumId: album.id,
          message: err.error?.error || 'Error al cambiar descarga gratuita',
          success: false
        });
      }
    });
  }

  // --- Privacidad y Código PIN ---
  public startEditPrivacy(album: Album): void {
    this.editingPrivacyAlbumId.set(album.id);
    this.privacyAccessCodeInput.set(album.accessCode === '********' ? '' : (album.accessCode || ''));
    this.privacyError.set(null);
  }

  public cancelEditPrivacy(): void {
    this.editingPrivacyAlbumId.set(null);
    this.privacyAccessCodeInput.set('');
    this.privacyError.set(null);
  }

  public savePrivacy(album: Album, makePrivate: boolean): void {
    const code = this.privacyAccessCodeInput().trim();
    if (makePrivate && !code) {
      this.privacyError.set('Debes ingresar un código PIN o clave de acceso para el álbum privado.');
      this.showToast('Debes ingresar un código PIN o clave de acceso', 'warning');
      return;
    }
    this.privacyError.set(null);

    this.isUpdatingPrivacyId.set(album.id);
    this.adminService.updateAlbumPrivacy(album.id, makePrivate, makePrivate ? code : null).subscribe({
      next: (res) => {
        this.isUpdatingPrivacyId.set(null);
        this.editingPrivacyAlbumId.set(null);
        if (res.success && res.album) {
          const updatedAlbum: Album = makePrivate
            ? { ...res.album, accessCode: code }
            : { ...res.album, accessCode: null };
          this.albums.set(this.albums().map(a => a.id === album.id ? updatedAlbum : a));
          this.showToast(makePrivate ? '🔒 Álbum protegido con PIN' : 'Álbum configurado como público', 'success');
        }
      },
      error: (err) => {
        this.isUpdatingPrivacyId.set(null);
        this.showToast(err.error?.error || 'Error al actualizar privacidad', 'error');
      }
    });
  }

  // --- Métodos de Gestión de Fotos del Álbum ---
  public openPhotosModal(album: Album): void {
    this.selectedAlbumForPhotos.set(album);
    this.isPhotosModalOpen.set(true);
    this.photosModalError.set(null);
    this.photosModalFeedback.set(null);
    this.albumPhotos.set([]);
    this.loadAlbumPhotos(album.id);
  }

  public closePhotosModal(): void {
    this.isPhotosModalOpen.set(false);
    this.selectedAlbumForPhotos.set(null);
    this.albumPhotos.set([]);
    this.photosModalError.set(null);
    this.photosModalFeedback.set(null);
    this.isPhotosOrderDirty.set(false);
    this.draggedPhotoIndex.set(null);
    this.dragOverPhotoIndex.set(null);
  }

  public loadAlbumPhotos(albumId: string): void {
    this.isLoadingAlbumPhotos.set(true);
    this.photosModalError.set(null);

    this.adminService.getAlbumPhotos(albumId).subscribe({
      next: (res) => {
        this.isLoadingAlbumPhotos.set(false);
        if (res.success && res.photos) {
          this.albumPhotos.set(res.photos);
        } else {
          this.albumPhotos.set([]);
        }
      },
      error: (err) => {
        this.isLoadingAlbumPhotos.set(false);
        const errMsg = err.error?.error || err.error?.message || err.message || 'Error al cargar las fotos del álbum';
        this.photosModalError.set(errMsg);
        this.showToast(`Error al cargar fotos: ${errMsg}`, 'error');
      }
    });
  }

  public onPhotoThumbError(event: Event, _photo: AdminAlbumPhoto): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('data:image/svg+xml')) {
      target.src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80';
    }
  }

  public isSampleDemoAlbum(album: Album | null): boolean {
    if (!album) return false;
    const photos = this.albumPhotos();
    if (photos.length === 0) return false;
    return photos.every(p => p.filename.includes('_muestra_') || p.id.includes('-photo-') || p.id.includes('muestra'));
  }

  public setPhotoAsCover(photo: AdminAlbumPhoto): void {
    const album = this.selectedAlbumForPhotos();
    if (!album) return;

    this.updatingPhotoId.set(photo.id);
    this.photosModalFeedback.set(null);

    this.adminService.updateAlbumPhoto(album.id, photo.id, { setAsCover: true }).subscribe({
      next: (res) => {
        this.updatingPhotoId.set(null);
        const newCover = res.coverUrl || photo.previewUrl;
        this.selectedAlbumForPhotos.set({ ...album, coverUrl: newCover });
        this.albums.set(
          this.albums().map(a => a.id === album.id ? { ...a, coverUrl: newCover } : a)
        );
        this.photosModalFeedback.set({
          message: 'Foto establecida como portada principal del álbum',
          success: true
        });
      },
      error: (err) => {
        this.updatingPhotoId.set(null);
        this.photosModalFeedback.set({
          message: err.error?.error || err.message || 'Error al actualizar portada',
          success: false
        });
      }
    });
  }

  public toggleSampleHd(photo: AdminAlbumPhoto): void {
    const album = this.selectedAlbumForPhotos();
    if (!album) return;

    this.updatingPhotoId.set(photo.id);
    this.photosModalFeedback.set(null);
    const newSampleHd = !photo.isSampleHd;

    this.adminService.updateAlbumPhoto(album.id, photo.id, { isSampleHD: newSampleHd }).subscribe({
      next: () => {
        this.updatingPhotoId.set(null);
        this.albumPhotos.set(
          this.albumPhotos().map(p => p.id === photo.id ? { ...p, isSampleHd: newSampleHd } : p)
        );
        this.photosModalFeedback.set({
          message: newSampleHd ? 'Foto marcada como Muestra HD (⭐)' : 'Muestra HD removida',
          success: true
        });
      },
      error: (err) => {
        this.updatingPhotoId.set(null);
        this.photosModalFeedback.set({
          message: err.error?.error || err.message || 'Error al actualizar muestra HD',
          success: false
        });
      }
    });
  }

  public deleteAlbumPhoto(photo: AdminAlbumPhoto): void {
    const album = this.selectedAlbumForPhotos();
    if (!album) return;

    // Si aún no está en confirmación para esta foto, activar el estado por 3 segundos
    if (this.confirmingDeletePhotoId() !== photo.id) {
      this.confirmingDeletePhotoId.set(photo.id);
      if (this.deletePhotoTimer) {
        clearTimeout(this.deletePhotoTimer);
      }
      this.deletePhotoTimer = setTimeout(() => {
        if (this.confirmingDeletePhotoId() === photo.id) {
          this.confirmingDeletePhotoId.set(null);
        }
      }, 3000);
      return;
    }

    // Segundo clic dentro de los 3 segundos: limpiar temporizador y ejecutar borrado
    if (this.deletePhotoTimer) {
      clearTimeout(this.deletePhotoTimer);
      this.deletePhotoTimer = null;
    }
    this.confirmingDeletePhotoId.set(null);

    this.deletingPhotoId.set(photo.id);
    this.photosModalFeedback.set(null);

    this.adminService.deleteAlbumPhoto(album.id, photo.id).subscribe({
      next: () => {
        this.deletingPhotoId.set(null);
        const remaining = this.albumPhotos().filter(p => p.id !== photo.id);
        this.albumPhotos.set(remaining);

        const newCount = Math.max(0, (album.photosCount || 1) - 1);
        const isCover = album.coverUrl === photo.previewUrl;
        const newCover = isCover ? (remaining[0]?.previewUrl || '') : album.coverUrl;

        this.selectedAlbumForPhotos.set({
          ...album,
          photosCount: newCount,
          coverUrl: newCover
        });

        this.albums.set(
          this.albums().map(a =>
            a.id === album.id ? { ...a, photosCount: newCount, coverUrl: newCover } : a
          )
        );

        this.photosModalFeedback.set({
          message: 'Fotografía eliminada correctamente del álbum',
          success: true
        });
      },
      error: (err) => {
        this.deletingPhotoId.set(null);
        this.photosModalFeedback.set({
          message: err.error?.error || err.message || 'Error al eliminar la foto',
          success: false
        });
      }
    });
  }

  // --- Reordenamiento de Fotos del Álbum (Drag & Drop y Móvil) ---
  public moveManagedPhoto(fromIndex: number, toIndex: number): void {
    const photos = [...this.albumPhotos()];
    if (toIndex < 0 || toIndex >= photos.length || fromIndex === toIndex) return;

    const moved = photos.splice(fromIndex, 1)[0];
    photos.splice(toIndex, 0, moved);
    this.albumPhotos.set(photos);
    this.isPhotosOrderDirty.set(true);
  }

  public onPhotoDragStart(event: DragEvent, index: number): void {
    this.draggedPhotoIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  public onPhotoDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverPhotoIndex.set(index);
  }

  public onPhotoDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    const fromIndex = this.draggedPhotoIndex();
    if (fromIndex !== null && fromIndex !== targetIndex) {
      this.moveManagedPhoto(fromIndex, targetIndex);
    }
    this.draggedPhotoIndex.set(null);
    this.dragOverPhotoIndex.set(null);
  }

  public onPhotoDragEnd(): void {
    this.draggedPhotoIndex.set(null);
    this.dragOverPhotoIndex.set(null);
  }

  public savePhotosOrder(): void {
    const album = this.selectedAlbumForPhotos();
    if (!album) return;

    this.isSavingPhotosOrder.set(true);
    this.photosModalFeedback.set(null);
    const photoIds = this.albumPhotos().map(p => p.id);

    this.adminService.reorderAlbumPhotos(album.id, photoIds).subscribe({
      next: (res) => {
        this.isSavingPhotosOrder.set(false);
        if (res.success) {
          this.isPhotosOrderDirty.set(false);
          this.photosModalFeedback.set({
            message: 'Orden de fotos guardado exitosamente en el catálogo.',
            success: true
          });
          this.showToast('¡Orden de fotos actualizado correctamente!', 'success');
        }
      },
      error: (err) => {
        this.isSavingPhotosOrder.set(false);
        this.photosModalFeedback.set({
          message: this.extractErrorMessage(err, 'Error al guardar el nuevo orden de fotos.'),
          success: false
        });
      }
    });
  }

  // --- Navegación Rápida a Subida ---
  public navigateToUploadWithAlbum(albumId: string): void {
    this.bulkForm.patchValue({ albumId });
    this.activeTab.set('upload');
  }

  public navigateToDriveWithAlbum(albumId: string): void {
    this.driveForm.patchValue({ albumId });
    this.activeTab.set('drive');
  }

  // --- Métodos de Subida Masiva y Drive ---
  public submitDriveImport(): void {
    if (this.driveForm.invalid) {
      this.driveForm.markAllAsTouched();
      return;
    }

    this.isDriveImporting.set(true);
    this.driveResult.set(null);
    this.driveError.set(null);

    const formVal = this.driveForm.getRawValue();

    this.adminService.importFromDrive({
      albumId: formVal.albumId,
      driveUrl: formVal.driveUrl,
      watermarkText: formVal.watermarkText,
      concurrencyLimit: formVal.concurrencyLimit,
      markHdFirstN: formVal.markHdFirstN
    }).subscribe({
      next: (res) => {
        this.isDriveImporting.set(false);
        this.driveResult.set(res);
        this.loadAlbums(); // Recargar conteos actualizados
      },
      error: (err) => {
        this.isDriveImporting.set(false);
        this.driveError.set(this.extractErrorMessage(err, 'Error al conectar con el importador de Google Drive'));
      }
    });
  }

  public onFilesDropped(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.handleSelectedFileList(Array.from(event.dataTransfer.files));
    }
  }

  public onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleSelectedFileList(Array.from(input.files));
      input.value = '';
    }
  }

  public static readonly BULK_UPLOAD_BATCH_SIZE = 4;

  /**
   * Helper seguro que extrae mensajes de error en formato string evitando [object Object]
   */
  public extractErrorMessage(err: unknown, defaultMsg: string = 'Error inesperado'): string {
    if (!err) return defaultMsg;

    const errorObj = err as Record<string, unknown>;

    // Códigos de estado HTTP específicos
    if (errorObj['status'] === 413) {
      return 'El lote supera el límite de tamaño permitido.';
    }
    if (errorObj['status'] === 0) {
      return 'Error de red o tiempo de espera agotado al subir las fotos.';
    }

    const innerError = errorObj['error'];

    // 1. err?.error?.error es string
    if (
      innerError &&
      typeof innerError === 'object' &&
      typeof (innerError as Record<string, unknown>)['error'] === 'string'
    ) {
      const msg = (innerError as Record<string, unknown>)['error'] as string;
      if (msg.trim().length > 0) return msg.trim();
    }

    // 2. err?.error?.message es string
    if (
      innerError &&
      typeof innerError === 'object' &&
      typeof (innerError as Record<string, unknown>)['message'] === 'string'
    ) {
      const msg = (innerError as Record<string, unknown>)['message'] as string;
      if (msg.trim().length > 0) return msg.trim();
    }

    // 3. err?.error es string directo
    if (typeof innerError === 'string' && innerError.trim().length > 0) {
      return innerError.trim();
    }

    // 4. err?.error es un objeto: intentar serializarlo de forma legible
    if (innerError && typeof innerError === 'object') {
      try {
        const str = JSON.stringify(innerError);
        if (str && str !== '{}') return str;
      } catch {
        // Fallback a propiedades posteriores
      }
    }

    // 5. err?.message es string directo
    if (typeof errorObj['message'] === 'string' && errorObj['message'].trim().length > 0) {
      return errorObj['message'].trim();
    }

    return defaultMsg;
  }

  /**
   * Genera miniaturas WebP ligeras (320x320) con canvas para optimizar consumo de RAM,
   * con fallback defensivo a URL.createObjectURL en entornos de test/JSDOM.
   */
  private async generateThumbnailUrl(file: File): Promise<string> {
    try {
      if (
        typeof window !== 'undefined' &&
        typeof (window as any).createImageBitmap === 'function' &&
        typeof document !== 'undefined'
      ) {
        let bitmap: ImageBitmap | null = null;
        try {
          bitmap = await createImageBitmap(file);
        } catch {
          // Fallback silencioso si falla la decodificación por bitmap
        }

        if (bitmap) {
          const maxDim = 320;
          let targetW = bitmap.width;
          let targetH = bitmap.height;

          if (targetW > maxDim || targetH > maxDim) {
            if (targetW > targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0, targetW, targetH);
            bitmap.close();
            return canvas.toDataURL('image/webp', 0.7);
          }
          bitmap.close();
        }
      }
    } catch {
      // Ignorar excepciones de canvas en entornos headless
    }

    // Fallback defensivo a createObjectURL para tests y navegadores sin canvas 2D
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        return URL.createObjectURL(file);
      } catch {
        return '';
      }
    }

    return '';
  }

  private handleSelectedFileList(files: File[]): void {
    const validImageFiles = files.filter(f =>
      f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name)
    );

    if (validImageFiles.length === 0) return;

    const currentFiles = this.selectedFiles();
    const isFirstBatch = currentFiles.length === 0;

    // Deduplicación comparando la clave ${f.name}_${f.size}_${f.lastModified}
    const existingKeys = new Set(
      currentFiles.map(f => `${f.name}_${f.size}_${f.lastModified}`)
    );

    const newFilesToAdd: File[] = [];
    let duplicatesCount = 0;

    for (const file of validImageFiles) {
      const key = `${file.name}_${file.size}_${file.lastModified}`;
      if (existingKeys.has(key)) {
        duplicatesCount++;
      } else {
        existingKeys.add(key);
        newFilesToAdd.push(file);
      }
    }

    if (duplicatesCount > 0) {
      this.showToast(
        `Se omitieron ${duplicatesCount} foto(s) ya presentes en la selección actual.`,
        'info'
      );
    }

    if (newFilesToAdd.length === 0) {
      return;
    }

    // Acumular archivos en la selección actual
    const updatedFiles = [...currentFiles, ...newFilesToAdd];
    this.selectedFiles.set(updatedFiles);

    // Detección de entorno con soporte real de canvas/bitmap
    const hasCanvasSupport =
      typeof window !== 'undefined' &&
      typeof (window as any).createImageBitmap === 'function' &&
      typeof document !== 'undefined';

    if (!hasCanvasSupport && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      // Modo síncrono para entornos de test (JSDOM/Vitest) o navegadores básicos
      const newPreviewUrls = newFilesToAdd.map(f => {
        try {
          return URL.createObjectURL(f);
        } catch {
          return '';
        }
      });
      this.filePreviewUrls.set([...this.filePreviewUrls(), ...newPreviewUrls]);
    } else {
      // Modo optimizado de memoria: generar WebP 320px ultra-liviano para evitar colapso de RAM
      const startIndex = this.filePreviewUrls().length;
      // Colocar placeholders inmediatos para preservar la alineación de índices
      const placeholders = newFilesToAdd.map(() => '');
      this.filePreviewUrls.set([...this.filePreviewUrls(), ...placeholders]);

      Promise.all(
        newFilesToAdd.map(async (file, offset) => {
          const thumbUrl = await this.generateThumbnailUrl(file);
          return { targetIndex: startIndex + offset, thumbUrl };
        })
      ).then(results => {
        const currentUrls = [...this.filePreviewUrls()];
        for (const item of results) {
          if (item.targetIndex < currentUrls.length && item.thumbUrl) {
            currentUrls[item.targetIndex] = item.thumbUrl;
          }
        }
        this.filePreviewUrls.set(currentUrls);
      });
    }

    // Si era la primera tanda de archivos, marcar [0, 1] como hdIndices; si ya había archivos, conservar intactos los elegidos
    if (isFirstBatch) {
      const defaultHd: number[] = [];
      if (updatedFiles.length > 0) defaultHd.push(0);
      if (updatedFiles.length > 1) defaultHd.push(1);
      this.hdIndices.set(defaultHd);
    }

    // Comprobación de archivos > 50 MB
    const oversized = updatedFiles.filter(f => f.size > this.MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      this.bulkError.set(
        `Atención: ${oversized.length} archivo(s) superan el límite de 50 MB de Supabase Storage. Quítalos de la lista antes de procesar.`
      );
    } else {
      this.bulkError.set(null);
    }
  }

  public revokePreviewUrls(): void {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      this.filePreviewUrls().forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
    this.filePreviewUrls.set([]);
  }

  public removeSelectedFile(index: number): void {
    const urls = this.filePreviewUrls();
    const urlToRemove = urls[index];
    if (urlToRemove && urlToRemove.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(urlToRemove);
    }
    this.filePreviewUrls.set(urls.filter((_, i) => i !== index));

    const current = this.selectedFiles();
    const updated = current.filter((_, i) => i !== index);
    this.selectedFiles.set(updated);
    this.hdIndices.set(
      this.hdIndices()
        .filter(i => i !== index)
        .map(i => (i > index ? i - 1 : i))
    );
    if (!this.hasOversizedFiles() && this.bulkError()?.includes('50 MB')) {
      this.bulkError.set(null);
    }
  }

  public clearSelectedFiles(): void {
    this.revokePreviewUrls();
    this.selectedFiles.set([]);
    this.hdIndices.set([]);
    this.draggedQueueIndex.set(null);
    this.dragOverQueueIndex.set(null);
    this.bulkError.set(null);
  }

  // --- Reordenamiento de Cola de Subida Masiva (Drag & Drop y Móvil) ---
  public moveQueueItem(fromIndex: number, toIndex: number): void {
    const currentFiles = this.selectedFiles();
    if (toIndex < 0 || toIndex >= currentFiles.length || fromIndex === toIndex) return;

    // Rastrear por referencia los archivos HD para que no pierdan la marca
    const hdFileSet = new Set(this.hdIndices().map(i => currentFiles[i]).filter(Boolean));

    // Reordenar archivos
    const files = [...currentFiles];
    const movedFile = files.splice(fromIndex, 1)[0];
    files.splice(toIndex, 0, movedFile);
    this.selectedFiles.set(files);

    // Reordenar URLs de previsualización en sincronía
    const urls = [...this.filePreviewUrls()];
    if (fromIndex < urls.length && toIndex < urls.length) {
      const movedUrl = urls.splice(fromIndex, 1)[0];
      urls.splice(toIndex, 0, movedUrl);
      this.filePreviewUrls.set(urls);
    }

    // Remapear índices HD según la nueva posición de cada archivo
    const newHdIndices: number[] = [];
    files.forEach((f, idx) => {
      if (hdFileSet.has(f)) {
        newHdIndices.push(idx);
      }
    });
    this.hdIndices.set(newHdIndices);
  }

  public onQueueDragStart(event: DragEvent, index: number): void {
    this.draggedQueueIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  public onQueueDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverQueueIndex.set(index);
  }

  public onQueueDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    const fromIndex = this.draggedQueueIndex();
    if (fromIndex !== null && fromIndex !== targetIndex) {
      this.moveQueueItem(fromIndex, targetIndex);
    }
    this.draggedQueueIndex.set(null);
    this.dragOverQueueIndex.set(null);
  }

  public onQueueDragEnd(): void {
    this.draggedQueueIndex.set(null);
    this.dragOverQueueIndex.set(null);
  }

  public toggleHdIndex(index: number): void {
    const current = this.hdIndices();
    if (current.includes(index)) {
      this.hdIndices.set(current.filter(i => i !== index));
    } else {
      this.hdIndices.set([...current, index]);
    }
  }

  public isHdSelected(index: number): boolean {
    return this.hdIndices().includes(index);
  }

  public submitBulkUpload(): void {
    const filesToUpload = this.selectedFiles();
    if (filesToUpload.length === 0) {
      this.bulkError.set('Selecciona al menos una fotografía para subir');
      return;
    }

    if (this.hasOversizedFiles()) {
      this.bulkError.set(
        `No es posible subir el lote: Hay ${this.oversizedFiles().length} archivo(s) que superan los 50 MB permitidos por Supabase Storage. Elimínalos para continuar.`
      );
      return;
    }

    this.uploadProgress.set(0);
    this.isBulkUploading.set(true);
    this.bulkResult.set(null);
    this.bulkError.set(null);

    const formVal = this.bulkForm.getRawValue();
    const albumId = formVal.albumId;
    const watermarkText = formVal.watermarkText;
    const globalHdIndices = this.hdIndices();
    const totalFiles = filesToUpload.length;
    const BATCH_SIZE = AdminPanelComponent.BULK_UPLOAD_BATCH_SIZE;

    let completedFiles = 0;
    let totalReceived = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalDurationMs = 0;
    const allPhotos: ProcessedPhotoSummary[] = [];
    const allErrors: Array<{ fileName: string; error: string }> = [];

    const uploadNextBatch = (startIdx: number): void => {
      if (startIdx >= totalFiles) {
        // Consolidar resumen de todas las tandas completadas
        const consolidatedResult: BulkUploadResponse = {
          success: true,
          albumId,
          summary: {
            totalReceived,
            successful: totalSuccessful,
            failed: totalFailed,
            durationMs: totalDurationMs
          },
          photos: allPhotos,
          errors: allErrors
        };

        this.uploadProgress.set(100);
        this.isBulkUploading.set(false);
        this.bulkResult.set(consolidatedResult);
        this.clearSelectedFiles(); // Limpia la cola y resetea estado sin recargar la página
        this.loadAlbums(); // Recargar conteos actualizados
        this.showToast(
          `¡Subida completada con éxito! ${totalSuccessful} fotos procesadas y añadidas al álbum.`,
          'success'
        );
        return;
      }

      const batchFiles = filesToUpload.slice(startIdx, startIdx + BATCH_SIZE);

      // Mapear qué índices locales dentro de este micro-lote de 4 fotos corresponden a los HD globales
      const batchHdIndices: number[] = [];
      for (let localIdx = 0; localIdx < batchFiles.length; localIdx++) {
        const globalIdx = startIdx + localIdx;
        if (globalHdIndices.includes(globalIdx)) {
          batchHdIndices.push(localIdx);
        }
      }

      // Ejecutar subida de este micro-lote y calcular progreso global combinado
      this.adminService.bulkUpload(
        albumId,
        batchFiles,
        watermarkText,
        batchHdIndices,
        (batchPercent: number) => {
          const currentBatchLoadedFraction = (batchPercent / 100) * batchFiles.length;
          const globalPercent = Math.min(
            99,
            Math.round(((completedFiles + currentBatchLoadedFraction) / totalFiles) * 100)
          );
          this.uploadProgress.set(globalPercent);
        }
      ).subscribe({
        next: (batchResponse) => {
          completedFiles += batchFiles.length;
          if (batchResponse) {
            totalReceived += batchResponse.summary?.totalReceived ?? batchFiles.length;
            totalSuccessful += batchResponse.summary?.successful ?? batchFiles.length;
            totalFailed += batchResponse.summary?.failed ?? 0;
            totalDurationMs += batchResponse.summary?.durationMs ?? 0;
            if (Array.isArray(batchResponse.photos)) {
              allPhotos.push(...batchResponse.photos);
            }
            if (Array.isArray(batchResponse.errors)) {
              allErrors.push(...batchResponse.errors);
            }
          }

          const currentFinishedProgress = Math.round((completedFiles / totalFiles) * 100);
          this.uploadProgress.set(currentFinishedProgress);

          // Continuar con el siguiente micro-lote secuencial
          uploadNextBatch(startIdx + BATCH_SIZE);
        },
        error: (err) => {
          this.isBulkUploading.set(false);
          const safeErrorMsg = this.extractErrorMessage(err, 'Error durante la subida masiva de fotos');
          this.bulkError.set(safeErrorMsg);
          this.showToast(safeErrorMsg, 'error');
        }
      });
    };

    // Iniciar primer micro-lote
    uploadNextBatch(0);
  }

  public submitRegisterPhotographer(): void {
    if (this.photographerForm.invalid) {
      this.photographerForm.markAllAsTouched();
      return;
    }

    this.isRegisteringPhotographer.set(true);
    this.photographerResult.set(null);
    this.photographerError.set(null);

    const formVal = this.photographerForm.getRawValue();

    this.adminService.registerPhotographer({
      name: formVal.name,
      email: formVal.email,
      password: formVal.password,
      role: formVal.role as 'admin' | 'photographer'
    }).subscribe({
      next: (res) => {
        this.isRegisteringPhotographer.set(false);
        this.photographerResult.set(res);
        this.photographerForm.reset({
          name: '',
          email: '',
          password: '',
          role: 'photographer'
        });
      },
      error: (err) => {
        this.isRegisteringPhotographer.set(false);
        this.photographerError.set(this.extractErrorMessage(err, 'Error al registrar fotógrafo'));
      }
    });
  }
}
