import { describe, it, expect } from 'vitest';
import { calculateCartTotal } from '../src/services/pricing.service';

describe('Pricing Service - Cálculo de Precios y Packs', () => {
  const UNIT_PRICE = 1200;
  const FULL_ALBUM_PRICE = 9500;

  it('debe calcular correctamente 1 foto individual sin descuento', () => {
    const result = calculateCartTotal({
      photoCount: 1,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: false
    });

    expect(result.subtotal).toBe(1200);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(1200);
  });

  it('debe aplicar 20% de descuento automático en pack de 3 fotos', () => {
    const result = calculateCartTotal({
      photoCount: 3,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: false
    });

    // 3 * 1200 = 3600 -> 20% desc = 720 -> total = 2880
    expect(result.subtotal).toBe(3600);
    expect(result.discount).toBe(720);
    expect(result.total).toBe(2880);
    expect(result.discountPercentage).toBe(20);
  });

  it('debe aplicar 30% de descuento automático en pack de 5 o más fotos', () => {
    const result = calculateCartTotal({
      photoCount: 5,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: false
    });

    // 5 * 1200 = 6000 -> 30% desc = 1800 -> total = 4200
    expect(result.subtotal).toBe(6000);
    expect(result.discount).toBe(1800);
    expect(result.total).toBe(4200);
    expect(result.discountPercentage).toBe(30);
  });

  it('debe cobrar el precio del álbum completo cuando se compra el paquete entero', () => {
    const result = calculateCartTotal({
      photoCount: 48,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: true
    });

    expect(result.total).toBe(9500);
    expect(result.isFullAlbum).toBe(true);
  });

  it('debe aplicar cupón validado desde repositorio sobre el total', () => {
    const result = calculateCartTotal({
      photoCount: 1,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: false,
      couponCode: 'YUYO10',
      coupon: {
        code: 'YUYO10',
        discountPercent: 10,
        isActive: true,
        usedCount: 0
      }
    });

    // 1200 - 10% = 1080
    expect(result.total).toBe(1080);
    expect(result.discount).toBe(120);
    expect(result.couponApplied).toBe('YUYO10');
  });

  it('debe aplicar el tope fullAlbumPrice ANTES del cupón para no anular ni desperdiciar el cupón', () => {
    const result = calculateCartTotal({
      photoCount: 15, // 15 * 1200 = 18000 -> -30% = 12600 -> cap a 9500 -> -10% cupón = 8550
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: false,
      couponCode: 'YUYO10',
      coupon: {
        code: 'YUYO10',
        discountPercent: 10,
        isActive: true,
        usedCount: 0
      }
    });

    expect(result.total).toBe(8550);
    expect(result.couponApplied).toBe('YUYO10');
  });

  it('NO debe aplicar cupón YUYO10 si req.coupon es null o undefined (cero fallbacks hardcodeados)', () => {
    const result = calculateCartTotal({
      photoCount: 1,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: false,
      couponCode: 'YUYO10',
      coupon: null
    });

    const resultUndefined = calculateCartTotal({
      photoCount: 1,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: false,
      couponCode: 'YUYO10'
    });

    // 1200 sin descuento en ambos casos
    expect(result.total).toBe(1200);
    expect(result.discount).toBe(0);
    expect(result.couponApplied).toBeUndefined();
    expect(resultUndefined.total).toBe(1200);
    expect(resultUndefined.couponApplied).toBeUndefined();
  });
});
