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

  it('debe registrar un álbum como desbloqueado y recuperar el accessToken', () => {
    store.unlockAlbum('album-privado-1', 'test_access_token');
    expect(store.isUnlocked('album-privado-1')).toBe(true);
    expect(store.unlockedIds().has('album-privado-1')).toBe(true);
    expect(store.getAccessToken('album-privado-1')).toBe('test_access_token');
    expect(store.getAccessToken('otro-album')).toBeUndefined();
    expect(store.isUnlocked('otro-album')).toBe(false);
  });

  it('debe persistir los tokens en sessionStorage y recargarlos en una nueva instancia', () => {
    store.unlockAlbum('album-privado-persisted', 'token_seguro_persisted');
    expect(store.getAccessToken('album-privado-persisted')).toBe('token_seguro_persisted');

    // Nueva instancia simulando recarga de página (F5)
    const newStoreInstance = new AlbumAccessStore();
    expect(newStoreInstance.isUnlocked('album-privado-persisted')).toBe(true);
    expect(newStoreInstance.getAccessToken('album-privado-persisted')).toBe('token_seguro_persisted');
  });

  it('debe permitir bloquear un álbum nuevamente y remover su token', () => {
    store.unlockAlbum('album-privado-1', 'token_123');
    expect(store.isUnlocked('album-privado-1')).toBe(true);
    expect(store.getAccessToken('album-privado-1')).toBe('token_123');

    store.lockAlbum('album-privado-1');
    expect(store.isUnlocked('album-privado-1')).toBe(false);
    expect(store.getAccessToken('album-privado-1')).toBeUndefined();
  });

  it('debe limpiar todos los accesos al llamar a clearAll()', () => {
    store.unlockAlbum('alb_1', 'tok_1');
    store.unlockAlbum('alb_2', 'tok_2');
    expect(store.unlockedIds().size).toBe(2);
    expect(store.getAccessToken('alb_1')).toBe('tok_1');

    store.clearAll();
    expect(store.unlockedIds().size).toBe(0);
    expect(store.isUnlocked('alb_1')).toBe(false);
    expect(store.getAccessToken('alb_1')).toBeUndefined();
  });
});
