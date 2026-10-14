import { describe, it, expect, beforeEach } from 'vitest';
import { AlbumAccessStore } from './album-access.store';

describe('AlbumAccessStore - Gestión de Desbloqueo de Álbumes Privados', () => {
  let store: AlbumAccessStore;

  beforeEach(() => {
    store = new AlbumAccessStore();
    store.clearAll();
  });

  it('debe iniciar sin álbumes desbloqueados', () => {
    expect(store.isUnlocked('album-privado-1')).toBe(false);
    expect(store.unlockedIds().size).toBe(0);
  });

  it('debe registrar un álbum como desbloqueado', () => {
    store.unlockAlbum('album-privado-1', 'test_access_token');
    expect(store.isUnlocked('album-privado-1')).toBe(true);
    expect(store.unlockedIds().has('album-privado-1')).toBe(true);
    expect(store.isUnlocked('otro-album')).toBe(false);
  });

  it('debe permitir bloquear un álbum nuevamente', () => {
    store.unlockAlbum('album-privado-1');
    expect(store.isUnlocked('album-privado-1')).toBe(true);

    store.lockAlbum('album-privado-1');
    expect(store.isUnlocked('album-privado-1')).toBe(false);
  });

  it('debe limpiar todos los accesos al llamar a clearAll()', () => {
    store.unlockAlbum('alb_1');
    store.unlockAlbum('alb_2');
    expect(store.unlockedIds().size).toBe(2);

    store.clearAll();
    expect(store.unlockedIds().size).toBe(0);
    expect(store.isUnlocked('alb_1')).toBe(false);
  });
});
