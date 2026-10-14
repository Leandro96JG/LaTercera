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
});
