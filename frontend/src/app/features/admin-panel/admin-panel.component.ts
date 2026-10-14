import { Component, ChangeDetectionStrategy, inject, signal, OnInit, output } from '@angular/core';
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
  UpdateAlbumRequest
} from '../../core/models/admin.model';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css'
})
export class AdminPanelComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  public readonly adminAuthStore = inject(AdminAuthStore);
  public readonly adminService = inject(AdminService);
  public readonly albumService = inject(AlbumService);

  // Eventos hacia el contenedor principal
  public readonly goHome = output<void>();
  public readonly logout = output<void>();

  // Pestaña activa: 'albums' | 'drive' | 'upload' | 'photographers'
  public readonly activeTab = signal<'albums' | 'drive' | 'upload' | 'photographers'>('albums');

  // Álbumes disponibles en el sistema (vista administrativa y formularios)
  public readonly albums = signal<readonly Album[]>([]);
  public readonly isLoadingAlbums = signal<boolean>(false);

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

  // Formulario de Creación de Nuevo Álbum
  public readonly createAlbumForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(4)]],
    category: ['futbol' as AlbumCategory, [Validators.required]],
    subtitle: ['', [Validators.required]],
    date: [new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }), [Validators.required]],
    location: ['Estadio Carlos A. Mercado Luna, La Rioja', [Validators.required]],
    unitPrice: [1200, [Validators.required, Validators.min(100)]],
    fullAlbumPrice: [9500, [Validators.required, Validators.min(500)]],
    badge: ['⚽ Fútbol', [Validators.required]],
    coverUrl: [''],
    isPublished: [true]
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
    this.loadStats();
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

    this.adminService.createAlbum({
      title: val.title,
      category: val.category,
      subtitle: val.subtitle,
      date: val.date,
      location: val.location,
      unitPrice: Number(val.unitPrice),
      fullAlbumPrice: Number(val.fullAlbumPrice),
      badge: val.badge,
      coverUrl: val.coverUrl || undefined,
      isPublished: val.isPublished
    }).subscribe({
      next: (res) => {
        this.isCreatingAlbum.set(false);
        if (res.success && res.album) {
          const newAlbum = res.album;
          // Actualizamos la lista local reactiva
          const updatedList = [newAlbum, ...this.albums()];
          this.setAlbumsData(updatedList);

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
    this.adminService.updateAlbum(album.id, { isPublished: newStatus }).subscribe({
      next: (res) => {
        if (res.success && res.album) {
          this.albums.set(this.albums().map(a => a.id === album.id ? res.album : a));
        }
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
    const validImageFiles = files.filter(f =>
      f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name)
    );
    this.selectedFiles.set(validImageFiles);
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
        this.bulkError.set(err.error?.error || err.message || 'Error durante la subida masiva');
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
