import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Photo } from '../models/photo.model';
import { PricingBreakdown, PRICING_CONFIG } from '../models/pricing.model';
import { CustomerInfo } from '../models/order.model';
import { PricingTierConfig } from '../models/admin.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CartStore {
  public static readonly STORAGE_KEY = 'la_tercera_cart_state';
  private readonly http: HttpClient | null;

  // --- Estados Privados Writable Signals ---
  private readonly _selectedPhotos = signal<Map<string, Photo>>(new Map());
  private readonly _activeAlbumId = signal<string | null>(null);
  private readonly _isFullAlbum = signal<boolean>(false);
  private readonly _fullAlbumPrice = signal<number>(PRICING_CONFIG.DEFAULT_FULL_ALBUM_PRICE);
  private readonly _unitPrice = signal<number>(PRICING_CONFIG.DEFAULT_UNIT_PRICE);
  private readonly _couponCode = signal<string | null>(null);
  private readonly _couponDiscountPercent = signal<number | null>(null);
  private readonly _customer = signal<CustomerInfo>({ email: '', name: '', phone: '' });

  // Configuración de descuentos por volumen sincronizada con el backend
  private readonly _tierConfig = signal<PricingTierConfig>({
    enableTierDiscounts: true,
    tier3DiscountPercent: 20,
    tier5DiscountPercent: 30,
    capAtFullAlbumPrice: true
  });

  constructor() {
    let resolvedHttp: HttpClient | null = null;
    try {
      resolvedHttp = inject(HttpClient, { optional: true });
    } catch {
      resolvedHttp = null;
    }
    this.http = resolvedHttp;
    this.hydrateFromSession();
  }

  // --- Selectores Públicos Readonly Signals ---
  public readonly activeAlbumId = this._activeAlbumId.asReadonly();
  public readonly isFullAlbum = this._isFullAlbum.asReadonly();
  public readonly unitPrice = this._unitPrice.asReadonly();
  public readonly fullAlbumPrice = this._fullAlbumPrice.asReadonly();
  public readonly couponCode = this._couponCode.asReadonly();
  public readonly couponDiscountPercent = this._couponDiscountPercent.asReadonly();
  public readonly customer = this._customer.asReadonly();
  public readonly tierConfig = this._tierConfig.asReadonly();

  public readonly tier3DiscountPercent = computed<number>(
    () => this._tierConfig().tier3DiscountPercent
  );

  public readonly tier5DiscountPercent = computed<number>(
    () => this._tierConfig().tier5DiscountPercent
  );

  public setTierConfig(config: PricingTierConfig): void {
    this._tierConfig.set({
      enableTierDiscounts: config.enableTierDiscounts ?? true,
      tier3DiscountPercent: config.tier3DiscountPercent ?? 20,
      tier5DiscountPercent: config.tier5DiscountPercent ?? 30,
      capAtFullAlbumPrice: config.capAtFullAlbumPrice ?? true
    });
  }

  public refreshPricingConfig(): void {
    if (!this.http) return;
    this.http.get<PricingTierConfig>(`${environment.apiUrl}/pricing/config`).subscribe({
      next: (config) => {
        if (config) {
          this.setTierConfig(config);
        }
      },
      error: () => {
        // Fallback silencioso sin interrumpir la experiencia de compra
      }
    });
  }

  public readonly selectedPhotosArray = computed<readonly Photo[]>(() =>
    Array.from(this._selectedPhotos().values())
  );

  public readonly selectedPhotoIds = computed<readonly string[]>(() =>
    Array.from(this._selectedPhotos().keys())
  );

  public readonly totalItemsCount = computed<number>(() => {
    return this._isFullAlbum() ? 1 : this._selectedPhotos().size;
  });

  public readonly hasItems = computed<boolean>(() => {
    return this._isFullAlbum() || this._selectedPhotos().size > 0;
  });

  // --- Recomendación Inteligente de Pack Álbum Completo ---
  public readonly shouldRecommendFullAlbum = computed<boolean>(() => {
    if (this._isFullAlbum()) return false;
    const count = this._selectedPhotos().size;
    if (count === 0) return false;
    const currentSubtotal = this.pricing().finalTotal;
    const fullPrice = this._fullAlbumPrice();
    // Solo recomienda pasar al Álbum Completo cuando el total neto real a pagar alcanza o supera el 75% del pack,
    // comparando el total real a pagar y nunca sugiriendo pagar más caro que el subtotal con descuento
    return currentSubtotal >= (fullPrice * 0.75);
  });

  public readonly packRecommendationSavings = computed<number>(() => {
    const currentTotal = this.pricing().finalTotal;
    const fullPrice = this._fullAlbumPrice();
    return Math.max(0, currentTotal - fullPrice);
  });

  // --- Cálculo Reactivo Determinista de Precios (computed) ---
  public readonly pricing = computed<PricingBreakdown>(() => {
    const isFull = this._isFullAlbum();
    const count = this._selectedPhotos().size;
    const unitPrice = this._unitPrice();
    const coupon = this._couponCode()?.trim().toUpperCase() ?? null;
    const tierConfig = this._tierConfig();
    const enableTierDiscounts = tierConfig.enableTierDiscounts;
    const tier3DiscountPercent = tierConfig.tier3DiscountPercent;
    const tier5DiscountPercent = tierConfig.tier5DiscountPercent;
    const capAtFullAlbumPrice = tierConfig.capAtFullAlbumPrice;

    if (isFull) {
      const fullPrice = this._fullAlbumPrice();
      let couponDiscount = 0;
      const discountPct = this._couponDiscountPercent() ?? (coupon === 'YUYO10' ? 10 : 0);
      if (discountPct > 0) {
        couponDiscount = Math.round(fullPrice * (discountPct / 100));
        couponDiscount = Math.min(fullPrice, Math.max(0, couponDiscount));
      }

      return {
        photoCount: count,
        unitPrice,
        rawSubtotal: fullPrice,
        baseDiscountPercentage: 0,
        baseDiscountAmount: 0,
        couponCode: couponDiscount > 0 ? coupon : null,
        couponDiscountAmount: couponDiscount,
        totalDiscount: couponDiscount,
        finalTotal: Math.max(0, fullPrice - couponDiscount),
        isFullAlbum: true
      };
    }

    const rawSubtotal = count * unitPrice;
    let baseDiscountPercentage = 0;

    if (enableTierDiscounts) {
      if (count >= 5) {
        baseDiscountPercentage = tier5DiscountPercent;
      } else if (count >= 3) {
        baseDiscountPercentage = tier3DiscountPercent;
      }
    }

    const baseDiscountAmount = Math.round(rawSubtotal * (baseDiscountPercentage / 100));
    const subtotalAfterBase = Math.max(0, rawSubtotal - baseDiscountAmount);

    let couponDiscountAmount = 0;
    const discountPct = this._couponDiscountPercent() ?? (coupon === 'YUYO10' ? 10 : 0);
    if (discountPct > 0) {
      couponDiscountAmount = Math.round(subtotalAfterBase * (discountPct / 100));
      couponDiscountAmount = Math.min(subtotalAfterBase, Math.max(0, couponDiscountAmount));
    }

    let totalDiscount = baseDiscountAmount + couponDiscountAmount;
    let finalTotal = Math.max(0, rawSubtotal - totalDiscount);

    // Tope automático: comprar fotos sueltas nunca cuesta más que fullAlbumPrice
    const fullPrice = this._fullAlbumPrice();
    if (capAtFullAlbumPrice && fullPrice > 0 && finalTotal > fullPrice) {
      finalTotal = fullPrice;
      totalDiscount = Math.max(0, rawSubtotal - finalTotal);
    }

    totalDiscount = Math.min(rawSubtotal, Math.max(0, totalDiscount));
    finalTotal = Math.max(0, rawSubtotal - totalDiscount);

    return {
      photoCount: count,
      unitPrice,
      rawSubtotal,
      baseDiscountPercentage,
      baseDiscountAmount,
      couponCode: couponDiscountAmount > 0 ? coupon : null,
      couponDiscountAmount,
      totalDiscount,
      finalTotal,
      isFullAlbum: false
    };
  });

  // --- Persistencia y Sincronización en SessionStorage ---

  public hydrateFromSession(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(CartStore.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.selectedPhotos)) {
          const map = new Map<string, Photo>();
          for (const photo of parsed.selectedPhotos) {
            if (photo && photo.id) {
              map.set(photo.id, photo);
            }
          }
          this._selectedPhotos.set(map);
        }
        if (parsed.activeAlbumId !== undefined) {
          this._activeAlbumId.set(parsed.activeAlbumId);
        }
        if (typeof parsed.isFullAlbum === 'boolean') {
          this._isFullAlbum.set(parsed.isFullAlbum);
        }
        if (typeof parsed.unitPrice === 'number' && parsed.unitPrice > 0) {
          this._unitPrice.set(parsed.unitPrice);
        }
        if (typeof parsed.fullAlbumPrice === 'number' && parsed.fullAlbumPrice > 0) {
          this._fullAlbumPrice.set(parsed.fullAlbumPrice);
        }
        if (parsed.couponCode !== undefined) {
          this._couponCode.set(parsed.couponCode);
        }
        if (typeof parsed.couponDiscountPercent === 'number') {
          this._couponDiscountPercent.set(parsed.couponDiscountPercent);
        }
        if (parsed.customer && typeof parsed.customer === 'object') {
          this._customer.set({
            email: parsed.customer.email || '',
            name: parsed.customer.name || '',
            phone: parsed.customer.phone || ''
          });
        }
      }
    } catch {
      // Ignorar fallos de deserialización defensivamente
    }
  }

  public persistToSession(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const state = {
        selectedPhotos: Array.from(this._selectedPhotos().values()),
        activeAlbumId: this._activeAlbumId(),
        isFullAlbum: this._isFullAlbum(),
        unitPrice: this._unitPrice(),
        fullAlbumPrice: this._fullAlbumPrice(),
        couponCode: this._couponCode(),
        couponDiscountPercent: this._couponDiscountPercent(),
        customer: this._customer()
      };
      sessionStorage.setItem(CartStore.STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignorar quota exceeded o storage deshabilitado
    }
  }

  // --- Mutadores de Estado ---

  public isPhotoSelected(photoId: string): boolean {
    return this._selectedPhotos().has(photoId);
  }

  public togglePhoto(photo: Photo): void {
    if (this._isFullAlbum()) {
      this._isFullAlbum.set(false);
    }

    // Comprobar cambio de álbum activo defensivamente
    if (photo.albumId && this._activeAlbumId() && this._activeAlbumId() !== photo.albumId) {
      this._selectedPhotos.set(new Map());
    }
    if (photo.albumId) {
      this._activeAlbumId.set(photo.albumId);
    }

    const updated = new Map(this._selectedPhotos());
    if (updated.has(photo.id)) {
      updated.delete(photo.id);
    } else {
      updated.set(photo.id, photo);
    }
    this._selectedPhotos.set(updated);
    this.persistToSession();
  }

  public removePhoto(photoId: string): void {
    if (this._selectedPhotos().has(photoId)) {
      const updated = new Map(this._selectedPhotos());
      updated.delete(photoId);
      this._selectedPhotos.set(updated);
      this.persistToSession();
    }
  }

  public setAlbumPricing(
    albumId: string,
    fullAlbumPrice: number = PRICING_CONFIG.DEFAULT_FULL_ALBUM_PRICE,
    unitPrice: number = PRICING_CONFIG.DEFAULT_UNIT_PRICE
  ): void {
    if (this._activeAlbumId() && this._activeAlbumId() !== albumId) {
      this._selectedPhotos.set(new Map());
      this._isFullAlbum.set(false);
    }
    this._activeAlbumId.set(albumId);
    this._fullAlbumPrice.set(fullAlbumPrice > 0 ? fullAlbumPrice : PRICING_CONFIG.DEFAULT_FULL_ALBUM_PRICE);
    this._unitPrice.set(unitPrice > 0 ? unitPrice : PRICING_CONFIG.DEFAULT_UNIT_PRICE);
    this.persistToSession();
  }

  public setFullAlbumMode(
    albumId: string,
    albumPrice: number = PRICING_CONFIG.DEFAULT_FULL_ALBUM_PRICE,
    unitPrice?: number
  ): void {
    this.setAlbumPricing(albumId, albumPrice, unitPrice);
    this._isFullAlbum.set(true);
    this.persistToSession();
  }

  public switchToFullAlbum(): void {
    const currentId = this._activeAlbumId();
    if (currentId) {
      this.setFullAlbumMode(currentId, this._fullAlbumPrice(), this._unitPrice());
    }
  }

  public removeFullAlbum(): void {
    this._isFullAlbum.set(false);
    this.persistToSession();
  }

  public applyCoupon(code: string | null, discountPercent?: number): void {
    this._couponCode.set(code?.trim() || null);
    this._couponDiscountPercent.set(
      discountPercent ?? (code?.trim().toUpperCase() === 'YUYO10' ? 10 : null)
    );
    this.persistToSession();
  }

  public updateCustomer(customer: Partial<CustomerInfo>): void {
    this._customer.update(prev => ({ ...prev, ...customer }));
    this.persistToSession();
  }

  public clearCart(): void {
    this._selectedPhotos.set(new Map());
    this._isFullAlbum.set(false);
    this._couponCode.set(null);
    this._couponDiscountPercent.set(null);
    this.persistToSession();
  }
}
