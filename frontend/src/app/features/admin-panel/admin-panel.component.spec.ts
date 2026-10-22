import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { AdminPanelComponent } from './admin-panel.component';
import { AdminService } from '../../core/services/admin.service';
import { AdminAuthStore } from '../../core/state/admin-auth.store';
import { Album, AlbumCategory } from '../../core/models/album.model';
import { CategoryDTO } from '../../core/models/category.model';

describe('AdminPanelComponent - Panel de Fotógrafa & Procesamiento Masivo', () => {
  let component: AdminPanelComponent;
  let fixture: ComponentFixture<AdminPanelComponent>;
  let mockAdminService: {
    getStats: ReturnType<typeof vi.fn>;
    importFromDrive: ReturnType<typeof vi.fn>;
    bulkUpload: ReturnType<typeof vi.fn>;
    registerPhotographer: ReturnType<typeof vi.fn>;
    getAdminAlbums: ReturnType<typeof vi.fn>;
    createAlbum: ReturnType<typeof vi.fn>;
    updateAlbum: ReturnType<typeof vi.fn>;
    getTrashAlbums: ReturnType<typeof vi.fn>;
    moveToTrash: ReturnType<typeof vi.fn>;
    restoreFromTrash: ReturnType<typeof vi.fn>;
    permanentDeleteAlbum: ReturnType<typeof vi.fn>;
    toggleCourtesyDownload: ReturnType<typeof vi.fn>;
    updateAlbumPrivacy: ReturnType<typeof vi.fn>;
    getAdminOrders: ReturnType<typeof vi.fn>;
    regenerateOrderToken: ReturnType<typeof vi.fn>;
    getAlbumPhotos: ReturnType<typeof vi.fn>;
    updateAlbumPhoto: ReturnType<typeof vi.fn>;
    deleteAlbumPhoto: ReturnType<typeof vi.fn>;
    reorderAlbumPhotos: ReturnType<typeof vi.fn>;
    getPromotions: ReturnType<typeof vi.fn>;
    updatePricingConfig: ReturnType<typeof vi.fn>;
    createCoupon: ReturnType<typeof vi.fn>;
    updateCoupon: ReturnType<typeof vi.fn>;
    deleteCoupon: ReturnType<typeof vi.fn>;
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
      registerPhotographer: vi.fn(),
      getTrashAlbums: vi.fn().mockReturnValue(of({ success: true, count: 0, trash: [] })),
      moveToTrash: vi.fn().mockReturnValue(of({ success: true, message: 'Álbum movido a la papelera' })),
      restoreFromTrash: vi.fn().mockReturnValue(of({ success: true, message: 'Álbum restaurado' })),
      permanentDeleteAlbum: vi.fn().mockReturnValue(of({ success: true, message: 'Álbum eliminado' })),
      toggleCourtesyDownload: vi.fn().mockReturnValue(of({ success: true, album: initialMockAlbum })),
      updateAlbumPrivacy: vi.fn().mockReturnValue(of({ success: true, album: initialMockAlbum })),
      getAdminOrders: vi.fn().mockReturnValue(of({
        success: true,
        total: 1,
        orders: [
          {
            id: 'ord_mock_1',
            albumId: 'album-1',
            albumTitle: 'Atlético Tesorieri vs Andino SC',
            photoIds: ['p1'],
            isFullAlbum: false,
            photoCount: 1,
            unitPrice: 1200,
            subtotal: 1200,
            discount: 0,
            discountPercentage: 0,
            totalAmount: 1200,
            currency: 'ARS',
            customer: { email: 'cliente@test.com', name: 'Laura', phone: '+5493804556677' },
            status: 'PAID',
            downloadToken: 'valid_token_123',
            downloadUrl: 'http://localhost:4200/pago-exitoso?token=valid_token_123',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      })),
      regenerateOrderToken: vi.fn().mockReturnValue(of({
        success: true,
        orderId: 'ord_mock_1',
        downloadToken: 'new_token_456',
        downloadUrl: 'http://localhost:4200/pago-exitoso?token=new_token_456',
        expiresInHours: 72
      })),
      getAlbumPhotos: vi.fn().mockReturnValue(of({
        success: true,
        albumId: 'album-1',
        total: 2,
        photos: [
          {
            id: 'photo-1',
            albumId: 'album-1',
            filename: 'tesorieri_01.jpg',
            originalPath: 'originals/album-1/photo-1.jpg',
            previewUrl: 'https://cdn.example.com/photo-1.webp',
            isSampleHd: false
          },
          {
            id: 'photo-2',
            albumId: 'album-1',
            filename: 'tesorieri_02.jpg',
            originalPath: 'originals/album-1/photo-2.jpg',
            previewUrl: 'https://cdn.example.com/photo-2.webp',
            isSampleHd: true
          }
        ]
      })),
      updateAlbumPhoto: vi.fn().mockReturnValue(of({
        success: true,
        photo: {
          id: 'photo-1',
          albumId: 'album-1',
          filename: 'tesorieri_01.jpg',
          originalPath: 'originals/album-1/photo-1.jpg',
          previewUrl: 'https://cdn.example.com/photo-1.webp',
          isSampleHd: true
        },
        coverUrl: 'https://cdn.example.com/photo-1.webp',
        message: 'Foto actualizada'
      })),
      deleteAlbumPhoto: vi.fn().mockReturnValue(of({
        success: true,
        photoId: 'photo-1',
        message: 'Foto eliminada correctamente'
      })),
      reorderAlbumPhotos: vi.fn().mockReturnValue(of({
        success: true,
        albumId: 'album-1',
        message: 'Orden de fotos actualizado correctamente'
      })),
      getPromotions: vi.fn().mockReturnValue(of({
        success: true,
        config: {
          enableTierDiscounts: true,
          tier3DiscountPercent: 20,
          tier5DiscountPercent: 30,
          capAtFullAlbumPrice: true
        },
        coupons: [
          {
            code: 'YUYO10',
            discountPercent: 10,
            isActive: true,
            usedCount: 0
          }
        ]
      })),
      updatePricingConfig: vi.fn().mockReturnValue(of({
        success: true,
        config: {
          enableTierDiscounts: true,
          tier3DiscountPercent: 25,
          tier5DiscountPercent: 35,
          capAtFullAlbumPrice: true
        },
        message: 'Configuración actualizada'
      })),
      createCoupon: vi.fn().mockReturnValue(of({
        success: true,
        coupon: {
          code: 'FIESTA20',
          discountPercent: 20,
          isActive: true,
          usedCount: 0
        },
        message: 'Cupón creado'
      })),
      updateCoupon: vi.fn().mockReturnValue(of({
        success: true,
        coupon: {
          code: 'YUYO10',
          discountPercent: 10,
          isActive: false,
          usedCount: 0
        },
        message: 'Cupón actualizado'
      })),
      deleteCoupon: vi.fn().mockReturnValue(of({
        success: true,
        code: 'YUYO10',
        message: 'Cupón eliminado'
      }))
    };

    await TestBed.configureTestingModule({
      imports: [AdminPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminService, useValue: mockAdminService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPanelComponent);
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

  it('debe rechazar el guardado de precios si unitPrice supera fullAlbumPrice', () => {
    // Configurar borrador inválido: unitPrice 15000 > fullAlbumPrice 5000
    const mockInput = { target: { value: '15000' } } as unknown as Event;
    component.onPriceDraftChange('album-1', 'unitPrice', mockInput);

    const mockAlbumInput = { target: { value: '5000' } } as unknown as Event;
    component.onPriceDraftChange('album-1', 'fullAlbumPrice', mockAlbumInput);

    component.saveAlbumPrices('album-1');

    expect(mockAdminService.updateAlbum).not.toHaveBeenCalled();
    expect(component.updateFeedback()?.success).toBe(false);
    expect(component.updateFeedback()?.message).toContain('no puede ser más cara');
  });

  it('debe rechazar la creación de un álbum si unitPrice supera fullAlbumPrice en el formulario', () => {
    component.openCreateModal();

    component.createAlbumForm.patchValue({
      title: 'Torneo Precios Invertidos',
      category: 'futbol',
      subtitle: 'Liga Riojana',
      date: '20 Octubre, 2026',
      location: 'Mercado Luna',
      unitPrice: 15000,
      fullAlbumPrice: 5000,
      badge: '⚽ Fútbol',
      isPublished: true
    });

    component.submitCreateAlbum();

    expect(mockAdminService.createAlbum).not.toHaveBeenCalled();
    expect(component.createAlbumError()).toContain('no puede ser mayor');
  });

  it('debe alternar la visibilidad de un álbum con togglePublishStatus y mostrar feedback', () => {
    mockAdminService.updateAlbum.mockReturnValue(of({
      success: true,
      album: {
        ...initialMockAlbum,
        isPublished: false
      },
      message: 'Álbum actualizado'
    }));

    component.togglePublishStatus(initialMockAlbum);

    expect(mockAdminService.updateAlbum).toHaveBeenCalledWith('album-1', { isPublished: false });
    expect(component.isTogglingPublishId()).toBe(null);
    expect(component.albums().find(a => a.id === 'album-1')?.isPublished).toBe(false);
    expect(component.updateFeedback()?.success).toBe(true);
    expect(component.updateFeedback()?.message).toContain('ocultado');
  });

  it('debe paginar los álbumes en la vista de administración', () => {
    // Simular 8 álbumes en el panel
    const mockList = Array.from({ length: 8 }, (_, i) => ({
      ...initialMockAlbum,
      id: `album-${i + 1}`,
      title: `Álbum #${i + 1}`
    }));

    component.albums.set(mockList);
    component.pageSize.set(3);

    expect(component.totalPages()).toBe(3);
    expect(component.paginatedAlbums().length).toBe(3);
    expect(component.currentPage()).toBe(1);

    component.nextPage();
    expect(component.currentPage()).toBe(2);
    expect(component.paginatedAlbums().length).toBe(3);

    component.nextPage();
    expect(component.currentPage()).toBe(3);
    expect(component.paginatedAlbums().length).toBe(2);

    component.prevPage();
    expect(component.currentPage()).toBe(2);
  });

  it('debe cargar 10 álbumes, verificar pageSize 6, mostrar exactamente 6 en página 1 y 4 en página 2, y renderizar 6 tarjetas en el DOM', () => {
    const mockList = Array.from({ length: 10 }, (_, i) => ({
      ...initialMockAlbum,
      id: `album-pag-${i + 1}`,
      title: `Álbum de Prueba #${i + 1}`,
      category: 'futbol' as AlbumCategory,
      isPublished: true,
      deletedAt: null
    }));

    component.albums.set(mockList);
    component.clearAlbumFilters();
    fixture.detectChanges();

    expect(component.pageSize()).toBe(6);
    expect(component.filteredAdminAlbums().length).toBe(10);
    expect(component.totalPages()).toBe(2);
    expect(component.currentPage()).toBe(1);
    expect(component.paginatedAlbums().length).toBe(6);

    // Verificar en el DOM que se renderizan exactamente 6 tarjetas de álbum en la página 1
    const compiled = fixture.nativeElement as HTMLElement;
    const cardsPage1 = compiled.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-2 > div');
    expect(cardsPage1.length).toBe(6);

    // Ir a la página 2
    component.goToPage(2);
    fixture.detectChanges();

    expect(component.currentPage()).toBe(2);
    expect(component.paginatedAlbums().length).toBe(4);
    const cardsPage2 = compiled.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-2 > div');
    expect(cardsPage2.length).toBe(4);
  });

  describe('Buscador y Filtros Reactivos de Álbumes (filteredAdminAlbums)', () => {
    beforeEach(() => {
      component.albums.set([
        {
          id: 'album-fut-1',
          category: 'futbol',
          title: 'Defensores de la Boca vs Rioja Juniors',
          subtitle: 'Torneo Clausura',
          date: '2026-10-15',
          eventDate: '2026-10-15',
          location: 'Estadio Mercado Luna',
          photosCount: 50,
          unitPrice: 1200,
          fullAlbumPrice: 9500,
          coverUrl: '',
          badge: '⚽ Fútbol',
          isPublished: true,
          isPrivate: false,
          isFreeDownload: false
        },
        {
          id: 'album-hoc-2',
          category: 'hockey',
          title: 'Semifinal Hockey Dairó',
          subtitle: 'Polideportivo Evita',
          date: '2026-10-10',
          eventDate: '2026-10-10',
          location: 'Cancha 1',
          photosCount: 30,
          unitPrice: 1200,
          fullAlbumPrice: 9500,
          coverUrl: '',
          badge: '🏑 Hockey',
          isPublished: false,
          isPrivate: false,
          isFreeDownload: false
        },
        {
          id: 'album-bas-3',
          category: 'basquet',
          title: 'Final Básquetbol Riojano',
          subtitle: 'Club San Martín',
          date: '2026-10-05',
          eventDate: '2026-10-05',
          location: 'Cancha Central',
          photosCount: 80,
          unitPrice: 1500,
          fullAlbumPrice: 12000,
          coverUrl: '',
          badge: '🏀 Básquet',
          isPublished: true,
          isPrivate: true,
          accessCode: 'BASQUET26',
          isFreeDownload: false
        },
        {
          id: 'album-soc-4',
          category: 'sociales',
          title: 'Fiesta de 15 Camila',
          subtitle: 'Salón Las Retamas',
          date: '2026-10-01',
          eventDate: '2026-10-01',
          location: 'Salón Principal',
          photosCount: 15,
          unitPrice: 1000,
          fullAlbumPrice: 7000,
          coverUrl: '',
          badge: '🎉 Cumpleaños',
          isPublished: true,
          isPrivate: false,
          isFreeDownload: true
        }
      ]);
      component.clearAlbumFilters();
    });

    it('debe filtrar álbumes en tiempo real por búsqueda de texto (título, subtítulo, ID, fecha)', () => {
      // Búsqueda por título
      component.albumSearchQuery.set('Defensores');
      expect(component.filteredAdminAlbums().length).toBe(1);
      expect(component.filteredAdminAlbums()[0].id).toBe('album-fut-1');

      // Búsqueda por subtítulo
      component.albumSearchQuery.set('Las Retamas');
      expect(component.filteredAdminAlbums().length).toBe(1);
      expect(component.filteredAdminAlbums()[0].id).toBe('album-soc-4');

      // Búsqueda por ID
      component.albumSearchQuery.set('album-bas-3');
      expect(component.filteredAdminAlbums().length).toBe(1);
      expect(component.filteredAdminAlbums()[0].id).toBe('album-bas-3');

      // Búsqueda por fecha
      component.albumSearchQuery.set('2026-10-10');
      expect(component.filteredAdminAlbums().length).toBe(1);
      expect(component.filteredAdminAlbums()[0].id).toBe('album-hoc-2');
    });

    it('debe filtrar combinando categoría y estado (privados, cortesía, ocultos, publicados)', () => {
      // Filtrar por categoría hockey
      component.albumCategoryFilter.set('hockey');
      expect(component.filteredAdminAlbums().length).toBe(1);
      expect(component.filteredAdminAlbums()[0].category).toBe('hockey');

      // Combinar categoría hockey con estado publicados -> 0 (porque está oculto)
      component.albumStatusFilter.set('publicados');
      expect(component.filteredAdminAlbums().length).toBe(0);

      // Cambiar estado a ocultos -> 1
      component.albumStatusFilter.set('ocultos');
      expect(component.filteredAdminAlbums().length).toBe(1);

      // Limpiar y filtrar por privados
      component.albumCategoryFilter.set('todos');
      component.albumStatusFilter.set('privados');
      expect(component.filteredAdminAlbums().length).toBe(1);
      expect(component.filteredAdminAlbums()[0].id).toBe('album-bas-3');

      // Filtrar por cortesía gratis
      component.albumStatusFilter.set('cortesia');
      expect(component.filteredAdminAlbums().length).toBe(1);
      expect(component.filteredAdminAlbums()[0].id).toBe('album-soc-4');
    });

    it('debe ordenar álbumes por más fotos, menos fotos, más recientes y más antiguos', () => {
      // Más fotos (80, 50, 30, 15)
      component.albumSortBy.set('mas_fotos');
      expect(component.filteredAdminAlbums()[0].id).toBe('album-bas-3');
      expect(component.filteredAdminAlbums()[3].id).toBe('album-soc-4');

      // Menos fotos (15, 30, 50, 80)
      component.albumSortBy.set('menos_fotos');
      expect(component.filteredAdminAlbums()[0].id).toBe('album-soc-4');
      expect(component.filteredAdminAlbums()[3].id).toBe('album-bas-3');

      // Más recientes (2026-10-15 -> 2026-10-01)
      component.albumSortBy.set('recientes');
      expect(component.filteredAdminAlbums()[0].id).toBe('album-fut-1');

      // Más antiguos (2026-10-01 -> 2026-10-15)
      component.albumSortBy.set('antiguos');
      expect(component.filteredAdminAlbums()[0].id).toBe('album-soc-4');
    });

    it('debe restablecer todos los filtros con clearAlbumFilters()', () => {
      component.albumSearchQuery.set('fiesta');
      component.albumCategoryFilter.set('sociales');
      component.albumStatusFilter.set('cortesia');
      component.albumSortBy.set('mas_fotos');

      expect(component.hasActiveAlbumFilters()).toBe(true);
      expect(component.filteredAdminAlbums().length).toBe(1);

      component.clearAlbumFilters();

      expect(component.albumSearchQuery()).toBe('');
      expect(component.albumCategoryFilter()).toBe('todos');
      expect(component.albumStatusFilter()).toBe('todos');
      expect(component.albumSortBy()).toBe('recientes');
      expect(component.hasActiveAlbumFilters()).toBe(false);
      expect(component.filteredAdminAlbums().length).toBe(4);
    });
  });

  it('debe detectar archivos que superan el límite de 50 MB de Supabase Storage y bloquear la subida', () => {
    // Archivo de 52 MB simulado
    const oversizedFile = new File(['x'.repeat(100)], 'foto_upscaled_4x.png', { type: 'image/png' });
    Object.defineProperty(oversizedFile, 'size', { value: 52.5 * 1024 * 1024 });

    const normalFile = new File(['normal'], 'foto_normal.jpg', { type: 'image/jpeg' });
    Object.defineProperty(normalFile, 'size', { value: 3.5 * 1024 * 1024 });

    component.selectedFiles.set([normalFile, oversizedFile]);

    expect(component.hasOversizedFiles()).toBe(true);
    expect(component.oversizedFiles().length).toBe(1);
    expect(component.oversizedFiles()[0].name).toBe('foto_upscaled_4x.png');

    // Intentar subir debe bloquearse
    component.submitBulkUpload();

    expect(mockAdminService.bulkUpload).not.toHaveBeenCalled();
    expect(component.bulkError()).toContain('superan los 50 MB permitidos');
  });

  it('debe permitir eliminar un archivo puntual de la selección o limpiar todos los archivos', () => {
    const file1 = new File(['1'], 'foto1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['2'], 'foto2.jpg', { type: 'image/jpeg' });

    component.selectedFiles.set([file1, file2]);
    component.hdIndices.set([0, 1]);

    expect(component.selectedFiles().length).toBe(2);

    // Quitar el primer archivo
    component.removeSelectedFile(0);
    expect(component.selectedFiles().length).toBe(1);
    expect(component.selectedFiles()[0].name).toBe('foto2.jpg');

    // Limpiar todos
    component.clearSelectedFiles();
    expect(component.selectedFiles().length).toBe(0);
    expect(component.hdIndices().length).toBe(0);
  });

  describe('Pestaña Ventas & Entregas y Regeneración de Enlaces de 72 Horas', () => {
    it('debe inicializar cargando las órdenes y calculando métricas de ventas reactivas', () => {
      expect(component.orders().length).toBe(1);
      expect(component.paidOrdersCount()).toBe(1);
      expect(component.totalPaidRevenue()).toBe(1200);
      expect(mockAdminService.getAdminOrders).toHaveBeenCalled();
    });

    it('debe filtrar las órdenes por estado y por texto de búsqueda', () => {
      const extraOrders = [
        {
          id: 'ord_pending_99',
          albumId: 'album-1',
          albumTitle: 'Atlético Tesorieri vs Andino SC',
          photoIds: ['p1', 'p2'],
          isFullAlbum: false,
          photoCount: 2,
          unitPrice: 1200,
          subtotal: 2400,
          discount: 0,
          discountPercentage: 0,
          totalAmount: 2400,
          currency: 'ARS',
          customer: { email: 'pedro@pendiente.com', name: 'Pedro' },
          status: 'PENDING' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'ord_fraud_88',
          albumId: 'album-2',
          albumTitle: 'Hockey Polideportivo',
          photoIds: [],
          isFullAlbum: true,
          photoCount: 36,
          unitPrice: 1200,
          subtotal: 9500,
          discount: 0,
          discountPercentage: 0,
          totalAmount: 9500,
          currency: 'ARS',
          customer: { email: 'estafador@alerta.com', name: 'Estafador' },
          status: 'FRAUD_ALERT_PRICE_MISMATCH' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      component.orders.set([...component.orders(), ...extraOrders]);

      expect(component.orders().length).toBe(3);

      // Filtro por PAID
      component.orderStatusFilter.set('PAID');
      expect(component.filteredOrders().length).toBe(1);
      expect(component.filteredOrders()[0].id).toBe('ord_mock_1');

      // Filtro por PENDING
      component.orderStatusFilter.set('PENDING');
      expect(component.filteredOrders().length).toBe(1);
      expect(component.filteredOrders()[0].id).toBe('ord_pending_99');

      // Filtro por Búsqueda
      component.orderStatusFilter.set('ALL');
      component.orderSearchQuery.set('estafador');
      expect(component.filteredOrders().length).toBe(1);
      expect(component.filteredOrders()[0].id).toBe('ord_fraud_88');
    });

    it('debe regenerar el token de descarga en 1 clic, actualizar la orden y copiar al portapapeles', () => {
      // Mock clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      const orderToRenew = component.orders()[0];
      component.renewOrderToken(orderToRenew);

      expect(mockAdminService.regenerateOrderToken).toHaveBeenCalledWith('ord_mock_1');
      expect(writeTextMock).toHaveBeenCalledWith('http://localhost:4200/pago-exitoso?token=new_token_456');

      const updated = component.orders().find(o => o.id === 'ord_mock_1');
      expect(updated?.downloadToken).toBe('new_token_456');
      expect(updated?.downloadUrl).toBe('http://localhost:4200/pago-exitoso?token=new_token_456');
      expect(component.renewFeedback()?.success).toBe(true);
    });

    it('debe abrir enlace de WhatsApp pre-armado con el token de descarga del cliente', () => {
      const windowOpenMock = vi.fn();
      vi.stubGlobal('open', windowOpenMock);

      const order = component.orders()[0];
      component.sendWhatsApp(order);

      expect(windowOpenMock).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/5493804556677?text='),
        '_blank'
      );

      vi.unstubAllGlobals();
    });
  });

  describe('Modal Bento: Gestión de Fotos del Álbum', () => {
    it('debe abrir el modal de fotos y cargar las fotografías del álbum seleccionado', () => {
      component.openPhotosModal(initialMockAlbum);

      expect(component.isPhotosModalOpen()).toBe(true);
      expect(component.selectedAlbumForPhotos()?.id).toBe('album-1');
      expect(mockAdminService.getAlbumPhotos).toHaveBeenCalledWith('album-1');
      expect(component.albumPhotos().length).toBe(2);
      expect(component.albumPhotos()[0].id).toBe('photo-1');
    });

    it('debe cerrar el modal de fotos y resetear el estado', () => {
      component.openPhotosModal(initialMockAlbum);
      expect(component.isPhotosModalOpen()).toBe(true);

      component.closePhotosModal();

      expect(component.isPhotosModalOpen()).toBe(false);
      expect(component.selectedAlbumForPhotos()).toBeNull();
      expect(component.albumPhotos().length).toBe(0);
      expect(component.photosModalFeedback()).toBeNull();
    });

    it('debe definir una foto como portada del álbum y actualizar el estado local', () => {
      component.openPhotosModal(initialMockAlbum);
      const photoToCover = component.albumPhotos()[0];

      component.setPhotoAsCover(photoToCover);

      expect(mockAdminService.updateAlbumPhoto).toHaveBeenCalledWith(
        'album-1',
        'photo-1',
        { setAsCover: true }
      );
      expect(component.selectedAlbumForPhotos()?.coverUrl).toBe('https://cdn.example.com/photo-1.webp');
      expect(component.albums().find(a => a.id === 'album-1')?.coverUrl).toBe('https://cdn.example.com/photo-1.webp');
      expect(component.photosModalFeedback()?.success).toBe(true);
    });

    it('debe alternar el estado de muestra HD de una foto', () => {
      component.openPhotosModal(initialMockAlbum);
      const photo = component.albumPhotos()[0]; // isSampleHd is false

      component.toggleSampleHd(photo);

      expect(mockAdminService.updateAlbumPhoto).toHaveBeenCalledWith(
        'album-1',
        'photo-1',
        { isSampleHD: true }
      );
      expect(component.albumPhotos().find(p => p.id === 'photo-1')?.isSampleHd).toBe(true);
      expect(component.photosModalFeedback()?.success).toBe(true);
    });

    it('debe requerir confirmación inline de dos clics para eliminar una foto del álbum sin usar confirm nativo', () => {
      component.openPhotosModal(initialMockAlbum);
      const photoToDelete = component.albumPhotos()[0];

      // Primer clic: activa el estado de confirmación y no llama al servicio
      component.deleteAlbumPhoto(photoToDelete);

      expect(component.confirmingDeletePhotoId()).toBe('photo-1');
      expect(mockAdminService.deleteAlbumPhoto).not.toHaveBeenCalled();

      // Segundo clic dentro de los 3s: confirma y llama al servicio
      component.deleteAlbumPhoto(photoToDelete);

      expect(mockAdminService.deleteAlbumPhoto).toHaveBeenCalledWith('album-1', 'photo-1');
      expect(component.confirmingDeletePhotoId()).toBeNull();
      expect(component.albumPhotos().some(p => p.id === 'photo-1')).toBe(false);
      expect(component.selectedAlbumForPhotos()?.photosCount).toBe(47);
      expect(component.albums().find(a => a.id === 'album-1')?.photosCount).toBe(47);
      expect(component.photosModalFeedback()?.success).toBe(true);
    });

    it('debe manejar errores HTTP en loadAlbumPhotos mostrando toast y guardando el mensaje en photosModalError sin romper el modal', () => {
      mockAdminService.getAlbumPhotos.mockReturnValueOnce(
        throwError(() => ({ error: { error: 'Fallo de conexión con la base de datos' } }))
      );

      component.openPhotosModal(initialMockAlbum);

      expect(component.isPhotosModalOpen()).toBe(true);
      expect(component.isLoadingAlbumPhotos()).toBe(false);
      expect(component.photosModalError()).toBe('Fallo de conexión con la base de datos');
      expect(component.toast()?.type).toBe('error');
      expect(component.toast()?.message).toContain('Fallo de conexión con la base de datos');
      expect(component.albumPhotos().length).toBe(0);
    });

    it('debe reintentar la carga de fotos al invocar loadAlbumPhotos tras un fallo previo', () => {
      // 1. Primer intento falla
      mockAdminService.getAlbumPhotos.mockReturnValueOnce(
        throwError(() => ({ message: 'Error de red transitorio' }))
      );
      component.openPhotosModal(initialMockAlbum);
      expect(component.photosModalError()).toBe('Error de red transitorio');

      // 2. Reintento exitoso
      mockAdminService.getAlbumPhotos.mockReturnValueOnce(
        of({
          success: true,
          albumId: 'album-1',
          total: 1,
          photos: [
            {
              id: 'photo-retry-1',
              albumId: 'album-1',
              filename: 'retry.jpg',
              originalPath: '',
              previewUrl: 'http://localhost:4000/retry.webp',
              isSampleHd: false
            }
          ]
        })
      );

      component.loadAlbumPhotos('album-1');

      expect(component.isLoadingAlbumPhotos()).toBe(false);
      expect(component.photosModalError()).toBeNull();
      expect(component.albumPhotos().length).toBe(1);
      expect(component.albumPhotos()[0].id).toBe('photo-retry-1');
    });

    it('debe reemplazar la imagen rota con un fallback seguro en onPhotoThumbError', () => {
      const mockImg = { src: 'http://broken-link.com/photo.jpg' } as HTMLImageElement;
      const mockEvent = { target: mockImg } as unknown as Event;
      const photo = {
        id: 'photo-broken',
        albumId: 'album-1',
        filename: 'broken.jpg',
        originalPath: '',
        previewUrl: 'http://broken-link.com/photo.jpg',
        isSampleHd: false
      };

      component.onPhotoThumbError(mockEvent, photo);

      expect(mockImg.src).toContain('https://images.unsplash.com');
    });

    it('debe detectar correctamente si un álbum contiene fotos de muestra demo con isSampleDemoAlbum', () => {
      expect(component.isSampleDemoAlbum(null)).toBe(false);

      // Con fotos regulares de producción
      component.albumPhotos.set([
        {
          id: 'photo-prod-1',
          albumId: 'album-1',
          filename: 'partido_001.jpg',
          originalPath: 'originals/album-1/partido_001.jpg',
          previewUrl: 'https://cdn.example.com/partido_001.webp',
          isSampleHd: false
        }
      ]);
      expect(component.isSampleDemoAlbum(initialMockAlbum)).toBe(false);

      // Con fotos sintéticas de muestra/demo
      component.albumPhotos.set([
        {
          id: 'album-1-photo-1',
          albumId: 'album-1',
          filename: 'demo_muestra_01.jpg',
          originalPath: '',
          previewUrl: 'http://localhost:4000/demo1.webp',
          isSampleHd: true
        }
      ]);
      expect(component.isSampleDemoAlbum(initialMockAlbum)).toBe(true);
    });
  });

  describe('Kit de Difusión WhatsApp, Miniaturas en Subida Masiva y Sistema de Toasts Bento', () => {
    it('debe generar y copiar el texto de difusión para WhatsApp con enlace directo al portapapeles', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      component.copyWhatsAppShareText(initialMockAlbum);

      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('📸 ¡Ya están las fotos de Atlético Tesorieri vs Andino SC en LA TERCERA!')
      );
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('/?album=album-1')
      );
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('Foto suelta: $1200 | Pack completo: $9500')
      );
      expect(component.copiedWhatsAppAlbumId()).toBe('album-1');
      expect(component.toast()?.type).toBe('success');
    });

    it('debe incluir el código PIN en el mensaje de WhatsApp si el álbum es privado', () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      const privateAlbum = {
        ...initialMockAlbum,
        isPrivate: true,
        accessCode: 'SECRETO123'
      };

      component.copyWhatsAppShareText(privateAlbum);

      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('🔒 PIN de acceso: SECRETO123')
      );
    });

    it('debe generar URLs de previsualización con createObjectURL y revocarlas al remover o limpiar', () => {
      const createObjectURLMock = vi.fn((file: File) => `blob:http://localhost:4200/${file.name}`);
      const revokeObjectURLMock = vi.fn();
      vi.stubGlobal('URL', {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock
      });

      const f1 = new File(['content1'], 'foto1.jpg', { type: 'image/jpeg' });
      const f2 = new File(['content2'], 'foto2.jpg', { type: 'image/jpeg' });

      // Simular onFilesDropped o handleSelectedFileList
      (component as any).handleSelectedFileList([f1, f2]);

      expect(component.filePreviewUrls().length).toBe(2);
      expect(component.filePreviewUrls()[0]).toBe('blob:http://localhost:4200/foto1.jpg');
      expect(createObjectURLMock).toHaveBeenCalledTimes(2);

      // Quitar la primera foto
      component.removeSelectedFile(0);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost:4200/foto1.jpg');
      expect(component.filePreviewUrls().length).toBe(1);

      // Limpiar selección
      component.clearSelectedFiles();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost:4200/foto2.jpg');
      expect(component.filePreviewUrls().length).toBe(0);

      vi.unstubAllGlobals();
    });

    it('debe abrir modal Bento de confirmación para mover a papelera y procesar con confirmMoveToTrash', () => {
      // Al hacer clic en moveToTrash se abre el modal Bento sin confirm() nativo
      component.moveToTrash(initialMockAlbum);

      expect(component.isTrashModalOpen()).toBe(true);
      expect(component.albumToTrash()?.id).toBe('album-1');

      // Confirmar en el modal Bento
      component.confirmMoveToTrash();

      expect(mockAdminService.moveToTrash).toHaveBeenCalledWith('album-1');
      expect(component.isTrashModalOpen()).toBe(false);
      expect(component.albumToTrash()).toBeNull();
      expect(component.albums().find(a => a.id === 'album-1')).toBeUndefined();
      expect(component.toast()?.type).toBe('success');
      expect(component.toast()?.message).toContain('movido a la papelera');
    });

    it('debe validar inline y mostrar toast si falta el PIN al proteger álbum sin invocar alert nativo', () => {
      const alertMock = vi.fn();
      vi.stubGlobal('alert', alertMock);

      component.startEditPrivacy(initialMockAlbum);
      component.privacyAccessCodeInput.set('');

      component.savePrivacy(initialMockAlbum, true);

      // Debe rechazar sin invocar alert() nativo del navegador
      expect(alertMock).not.toHaveBeenCalled();
      expect(component.privacyError()).toContain('código PIN');
      expect(component.toast()?.type).toBe('warning');
      expect(mockAdminService.updateAlbumPrivacy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('debe gestionar el ciclo de vida del Toast flotante Bento', () => {
      component.showToast('Operación exitosa', 'success');
      expect(component.toast()?.message).toBe('Operación exitosa');
      expect(component.toast()?.type).toBe('success');

      component.dismissToast();
      expect(component.toast()).toBeNull();
    });

    it('debe acumular fotos al llamar handleSelectedFileList dos veces seguidas sin borrar la primera ni perder hdIndices ni previewUrls', () => {
      const createObjectURLMock = vi.fn((file: File) => `blob:http://localhost:4200/${file.name}`);
      const revokeObjectURLMock = vi.fn();
      vi.stubGlobal('URL', {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock
      });

      const f1 = new File(['foto 1'], 'foto1.jpg', { type: 'image/jpeg', lastModified: 1000 });
      const f2 = new File(['foto 2'], 'foto2.jpg', { type: 'image/jpeg', lastModified: 2000 });
      const f3 = new File(['foto 3'], 'foto3.jpg', { type: 'image/jpeg', lastModified: 3000 });

      // Primera selección: 1 archivo
      (component as any).handleSelectedFileList([f1]);

      expect(component.selectedFiles().length).toBe(1);
      expect(component.selectedFiles()[0].name).toBe('foto1.jpg');
      expect(component.filePreviewUrls().length).toBe(1);
      expect(component.filePreviewUrls()[0]).toBe('blob:http://localhost:4200/foto1.jpg');
      expect(component.hdIndices()).toEqual([0]);

      // Usuario personaliza hdIndices a algo específico
      component.hdIndices.set([0]);

      // Segunda selección: 2 archivos adicionales
      (component as any).handleSelectedFileList([f2, f3]);

      // Debe acumular los 3 archivos sin borrar foto1 ni revocar sus URLs
      expect(component.selectedFiles().length).toBe(3);
      expect(component.selectedFiles()[0].name).toBe('foto1.jpg');
      expect(component.selectedFiles()[1].name).toBe('foto2.jpg');
      expect(component.selectedFiles()[2].name).toBe('foto3.jpg');
      expect(component.filePreviewUrls().length).toBe(3);
      expect(component.filePreviewUrls()[0]).toBe('blob:http://localhost:4200/foto1.jpg');
      expect(component.filePreviewUrls()[1]).toBe('blob:http://localhost:4200/foto2.jpg');
      expect(component.filePreviewUrls()[2]).toBe('blob:http://localhost:4200/foto3.jpg');
      expect(component.hdIndices()).toEqual([0]); // Conserva los índices elegidos intactos

      vi.unstubAllGlobals();
    });

    it('debe deduplicar archivos repetidos por clave única y mostrar toast informativo', () => {
      const createObjectURLMock = vi.fn((file: File) => `blob:http://localhost:4200/${file.name}`);
      vi.stubGlobal('URL', {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: vi.fn()
      });

      const f1 = new File(['content1'], 'partido_1.jpg', { type: 'image/jpeg', lastModified: 1000 });
      const f1Duplicate = new File(['content1'], 'partido_1.jpg', { type: 'image/jpeg', lastModified: 1000 });
      const f2 = new File(['content2'], 'partido_2.jpg', { type: 'image/jpeg', lastModified: 2000 });

      (component as any).handleSelectedFileList([f1]);
      expect(component.selectedFiles().length).toBe(1);

      // Intentar agregar f1 nuevamente junto a f2
      (component as any).handleSelectedFileList([f1Duplicate, f2]);

      expect(component.selectedFiles().length).toBe(2);
      expect(component.toast()?.type).toBe('info');
      expect(component.toast()?.message).toContain('Se omitieron 1 foto(s)');

      vi.unstubAllGlobals();
    });

    it('debe limpiar input.value en onFileSelect para permitir re-seleccionar archivos', () => {
      const f1 = new File(['foto'], 'foto_reselect.jpg', { type: 'image/jpeg' });
      const mockInput = {
        files: [f1],
        value: 'C:\\fakepath\\foto_reselect.jpg'
      };

      component.onFileSelect({ target: mockInput } as unknown as Event);

      expect(mockInput.value).toBe('');
      expect(component.selectedFiles().some(f => f.name === 'foto_reselect.jpg')).toBe(true);
    });

    it('debe conservar el PIN en claro en el objeto local al guardar privacidad para incluirlo en WhatsApp', () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      // El backend devuelve accessCode enmascarado como '********'
      mockAdminService.updateAlbumPrivacy.mockReturnValue(of({
        success: true,
        album: {
          ...initialMockAlbum,
          isPrivate: true,
          accessCode: '********'
        }
      }));

      component.startEditPrivacy(initialMockAlbum);
      component.privacyAccessCodeInput.set('TORNEO2026');

      component.savePrivacy(initialMockAlbum, true);

      // Verificar que en local el álbum conserva el PIN en texto claro y no '********'
      const updatedAlbum = component.albums().find(a => a.id === initialMockAlbum.id);
      expect(updatedAlbum?.isPrivate).toBe(true);
      expect(updatedAlbum?.accessCode).toBe('TORNEO2026');

      // Al copiar texto de WhatsApp inmediatamente después, debe incluir el PIN
      component.copyWhatsAppShareText(updatedAlbum!);

      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('🔒 PIN de acceso: TORNEO2026')
      );
    });

    it('debe actualizar uploadProgress durante la subida masiva y completar al 100%', () => {
      const f1 = new File(['foto'], 'test_upload.jpg', { type: 'image/jpeg' });
      (component as any).handleSelectedFileList([f1]);

      let capturedProgressCb: ((percent: number) => void) | undefined;
      const uploadSubject = new Subject<any>();
      mockAdminService.bulkUpload.mockImplementation((_alb, _files, _wm, _hd, onProgress) => {
        capturedProgressCb = onProgress;
        return uploadSubject.asObservable();
      });

      expect(component.uploadProgress()).toBe(0);

      component.submitBulkUpload();

      expect(component.isBulkUploading()).toBe(true);
      expect(mockAdminService.bulkUpload).toHaveBeenCalled();

      // Emitir progreso intermedio
      capturedProgressCb?.(65);
      expect(component.uploadProgress()).toBe(65);

      // Emitir respuesta final exitosa
      uploadSubject.next({
        success: true,
        albumId: 'album-1',
        summary: { totalReceived: 1, successful: 1, failed: 0, durationMs: 500 }
      });
      uploadSubject.complete();

      expect(component.uploadProgress()).toBe(100);
      expect(component.selectedFiles().length).toBe(0);
      expect(component.isBulkUploading()).toBe(false);
    });
  });

  describe('Generador de Código QR para Álbumes (Eventos Deportivos & Sociales)', () => {
    it('debe abrir el modal QR y generar el dataUrl del código QR con QRCode.toDataURL', async () => {
      expect(component.isQrModalOpen()).toBe(false);
      expect(component.qrDataUrl()).toBe('');

      await component.openQrModal(initialMockAlbum);

      expect(component.isQrModalOpen()).toBe(true);
      expect(component.qrAlbum()?.id).toBe('album-1');
      expect(component.qrDataUrl()).toContain('data:image/');

      component.closeQrModal();
      expect(component.isQrModalOpen()).toBe(false);
      expect(component.qrAlbum()).toBeNull();
      expect(component.qrDataUrl()).toBe('');
    });

    it('debe copiar el enlace directo al álbum desde el modal QR al portapapeles', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      await component.openQrModal(initialMockAlbum);
      await component.copyQrAlbumLink();

      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('?album=album-1')
      );
      expect(component.qrCopied()).toBe(true);
      expect(component.toast()?.type).toBe('success');
    });

    it('debe generar y descargar la tarjeta QR con downloadQrCard', async () => {
      await component.openQrModal(initialMockAlbum);

      // Espiar creación de enlace para descarga
      const clickMock = vi.fn();
      const createElementSpy = vi.spyOn(document, 'createElement');

      // Ejecutar descarga
      await component.downloadQrCard(initialMockAlbum);

      expect(component.toast()?.type).toBe('success');
      createElementSpy.mockRestore();
    });
  });

  describe('Gestión Dinámica de Promociones & Cupones (Bento Dashboard)', () => {
    it('debe inicializar y cargar la configuración de descuentos por cantidad y cupones al arrancar', () => {
      expect(mockAdminService.getPromotions).toHaveBeenCalled();
      expect(component.pricingConfig().enableTierDiscounts).toBe(true);
      expect(component.pricingConfig().tier3DiscountPercent).toBe(20);
      expect(component.pricingConfig().tier5DiscountPercent).toBe(30);
      expect(component.coupons().length).toBe(1);
      expect(component.coupons()[0].code).toBe('YUYO10');
      expect(component.pricingConfigForm.value.tier3DiscountPercent).toBe(20);
    });

    it('debe permitir cambiar a la pestaña de promociones', () => {
      component.activeTab.set('promotions');
      expect(component.activeTab()).toBe('promotions');
    });

    it('debe guardar la configuración de descuentos por cantidad con savePricingConfig', () => {
      component.pricingConfigForm.patchValue({
        enableTierDiscounts: true,
        tier3DiscountPercent: 25,
        tier5DiscountPercent: 35,
        capAtFullAlbumPrice: true
      });

      component.savePricingConfig();

      expect(mockAdminService.updatePricingConfig).toHaveBeenCalledWith({
        enableTierDiscounts: true,
        tier3DiscountPercent: 25,
        tier5DiscountPercent: 35,
        capAtFullAlbumPrice: true
      });
      expect(component.pricingConfig().tier3DiscountPercent).toBe(25);
      expect(component.promotionsFeedback()?.success).toBe(true);
    });

    it('debe crear un nuevo cupón y añadirlo a la lista con createNewCoupon', () => {
      component.createCouponForm.patchValue({
        code: 'fiesta20',
        discountPercent: 20,
        maxUses: null
      });

      component.createNewCoupon();

      expect(mockAdminService.createCoupon).toHaveBeenCalledWith({
        code: 'FIESTA20',
        discountPercent: 20,
        maxUses: null
      });
      expect(component.coupons().some(c => c.code === 'FIESTA20')).toBe(true);
      expect(component.createCouponForm.value.code).toBe('');
      expect(component.promotionsFeedback()?.success).toBe(true);
    });

    it('debe alternar el estado activo/pausado de un cupón con toggleCouponActive', () => {
      const coupon = component.coupons()[0];
      expect(coupon.isActive).toBe(true);

      component.toggleCouponActive(coupon);

      expect(mockAdminService.updateCoupon).toHaveBeenCalledWith('YUYO10', { isActive: false });
      expect(component.coupons()[0].isActive).toBe(false);
    });

    it('debe eliminar un cupón de la lista con deleteCoupon', () => {
      const coupon = component.coupons()[0];

      component.deleteCoupon(coupon);

      expect(mockAdminService.deleteCoupon).toHaveBeenCalledWith('YUYO10');
      expect(component.coupons().some(c => c.code === 'YUYO10')).toBe(false);
      expect(component.promotionsFeedback()?.success).toBe(true);
    });

    it('debe autocompletar el formulario con presetGiveawayCoupon para sorteo de 100% de descuento, 1 uso y 1 foto', () => {
      component.createCouponForm.patchValue({ code: '' });
      component.presetGiveawayCoupon();

      expect(component.createCouponForm.value.code).toBe('SORTEO100');
      expect(component.createCouponForm.value.discountPercent).toBe(100);
      expect(component.createCouponForm.value.maxUses).toBe(1);
      expect(component.createCouponForm.value.maxPhotos).toBe(1);

      // Si ya tenía un código escrito, debe preservarlo
      component.createCouponForm.patchValue({ code: 'INSTASORTEO' });
      component.presetGiveawayCoupon();
      expect(component.createCouponForm.value.code).toBe('INSTASORTEO');
      expect(component.createCouponForm.value.discountPercent).toBe(100);
    });

    it('debe crear un cupón con alcance de álbum específico y límite de maxPhotos para sorteos', () => {
      component.createCouponForm.patchValue({
        code: 'sorteo-final',
        discountPercent: 100,
        maxUses: 1,
        albumId: 'album-1',
        maxPhotos: 1
      });

      component.createNewCoupon();

      expect(mockAdminService.createCoupon).toHaveBeenCalledWith({
        code: 'SORTEO-FINAL',
        discountPercent: 100,
        maxUses: 1,
        albumId: 'album-1',
        maxPhotos: 1
      });
      expect(component.createCouponForm.value.albumId).toBeNull();
      expect(component.createCouponForm.value.maxPhotos).toBeNull();
    });
  });

  describe('Gestor Dinámico de Categorías e Insignias (Frente 2)', () => {
    it('debe impedir eliminar la categoría "otros" requerida por el sistema', () => {
      const otrosCat: CategoryDTO = {
        id: 'otros',
        name: 'Otros Eventos',
        icon: '📸',
        badgeLabel: '📸 Otros',
        order: 99,
        isActive: true
      };

      component.deleteCategory(otrosCat);

      expect(component.categoryFeedback()?.success).toBe(false);
      expect(component.categoryFeedback()?.message).toContain('No es posible eliminar');
      expect(component.confirmingDeleteCategoryId()).toBeNull();
    });

    it('debe requerir confirmación inline de dos clics para eliminar una categoría sin usar confirm nativo', () => {
      const catToDelete: CategoryDTO = {
        id: 'padel',
        name: 'Pádel',
        icon: '🎾',
        badgeLabel: '🎾 Pádel',
        order: 10,
        isActive: true
      };
      component.categories.set([...component.categories(), catToDelete]);
      const deleteSpy = vi.spyOn(component.categoryService, 'deleteCategory').mockReturnValue(
        of({ success: true, message: 'Categoría eliminada' })
      );

      // Primer clic: activa el estado de confirmación y no llama al servicio
      component.deleteCategory(catToDelete);

      expect(component.confirmingDeleteCategoryId()).toBe('padel');
      expect(deleteSpy).not.toHaveBeenCalled();

      // Segundo clic dentro de los 3s: confirma y llama al servicio
      component.deleteCategory(catToDelete);

      expect(deleteSpy).toHaveBeenCalledWith('padel');
      expect(component.confirmingDeleteCategoryId()).toBeNull();
      expect(component.categories().some(c => c.id === 'padel')).toBe(false);
      expect(component.categoryFeedback()?.success).toBe(true);
    });

    it('debe auto-resetear la confirmación de eliminación de categoría tras 3 segundos', () => {
      vi.useFakeTimers();
      const catToDelete: CategoryDTO = {
        id: 'padel',
        name: 'Pádel',
        icon: '🎾',
        badgeLabel: '🎾 Pádel',
        order: 10,
        isActive: true
      };
      component.deleteCategory(catToDelete);
      expect(component.confirmingDeleteCategoryId()).toBe('padel');

      vi.advanceTimersByTime(3000);
      expect(component.confirmingDeleteCategoryId()).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('Optimización de Memoria RAM, Subida en Micro-Lotes y Erradicación de [object Object]', () => {
    describe('extractErrorMessage', () => {
      it('debe devolver mensaje específico para status 413 (Payload Too Large)', () => {
        const error = { status: 413 };
        expect(component.extractErrorMessage(error)).toBe('El lote supera el límite de tamaño permitido.');
      });

      it('debe devolver mensaje específico para status 0 (Timeout o Fallo de Red)', () => {
        const error = { status: 0 };
        expect(component.extractErrorMessage(error)).toBe('Error de red o tiempo de espera agotado al subir las fotos.');
      });

      it('debe extraer err.error.error si es string', () => {
        const error = { error: { error: 'Error específico de base de datos' } };
        expect(component.extractErrorMessage(error)).toBe('Error específico de base de datos');
      });

      it('debe extraer err.error.message si es string', () => {
        const error = { error: { message: 'Falta configurar credenciales' } };
        expect(component.extractErrorMessage(error)).toBe('Falta configurar credenciales');
      });

      it('debe extraer err.error directo si es string', () => {
        const error = { error: 'Mensaje de error plano en el body' };
        expect(component.extractErrorMessage(error)).toBe('Mensaje de error plano en el body');
      });

      it('debe serializar de forma legible un objeto de error evitando "[object Object]"', () => {
        const error = { error: { code: 'INVALID_PARAM', details: 'Faltan parámetros' } };
        const msg = component.extractErrorMessage(error);
        expect(msg).not.toBe('[object Object]');
        expect(msg).toContain('INVALID_PARAM');
      });

      it('debe retornar defaultMsg si err es nulo o vacío', () => {
        expect(component.extractErrorMessage(null, 'Error por defecto')).toBe('Error por defecto');
      });
    });

    describe('generateThumbnailUrl', () => {
      it('debe generar una URL de previsualización sin arrojar excepciones', async () => {
        const file = new File(['mock-bytes'], 'test-thumb.jpg', { type: 'image/jpeg' });
        const url = await (component as any).generateThumbnailUrl(file);
        expect(typeof url).toBe('string');
      });
    });

    describe('Subida por Micro-Lotes Secuenciales (Chunked Upload)', () => {
      it('debe dividir 9 archivos en 3 micro-lotes de máximo 4 fotos, mapear hdIndices locales y consolidar resumen', () => {
        const mockFiles: File[] = [];
        for (let i = 0; i < 9; i++) {
          mockFiles.push(new File([`data-${i}`], `foto_${i}.jpg`, { type: 'image/jpeg' }));
        }

        component.selectedFiles.set(mockFiles);
        // Índices HD globales: foto 0 (lote 0, idx local 0) y foto 5 (lote 1, idx local 1 pues 5 - 4 = 1)
        component.hdIndices.set([0, 5]);

        const calls: Array<{ filesCount: number; hdIndices: number[] }> = [];

        mockAdminService.bulkUpload.mockImplementation((_albumId, files, _wm, hdIndices, onProgress) => {
          calls.push({ filesCount: files.length, hdIndices: [...hdIndices] });
          onProgress?.(100);
          return of({
            success: true,
            albumId: 'album-1',
            summary: {
              totalReceived: files.length,
              successful: files.length,
              failed: 0,
              durationMs: 250
            },
            photos: files.map((f: File, idx: number) => ({
              id: `p-${f.name}`,
              originalName: f.name,
              storagePath: `storage/${f.name}`,
              previewUrl: `preview/${f.name}`,
              width: 800,
              height: 600,
              format: 'webp',
              isHD: hdIndices.includes(idx)
            })),
            errors: []
          });
        });

        component.submitBulkUpload();

        // 9 archivos / 4 = 3 lotes (4, 4, 1)
        expect(calls.length).toBe(3);
        expect(calls[0].filesCount).toBe(4);
        expect(calls[0].hdIndices).toEqual([0]);

        expect(calls[1].filesCount).toBe(4);
        expect(calls[1].hdIndices).toEqual([1]); // 5 - 4 = 1

        expect(calls[2].filesCount).toBe(1);
        expect(calls[2].hdIndices).toEqual([]); // Ningún índice HD global en el lote 2

        // Verificaciones de estado final
        expect(component.uploadProgress()).toBe(100);
        expect(component.isBulkUploading()).toBe(false);
        expect(component.selectedFiles().length).toBe(0);
        expect(component.bulkResult()?.summary.totalReceived).toBe(9);
        expect(component.bulkResult()?.summary.successful).toBe(9);
      });

      it('debe manejar errores en micro-lotes sin asignar [object Object] a bulkError', () => {
        const mockFiles = [
          new File(['1'], 'f1.jpg', { type: 'image/jpeg' }),
          new File(['2'], 'f2.jpg', { type: 'image/jpeg' })
        ];
        component.selectedFiles.set(mockFiles);

        mockAdminService.bulkUpload.mockReturnValue(
          throwError(() => ({
            status: 413,
            error: { message: 'Límite excedido' }
          }))
        );

        component.submitBulkUpload();

        expect(component.isBulkUploading()).toBe(false);
        expect(component.bulkError()).toBe('El lote supera el límite de tamaño permitido.');
        expect(component.bulkError()).not.toContain('[object Object]');
      });
    });

    describe('Drag & Drop y Reordenamiento de Cola de Subida Masiva', () => {
      it('debe reordenar archivos y previewUrls manteniendo las fotos marcadas como HD', () => {
        const fileA = new File(['a'], 'foto_a.jpg', { type: 'image/jpeg' });
        const fileB = new File(['b'], 'foto_b.jpg', { type: 'image/jpeg' });
        const fileC = new File(['c'], 'foto_c.jpg', { type: 'image/jpeg' });

        component.selectedFiles.set([fileA, fileB, fileC]);
        component.filePreviewUrls.set(['blob:url_a', 'blob:url_b', 'blob:url_c']);
        // Marcamos foto_b (índice 1) como HD
        component.hdIndices.set([1]);

        // Mover foto_b (índice 1) a la primera posición (índice 0)
        component.moveQueueItem(1, 0);

        // Ahora el orden debe ser [fileB, fileA, fileC]
        expect(component.selectedFiles()[0].name).toBe('foto_b.jpg');
        expect(component.selectedFiles()[1].name).toBe('foto_a.jpg');
        expect(component.selectedFiles()[2].name).toBe('foto_c.jpg');

        expect(component.filePreviewUrls()).toEqual(['blob:url_b', 'blob:url_a', 'blob:url_c']);

        // fileB sigue marcado como HD, ahora en el índice 0
        expect(component.hdIndices()).toEqual([0]);
      });

      it('debe ignorar índices fuera de rango en moveQueueItem', () => {
        const fileA = new File(['a'], 'foto_a.jpg', { type: 'image/jpeg' });
        const fileB = new File(['b'], 'foto_b.jpg', { type: 'image/jpeg' });
        component.selectedFiles.set([fileA, fileB]);
        component.filePreviewUrls.set(['blob:a', 'blob:b']);

        component.moveQueueItem(0, -1);
        expect(component.selectedFiles()[0].name).toBe('foto_a.jpg');

        component.moveQueueItem(0, 5);
        expect(component.selectedFiles()[0].name).toBe('foto_a.jpg');

        component.moveQueueItem(0, 0);
        expect(component.selectedFiles()[0].name).toBe('foto_a.jpg');
      });

      it('debe responder a eventos de Drag & Drop en la cola de subida', () => {
        const fileA = new File(['a'], 'foto_a.jpg', { type: 'image/jpeg' });
        const fileB = new File(['b'], 'foto_b.jpg', { type: 'image/jpeg' });
        component.selectedFiles.set([fileA, fileB]);
        component.filePreviewUrls.set(['blob:a', 'blob:b']);

        const mockDragEvent = {
          preventDefault: vi.fn(),
          dataTransfer: {
            effectAllowed: '',
            dropEffect: '',
            setData: vi.fn(),
            getData: vi.fn()
          }
        } as unknown as DragEvent;

        component.onQueueDragStart(mockDragEvent, 0);
        expect(component.draggedQueueIndex()).toBe(0);

        component.onQueueDragOver(mockDragEvent, 1);
        expect(component.dragOverQueueIndex()).toBe(1);

        component.onQueueDrop(mockDragEvent, 1);
        // Debe haberse movido a la posición 1
        expect(component.selectedFiles()[0].name).toBe('foto_b.jpg');
        expect(component.selectedFiles()[1].name).toBe('foto_a.jpg');
        expect(component.draggedQueueIndex()).toBeNull();
        expect(component.dragOverQueueIndex()).toBeNull();

        component.onQueueDragEnd();
        expect(component.draggedQueueIndex()).toBeNull();
      });
    });

    describe('Reordenamiento Persistente en Modal Gestionar Fotos del Álbum', () => {
      beforeEach(() => {
        component.selectedAlbumForPhotos.set(initialMockAlbum);
        component.albumPhotos.set([
          {
            id: 'p1',
            albumId: 'album-1',
            filename: 'foto_1.jpg',
            originalPath: '',
            previewUrl: 'http://localhost:4000/p1.webp',
            isSampleHd: false
          },
          {
            id: 'p2',
            albumId: 'album-1',
            filename: 'foto_2.jpg',
            originalPath: '',
            previewUrl: 'http://localhost:4000/p2.webp',
            isSampleHd: true
          },
          {
            id: 'p3',
            albumId: 'album-1',
            filename: 'foto_3.jpg',
            originalPath: '',
            previewUrl: 'http://localhost:4000/p3.webp',
            isSampleHd: false
          }
        ]);
        component.isPhotosOrderDirty.set(false);
      });

      it('debe reordenar fotos y marcar isPhotosOrderDirty en true con moveManagedPhoto', () => {
        expect(component.isPhotosOrderDirty()).toBe(false);

        // Mover p3 (índice 2) a la primera posición (índice 0)
        component.moveManagedPhoto(2, 0);

        expect(component.isPhotosOrderDirty()).toBe(true);
        const photos = component.albumPhotos();
        expect(photos[0].id).toBe('p3');
        expect(photos[1].id).toBe('p1');
        expect(photos[2].id).toBe('p2');
      });

      it('debe gestionar eventos drag & drop en fotos del álbum', () => {
        const mockDragEvent = {
          preventDefault: vi.fn(),
          dataTransfer: {
            effectAllowed: '',
            dropEffect: '',
            setData: vi.fn()
          }
        } as unknown as DragEvent;

        component.onPhotoDragStart(mockDragEvent, 1);
        expect(component.draggedPhotoIndex()).toBe(1);

        component.onPhotoDragOver(mockDragEvent, 0);
        expect(component.dragOverPhotoIndex()).toBe(0);

        component.onPhotoDrop(mockDragEvent, 0);
        expect(component.albumPhotos()[0].id).toBe('p2');
        expect(component.isPhotosOrderDirty()).toBe(true);
        expect(component.draggedPhotoIndex()).toBeNull();

        component.onPhotoDragEnd();
        expect(component.draggedPhotoIndex()).toBeNull();
      });

      it('debe guardar el nuevo orden con savePhotosOrder invocando reorderAlbumPhotos', () => {
        component.moveManagedPhoto(1, 0);
        expect(component.isPhotosOrderDirty()).toBe(true);

        mockAdminService.reorderAlbumPhotos.mockReturnValue(of({
          success: true,
          albumId: 'album-1',
          message: 'Orden de fotos actualizado correctamente'
        }));

        component.savePhotosOrder();

        expect(mockAdminService.reorderAlbumPhotos).toHaveBeenCalledWith('album-1', ['p2', 'p1', 'p3']);
        expect(component.isSavingPhotosOrder()).toBe(false);
        expect(component.isPhotosOrderDirty()).toBe(false);
        expect(component.photosModalFeedback()?.success).toBe(true);
      });

      it('debe resetear isPhotosOrderDirty al cerrar el modal de fotos', () => {
        component.moveManagedPhoto(1, 0);
        expect(component.isPhotosOrderDirty()).toBe(true);

        component.closePhotosModal();

        expect(component.isPhotosModalOpen()).toBe(false);
        expect(component.isPhotosOrderDirty()).toBe(false);
      });
    });

    describe('Modal de Edición de Metadatos del Álbum (Sin reprocesar fotos)', () => {
      it('debe precargar los datos del álbum en editAlbumForm con openEditAlbumModal', () => {
        component.openEditAlbumModal(initialMockAlbum);

        expect(component.isEditAlbumModalOpen()).toBe(true);
        expect(component.editingAlbum()?.id).toBe('album-1');
        expect(component.editAlbumForm.get('title')?.value).toBe('Atlético Tesorieri vs Andino SC');
        expect(component.editAlbumForm.get('category')?.value).toBe('futbol');
        expect(component.editAlbumForm.get('badge')?.value).toBe('⚽ Fútbol');
      });

      it('debe cerrar el modal de edición y limpiar el formulario con closeEditAlbumModal', () => {
        component.openEditAlbumModal(initialMockAlbum);
        component.closeEditAlbumModal();

        expect(component.isEditAlbumModalOpen()).toBe(false);
        expect(component.editingAlbum()).toBeNull();
      });

      it('debe actualizar el badge al cambiar la categoría en onEditCategoryChange', () => {
        component.categories.set([
          { id: 'basquet', name: 'Básquet', icon: '🏀', badgeLabel: '🏀 Básquet', order: 1, isActive: true }
        ]);

        const mockEvent = {
          target: { value: 'basquet' }
        } as unknown as Event;

        component.onEditCategoryChange(mockEvent);

        expect(component.editAlbumForm.get('badge')?.value).toBe('🏀 Básquet');
      });

      it('debe guardar cambios del álbum con submitUpdateAlbum e impactar reactivamente en albums()', () => {
        component.albums.set([initialMockAlbum]);
        component.openEditAlbumModal(initialMockAlbum);

        component.editAlbumForm.patchValue({
          title: 'Clásico Riojano 2026 - Edición Especial',
          subtitle: 'Gran Final del Torneo',
          location: 'Cancha Oficial'
        });

        const updatedAlbumMock: Album = {
          ...initialMockAlbum,
          title: 'Clásico Riojano 2026 - Edición Especial',
          subtitle: 'Gran Final del Torneo',
          location: 'Cancha Oficial'
        };

        mockAdminService.updateAlbum.mockReturnValue(of({
          success: true,
          album: updatedAlbumMock,
          message: 'Álbum actualizado con éxito'
        }));

        component.submitUpdateAlbum();

        expect(mockAdminService.updateAlbum).toHaveBeenCalledWith(
          'album-1',
          expect.objectContaining({
            title: 'Clásico Riojano 2026 - Edición Especial',
            subtitle: 'Gran Final del Torneo',
            location: 'Cancha Oficial'
          })
        );

        expect(component.isEditAlbumModalOpen()).toBe(false);
        const savedAlbum = component.albums().find(a => a.id === 'album-1');
        expect(savedAlbum?.title).toBe('Clásico Riojano 2026 - Edición Especial');
        expect(savedAlbum?.subtitle).toBe('Gran Final del Torneo');
        expect(component.toast()?.type).toBe('success');
      });
    });
  });
});

