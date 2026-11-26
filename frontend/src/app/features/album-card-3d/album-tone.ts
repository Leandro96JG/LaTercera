export type AlbumTone = 'sport' | 'social' | 'neutral';

export interface AlbumToneTokens {
  readonly meta: string;
  readonly titleHover: string;
  readonly divider: string;
  readonly packBox: string;
  readonly packLabel: string;
  readonly ctaHover: string;
}

const SPORT_KEYS: readonly string[] = [
  'futbol', 'hockey', 'basquet', 'basket', 'motos', 'moto', 'voley', 'rugby', 'tenis', 'padel',
  'natacion', 'atletismo', 'handball', 'ciclismo', 'karting', 'automovilismo', 'running', 'maraton', 'deporte'
];

const SOCIAL_KEYS: readonly string[] = [
  'social', 'sociales', '15', 'quince', 'cumple', 'casamiento', 'boda', 'egres', 'bautismo',
  'comunion', 'fiesta', 'evento', 'aniversario', 'graduacion', 'baby'
];

/** Quita acentos y pasa a minúsculas: 'Básquet' → 'basquet' */
const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Resuelve el tono visual de un álbum según su categoría y badge dinámicos. */
export function resolveAlbumTone(category: string, badge: string): AlbumTone {
  const haystack = normalize(`${category} ${badge}`);
  if (SOCIAL_KEYS.some(key => haystack.includes(key))) return 'social';
  if (SPORT_KEYS.some(key => haystack.includes(key))) return 'sport';
  return 'neutral';
}
