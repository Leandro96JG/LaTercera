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
    getAdminAlbums: ReturnType<typeof vi.fn>;
    createAlbum: ReturnType<typeof vi.fn>;
    updateAlbum: ReturnType<typeof vi.fn>;
  };

  const initialMockAlbum = {
    id: 'album-1',
    category: 'futbol' as const,
    title: 'Atlético Tesorieri vs Andino SC',
    subtitle: 'Liga Riojana de Fútbol',
    date: '12 Octubre, 2026',
    location: 'Estadio Carlos Augusto Mercado Luna',
    photosCount: 48,
    unitPrice: 1200,
    fullAlbumPrice: 9500,
    coverUrl: 'https://images.unsplash.com/photo-test',
    badge: '⚽ Fútbol',
    isPublished: true
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
      getAdminAlbums: vi.fn().mockReturnValue(of({
        success: true,
        total: 1,
        albums: [initialMockAlbum]
      })),
      createAlbum: vi.fn(),
      updateAlbum: vi.fn(),
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

  it('debe inicializar con la pestaña de Álbumes activa, álbumes cargados y estadísticas', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab()).toBe('albums');
    expect(component.stats().photosSold).toBe(50);
    expect(component.albums().length).toBe(1);
    expect(component.albums()[0].id).toBe('album-1');
    expect(component.priceDrafts()['album-1'].unitPrice).toBe(1200);
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

  it('debe crear un nuevo álbum y actualizar la lista reactiva en el panel', () => {
    const createdAlbum = {
      id: 'clasico-riojano-2026',
      category: 'futbol' as const,
      title: 'Clásico Riojano 2026',
      subtitle: 'Tesorieri vs Rioja Juniors',
      date: '20 Octubre, 2026',
      location: 'Mercado Luna',
      photosCount: 0,
      unitPrice: 1500,
      fullAlbumPrice: 11000,
      coverUrl: '',
      badge: '⚽ Fútbol',
      isPublished: true
    };

    mockAdminService.createAlbum.mockReturnValue(of({
      success: true,
      album: createdAlbum,
      message: 'Álbum creado exitosamente'
    }));

    component.openCreateModal();
    expect(component.isCreateModalOpen()).toBe(true);

    component.createAlbumForm.patchValue({
      title: 'Clásico Riojano 2026',
      category: 'futbol',
      subtitle: 'Tesorieri vs Rioja Juniors',
      date: '20 Octubre, 2026',
      location: 'Mercado Luna',
      unitPrice: 1500,
      fullAlbumPrice: 11000,
      badge: '⚽ Fútbol',
      isPublished: true
    });

    component.submitCreateAlbum();

    expect(component.isCreatingAlbum()).toBe(false);
    expect(component.isCreateModalOpen()).toBe(false);
    expect(component.albums().length).toBe(2);
    expect(component.albums()[0].id).toBe('clasico-riojano-2026');
    expect(component.priceDrafts()['clasico-riojano-2026'].unitPrice).toBe(1500);
  });

  it('debe autoseleccionar el álbum creado si se originó desde la pestaña de Google Drive', () => {
    const createdAlbum = {
      id: 'nuevo-evento-drive',
      category: 'sociales' as const,
      title: 'Cumpleaños 15 Años Sofía',
      subtitle: 'Salón de Eventos',
      date: '14 Octubre, 2026',
      photosCount: 0,
      unitPrice: 1400,
      fullAlbumPrice: 10000,
      badge: '🎉 Cumpleaños & Social',
      isPublished: true
    };

    mockAdminService.createAlbum.mockReturnValue(of({
      success: true,
      album: createdAlbum,
      message: 'Álbum creado exitosamente'
    }));

    component.openCreateModal('drive');
    expect(component.pendingTargetForm()).toBe('drive');

    component.createAlbumForm.patchValue({
      title: 'Cumpleaños 15 Años Sofía',
      category: 'sociales',
      subtitle: 'Salón de Eventos',
      date: '14 Octubre, 2026',
      location: 'Salón Elegance',
      unitPrice: 1400,
      fullAlbumPrice: 10000,
      badge: '🎉 Cumpleaños & Social',
      isPublished: true
    });

    component.submitCreateAlbum();

    expect(component.driveForm.get('albumId')?.value).toBe('nuevo-evento-drive');
    expect(component.activeTab()).toBe('drive');
  });

  it('debe guardar precios actualizados de un álbum y mostrar feedback', () => {
    mockAdminService.updateAlbum.mockReturnValue(of({
      success: true,
      album: {
        ...initialMockAlbum,
        unitPrice: 1600,
        fullAlbumPrice: 12000
      },
      message: 'Precios actualizados exitosamente'
    }));

    // Modificar borrador de precios
    const mockInput = { target: { value: '1600' } } as unknown as Event;
    component.onPriceDraftChange('album-1', 'unitPrice', mockInput);

    const mockAlbumInput = { target: { value: '12000' } } as unknown as Event;
    component.onPriceDraftChange('album-1', 'fullAlbumPrice', mockAlbumInput);

    expect(component.priceDrafts()['album-1'].unitPrice).toBe(1600);
    expect(component.priceDrafts()['album-1'].fullAlbumPrice).toBe(12000);

    component.saveAlbumPrices('album-1');

    expect(mockAdminService.updateAlbum).toHaveBeenCalledWith('album-1', {
      unitPrice: 1600,
      fullAlbumPrice: 12000
    });
    expect(component.updatingAlbumId()).toBe(null);
    expect(component.updateFeedback()?.success).toBe(true);
    expect(component.albums().find((a) => a.id === 'album-1')?.unitPrice).toBe(1600);
  });
});
