import { SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface PricingTierConfig {
  enableTierDiscounts: boolean; // default: true
  tier3DiscountPercent: number; // default: 20
  tier5DiscountPercent: number; // default: 30
  capAtFullAlbumPrice: boolean; // default: true
}

export interface CouponDTO {
  code: string;
  discountPercent: number;
  isActive: boolean;
  albumId?: string | null;
  maxUses?: number | null;
  usedCount: number;
  maxPhotos?: number | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface IPromotionRepository {
  getConfig(): Promise<PricingTierConfig>;
  updateConfig(config: Partial<PricingTierConfig>): Promise<PricingTierConfig>;
  listCoupons(): Promise<CouponDTO[]>;
  getCouponByCode(code: string): Promise<CouponDTO | null>;
  createCoupon(coupon: Omit<CouponDTO, 'createdAt' | 'usedCount'> & { usedCount?: number }): Promise<CouponDTO>;
  updateCoupon(code: string, updates: Partial<CouponDTO>): Promise<CouponDTO | null>;
  deleteCoupon(code: string): Promise<boolean>;
  incrementCouponUsage(code: string): Promise<void>;
  tryConsumeCoupon(
    code: string,
    albumId?: string,
    photoCount?: number,
    isFullAlbum?: boolean,
    syncBeforeCheck?: () => Promise<CouponDTO | null>
  ): Promise<{ success: boolean; coupon?: CouponDTO; error?: string }>;
}

export const DEFAULT_PRICING_TIER_CONFIG: PricingTierConfig = {
  enableTierDiscounts: true,
  tier3DiscountPercent: 20,
  tier5DiscountPercent: 30,
  capAtFullAlbumPrice: true
};

export const DEFAULT_INITIAL_COUPONS: CouponDTO[] = [
  {
    code: 'YUYO10',
    discountPercent: 10,
    isActive: true,
    albumId: null,
    maxUses: null,
    usedCount: 0,
    maxPhotos: null,
    expiresAt: null,
    createdAt: new Date().toISOString()
  }
];

const PROMOTIONS_FILE_PATH = path.resolve(__dirname, '../../data/promotions.json');

/**
 * Implementación en memoria de IPromotionRepository para tests y fallback offline con persistencia JSON
 */
export class MemoryPromotionRepository implements IPromotionRepository {
  private config: PricingTierConfig = { ...DEFAULT_PRICING_TIER_CONFIG };
  private coupons: Map<string, CouponDTO> = new Map();
  private locks: Map<string, Promise<void>> = new Map();
  private allowFilePersistence: boolean = true;

  constructor(allowFilePersistence = true) {
    this.allowFilePersistence = allowFilePersistence && process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true';

    // Cargar cupones iniciales por defecto
    for (const c of DEFAULT_INITIAL_COUPONS) {
      this.coupons.set(c.code.toUpperCase(), { ...c });
    }

    if (this.allowFilePersistence) {
      this.loadFromFile();
    }
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(PROMOTIONS_FILE_PATH)) {
        const raw = fs.readFileSync(PROMOTIONS_FILE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (data.config) {
          this.config = { ...DEFAULT_PRICING_TIER_CONFIG, ...data.config };
        }
        if (Array.isArray(data.coupons)) {
          for (const c of data.coupons) {
            if (c && c.code) {
              this.coupons.set(c.code.toUpperCase(), { ...c });
            }
          }
        }
      } else {
        this.saveToFile();
      }
    } catch (err) {
      console.warn('[MemoryPromotionRepository] Advertencia al leer promotions.json:', err);
    }
  }

  private saveToFile(): void {
    if (!this.allowFilePersistence) return;
    try {
      const dir = path.dirname(PROMOTIONS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        config: this.config,
        coupons: Array.from(this.coupons.values())
      };
      fs.writeFileSync(PROMOTIONS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemoryPromotionRepository] Advertencia al guardar promotions.json:', err);
    }
  }

  private async acquireLock(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let release: () => void;
    const promise = new Promise<void>((resolve) => {
      release = () => {
        this.locks.delete(key);
        resolve();
      };
    });
    this.locks.set(key, promise);
    return release!;
  }

  async getConfig(): Promise<PricingTierConfig> {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<PricingTierConfig>): Promise<PricingTierConfig> {
    this.config = {
      ...this.config,
      ...updates
    };
    this.saveToFile();
    return { ...this.config };
  }
  upsertMemoryCoupon(coupon: CouponDTO): void {
    const normalizedCode = coupon.code.trim().toUpperCase();
    this.coupons.set(normalizedCode, { ...coupon, code: normalizedCode });
    this.saveToFile();
  }

  async listCoupons(): Promise<CouponDTO[]> {
    return Array.from(this.coupons.values()).map(c => ({ ...c }));
  }

  async getCouponByCode(code: string): Promise<CouponDTO | null> {
    const found = this.coupons.get(code.trim().toUpperCase());
    return found ? { ...found } : null;
  }

  async createCoupon(
    input: Omit<CouponDTO, 'createdAt' | 'usedCount'> & { usedCount?: number }
  ): Promise<CouponDTO> {
    const normalizedCode = input.code.trim().toUpperCase();
    if (this.coupons.has(normalizedCode)) {
      throw new Error(`El cupón con código '${normalizedCode}' ya existe`);
    }

    if (input.discountPercent < 1 || input.discountPercent > 100) {
      throw new Error('El porcentaje de descuento debe estar entre 1 y 100');
    }

    const cleanAlbumId = input.albumId && input.albumId.trim() !== '' ? input.albumId.trim() : null;
    const cleanMaxUses = input.maxUses ? Number(input.maxUses) : null;
    const cleanMaxPhotos = input.maxPhotos ? Number(input.maxPhotos) : null;

    const newCoupon: CouponDTO = {
      code: normalizedCode,
      discountPercent: input.discountPercent,
      isActive: input.isActive ?? true,
      albumId: cleanAlbumId,
      maxUses: cleanMaxUses,
      usedCount: input.usedCount || 0,
      maxPhotos: cleanMaxPhotos,
      expiresAt: input.expiresAt || null,
      createdAt: new Date().toISOString()
    };

    this.coupons.set(normalizedCode, newCoupon);
    this.saveToFile();
    return { ...newCoupon };
  }

  async updateCoupon(code: string, updates: Partial<CouponDTO>): Promise<CouponDTO | null> {
    const normalizedCode = code.trim().toUpperCase();
    const existing = this.coupons.get(normalizedCode);
    if (!existing) return null;

    if (updates.discountPercent !== undefined && (updates.discountPercent < 1 || updates.discountPercent > 100)) {
      throw new Error('El porcentaje de descuento debe estar entre 1 y 100');
    }

    const updated: CouponDTO = {
      ...existing,
      ...updates,
      code: normalizedCode // preservar código original
    };

    this.coupons.set(normalizedCode, updated);
    this.saveToFile();
    return { ...updated };
  }

  async deleteCoupon(code: string): Promise<boolean> {
    const normalizedCode = code.trim().toUpperCase();
    const deleted = this.coupons.delete(normalizedCode);
    if (deleted) {
      this.saveToFile();
    }
    return deleted;
  }

  async incrementCouponUsage(code: string): Promise<void> {
    const normalizedCode = code.trim().toUpperCase();
    const existing = this.coupons.get(normalizedCode);
    if (existing) {
      existing.usedCount = (existing.usedCount || 0) + 1;
      this.coupons.set(normalizedCode, existing);
      this.saveToFile();
    }
  }

  async tryConsumeCoupon(
    code: string,
    albumId?: string,
    photoCount?: number,
    isFullAlbum?: boolean,
    syncBeforeCheck?: () => Promise<CouponDTO | null>
  ): Promise<{ success: boolean; coupon?: CouponDTO; error?: string }> {
    const normalizedCode = code.trim().toUpperCase();
    const release = await this.acquireLock(normalizedCode);
    try {
      if (syncBeforeCheck) {
        try {
          const fresh = await syncBeforeCheck();
          if (fresh) {
            this.upsertMemoryCoupon(fresh);
          }
        } catch (err: unknown) {
          console.warn('[MemoryPromotionRepository] Advertencia al sincronizar en lock:', err);
        }
      }

      const coupon = this.coupons.get(normalizedCode);
      if (!coupon) {
        return { success: false, error: 'Cupón no encontrado' };
      }
      if (!coupon.isActive) {
        return { success: false, error: 'El cupón no se encuentra activo' };
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
        return { success: false, error: 'Este cupón ha expirado' };
      }
      if (coupon.albumId && albumId && coupon.albumId !== albumId) {
        return { success: false, error: 'Este cupón no es válido para este álbum específico' };
      }
      if (coupon.maxPhotos != null) {
        if (isFullAlbum) {
          return {
            success: false,
            error: `Este cupón de sorteo es válido hasta ${coupon.maxPhotos} foto(s) individual(es)`
          };
        }
        if (photoCount !== undefined && photoCount > coupon.maxPhotos) {
          return {
            success: false,
            error: `Este cupón de sorteo es válido hasta ${coupon.maxPhotos} foto(s) individual(es)`
          };
        }
      }
      if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
        return { success: false, error: 'Este cupón ha alcanzado el límite máximo de usos disponibles' };
      }

      coupon.usedCount = (coupon.usedCount || 0) + 1;
      this.coupons.set(normalizedCode, { ...coupon });
      this.saveToFile();
      return { success: true, coupon: { ...coupon } };
    } finally {
      release();
    }
  }
}

