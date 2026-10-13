export interface PricingRequest {
  photoCount: number;
  unitPrice?: number;
  fullAlbumPrice?: number;
  isFullAlbum?: boolean;
  couponCode?: string;
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

export function calculateCartTotal(req: PricingRequest): PricingResult {
  const unitPrice = req.unitPrice ?? DEFAULT_UNIT_PRICE;
  const fullAlbumPrice = req.fullAlbumPrice ?? DEFAULT_FULL_ALBUM_PRICE;
  const isFullAlbum = req.isFullAlbum ?? false;
  const photoCount = req.photoCount;

  if (isFullAlbum) {
    let total = fullAlbumPrice;
    let couponDiscount = 0;

    if (req.couponCode && req.couponCode.toUpperCase() === 'YUYO10') {
      couponDiscount = Math.round(total * 0.10);
      total -= couponDiscount;
    }

    return {
      photoCount,
      unitPrice,
      subtotal: fullAlbumPrice,
      discount: couponDiscount,
      discountPercentage: couponDiscount > 0 ? 10 : 0,
      total,
      isFullAlbum: true,
      couponApplied: couponDiscount > 0 ? 'YUYO10' : undefined
    };
  }

  const subtotal = photoCount * unitPrice;
  let discountPercentage = 0;

  if (photoCount >= 5) {
    discountPercentage = 30;
  } else if (photoCount >= 3) {
    discountPercentage = 20;
  }

  let discount = Math.round(subtotal * (discountPercentage / 100));
  let total = subtotal - discount;

  // Cupón adicional
  if (req.couponCode && req.couponCode.toUpperCase() === 'YUYO10') {
    const couponDiscount = Math.round(total * 0.10);
    discount += couponDiscount;
    total -= couponDiscount;
  }

  return {
    photoCount,
    unitPrice,
    subtotal,
    discount,
    discountPercentage,
    total,
    isFullAlbum: false,
    couponApplied: req.couponCode ? 'YUYO10' : undefined
  };
}
