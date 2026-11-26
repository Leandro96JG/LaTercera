import { PricingTierConfig, CouponDTO } from '../repositories/promotion.repository';

export interface PricingRequest {
  photoCount: number;
  unitPrice?: number;
  fullAlbumPrice?: number;
  isFullAlbum?: boolean;
  couponCode?: string;
  config?: Partial<PricingTierConfig>;
  coupon?: CouponDTO | null;
}

export interface PricingResult {
  photoCount: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  discountPercentage: number;
  total: number;
  isFullAlbum: boolean;
  couponApplied?: string;
}

const DEFAULT_UNIT_PRICE = 1200;
const DEFAULT_FULL_ALBUM_PRICE = 9500;

function clamp(val: number, min = 0, max = 100): number {
  if (isNaN(val)) return min;
  return Math.min(max, Math.max(min, val));
}

export function calculateCartTotal(req: PricingRequest): PricingResult {
  const unitPrice = req.unitPrice ?? DEFAULT_UNIT_PRICE;
  const fullAlbumPrice = req.fullAlbumPrice ?? DEFAULT_FULL_ALBUM_PRICE;
  const isFullAlbum = req.isFullAlbum ?? false;
  const photoCount = Math.max(0, req.photoCount);

  const enableTierDiscounts = req.config?.enableTierDiscounts ?? true;
  const tier3DiscountPercent = clamp(req.config?.tier3DiscountPercent ?? 20);
  const tier5DiscountPercent = clamp(req.config?.tier5DiscountPercent ?? 30);
  const capAtFullAlbumPrice = req.config?.capAtFullAlbumPrice ?? true;

  // Resolver descuento de cupón
  let couponDiscountPercent = 0;
  let couponAppliedName: string | undefined = undefined;

  if (req.coupon) {
    const isNotExpired = !req.coupon.expiresAt || new Date(req.coupon.expiresAt).getTime() >= Date.now();
    const isUnderMaxPhotos = req.coupon.maxPhotos == null || (!isFullAlbum && photoCount <= req.coupon.maxPhotos);
    const usageNotExceeded = req.coupon.maxUses == null || req.coupon.usedCount < req.coupon.maxUses;
    if (req.coupon.isActive && usageNotExceeded && isNotExpired && isUnderMaxPhotos) {
      couponDiscountPercent = clamp(req.coupon.discountPercent);
      couponAppliedName = req.coupon.code;
    }
  }

  if (isFullAlbum) {
    let couponDiscount = 0;

    if (couponDiscountPercent > 0) {
      couponDiscount = Math.round(fullAlbumPrice * (couponDiscountPercent / 100));
      couponDiscount = Math.min(fullAlbumPrice, Math.max(0, couponDiscount));
    }
    const total = Math.max(0, fullAlbumPrice - couponDiscount);

    return {
      photoCount,
      unitPrice,
      subtotal: fullAlbumPrice,
      discount: couponDiscount,
      discountPercentage: couponDiscount > 0 ? couponDiscountPercent : 0,
      total,
      isFullAlbum: true,
      couponApplied: couponDiscount > 0 ? couponAppliedName : undefined
    };
  }

  const subtotal = Math.max(0, photoCount * unitPrice);
  let discountPercentage = 0;

  if (enableTierDiscounts) {
    if (photoCount >= 5) {
      discountPercentage = tier5DiscountPercent;
    } else if (photoCount >= 3) {
      discountPercentage = tier3DiscountPercent;
    }
  }

  let baseTotal = Math.max(0, subtotal - Math.round(subtotal * (discountPercentage / 100)));

  // Tope automático ANTES del cupón: comprar fotos sueltas nunca supera fullAlbumPrice ni anula el cupón
  if (capAtFullAlbumPrice && fullAlbumPrice > 0 && baseTotal > fullAlbumPrice) {
    baseTotal = fullAlbumPrice;
  }

  let couponDiscount = 0;
  if (couponDiscountPercent > 0) {
    couponDiscount = Math.round(baseTotal * (couponDiscountPercent / 100));
    couponDiscount = Math.min(baseTotal, Math.max(0, couponDiscount));
  }

  let total = Math.max(0, baseTotal - couponDiscount);
  let discount = Math.min(subtotal, Math.max(0, subtotal - total));
  total = Math.max(0, subtotal - discount);

  return {
    photoCount,
    unitPrice,
    subtotal,
    discount,
    discountPercentage,
    total,
    isFullAlbum: false,
    couponApplied: couponDiscount > 0 ? couponAppliedName : undefined
  };
}
