import { SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface CategoryDTO {
  id: string;        // slug único ej: 'futbol', 'motos', 'hockey', 'sociales', 'otros'
  name: string;      // nombre visible ej: 'Fútbol', 'Motos & Enduro', 'Cumpleaños & 15s'
  icon: string;      // icono/emoji seleccionado ej: '⚽', '🏍️', '🏑', '🏀', '🎉'
  badgeLabel: string; // ej: '⚽ Fútbol', '🏍️ Motos'
  order: number;
  isActive: boolean;
}

export function slugifyCategory(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'categoria';
}

export const DEFAULT_INITIAL_CATEGORIES: CategoryDTO[] = [
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

export interface ICategoryRepository {
  listCategories(): Promise<CategoryDTO[]>;
  listAllCategoriesAdmin(): Promise<CategoryDTO[]>;
  getCategoryById(id: string): Promise<CategoryDTO | null>;
  createCategory(input: {
    id?: string;
    name: string;
    icon?: string;
    badgeLabel?: string;
    order?: number;
    isActive?: boolean;
  }): Promise<CategoryDTO>;
  updateCategory(id: string, updates: Partial<CategoryDTO>): Promise<CategoryDTO | null>;
  deleteCategory(id: string): Promise<boolean>;
}

const CATEGORIES_FILE_PATH = path.resolve(__dirname, '../../data/categories.json');

/**
 * Implementación en memoria y persistente en JSON de ICategoryRepository
 */
export class MemoryCategoryRepository implements ICategoryRepository {
  private categories: Map<string, CategoryDTO> = new Map();
  private allowFilePersistence: boolean = true;

  constructor(allowFilePersistence = true) {
    this.allowFilePersistence = allowFilePersistence && process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true';

    for (const cat of DEFAULT_INITIAL_CATEGORIES) {
      this.categories.set(cat.id, { ...cat });
    }

    if (this.allowFilePersistence) {
      this.loadFromFile();
    }
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(CATEGORIES_FILE_PATH)) {
        const raw = fs.readFileSync(CATEGORIES_FILE_PATH, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.id) {
              this.categories.set(item.id, { ...item });
            }
          }
        }
      } else {
        this.saveToFile();
      }
    } catch (err) {
      console.warn('[MemoryCategoryRepository] Advertencia al leer categories.json:', err);
    }
  }

  private saveToFile(): void {
    if (!this.allowFilePersistence) return;
    try {
      const dir = path.dirname(CATEGORIES_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.categories.values());
      fs.writeFileSync(CATEGORIES_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemoryCategoryRepository] Advertencia al guardar categories.json:', err);
    }
  }

  async listCategories(): Promise<CategoryDTO[]> {
    return Array.from(this.categories.values())
      .filter(c => c.isActive)
      .sort((a, b) => a.order - b.order);
  }

  async listAllCategoriesAdmin(): Promise<CategoryDTO[]> {
    return Array.from(this.categories.values())
      .sort((a, b) => a.order - b.order);
  }

  async getCategoryById(id: string): Promise<CategoryDTO | null> {
    const found = this.categories.get(id.toLowerCase().trim());
    return found ? { ...found } : null;
  }

  async createCategory(input: {
    id?: string;
    name: string;
    icon?: string;
    badgeLabel?: string;
    order?: number;
    isActive?: boolean;
  }): Promise<CategoryDTO> {
    const rawId = input.id ? slugifyCategory(input.id) : slugifyCategory(input.name);
    const id = rawId || 'cat-' + Date.now();

    if (this.categories.has(id)) {
      throw new Error(`La categoría con ID '${id}' ya existe`);
    }

    const name = input.name.trim();
    if (!name) {
      throw new Error('El nombre de la categoría es obligatorio');
    }

    const icon = input.icon?.trim() || '📸';
    const badgeLabel = input.badgeLabel?.trim() || `${icon} ${name}`;
    const all = Array.from(this.categories.values());
    const nextOrder = input.order ?? (all.length > 0 ? Math.max(...all.map(c => c.order)) + 1 : 1);

    const newCategory: CategoryDTO = {
      id,
      name,
      icon,
      badgeLabel,
      order: nextOrder,
      isActive: input.isActive ?? true
    };

    this.categories.set(id, newCategory);
    this.saveToFile();
    return { ...newCategory };
  }

  async updateCategory(id: string, updates: Partial<CategoryDTO>): Promise<CategoryDTO | null> {
    const key = id.toLowerCase().trim();
    const existing = this.categories.get(key);
    if (!existing) return null;

    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    const icon = updates.icon !== undefined ? updates.icon.trim() : existing.icon;
    const badgeLabel = updates.badgeLabel !== undefined
      ? updates.badgeLabel.trim()
      : (updates.name || updates.icon ? `${icon} ${name}` : existing.badgeLabel);

    const updated: CategoryDTO = {
      ...existing,
      ...updates,
      id: key,
      name,
      icon,
      badgeLabel,
      order: updates.order !== undefined ? Number(updates.order) : existing.order,
      isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : existing.isActive
    };

    this.categories.set(key, updated);
    this.saveToFile();
    return { ...updated };
  }

  async deleteCategory(id: string): Promise<boolean> {
    const key = id.toLowerCase().trim();
    if (key === 'otros') {
      throw new Error('No es posible eliminar la categoría principal por defecto ("otros")');
    }
    const deleted = this.categories.delete(key);
    if (deleted) {
      this.saveToFile();
    }
    return deleted;
  }
}

