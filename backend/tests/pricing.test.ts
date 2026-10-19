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

  it('debe aplicar cupón de descuento adicional sobre el total si coupon es undefined (retrocompatibilidad)', () => {
    const result = calculateCartTotal({
      photoCount: 1,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: false,
      couponCode: 'YUYO10'
    });

    // 1200 - 10% = 1080
    expect(result.total).toBe(1080);
    expect(result.discount).toBe(120);
    expect(result.couponApplied).toBe('YUYO10');
  });

  it('NO debe aplicar cupón YUYO10 si req.coupon es null (fue buscado en repositorio y no existe o está inactivo)', () => {
    const result = calculateCartTotal({
      photoCount: 1,
      unitPrice: UNIT_PRICE,
      fullAlbumPrice: FULL_ALBUM_PRICE,
      isFullAlbum: false,
      couponCode: 'YUYO10',
      coupon: null
    });

    // 1200 sin descuento
    expect(result.total).toBe(1200);
    expect(result.discount).toBe(0);
    expect(result.couponApplied).toBeUndefined();
  });
});
