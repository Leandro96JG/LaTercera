import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import sharp from 'sharp';
import { app, adminAuthService } from '../src/index';

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
      formData.append('albumId', 'album_futbol_clausura');
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
      expect(data.albumId).toBe('album_futbol_clausura');
      expect(data.summary.totalReceived).toBe(1);
      expect(data.summary.successful).toBe(1);
      expect(data.photos.length).toBe(1);
      expect(data.photos[0].isHD).toBe(true);
      expect(data.photos[0].format).toBe('webp');
      expect(data.photos[0].width).toBe(1200); // HD Master mantiene alta resolución con badge sutil
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
});

