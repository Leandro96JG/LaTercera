import { describe, it, expect } from 'vitest';
import { resolveAlbumTone } from './album-tone';

describe('resolveAlbumTone', () => {
  it('debe resolver sport para categorías deportivas con o sin acento', () => {
    expect(resolveAlbumTone('futbol', '⚽ Fútbol')).toBe('sport');
    expect(resolveAlbumTone('hockey', '')).toBe('sport');
    expect(resolveAlbumTone('Básquet', '')).toBe('sport');
  });

  it('debe resolver social para eventos sociales y priorizar social sobre sport', () => {
    expect(resolveAlbumTone('sociales', '🎉 15 Años')).toBe('social');
    expect(resolveAlbumTone('futbol', '🎉 Fiesta del Club')).toBe('social');
  });

  it('debe resolver neutral para categorías desconocidas o vacías', () => {
    expect(resolveAlbumTone('ajedrez', '')).toBe('neutral');
    expect(resolveAlbumTone('', '')).toBe('neutral');
  });
});
