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

    it('debe eliminar una foto del álbum, actualizar la lista y decrementar el contador', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));

      component.openPhotosModal(initialMockAlbum);
      const photoToDelete = component.albumPhotos()[0];

      component.deleteAlbumPhoto(photoToDelete);

      expect(mockAdminService.deleteAlbumPhoto).toHaveBeenCalledWith('album-1', 'photo-1');
      expect(component.albumPhotos().some(p => p.id === 'photo-1')).toBe(false);
      expect(component.selectedAlbumForPhotos()?.photosCount).toBe(47);
      expect(component.albums().find(a => a.id === 'album-1')?.photosCount).toBe(47);
      expect(component.photosModalFeedback()?.success).toBe(true);

      vi.unstubAllGlobals();
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
  });
});

