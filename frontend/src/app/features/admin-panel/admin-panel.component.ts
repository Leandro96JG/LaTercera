import { Component, ChangeDetectionStrategy, inject, signal, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminAuthStore } from '../../core/state/admin-auth.store';
import { AdminService } from '../../core/services/admin.service';
import { AlbumService } from '../../core/services/album.service';
import { Album } from '../../core/models/album.model';
import {
  AdminStats,
  DriveImportResponse,
  BulkUploadResponse,
  RegisterPhotographerResponse
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

  // Pestaña activa: 'metrics' | 'drive' | 'upload' | 'photographers'
  public readonly activeTab = signal<'metrics' | 'drive' | 'upload' | 'photographers'>('drive');

  // Álbumes disponibles en el sistema
  public readonly albums = signal<readonly Album[]>([]);

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

  // Estados de carga
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
    this.albumService.getAlbums().subscribe({
      next: (list) => this.albums.set(list),
      error: () => {
        // Fallback local
        this.albums.set([
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
            badge: '⚽ Fútbol'
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
            badge: '🏑 Hockey'
          }
        ]);
      }
    });
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
