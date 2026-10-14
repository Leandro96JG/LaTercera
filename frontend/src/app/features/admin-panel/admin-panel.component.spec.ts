import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AdminPanelComponent } from './admin-panel.component';
import { AdminService } from '../../core/services/admin.service';
import { AdminAuthStore } from '../../core/state/admin-auth.store';

describe('AdminPanelComponent - Panel de Fotógrafa & Procesamiento Masivo', () => {
  let component: AdminPanelComponent;
  let mockAdminService: {
    getStats: ReturnType<typeof vi.fn>;
    importFromDrive: ReturnType<typeof vi.fn>;
    bulkUpload: ReturnType<typeof vi.fn>;
    registerPhotographer: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAdminService = {
      getStats: vi.fn().mockReturnValue(of({
        success: true,
        stats: {
          photosSold: 50,
          albumsSold: 4,
          revenueARS: 72000,
          storageUsedGB: 2.1,
          storageLimitGB: 10,
          activeAlbumsCount: 4,
          lastUpdated: new Date().toISOString()
        }
      })),
      importFromDrive: vi.fn(),
      bulkUpload: vi.fn(),
      registerPhotographer: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AdminPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminService, useValue: mockAdminService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe inicializar con la pestaña de Google Drive activa y estadísticas cargadas', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab()).toBe('drive');
    expect(component.stats().photosSold).toBe(50);
  });

  it('debe validar la URL de Google Drive antes de permitir la importación', () => {
    component.driveForm.patchValue({
      driveUrl: 'https://invalid-storage.com/folder'
    });
    expect(component.driveForm.invalid).toBe(true);

    component.driveForm.patchValue({
      driveUrl: 'https://drive.google.com/drive/folders/1ABC_XYZ123'
    });
    expect(component.driveForm.valid).toBe(true);
  });

  it('debe ejecutar submitDriveImport y actualizar driveResult al tener éxito', () => {
    const mockResponse = {
      success: true,
      albumId: 'album-1',
      folderId: '1ABC_XYZ123',
      summary: {
        totalFound: 10,
        totalEligible: 8,
        totalSkipped: 2,
        successful: 8,
        failed: 0,
        durationMs: 1200
      },
      photos: [],
      errors: []
    };

    mockAdminService.importFromDrive.mockReturnValue(of(mockResponse));

    component.driveForm.patchValue({
      albumId: 'album-1',
      driveUrl: 'https://drive.google.com/drive/folders/1ABC_XYZ123',
      watermarkText: 'LA TERCERA'
    });

    component.submitDriveImport();

    expect(component.isDriveImporting()).toBe(false);
    expect(component.driveResult()).toEqual(mockResponse);
    expect(mockAdminService.importFromDrive).toHaveBeenCalled();
  });

  it('debe capturar errores de importación de Drive de forma reactiva', () => {
    mockAdminService.importFromDrive.mockReturnValue(
      throwError(() => ({ error: { error: 'Carpeta de Drive no encontrada o privada' } }))
    );

    component.driveForm.patchValue({
      albumId: 'album-1',
      driveUrl: 'https://drive.google.com/drive/folders/1ABC_XYZ123'
    });

    component.submitDriveImport();

    expect(component.isDriveImporting()).toBe(false);
    expect(component.driveError()).toContain('Carpeta de Drive no encontrada');
  });

  it('debe permitir seleccionar y alternar fotos destacadas como Muestra HD en subida masiva', () => {
    const file1 = new File(['1'], 'foto1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['2'], 'foto2.jpg', { type: 'image/jpeg' });

    component.selectedFiles.set([file1, file2]);
    component.hdIndices.set([0]);

    expect(component.isHdSelected(0)).toBe(true);
    expect(component.isHdSelected(1)).toBe(false);

    component.toggleHdIndex(1);
    expect(component.isHdSelected(1)).toBe(true);
  });

  it('debe registrar un nuevo fotógrafo colaborador correctamente', () => {
    const mockPhotographerRes = {
      success: true,
      photographer: {
        id: 'usr_colab_1',
        email: 'asistente@latercera.com.ar',
        name: 'Carlos Foto',
        role: 'photographer',
        photographerId: 'photo_carlos',
        createdAt: new Date().toISOString()
      }
    };

    mockAdminService.registerPhotographer.mockReturnValue(of(mockPhotographerRes));

    component.photographerForm.patchValue({
      name: 'Carlos Foto',
      email: 'asistente@latercera.com.ar',
      password: 'PasswordSuperSegura2026!',
      role: 'photographer'
    });

    component.submitRegisterPhotographer();

    expect(component.isRegisteringPhotographer()).toBe(false);
    expect(component.photographerResult()).toEqual(mockPhotographerRes);
  });
});