/**
 * Implementación PostgreSQL de IPromotionRepository con Supabase
 * Incluye fallback defensivo local en caso de que la tabla aún no haya sido migrada
 */
export class SupabasePromotionRepository implements IPromotionRepository {
  private supabase: SupabaseClient;
  private localFallback = new MemoryPromotionRepository();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getConfig(): Promise<PricingTierConfig> {
    try {
      const { data, error } = await this.supabase
        .from('promotions_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          enableTierDiscounts: data.enable_tier_discounts ?? true,
          tier3DiscountPercent: data.tier3_discount_percent ?? 20,
          tier5DiscountPercent: data.tier5_discount_percent ?? 30,
          capAtFullAlbumPrice: data.cap_at_full_album_price ?? true
        };
      }
    } catch (err: unknown) {
      console.warn('[SupabasePromotionRepository] Error consultando promotions_config:', err);
    }

    return this.localFallback.getConfig();
  }

  async updateConfig(updates: Partial<PricingTierConfig>): Promise<PricingTierConfig> {
    const updatedLocal = await this.localFallback.updateConfig(updates);

    try {
      const { error } = await this.supabase
        .from('promotions_config')
        .upsert({
          id: 1,
          enable_tier_discounts: updatedLocal.enableTierDiscounts,
          tier3_discount_percent: updatedLocal.tier3DiscountPercent,
          tier5_discount_percent: updatedLocal.tier5DiscountPercent,
          cap_at_full_album_price: updatedLocal.capAtFullAlbumPrice,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      if (error) {
        console.warn('[SupabasePromotionRepository] Aviso al persistir promotions_config:', error.message);
      }
    } catch (err: unknown) {
      console.warn('[SupabasePromotionRepository] Advertencia al persistir promotions_config:', err);
    }

    return updatedLocal;
  }

  async listCoupons(): Promise<CouponDTO[]> {
    try {
      const { data, error } = await this.supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((r: any) => ({
          code: r.code,
          discountPercent: Number(r.discount_percent) || 10,
          isActive: Boolean(r.is_active),
          albumId: r.album_id || null,
          maxUses: r.max_uses ? Number(r.max_uses) : null,
          usedCount: Number(r.used_count) || 0,
          maxPhotos: r.max_photos ? Number(r.max_photos) : null,
          expiresAt: r.expires_at || null,
          createdAt: r.created_at
        }));
      }
    } catch (err: unknown) {
      console.warn('[SupabasePromotionRepository] Error consultando coupons:', err);
    }

    return this.localFallback.listCoupons();
  }

  async getCouponByCode(code: string): Promise<CouponDTO | null> {
    const normalizedCode = code.trim().toUpperCase();
    try {
      const { data, error } = await this.supabase
        .from('coupons')
        .select('*')
        .eq('code', normalizedCode)
        .maybeSingle();

      if (!error && data) {
        return {
          code: data.code,
          discountPercent: Number(data.discount_percent) || 10,
          isActive: Boolean(data.is_active),
          albumId: data.album_id || null,
          maxUses: data.max_uses ? Number(data.max_uses) : null,
          usedCount: Number(data.used_count) || 0,
          maxPhotos: data.max_photos ? Number(data.max_photos) : null,
          expiresAt: data.expires_at || null,
          createdAt: data.created_at
        };
      }
    } catch (err: unknown) {
      console.warn('[SupabasePromotionRepository] Error consultando coupon por código:', err);
    }

    return this.localFallback.getCouponByCode(normalizedCode);
  }

  async createCoupon(
    input: Omit<CouponDTO, 'createdAt' | 'usedCount'> & { usedCount?: number }
  ): Promise<CouponDTO> {
    const normalizedCode = input.code.trim().toUpperCase();
    const cleanAlbumId = input.albumId && input.albumId.trim() !== '' ? input.albumId.trim() : null;
    const cleanMaxUses = input.maxUses ? Number(input.maxUses) : null;
    const cleanMaxPhotos = input.maxPhotos ? Number(input.maxPhotos) : null;

    const createdLocal = await this.localFallback.createCoupon({
      ...input,
      albumId: cleanAlbumId,
      maxUses: cleanMaxUses,
      maxPhotos: cleanMaxPhotos
    });

    try {
      const { error } = await this.supabase
        .from('coupons')
        .insert({
          code: normalizedCode,
          discount_percent: createdLocal.discountPercent,
          is_active: createdLocal.isActive,
          album_id: createdLocal.albumId,
          max_uses: createdLocal.maxUses,
          used_count: createdLocal.usedCount,
          max_photos: createdLocal.maxPhotos,
          expires_at: createdLocal.expiresAt,
          created_at: createdLocal.createdAt
        });
      if (error) {
        console.warn('[SupabasePromotionRepository] Aviso al persistir cupón en Supabase:', error.message);
      }
    } catch (err: unknown) {
      console.warn('[SupabasePromotionRepository] Advertencia al persistir cupón:', err);
    }

    return createdLocal;
  }

  async updateCoupon(code: string, updates: Partial<CouponDTO>): Promise<CouponDTO | null> {
    const normalizedCode = code.trim().toUpperCase();
    const updatedLocal = await this.localFallback.updateCoupon(normalizedCode, updates);
    if (!updatedLocal) return null;

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent;
      if (updates.maxUses !== undefined) dbUpdates.max_uses = updates.maxUses;
      if (updates.albumId !== undefined) dbUpdates.album_id = updates.albumId;
      if (updates.maxPhotos !== undefined) dbUpdates.max_photos = updates.maxPhotos;
      if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt;

      await this.supabase
        .from('coupons')
        .update(dbUpdates)
        .eq('code', normalizedCode);
    } catch (err: unknown) {
      console.warn('[SupabasePromotionRepository] Advertencia al actualizar cupón:', err);
    }

    return updatedLocal;
  }

  async deleteCoupon(code: string): Promise<boolean> {
    const normalizedCode = code.trim().toUpperCase();
    const deletedLocal = await this.localFallback.deleteCoupon(normalizedCode);

    try {
      await this.supabase
        .from('coupons')
        .delete()
        .eq('code', normalizedCode);
    } catch (err: unknown) {
      console.warn('[SupabasePromotionRepository] Advertencia al borrar cupón:', err);
    }

    return deletedLocal;
  }

  async incrementCouponUsage(code: string): Promise<void> {
    const normalizedCode = code.trim().toUpperCase();
    await this.localFallback.incrementCouponUsage(normalizedCode);

    try {
      const { data } = await this.supabase
        .from('coupons')
        .select('used_count')
        .eq('code', normalizedCode)
        .maybeSingle();

      if (data) {
        await this.supabase
          .from('coupons')
          .update({ used_count: (Number(data.used_count) || 0) + 1 })
          .eq('code', normalizedCode);
      }
    } catch (err: unknown) {
      console.warn('[SupabasePromotionRepository] Advertencia al incrementar used_count de cupón:', err);
    }
  }

  async tryConsumeCoupon(
    code: string,
    albumId?: string,
    photoCount?: number,
    isFullAlbum?: boolean
  ): Promise<{ success: boolean; coupon?: CouponDTO; error?: string }> {
    const normalizedCode = code.trim().toUpperCase();

    const syncBeforeCheck = async (): Promise<CouponDTO | null> => {
      try {
        const { data, error } = await this.supabase
          .from('coupons')
          .select('*')
          .eq('code', normalizedCode)
          .maybeSingle();

        if (!error && data) {
          return {
            code: data.code,
            discountPercent: Number(data.discount_percent) || 10,
            isActive: Boolean(data.is_active),
            albumId: data.album_id || null,
            maxUses: data.max_uses ? Number(data.max_uses) : null,
            usedCount: Number(data.used_count) || 0,
            maxPhotos: data.max_photos ? Number(data.max_photos) : null,
            expiresAt: data.expires_at || null,
            createdAt: data.created_at
          };
        }
      } catch (err: unknown) {
        console.warn('[SupabasePromotionRepository] Advertencia al sincronizar cupón en lock:', err);
      }
      return null;
    };

    const res = await this.localFallback.tryConsumeCoupon(
      normalizedCode,
      albumId,
      photoCount,
      isFullAlbum,
      syncBeforeCheck
    );

    if (res.success && res.coupon) {
      try {
        let updateQuery = this.supabase
          .from('coupons')
          .update({ used_count: res.coupon.usedCount })
          .eq('code', res.coupon.code);

        if (res.coupon.maxUses != null) {
          updateQuery = updateQuery.lt('used_count', res.coupon.maxUses);
        }

        const { data, error } = await updateQuery.select('id, used_count');
        if (error) {
          console.warn('[SupabasePromotionRepository] Advertencia al persistir used_count en Supabase:', error);
        } else if (res.coupon.maxUses != null && (!data || data.length === 0)) {
          // Si ninguna fila fue actualizada, se alcanzó concurrentemente el límite maxUses en la base de datos
          res.coupon.usedCount = Math.max(0, res.coupon.usedCount - 1);
          this.localFallback.upsertMemoryCoupon(res.coupon);
          return {
            success: false,
            error: 'Este cupón ha alcanzado el límite máximo de usos disponibles'
          };
        }
      } catch (err: unknown) {
        console.warn('[SupabasePromotionRepository] Advertencia al persistir used_count en Supabase:', err);
      }
    }
    return res;
  }
}
