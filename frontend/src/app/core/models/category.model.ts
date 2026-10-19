export interface CategoryDTO {
  id: string;        // slug único ej: 'futbol', 'motos', 'hockey', 'sociales', 'otros'
  name: string;      // nombre visible ej: 'Fútbol', 'Motos & Enduro', 'Cumpleaños & 15s'
  icon: string;      // icono/emoji seleccionado ej: '⚽', '🏍️', '🏑', '🏀', '🎉'
  badgeLabel: string; // ej: '⚽ Fútbol', '🏍️ Motos'
  order: number;
  isActive: boolean;
}

export const DEFAULT_CATEGORIES: readonly CategoryDTO[] = [
  {
    id: 'futbol',
    name: 'Fútbol',
    icon: '⚽',
    badgeLabel: '⚽ Fútbol',
    order: 1,
    isActive: true
  },
  {
    id: 'motos',
    name: 'Motos & Enduro',
    icon: '🏍️',
    badgeLabel: '🏍️ Motos',
    order: 2,
    isActive: true
  },
  {
    id: 'hockey',
    name: 'Hockey',
    icon: '🏑',
    badgeLabel: '🏑 Hockey',
    order: 3,
    isActive: true
  },
  {
    id: 'basquet',
    name: 'Básquet',
    icon: '🏀',
    badgeLabel: '🏀 Básquet',
    order: 4,
    isActive: true
  },
  {
    id: 'sociales',
    name: 'Cumpleaños & 15s',
    icon: '🎉',
    badgeLabel: '🎉 Cumpleaños & Social',
    order: 5,
    isActive: true
  },
  {
    id: 'otros',
    name: 'Otros Eventos',
    icon: '📸',
    badgeLabel: '📸 General',
    order: 6,
    isActive: true
  }
];
