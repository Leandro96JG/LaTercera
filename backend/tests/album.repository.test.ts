import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAlbumRepository, AlbumDTO } from '../src/repositories/album.repository';

describe('AlbumRepository (TDD)', () => {
  let repo: MemoryAlbumRepository;

  beforeEach(() => {
    repo = new MemoryAlbumRepository();
  });

  it('debe listar los álbumes iniciales oficiales de La Tercera', async () => {
    const albums = await repo.findAll();
    expect(albums.length).toBeGreaterThanOrEqual(4);
    expect(albums.some(a => a.id === 'album-1')).toBe(true);
    expect(albums.some(a => a.category === 'hockey')).toBe(true);
  });

  it('debe filtrar álbumes por categoría', async () => {
    const futbol = await repo.findAll('futbol');
    expect(futbol.length).toBe(1);
    expect(futbol[0].category).toBe('futbol');
  });

  it('debe buscar un álbum por id', async () => {
    const album = await repo.findById('album-1');
    expect(album).not.toBeNull();
    expect(album?.title).toContain('Tesorieri');
  });

  it('debe crear un nuevo álbum persistido', async () => {
    const newAlbum: AlbumDTO = {
      id: 'album-nuevo-5',
      category: 'futbol',
      title: 'Defensores de la Boca vs Rioja Juniors',
      subtitle: 'Liga Riojana • Fecha 8',
      date: '15 Octubre, 2026',
      photosCount: 60,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://example.com/cover.jpg',
      badge: '⚽ Fútbol'
    };

    const created = await repo.create(newAlbum);
    expect(created.id).toBe('album-nuevo-5');

    const retrieved = await repo.findById('album-nuevo-5');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toContain('Defensores de la Boca');
  });

  it('debe actualizar la cantidad de fotos de un álbum', async () => {
    await repo.updatePhotosCount('album-1', 99);
    const updated = await repo.findById('album-1');
    expect(updated?.photosCount).toBe(99);
  });

  it('debe soportar la interfaz explícita IAlbumRepository (listAlbums, getAlbumById, createAlbum)', async () => {
    const list = await repo.listAlbums('futbol');
    expect(list.length).toBeGreaterThanOrEqual(1);

    const album = await repo.getAlbumById('album-1');
    expect(album).not.toBeNull();
    expect(album?.title).toContain('Tesorieri');

    const created = await repo.createAlbum({
      id: 'album-explicit-test',
      category: 'futbol',
      title: 'Prueba Explícita',
      photosCount: 10,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://example.com/test.jpg'
    });
    expect(created.id).toBe('album-explicit-test');
    expect(await repo.getAlbumById('album-explicit-test')).not.toBeNull();
  });

  it('debe actualizar precios y metadatos con updateAlbum sin mutar el ID', async () => {
    const updated = await repo.updateAlbum('album-1', {
      unitPrice: 1500,
      fullAlbumPrice: 11000,
      title: 'Tesorieri vs Andino (Clásico Actualizado)'
    });

    expect(updated).not.toBeNull();
    expect(updated?.id).toBe('album-1');
    expect(updated?.unitPrice).toBe(1500);
    expect(updated?.fullAlbumPrice).toBe(11000);
    expect(updated?.title).toBe('Tesorieri vs Andino (Clásico Actualizado)');

    // Verificar en almacenamiento
    const fetched = await repo.getAlbumById('album-1');
    expect(fetched?.unitPrice).toBe(1500);
    expect(fetched?.fullAlbumPrice).toBe(11000);
  });

  it('updateAlbum debe retornar null si el álbum no existe', async () => {
    const res = await repo.updateAlbum('album-inexistente', { unitPrice: 2000 });
    expect(res).toBeNull();
  });

  it('listAllAdmin debe devolver todos los álbumes sin filtrar por isPublished', async () => {
    await repo.createAlbum({
      id: 'album-oculto',
      category: 'sociales',
      title: 'Evento Privado',
      photosCount: 0,
      unitPrice: 1500,
      fullAlbumPrice: 12000,
      coverUrl: '',
      isPublished: false
    });

    const publicList = await repo.listAlbums();
    expect(publicList.some(a => a.id === 'album-oculto')).toBe(false);

    const adminList = await repo.listAllAdmin();
    expect(adminList.some(a => a.id === 'album-oculto')).toBe(true);
  });

  it('generateAlbumSlug debe crear slugs limpios y normalizados con año', async () => {
    const { generateAlbumSlug } = await import('../src/repositories/album.repository');
    const slug1 = generateAlbumSlug('Atlético Tesorieri vs Andino SC!', '12 Octubre, 2026');
    expect(slug1).toBe('atletico-tesorieri-vs-andino-sc-2026');

    const slug2 = generateAlbumSlug('Cumpleaños de 15 de Martina');
    const currentYear = new Date().getFullYear().toString();
    expect(slug2).toContain('cumpleanos-de-15-de-martina');
    expect(slug2).toContain(currentYear);
  });

  it('debe paginar el catálogo de álbumes públicos con listAlbumsPaginated', async () => {
    // Hay 4 álbumes iniciales. Con limit=2, debe devolver 2 álbumes por página y totalPages=2
    const page1 = await repo.listAlbumsPaginated({ page: 1, limit: 2 });
    expect(page1.albums.length).toBe(2);
    expect(page1.pagination.total).toBe(4);
    expect(page1.pagination.page).toBe(1);
    expect(page1.pagination.limit).toBe(2);
    expect(page1.pagination.totalPages).toBe(2);
    expect(page1.pagination.hasNext).toBe(true);
    expect(page1.pagination.hasPrev).toBe(false);

    const page2 = await repo.listAlbumsPaginated({ page: 2, limit: 2 });
    expect(page2.albums.length).toBe(2);
    expect(page2.pagination.page).toBe(2);
    expect(page2.pagination.hasNext).toBe(false);
    expect(page2.pagination.hasPrev).toBe(true);

    // Los álbumes de la página 1 y 2 no deben repetirse
    const idsPage1 = page1.albums.map(a => a.id);
    const idsPage2 = page2.albums.map(a => a.id);
    expect(idsPage1.some(id => idsPage2.includes(id))).toBe(false);
  });

  it('debe paginar el catálogo administrativo con listAllAdminPaginated incluyendo álbumes no publicados', async () => {
    await repo.createAlbum({
      id: 'album-draft-test',
      category: 'futbol',
      title: 'Borrador No Publicado',
      photosCount: 0,
      unitPrice: 1000,
      fullAlbumPrice: 8000,
      coverUrl: '',
      isPublished: false
    });

    const res = await repo.listAllAdminPaginated({ page: 1, limit: 10 });
    expect(res.pagination.total).toBe(5);
    expect(res.albums.some(a => a.id === 'album-draft-test')).toBe(true);
  });
});

