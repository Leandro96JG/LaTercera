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

  it('debe persistir fotos con addPhotosToAlbum y recuperarlas con getPhotosByAlbumId', async () => {
    const newPhotos = [
      {
        id: 'photo-test-1',
        albumId: 'album-1',
        filename: 'foto_partido_1.jpg',
        originalPath: 'originals/album-1/foto_partido_1.jpg',
        previewUrl: 'https://storage.supabase.com/previews/album-1/foto_partido_1.webp',
        isSampleHd: true,
        width: 4000,
        height: 3000,
        sizeBytes: 4500000
      },
      {
        id: 'photo-test-2',
        albumId: 'album-1',
        filename: 'foto_partido_2.jpg',
        originalPath: 'originals/album-1/foto_partido_2.jpg',
        previewUrl: 'https://storage.supabase.com/previews/album-1/foto_partido_2.webp',
        isSampleHd: false,
        width: 4000,
        height: 3000,
        sizeBytes: 4200000
      }
    ];

    await repo.addPhotosToAlbum('album-1', newPhotos);
    const photos = await repo.getPhotosByAlbumId('album-1');

    expect(photos.some(p => p.id === 'photo-test-1')).toBe(true);
    expect(photos.some(p => p.id === 'photo-test-2')).toBe(true);
    expect(photos.find(p => p.id === 'photo-test-1')?.isSampleHd).toBe(true);
  });

  it('debe retornar fotos de muestra para los álbumes oficiales iniciales si existen', async () => {
    const photos = await repo.getPhotosByAlbumId('album-2');
    expect(photos.length).toBeGreaterThan(0);
    expect(photos[0].albumId).toBe('album-2');
  });

  it('debe exponer createdAt cuando la fila de Supabase trae created_at', async () => {
    const { SupabaseAlbumRepository } = await import('../src/repositories/album.repository');
    const mockRows = [
      {
        id: 'album-sb-1',
        category: 'futbol',
        title: 'Partido con fecha',
        photos_count: 12,
        unit_price: 1200,
        full_album_price: 9500,
        cover_url: 'https://example.com/c.webp',
        is_published: true,
        created_at: '2026-10-12T15:30:00.000Z'
      }
    ];
    const chain = {
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      order: async () => ({ data: mockRows, error: null })
    };
    const mockSupabase = {
      from: () => chain
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const sbRepo = new SupabaseAlbumRepository(mockSupabase);
    const albums = await sbRepo.listAlbums();
    expect(albums.length).toBe(1);
    expect(albums[0].createdAt).toBe('2026-10-12T15:30:00.000Z');
  });

  it('debe actualizar el álbum si Supabase reporta PGRST204 por columna watermark_text faltante', async () => {
    const { SupabaseAlbumRepository } = await import('../src/repositories/album.repository');
    const capturedPayloads: Record<string, unknown>[] = [];

    const mockSupabase = {
      from: () => ({
        update: (payload: Record<string, unknown>) => {
          capturedPayloads.push({ ...payload });
          return {
            eq: () => ({
              select: () => ({
                maybeSingle: async () => {
                  if ('watermark_text' in payload) {
                    return {
                      data: null,
                      error: {
                        code: 'PGRST204',
                        message: "Could not find the 'watermark_text' column of 'albums' in the schema cache"
                      }
                    };
                  }
                  return {
                    data: {
                      id: 'defensores-de-la-boca-vs-gral-paz-junior-2026-5108',
                      category: 'futbol',
                      title: 'Defensores de la Boca Vs Gral Paz Junior',
                      subtitle: 'Torneo Regional Federal Amateur',
                      location: 'La Rioja, Argentina',
                      photos_count: 20,
                      unit_price: 1200,
                      full_album_price: 9500,
                      cover_url: 'https://example.com/c.webp',
                      is_hero_featured: Boolean(payload.is_hero_featured),
                      is_published: true
                    },
                    error: null
                  };
                }
              })
            })
          };
        }
      })
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const sbRepo = new SupabaseAlbumRepository(mockSupabase);
    const updated = await sbRepo.updateAlbum('defensores-de-la-boca-vs-gral-paz-junior-2026-5108', {
      title: 'Defensores de la Boca Vs Gral Paz Junior',
      subtitle: 'Torneo Regional Federal Amateur',
      category: 'futbol',
      isHeroFeatured: true,
      watermarkText: 'LA TERCERA • MUESTRA',
      watermarkLogoUrl: null
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Defensores de la Boca Vs Gral Paz Junior');
    expect(updated?.isHeroFeatured).toBe(true);
    expect(updated?.watermarkText).toBe('LA TERCERA • MUESTRA');
    expect(capturedPayloads.length).toBe(2);
    expect('watermark_text' in capturedPayloads[1]).toBe(false);
    expect(capturedPayloads[1].is_hero_featured).toBe(true);
  });
});

