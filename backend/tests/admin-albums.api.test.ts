import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import sharp from 'sharp';
import { app, adminAuthService, categoryRepository } from '../src/index';

describe('Admin Albums API Endpoints (/api/admin/albums)', () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;

  beforeAll(async () => {
    const authRes = adminAuthService.login('fotografa@latercera.com.ar', 'YuyoFotos2026!');
    adminToken = authRes.token!;

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('Seguridad y Control de Acceso (Zero-Trust)', () => {
    it('debe rechazar /import-drive con 401 si no se envía cabecera Authorization', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/import-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: 'alb_1', driveUrl: 'https://drive.google.com/drive/folders/123' })
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Acceso no autorizado');
    });

    it('debe rechazar /bulk-upload con 401 si el token es inválido o adulterado', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/bulk-upload`, {
        method: 'POST',
        headers: { Authorization: 'Bearer token_invalido_hacker' }
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/admin/albums/import-drive', () => {
    it('debe rechazar la petición con status 400 si falta albumId o driveUrl', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/import-drive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ albumId: 'alb_1' }) // falta driveUrl
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Campos requeridos faltantes');
    });

    it('debe rechazar una URL de Google Drive inválida con status 500/422 y error descriptivo', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/import-drive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          albumId: 'alb_test',
          driveUrl: 'https://dropbox.com/s/invalid'
        })
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain('no pertenece a Google Drive');
    });
  });

  describe('POST /api/admin/albums/bulk-upload', () => {
    it('debe rechazar con status 400 si no se envían fotos multipart', async () => {
      const formData = new FormData();
      formData.append('albumId', 'alb_hockey');

      const res = await fetch(`${baseUrl}/api/admin/albums/bulk-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`
        },
        body: formData
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('No se enviaron archivos');
    });

    it('debe procesar exitosamente la subida multipart de fotos con FormData nativo y token válido', async () => {
      const testBuffer = await sharp({
        create: { width: 1200, height: 800, channels: 3, background: { r: 10, g: 80, b: 150 } }
      }).jpeg().toBuffer();

      const formData = new FormData();
      formData.append('albumId', 'album-1');
      formData.append('watermarkText', 'LA TERCERA • MUESTRA');
      formData.append('hdPhotoIndices', JSON.stringify([0]));

      const blob = new Blob([testBuffer], { type: 'image/jpeg' });
      formData.append('photos', blob, 'gol_clasico.jpg');

      const res = await fetch(`${baseUrl}/api/admin/albums/bulk-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`
        },
        body: formData
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.albumId).toBe('album-1');
      expect(data.summary.totalReceived).toBe(1);
      expect(data.summary.successful).toBe(1);
      expect(data.photos.length).toBe(1);
      expect(data.photos[0].isHD).toBe(true);
      expect(data.photos[0].format).toBe('webp');
      expect(data.photos[0].width).toBe(1200); // HD Master mantiene alta resolución con badge sutil

      // Verificar que las fotos se persistieron y se consultan públicamente sin original_path (Zero-Trust)
      const photosRes = await fetch(`${baseUrl}/api/albums/album-1/photos`);
      expect(photosRes.status).toBe(200);
      const photosData = await photosRes.json();
      expect(photosData.success).toBe(true);
      expect(photosData.photos.length).toBeGreaterThanOrEqual(1);
      expect(photosData.photos[0].originalPath).toBeUndefined();
      expect(photosData.photos[0].previewUrl).toBeDefined();
    });
  });

  describe('Gestión Administrativa de Álbumes y Precios (CRUD)', () => {
    let createdAlbumId: string;

    it('GET /api/admin/albums debe listar todos los álbumes para el admin', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.albums)).toBe(true);
      expect(data.albums.length).toBeGreaterThanOrEqual(4);
    });

    it('POST /api/admin/albums debe crear un nuevo álbum con slug autogenerado', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Defensores de la Boca vs Rioja Juniors',
          category: 'futbol',
          subtitle: 'Fecha 9 - Torneo Clausura',
          date: '20 Octubre, 2026',
          location: 'Estadio Mercado Luna',
          unitPrice: 1500,
          fullAlbumPrice: 12000
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.album.id).toContain('defensores-de-la-boca-vs-rioja-juniors-2026');
      expect(data.album.unitPrice).toBe(1500);
      expect(data.album.fullAlbumPrice).toBe(12000);
      expect(data.album.badge).toBe('⚽ Fútbol');

      createdAlbumId = data.album.id;
    });

    it('POST /api/admin/albums debe rechazar si los precios son inválidos o faltan campos obligatorios', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Torneo Inválido',
          category: 'futbol',
          unitPrice: -50,
          fullAlbumPrice: 0
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('PUT /api/admin/albums/:id debe actualizar los precios de un álbum existente', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/${createdAlbumId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          unitPrice: 1800,
          fullAlbumPrice: 14000,
          subtitle: 'Fecha 9 - Edición Especial de Precios'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.album.unitPrice).toBe(1800);
      expect(data.album.fullAlbumPrice).toBe(14000);
      expect(data.album.subtitle).toBe('Fecha 9 - Edición Especial de Precios');
    });

    it('PUT /api/admin/albums/:id debe rechazar actualización con 400 si el precio es menor o igual a 0', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/${createdAlbumId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          unitPrice: 0
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('precio');
    });

    it('POST /api/admin/albums debe rechazar si el precio unitario supera al del álbum completo (400)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Torneo Precios Invertidos',
          category: 'futbol',
          unitPrice: 15000,
          fullAlbumPrice: 5000
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('no puede ser mayor');
    });

    it('PUT /api/admin/albums/:id debe rechazar si el nuevo precio unitario supera el precio del álbum completo (400)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/${createdAlbumId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          unitPrice: 25000 // fullAlbumPrice es 14000
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('no puede ser mayor');
    });

    it('PUT /api/admin/albums/:id debe retornar 404 para un álbum que no existe', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/album-inexistente-xyz`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          unitPrice: 2000
        })
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('no encontrado');
    });

    it('GET /api/admin/albums?page=1&limit=2 debe retornar álbumes paginados con metadata', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums?page=1&limit=2`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.albums.length).toBeLessThanOrEqual(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
      expect(data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/albums?page=1&limit=2 público debe retornar catálogo paginado', async () => {
      const res = await fetch(`${baseUrl}/api/albums?page=1&limit=2`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.albums.length).toBeLessThanOrEqual(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
    });
  });

  describe('Gestión de Fotos del Álbum (GET, PATCH, DELETE /api/admin/albums/:id/photos)', () => {
    let testAlbumId: string;
    let testPhotoId: string;

    beforeAll(async () => {
      // Crear un álbum específico para las pruebas de fotos
      const createRes = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Torneo Test Gestión Fotos',
          category: 'futbol',
          subtitle: 'Subtítulo Test',
          unitPrice: 1200,
          fullAlbumPrice: 9500
        })
      });
      const createData = await createRes.json();
      testAlbumId = createData.album.id;

      // Subir una foto mediante bulk-upload para tener datos reales de prueba
      const samplePng = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 50, g: 150, b: 200 }
        }
      }).png().toBuffer();

      const formData = new FormData();
      formData.append('albumId', testAlbumId);
      formData.append('photos', new Blob([samplePng], { type: 'image/png' }), 'test_action_photo.png');

      const uploadRes = await fetch(`${baseUrl}/api/admin/albums/bulk-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`
        },
        body: formData
      });
      const uploadData = await uploadRes.json();
      testPhotoId = uploadData.photos[0].id;
    });

    it('GET /api/admin/albums/:id/photos debe rechazar con 401 si no hay token', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/${testAlbumId}/photos`);
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/albums/:id/photos debe retornar la lista de fotos del álbum con URLs absolutas normalizadas', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/${testAlbumId}/photos`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.total).toBeGreaterThanOrEqual(1);
      expect(data.photos.some((p: any) => p.id === testPhotoId)).toBe(true);
      expect(data.photos[0].previewUrl).toMatch(/^https?:\/\//);
    });

    it('GET /api/admin/albums/:id/photos debe responder 200 OK con fotos de demostración para álbumes semilla (album-1)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/album-1/photos`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.photos)).toBe(true);
      expect(data.photos.length).toBeGreaterThan(0);
      expect(data.photos[0].previewUrl).toMatch(/^https?:\/\//);
      expect(data.photos.every((p: any) => p.albumId === 'album-1')).toBe(true);
    });

    it('PATCH /api/admin/albums/:id/photos/:photoId debe alternar isSampleHD y definir portada', async () => {
      // 1. Alternar isSampleHD a true
      const patchRes1 = await fetch(`${baseUrl}/api/admin/albums/${testAlbumId}/photos/${testPhotoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isSampleHD: true, setAsCover: true })
      });
      expect(patchRes1.status).toBe(200);
      const patchData1 = await patchRes1.json();
      expect(patchData1.success).toBe(true);
      expect(patchData1.photo.isSampleHd).toBe(true);
      expect(patchData1.coverUrl).toBe(patchData1.photo.previewUrl);

      // 2. Alternar isSampleHD a false
      const patchRes2 = await fetch(`${baseUrl}/api/admin/albums/${testAlbumId}/photos/${testPhotoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isSampleHD: false })
      });
      expect(patchRes2.status).toBe(200);
      const patchData2 = await patchRes2.json();
      expect(patchData2.photo.isSampleHd).toBe(false);
    });

    it('DELETE /api/admin/albums/:id/photos/:photoId debe eliminar la foto y decrementar photosCount', async () => {
      const deleteRes = await fetch(`${baseUrl}/api/admin/albums/${testAlbumId}/photos/${testPhotoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(deleteRes.status).toBe(200);
      const deleteData = await deleteRes.json();
      expect(deleteData.success).toBe(true);
      expect(deleteData.photoId).toBe(testPhotoId);

      // Verificar que ya no aparece en GET
      const getRes = await fetch(`${baseUrl}/api/admin/albums/${testAlbumId}/photos`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const getData = await getRes.json();
      expect(getData.photos.some((p: any) => p.id === testPhotoId)).toBe(false);
    });

    it('GET /api/admin/albums/:id/photos debe responder 200 OK con un array vacío sin arrojar error 404 para álbumes sin fotos o IDs válidos', async () => {
      // 1. Probar con un ID de álbum que no tiene fotos
      const resSinFotos = await fetch(`${baseUrl}/api/admin/albums/album-temporal-sin-fotos/photos`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(resSinFotos.status).toBe(200);
      const dataSinFotos = await resSinFotos.json();
      expect(dataSinFotos.success).toBe(true);
      expect(dataSinFotos.albumId).toBe('album-temporal-sin-fotos');
      expect(dataSinFotos.total).toBe(0);
      expect(Array.isArray(dataSinFotos.photos)).toBe(true);
      expect(dataSinFotos.photos).toEqual([]);

      // 2. Crear un álbum nuevo con photosCount: 0 explícito
      const createRes = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Álbum Reciente Sin Fotos',
          category: 'sociales',
          unitPrice: 1500,
          fullAlbumPrice: 10000
        })
      });
      expect(createRes.status).toBe(201);
      const createData = await createRes.json();
      const nuevoId = createData.album.id;

      const resNuevo = await fetch(`${baseUrl}/api/admin/albums/${nuevoId}/photos`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(resNuevo.status).toBe(200);
      const dataNuevo = await resNuevo.json();
      expect(dataNuevo.success).toBe(true);
      expect(dataNuevo.albumId).toBe(nuevoId);
      expect(dataNuevo.total).toBe(0);
      expect(dataNuevo.photos).toEqual([]);
    });

    it('debe permitir crear un álbum con categoría dinámica "motos" y asignar badge correspondiente', async () => {
      const createRes = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Enduro La Rioja 2026',
          category: 'motos',
          unitPrice: 2000,
          fullAlbumPrice: 15000
        })
      });

      expect(createRes.status).toBe(201);
      const data = await createRes.json();
      expect(data.success).toBe(true);
      expect(data.album.category).toBe('motos');
      expect(data.album.badge).toBe('🏍️ Motos');
    });

    it('debe permitir crear un álbum con una categoría dinámica recién creada en tiempo de ejecución', async () => {
      await categoryRepository.createCategory({
        id: 'padel-open',
        name: 'Pádel Tour',
        icon: '🎾',
        badgeLabel: '🎾 Pádel Tour',
        order: 10,
        isActive: true
      });

      const createRes = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Torneo Pádel La Rioja Open',
          category: 'padel-open',
          unitPrice: 1800,
          fullAlbumPrice: 12000
        })
      });

      expect(createRes.status).toBe(201);
      const data = await createRes.json();
      expect(data.success).toBe(true);
      expect(data.album.category).toBe('padel-open');
      expect(data.album.badge).toBe('🎾 Pádel Tour');
    });
  });

  describe('PUT /api/admin/albums/:id/photos/reorder', () => {
    it('debe rechazar la petición con 401 si no se envía token de autenticación admin', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/album-1/photos/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: ['p1', 'p2'] })
      });

      expect(res.status).toBe(401);
    });

    it('debe rechazar la petición con 400 si photoIds no es un array', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/album-1/photos/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ photoIds: 'not-an-array' })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('photoIds debe ser un array');
    });

    it('debe responder 404 si el álbum no existe', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/non-existent-album/photos/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ photoIds: ['p1', 'p2'] })
      });

      expect(res.status).toBe(404);
    });

    it('debe reordenar exitosamente las fotos de un álbum existente', async () => {
      // 1. Obtener fotos actuales de album-1
      const getRes = await fetch(`${baseUrl}/api/admin/albums/album-1/photos`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const photosData = await getRes.json();
      expect(photosData.success).toBe(true);
      const originalPhotos = photosData.photos;
      expect(originalPhotos.length).toBeGreaterThan(1);

      // Invertir el orden de las primeras dos fotos
      const targetPhotoIds = [originalPhotos[1].id, originalPhotos[0].id];

      // 2. Ejecutar reordenamiento
      const reorderRes = await fetch(`${baseUrl}/api/admin/albums/album-1/photos/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ photoIds: targetPhotoIds })
      });

      expect(reorderRes.status).toBe(200);
      const reorderData = await reorderRes.json();
      expect(reorderData.success).toBe(true);
      expect(reorderData.message).toContain('Orden de fotos actualizado');

      // 3. Verificar que getPhotos refleje el nuevo orden
      const checkRes = await fetch(`${baseUrl}/api/admin/albums/album-1/photos`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const checkData = await checkRes.json();
      expect(checkData.photos[0].id).toBe(targetPhotoIds[0]);
      expect(checkData.photos[1].id).toBe(targetPhotoIds[1]);
    });
  });
});

