import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminAuthStore } from '../../core/state/admin-auth.store';
import { AdminService } from '../../core/services/admin.service';
import { AlbumService } from '../../core/services/album.service';
import { Album, AlbumCategory } from '../../core/models/album.model';
import {
  AdminStats,
  DriveImportResponse,
  BulkUploadResponse,
  RegisterPhotographerResponse,
  CreateAlbumRequest,
  UpdateAlbumRequest,
  TrashAlbum,
  AdminOrder,
  AdminOrderStatus,
  AdminAlbumPhoto
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
  public readonly adminService = inject(AdminService);
  public readonly albumService = inject(AlbumService);

  // Eventos hacia el contenedor principal
  public readonly goHome = output<void>();
  public readonly logout = output<void>();

  // Pestaña activa: 'albums' | 'orders' | 'trash' | 'drive' | 'upload' | 'photographers'
  public readonly activeTab = signal<'albums' | 'orders' | 'trash' | 'drive' | 'upload' | 'photographers'>('albums');

  // Órdenes y Entregas (Ventas Mercado Pago)
  public readonly orders = signal<readonly AdminOrder[]>([]);
  public readonly isLoadingOrders = signal<boolean>(false);
  public readonly ordersError = signal<string | null>(null);
  public readonly renewingOrderId = signal<string | null>(null);
  public readonly copiedTokenOrderId = signal<string | null>(null);
  public readonly renewFeedback = signal<{ orderId: string; message: string; success: boolean } | null>(null);
  public readonly orderStatusFilter = signal<'ALL' | AdminOrderStatus>('ALL');
  public readonly orderSearchQuery = signal<string>('');

  public readonly filteredOrders = computed(() => {
    let list = this.orders();
    const filter = this.orderStatusFilter();
    const query = this.orderSearchQuery().toLowerCase().trim();

    if (filter !== 'ALL') {
      list = list.filter(o => o.status === filter);
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

  public readonly totalPaidRevenue = computed(() => {
    return this.orders()
      .filter(o => o.status === 'PAID')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  });

  public readonly paidOrdersCount = computed(() => {
    return this.orders().filter(o => o.status === 'PAID').length;
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

  // Estado de actualización de visibilidad (Ocultar/Publicar) por tarjeta
  public readonly isTogglingPublishId = signal<string | null>(null);

  // Paginación en pestaña de álbumes administrativos
  public readonly currentPage = signal<number>(1);
  public readonly pageSize = signal<number>(6);

  public readonly totalPages = computed(() => {
    const total = this.albums().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  public readonly paginatedAlbums = computed(() => {
    const list = this.albums();
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
    const total = this.albums().length;
    if (total === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  public readonly showingTo = computed(() => {
    const total = this.albums().length;
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

  // Borradores de edición de precios por tarjeta: { [albumId]: { unitPrice, fullAlbumPrice } }
  public readonly priceDrafts = signal<Record<string, { unitPrice: number; fullAlbumPrice: number }>>({});
  public readonly updatingAlbumId = signal<string | null>(null);
  public readonly updateFeedback = signal<{ albumId: string; message: string; success: boolean } | null>(null);

  // Estadísticas en vivo
  public readonly stats = signal<AdminStats>({
    photosSold: 43,
    albumsSold: 3,
    revenueARS: 64200,
    storageUsedGB: 1.8,
    storageLimitGB: 10,
    activeAlbumsCount: 4,
    lastUpdated: new Date().toISOString()
  });

  // Estados de carga de operaciones
  public readonly isDriveImporting = signal<boolean>(false);
  public readonly isBulkUploading = signal<boolean>(false);
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

  ngOnInit(): void {
    this.loadAlbums();
    this.loadTrashAlbums();
    this.loadStats();
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrls();
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
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

  public loadOrders(): void {
    this.isLoadingOrders.set(true);
    this.ordersError.set(null);
    this.adminService.getAdminOrders().subscribe({
      next: (res) => {
        this.isLoadingOrders.set(false);
        if (res.success && res.orders) {
          this.orders.set(res.orders);
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
        this.setAlbumsData([
          {
            id: 'album-1',
            category: 'futbol',
            title: 'Atlético Tesorieri vs Andino SC',
            subtitle: 'Liga Riojana de Fútbol',
            date: '12 Octubre, 2026',
            photosCount: 48,
            unitPrice: 1200,
            fullAlbumPrice: 9500,
            coverUrl: '',
            badge: '⚽ Fútbol',
            isPublished: true
          },
          {
            id: 'album-2',
            category: 'hockey',
            title: 'Torneo Provincial de Hockey Femenino',
            subtitle: 'Polideportivo Evita',
            date: '5 Octubre, 2026',
            photosCount: 36,
            unitPrice: 1200,
            fullAlbumPrice: 9500,
            coverUrl: '',
            badge: '🏑 Hockey',
            isPublished: true
          }
        ]);
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
      if (!this.driveForm.get('albumId')?.value) {
        this.driveForm.patchValue({ albumId: firstId });
      }
      if (!this.bulkForm.get('albumId')?.value) {
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
    const cat = (event.target as HTMLSelectElement).value as AlbumCategory;
    const defaultBadges: Record<AlbumCategory, string> = {
      futbol: '⚽ Fútbol',
      hockey: '🏑 Hockey',
      basquet: '🏀 Básquet',
      sociales: '🎉 Cumpleaños & Social',
      otros: '📸 Evento Especial'
    };
    this.createAlbumForm.patchValue({
      badge: defaultBadges[cat] || '📸 Evento'
    });
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
          this.albums.set(this.albums().map(a => a.id === album.id ? res.album : a));
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
    this.loadAlbumPhotos(album.id);
  }

  public closePhotosModal(): void {
    this.isPhotosModalOpen.set(false);
    this.selectedAlbumForPhotos.set(null);
    this.albumPhotos.set([]);
    this.photosModalError.set(null);
    this.photosModalFeedback.set(null);
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
        this.photosModalError.set(
          err.error?.error || err.error?.message || 'Error al cargar las fotos del álbum'
        );
      }
    });
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

    if (typeof confirm === 'function' && !confirm(`¿Eliminar esta fotografía del álbum "${album.title}"?\n\nEsta acción quitará el archivo del almacenamiento y actualizará el total de fotos.`)) {
      return;
    }

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
        this.driveError.set(err.error?.error || err.message || 'Error al conectar con el importador de Google Drive');
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
    }
  }

  private handleSelectedFileList(files: File[]): void {
    this.revokePreviewUrls();

    const validImageFiles = files.filter(f =>
      f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name)
    );
    this.selectedFiles.set(validImageFiles);

    const previewUrls = validImageFiles.map(f => {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        return URL.createObjectURL(f);
      }
      return '';
    });
    this.filePreviewUrls.set(previewUrls);

    const oversized = validImageFiles.filter(f => f.size > this.MAX_FILE_SIZE_BYTES);
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
        if (url) URL.revokeObjectURL(url);
      });
    }
    this.filePreviewUrls.set([]);
  }

  public removeSelectedFile(index: number): void {
    const urls = this.filePreviewUrls();
    const urlToRemove = urls[index];
    if (urlToRemove && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
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
    this.bulkError.set(null);
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
    if (this.selectedFiles().length === 0) {
      this.bulkError.set('Selecciona al menos una fotografía para subir');
      return;
    }

    if (this.hasOversizedFiles()) {
      this.bulkError.set(
        `No es posible subir el lote: Hay ${this.oversizedFiles().length} archivo(s) que superan los 50 MB permitidos por Supabase Storage. Elimínalos para continuar.`
      );
      return;
    }

    this.isBulkUploading.set(true);
    this.bulkResult.set(null);
    this.bulkError.set(null);

    const formVal = this.bulkForm.getRawValue();

    this.adminService.bulkUpload(
      formVal.albumId,
      this.selectedFiles(),
      formVal.watermarkText,
      this.hdIndices()
    ).subscribe({
      next: (res) => {
        this.isBulkUploading.set(false);
        this.bulkResult.set(res);
        this.selectedFiles.set([]);
        this.loadAlbums(); // Recargar conteos actualizados
      },
      error: (err) => {
        this.isBulkUploading.set(false);
        const errorMsg = err.error?.error || err.error?.message || err.message || 'Error durante la subida masiva';
        this.bulkError.set(errorMsg);
      }
    });
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
        this.photographerError.set(err.error?.error || err.message || 'Error al registrar fotógrafo');
      }
    });
  }
}
