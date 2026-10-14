export interface PricingBreakdown {
  readonly photoCount: number;
  readonly unitPrice: number;
  readonly rawSubtotal: number;
  readonly baseDiscountPercentage: number;
  readonly baseDiscountAmount: number;
  readonly couponCode: string | null;
  readonly couponDiscountAmount: number;
  readonly totalDiscount: number;
  readonly finalTotal: number;
  readonly isFullAlbum: boolean;
}

export const PRICING_CONFIG = {
  DEFAULT_UNIT_PRICE: 1200,
  DEFAULT_FULL_ALBUM_PRICE: 9500,
  TIER_3_PHOTOS_DISCOUNT: 0.20, // 20%
  TIER_5_PHOTOS_DISCOUNT: 0.30, // 30%
  COUPON_YUYO10_DISCOUNT: 0.10  // 10%
} as const;