/**
 * Implementación de ICategoryRepository para Supabase con fallback a MemoryCategoryRepository
 */
export class SupabaseCategoryRepository implements ICategoryRepository {
  private supabase: SupabaseClient;
  private localFallback = new MemoryCategoryRepository();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async listCategories(): Promise<CategoryDTO[]> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          name: r.name,
          icon: r.icon,
          badgeLabel: r.badge_label || `${r.icon} ${r.name}`,
          order: Number(r.display_order) || 1,
          isActive: Boolean(r.is_active)
        }));
      }
    } catch (err: unknown) {
      console.warn('[SupabaseCategoryRepository] Error consultando categories en Supabase:', err);
    }

    return this.localFallback.listCategories();
  }

  async listAllCategoriesAdmin(): Promise<CategoryDTO[]> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          name: r.name,
          icon: r.icon,
          badgeLabel: r.badge_label || `${r.icon} ${r.name}`,
          order: Number(r.display_order) || 1,
          isActive: Boolean(r.is_active)
        }));
      }
    } catch (err: unknown) {
      console.warn('[SupabaseCategoryRepository] Error consultando admin categories en Supabase:', err);
    }

    return this.localFallback.listAllCategoriesAdmin();
  }

  async getCategoryById(id: string): Promise<CategoryDTO | null> {
    const key = id.toLowerCase().trim();
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('id', key)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          icon: data.icon,
          badgeLabel: data.badge_label || `${data.icon} ${data.name}`,
          order: Number(data.display_order) || 1,
          isActive: Boolean(data.is_active)
        };
      }
    } catch (err: unknown) {
      console.warn('[SupabaseCategoryRepository] Error consultando category por id:', err);
    }

    return this.localFallback.getCategoryById(key);
  }

  async createCategory(input: {
    id?: string;
    name: string;
    icon?: string;
    badgeLabel?: string;
    order?: number;
    isActive?: boolean;
  }): Promise<CategoryDTO> {
    const createdLocal = await this.localFallback.createCategory(input);

    try {
      const { error } = await this.supabase
        .from('categories')
        .insert({
          id: createdLocal.id,
          name: createdLocal.name,
          icon: createdLocal.icon,
          badge_label: createdLocal.badgeLabel,
          display_order: createdLocal.order,
          is_active: createdLocal.isActive
        });
      if (error) {
        console.warn('[SupabaseCategoryRepository] Aviso al persistir categoría en Supabase:', error.message);
      }
    } catch (err: unknown) {
      console.warn('[SupabaseCategoryRepository] Advertencia al persistir categoría en Supabase:', err);
    }

    return createdLocal;
  }

  async updateCategory(id: string, updates: Partial<CategoryDTO>): Promise<CategoryDTO | null> {
    const updatedLocal = await this.localFallback.updateCategory(id, updates);
    if (!updatedLocal) return null;

    try {
      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      if (updates.name !== undefined) dbUpdates.name = updatedLocal.name;
      if (updates.icon !== undefined) dbUpdates.icon = updatedLocal.icon;
      if (updates.badgeLabel !== undefined || updates.name !== undefined || updates.icon !== undefined) {
        dbUpdates.badge_label = updatedLocal.badgeLabel;
      }
      if (updates.order !== undefined) dbUpdates.display_order = updatedLocal.order;
      if (updates.isActive !== undefined) dbUpdates.is_active = updatedLocal.isActive;

      const { error } = await this.supabase
        .from('categories')
        .update(dbUpdates)
        .eq('id', updatedLocal.id);

      if (error) {
        console.warn('[SupabaseCategoryRepository] Aviso al actualizar categoría en Supabase:', error.message);
      }
    } catch (err: unknown) {
      console.warn('[SupabaseCategoryRepository] Advertencia al actualizar categoría en Supabase:', err);
    }

    return updatedLocal;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const key = id.toLowerCase().trim();
    const deletedLocal = await this.localFallback.deleteCategory(key);
    if (!deletedLocal) return false;

    try {
      // Reasignar álbumes que usaban esta categoría a 'otros' antes de eliminarla
      await this.supabase
        .from('albums')
        .update({ category: 'otros', updated_at: new Date().toISOString() })
        .eq('category', key);

      const { error } = await this.supabase
        .from('categories')
        .delete()
        .eq('id', key);

      if (error) {
        console.warn('[SupabaseCategoryRepository] Aviso al eliminar categoría en Supabase:', error.message);
      }
    } catch (err: unknown) {
      console.warn('[SupabaseCategoryRepository] Advertencia al eliminar categoría en Supabase:', err);
    }

    return true;
  }
}
