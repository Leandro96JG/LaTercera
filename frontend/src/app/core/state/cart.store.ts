import { Injectable, computed, signal } from '@angular/core';
import { Photo } from '../models/photo.model';
import { PricingBreakdown, PRICING_CONFIG } from '../models/pricing.model';
import { CustomerInfo } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class CartStore {
  // --- Estados Privados Writable Signals ---
  private readonly _selectedPhotos = signal<Map<string, Photo>>(new Map());
  private readonly _activeAlbumId = signal<string | null>(null);
  private readonly _isFullAlbum = signal<boolean>(false);
  private readonly _fullAlbumPrice = signal<number>(PRICING_CONFIG.DEFAULT_FULL_ALBUM_PRICE);
  private readonly _unitPrice = signal<number>(PRICING_CONFIG.DEFAULT_UNIT_PRICE);
  private readonly _couponCode = signal<string | null>(null);
  private readonly _customer = signal<CustomerInfo>({ email: '', name: '', phone: '' });

  // --- Selectores Públicos Readonly Signals ---
  public readonly activeAlbumId = this._activeAlbumId.asReadonly();
  public readonly isFullAlbum = this._isFullAlbum.asReadonly();
  public readonly unitPrice = this._unitPrice.asReadonly();
  public readonly fullAlbumPrice = this._fullAlbumPrice.asReadonly();
  public readonly couponCode = this._couponCode.asReadonly();
  public readonly customer = this._customer.asReadonly();

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
    // Se recomienda si el total individual iguala o supera el precio del pack completo,
    // o si el costo individual alcanza el 80% del pack
    return currentSubtotal >= fullPrice || (count * this._unitPrice()) >= (fullPrice * 0.8);
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

    if (isFull) {
      const fullPrice = this._fullAlbumPrice();
      let couponDiscount = 0;
      if (coupon === 'YUYO10') {
        couponDiscount = Math.round(fullPrice * PRICING_CONFIG.COUPON_YUYO10_DISCOUNT);
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
        finalTotal: fullPrice - couponDiscount,
        isFullAlbum: true
      };
    }

    const rawSubtotal = count * unitPrice;
    let baseDiscountPercentage = 0;

    if (count >= 5) {
      baseDiscountPercentage = PRICING_CONFIG.TIER_5_PHOTOS_DISCOUNT * 100;
    } else if (count >= 3) {
      baseDiscountPercentage = PRICING_CONFIG.TIER_3_PHOTOS_DISCOUNT * 100;
    }

    const baseDiscountAmount = Math.round(rawSubtotal * (baseDiscountPercentage / 100));
    const subtotalAfterBase = rawSubtotal - baseDiscountAmount;

    let couponDiscountAmount = 0;
    if (coupon === 'YUYO10') {
      couponDiscountAmount = Math.round(subtotalAfterBase * PRICING_CONFIG.COUPON_YUYO10_DISCOUNT);
    }

    const totalDiscount = baseDiscountAmount + couponDiscountAmount;
    const finalTotal = Math.max(0, rawSubtotal - totalDiscount);

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

  // --- Mutadores de Estado ---

  public isPhotoSelected(photoId: string): boolean {
    return this._selectedPhotos().has(photoId);
  }

  public togglePhoto(photo: Photo): void {
    if (this._isFullAlbum()) {
      this._isFullAlbum.set(false);
    }

    // Comprobar cambio de álbum activo
    if (this._activeAlbumId() && this._activeAlbumId() !== photo.albumId) {
      this._selectedPhotos.set(new Map());
    }
    this._activeAlbumId.set(photo.albumId);

    const updated = new Map(this._selectedPhotos());
    if (updated.has(photo.id)) {
      updated.delete(photo.id);
    } else {
      updated.set(photo.id, photo);
    }
    this._selectedPhotos.set(updated);
  }

  public removePhoto(photoId: string): void {
    if (this._selectedPhotos().has(photoId)) {
      const updated = new Map(this._selectedPhotos());
      updated.delete(photoId);
      this._selectedPhotos.set(updated);
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
  }

  public setFullAlbumMode(
    albumId: string,
    albumPrice: number = PRICING_CONFIG.DEFAULT_FULL_ALBUM_PRICE,
    unitPrice?: number
  ): void {
    this.setAlbumPricing(albumId, albumPrice, unitPrice);
    this._isFullAlbum.set(true);
  }

  public switchToFullAlbum(): void {
    const currentId = this._activeAlbumId();
    if (currentId) {
      this.setFullAlbumMode(currentId, this._fullAlbumPrice(), this._unitPrice());
    }
  }

  public applyCoupon(code: string | null): void {
    this._couponCode.set(code?.trim() || null);
  }

  public updateCustomer(customer: Partial<CustomerInfo>): void {
    this._customer.update(prev => ({ ...prev, ...customer }));
  }

  public clearCart(): void {
    this._selectedPhotos.set(new Map());
    this._isFullAlbum.set(false);
    this._couponCode.set(null);
  }
}
