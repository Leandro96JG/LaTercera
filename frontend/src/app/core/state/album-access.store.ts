import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AlbumAccessStore {
  private static readonly STORAGE_KEY = 'la_tercera_unlocked_albums';
  private static readonly TOKENS_STORAGE_KEY = 'la_tercera_album_tokens';

  // Conjunto reactivo de IDs de álbumes desbloqueados en la sesión actual
  private readonly _unlockedIds = signal<Set<string>>(this.loadInitialFromSession());
  private readonly _accessTokens = signal<Map<string, string>>(this.loadTokensInitialFromSession());

  // Selectores públicos computados y de lectura
  public readonly unlockedIds = computed(() => this._unlockedIds());

  /**
   * Comprueba si un álbum ya ha sido desbloqueado por el cliente
   */
  public isUnlocked(albumId: string): boolean {
    return this._unlockedIds().has(albumId);
  }

  /**
   * Obtiene el token de acceso criptográfico para un álbum desbloqueado
   */
  public getAccessToken(albumId: string): string | undefined {
    return this._accessTokens().get(albumId);
  }

  /**
   * Registra un álbum como desbloqueado y persiste en sessionStorage
   */
  public unlockAlbum(albumId: string, accessToken?: string): void {
    const updated = new Set(this._unlockedIds());
    updated.add(albumId);
    this._unlockedIds.set(updated);
    this.persistToSession(updated);

    if (accessToken) {
      const tokens = new Map(this._accessTokens());
      tokens.set(albumId, accessToken);
      this._accessTokens.set(tokens);
      this.persistTokensToSession(tokens);
    }
  }

  /**
   * Bloquea nuevamente un álbum específico
   */
  public lockAlbum(albumId: string): void {
    const updated = new Set(this._unlockedIds());
    updated.delete(albumId);
    this._unlockedIds.set(updated);
    this.persistToSession(updated);

    const tokens = new Map(this._accessTokens());
    tokens.delete(albumId);
    this._accessTokens.set(tokens);
    this.persistTokensToSession(tokens);
  }

  /**
   * Limpia todos los accesos desbloqueados (cierre de sesión)
   */
  public clearAll(): void {
    this._unlockedIds.set(new Set());
    this._accessTokens.set(new Map());
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(AlbumAccessStore.STORAGE_KEY);
        window.sessionStorage.removeItem(AlbumAccessStore.TOKENS_STORAGE_KEY);
      }
    } catch {
      // Ignorar errores en entornos sin soporte de storage
    }
  }

  private loadInitialFromSession(): Set<string> {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = window.sessionStorage.getItem(AlbumAccessStore.STORAGE_KEY);
        if (stored) {
          const ids: string[] = JSON.parse(stored);
          return new Set(ids);
        }
      }
    } catch {
      // Fallback defensivo
    }
    return new Set<string>();
  }

  private loadTokensInitialFromSession(): Map<string, string> {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = window.sessionStorage.getItem(AlbumAccessStore.TOKENS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            return new Map(Object.entries(parsed));
          }
        }
      }
    } catch {
      // Fallback defensivo
    }
    return new Map<string, string>();
  }

  private persistToSession(ids: Set<string>): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(
          AlbumAccessStore.STORAGE_KEY,
          JSON.stringify(Array.from(ids))
        );
      }
    } catch {
      // Fallback defensivo
    }
  }

  private persistTokensToSession(tokens: Map<string, string>): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const obj = Object.fromEntries(tokens.entries());
        window.sessionStorage.setItem(
          AlbumAccessStore.TOKENS_STORAGE_KEY,
          JSON.stringify(obj)
        );
      }
    } catch {
      // Fallback defensivo
    }
  }
}
