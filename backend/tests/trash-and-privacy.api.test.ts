import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import { app, adminAuthService, albumRepository } from '../src/index';

describe('Trash, Privacy & Courtesy Download API Endpoints', () => {
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

  describe('Papelera de Reciclaje (Soft Delete, Restore y Hard Delete)', () => {
    it('GET /api/admin/albums/trash debe requerir autenticación de administrador', async () => {
      const res = await fetch(`${baseUrl}/api/admin/albums/trash`);
      expect(res.status).toBe(401);
    });

    it('debe mover un álbum a la papelera, excluirlo del catálogo público y luego restaurarlo', async () => {
      // 1. Crear álbum temporal para la prueba
      const createRes = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Álbum Test Papelera Reciclaje',
          category: 'futbol',
          unitPrice: 1500,
          fullAlbumPrice: 10000
        })
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      const albumId = created.album.id;

      // 2. Mover a papelera
      const trashRes = await fetch(`${baseUrl}/api/admin/albums/${albumId}/trash`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(trashRes.status).toBe(200);
      const trashData = await trashRes.json();
      expect(trashData.success).toBe(true);

      // 3. Verificar que aparece en la lista de papelera con días restantes
      const listTrashRes = await fetch(`${baseUrl}/api/admin/albums/trash`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(listTrashRes.status).toBe(200);
      const listTrashData = await listTrashRes.json();
      expect(listTrashData.success).toBe(true);
      const trashed = listTrashData.trashAlbums.find((a: any) => a.id === albumId);
      expect(trashed).toBeDefined();
      expect(trashed.daysRemaining).toBeGreaterThanOrEqual(29);

      // 4. Verificar que NO aparece en el catálogo público
      const publicRes = await fetch(`${baseUrl}/api/albums`);
      const publicData = await publicRes.json();
      const inPublic = publicData.albums.find((a: any) => a.id === albumId);
      expect(inPublic).toBeUndefined();

      // 5. Restaurar álbum
      const restoreRes = await fetch(`${baseUrl}/api/admin/albums/${albumId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(restoreRes.status).toBe(200);
      const restoreData = await restoreRes.json();
      expect(restoreData.success).toBe(true);

      // 6. Eliminar permanentemente (Hard delete)
      const permRes = await fetch(`${baseUrl}/api/admin/albums/${albumId}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(permRes.status).toBe(200);
    });
  });

  describe('Cortesía y Descarga Gratuita en Máxima Calidad', () => {
    it('debe activar descarga de cortesía y permitir descargar ZIP sin costo', async () => {
      // Crear álbum temporal
      const createRes = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Álbum Cortesía Fiesta',
          category: 'sociales',
          unitPrice: 1000,
          fullAlbumPrice: 8000
        })
      });
      const created = await createRes.json();
      const albumId = created.album.id;

      // Intentar descarga antes de habilitar -> 403
      const denyRes = await fetch(`${baseUrl}/api/downloads/free/${albumId}/zip`);
      expect(denyRes.status).toBe(403);

      // Activar descarga de cortesía
      const patchRes = await fetch(`${baseUrl}/api/admin/albums/${albumId}/courtesy-download`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isFreeDownload: true })
      });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.album.isFreeDownload).toBe(true);

      // Descargar ZIP gratuito -> 200 con application/zip
      const zipRes = await fetch(`${baseUrl}/api/downloads/free/${albumId}/zip`);
      expect(zipRes.status).toBe(200);
      expect(zipRes.headers.get('content-type')).toContain('application/zip');

      // Descargar foto individual gratuita -> 200 con Content-Disposition: attachment
      const singlePhotoRes = await fetch(`${baseUrl}/api/downloads/free/${albumId}/photo/foto_1`);
      expect(singlePhotoRes.status).toBe(200);
      expect(singlePhotoRes.headers.get('content-type')).toContain('image/');
      expect(singlePhotoRes.headers.get('content-disposition')).toContain('attachment');
      const photoBuffer = await singlePhotoRes.arrayBuffer();
      expect(photoBuffer.byteLength).toBeGreaterThan(0);

      // Limpieza
      await fetch(`${baseUrl}/api/admin/albums/${albumId}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    });
  });

  describe('Álbumes Privados y Verificación por PIN', () => {
    it('debe configurar código PIN y validar acceso en POST /api/albums/:id/verify-access', async () => {
      // Crear álbum temporal
      const createRes = await fetch(`${baseUrl}/api/admin/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Álbum Privado Martina 15',
          category: 'sociales',
          unitPrice: 1200,
          fullAlbumPrice: 9000
        })
      });
      const created = await createRes.json();
      const albumId = created.album.id;

      // Configurar como privado con código PIN
      const privRes = await fetch(`${baseUrl}/api/admin/albums/${albumId}/privacy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isPrivate: true, accessCode: 'MARTINA15' })
      });
      expect(privRes.status).toBe(200);
      const privData = await privRes.json();
      expect(privData.album.isPrivate).toBe(true);
      // El código de acceso debe estar enmascarado en la respuesta
      expect(privData.album.accessCode).toBe('********');

      // 1. PIN incorrecto -> 401
      const wrongPinRes = await fetch(`${baseUrl}/api/albums/${albumId}/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: 'INCORRECTO' })
      });
      expect(wrongPinRes.status).toBe(401);
      const wrongData = await wrongPinRes.json();
      expect(wrongData.valid).toBe(false);

      // 2. PIN correcto -> 200 y obtención de accessToken firmado
      const okPinRes = await fetch(`${baseUrl}/api/albums/${albumId}/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: 'MARTINA15' })
      });
      expect(okPinRes.status).toBe(200);
      const okData = await okPinRes.json();
      expect(okData.valid).toBe(true);
      expect(okData.accessToken).toBeDefined();
      const accessToken = okData.accessToken;

      // 3. Proteger GET /api/albums/:id/photos en álbum privado
      // Sin token -> 403
      const noTokenPhotosRes = await fetch(`${baseUrl}/api/albums/${albumId}/photos`);
      expect(noTokenPhotosRes.status).toBe(403);
      const noTokenData = await noTokenPhotosRes.json();
      expect(noTokenData.error).toContain('privado');

      // Con token inválido -> 403
      const badTokenPhotosRes = await fetch(`${baseUrl}/api/albums/${albumId}/photos`, {
        headers: { 'x-album-access-token': 'token_invalido_falso' }
      });
      expect(badTokenPhotosRes.status).toBe(403);

      // Con x-album-access-token válido -> 200
      const okHeaderPhotosRes = await fetch(`${baseUrl}/api/albums/${albumId}/photos`, {
        headers: { 'x-album-access-token': accessToken }
      });
      expect(okHeaderPhotosRes.status).toBe(200);
      const okHeaderData = await okHeaderPhotosRes.json();
      expect(okHeaderData.success).toBe(true);

      // Con query param ?accessToken=... -> 200
      const okQueryPhotosRes = await fetch(`${baseUrl}/api/albums/${albumId}/photos?accessToken=${accessToken}`);
      expect(okQueryPhotosRes.status).toBe(200);

      // Con admin Bearer -> 200
      const adminPhotosRes = await fetch(`${baseUrl}/api/albums/${albumId}/photos`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(adminPhotosRes.status).toBe(200);

      // 4. Proteger GET /api/downloads/free/:albumId/zip en álbum privado con cortesía
      await fetch(`${baseUrl}/api/admin/albums/${albumId}/courtesy-download`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isFreeDownload: true })
      });

      // Sin token -> 403
      const noTokenZipRes = await fetch(`${baseUrl}/api/downloads/free/${albumId}/zip`);
      expect(noTokenZipRes.status).toBe(403);

      // Con query param ?accessToken=... -> 200
      const okQueryZipRes = await fetch(`${baseUrl}/api/downloads/free/${albumId}/zip?accessToken=${accessToken}`);
      expect(okQueryZipRes.status).toBe(200);
      expect(okQueryZipRes.headers.get('content-type')).toContain('application/zip');

      // 5. Proteger GET /api/downloads/free/:albumId/photo/:photoId en álbum privado
      // Sin token -> 403
      const noTokenPhotoRes = await fetch(`${baseUrl}/api/downloads/free/${albumId}/photo/foto_1`);
      expect(noTokenPhotoRes.status).toBe(403);

      // Con query param ?accessToken=... -> 200
      const okQueryPhotoRes = await fetch(`${baseUrl}/api/downloads/free/${albumId}/photo/foto_1?accessToken=${accessToken}`);
      expect(okQueryPhotoRes.status).toBe(200);
      expect(okQueryPhotoRes.headers.get('content-type')).toContain('image/');
      expect(okQueryPhotoRes.headers.get('content-disposition')).toContain('attachment');

      // Con cabecera x-album-access-token -> 200
      const okHeaderPhotoRes = await fetch(`${baseUrl}/api/downloads/free/${albumId}/photo/foto_1`, {
        headers: { 'x-album-access-token': accessToken }
      });
      expect(okHeaderPhotoRes.status).toBe(200);

      // Limpieza
      await fetch(`${baseUrl}/api/admin/albums/${albumId}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    });

    it('POST /api/images/process debe exigir autenticación de administrador', async () => {
      const res = await fetch(`${baseUrl}/api/images/process`, {
        method: 'POST'
      });
      expect(res.status).toBe(401);
    });
  });
});
