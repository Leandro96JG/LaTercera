import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CartStore } from './cart.store';
import { Photo } from '../models/photo.model';

describe('CartStore - Lógica Reactiva de Precios y Descuentos con Signals', () => {
  let store: CartStore;

  const createDummyPhoto = (id: string, albumId = 'album-tesorieri'): Photo => ({
    id,
    albumId,
    title: `Foto ${id}`,
    previewUrl: `https://example.com/p/${id}.webp`,
    originalWidth: 4000,
    originalHeight: 3000,
    isSampleHD: false
  });

  beforeEach(() => {
    store = new CartStore();
  });

  it('debe iniciar vacío con total 0 y sin fotos', () => {
    expect(store.hasItems()).toBe(false);
    expect(store.totalItemsCount()).toBe(0);
    expect(store.pricing().finalTotal).toBe(0);
    expect(store.pricing().baseDiscountPercentage).toBe(0);
  });

  it('debe calcular 1 foto = $1.200 sin descuento', () => {
    store.togglePhoto(createDummyPhoto('foto-1'));

    const p = store.pricing();
    expect(p.photoCount).toBe(1);
    expect(p.rawSubtotal).toBe(1200);
    expect(p.baseDiscountPercentage).toBe(0);
    expect(p.baseDiscountAmount).toBe(0);
    expect(p.finalTotal).toBe(1200);
  });

  it('debe calcular 2 fotos = $2.400 sin descuento', () => {
    store.togglePhoto(createDummyPhoto('foto-1'));
    store.togglePhoto(createDummyPhoto('foto-2'));

    const p = store.pricing();
    expect(p.photoCount).toBe(2);
    expect(p.rawSubtotal).toBe(2400);
    expect(p.baseDiscountPercentage).toBe(0);
    expect(p.finalTotal).toBe(2400);
  });

  it('debe aplicar 20% de descuento a partir de 3 fotos (3 fotos = $2.880)', () => {
    store.togglePhoto(createDummyPhoto('foto-1'));
    store.togglePhoto(createDummyPhoto('foto-2'));
    store.togglePhoto(createDummyPhoto('foto-3'));

    const p = store.pricing();
    expect(p.photoCount).toBe(3);
    expect(p.rawSubtotal).toBe(3600);
    expect(p.baseDiscountPercentage).toBe(20);
    expect(p.baseDiscountAmount).toBe(720); // 3600 * 0.20
    expect(p.finalTotal).toBe(2880);
  });

  it('debe aplicar 30% de descuento a partir de 5 fotos (5 fotos = $4.200)', () => {
    for (let i = 1; i <= 5; i++) {
      store.togglePhoto(createDummyPhoto(`foto-${i}`));
    }

    const p = store.pricing();
    expect(p.photoCount).toBe(5);
    expect(p.rawSubtotal).toBe(6000);
    expect(p.baseDiscountPercentage).toBe(30);
    expect(p.baseDiscountAmount).toBe(1800); // 6000 * 0.30
    expect(p.finalTotal).toBe(4200);
  });

  it('debe aplicar cupón YUYO10 con 10% adicional acumulativo sobre el total descontado', () => {
    for (let i = 1; i <= 5; i++) {
      store.togglePhoto(createDummyPhoto(`foto-${i}`));
    }
    store.applyCoupon('YUYO10');

    const p = store.pricing();
    // 6000 - 30% (1800) = 4200
    // 4200 - 10% de cupón (420) = 3780
    expect(p.rawSubtotal).toBe(6000);
    expect(p.baseDiscountAmount).toBe(1800);
    expect(p.couponDiscountAmount).toBe(420);
    expect(p.totalDiscount).toBe(2220);
    expect(p.finalTotal).toBe(3780);
    expect(p.couponCode).toBe('YUYO10');
  });

  it('debe calcular tarifa fija de $9.500 para Álbum Completo', () => {
    store.setFullAlbumMode('album-tesorieri', 9500);

    const p = store.pricing();
    expect(p.isFullAlbum).toBe(true);
    expect(p.rawSubtotal).toBe(9500);
    expect(p.finalTotal).toBe(9500);
  });

  it('debe aplicar cupón YUYO10 al Álbum Completo ($9.500 - 10% = $8.550)', () => {
    store.setFullAlbumMode('album-tesorieri', 9500);
    store.applyCoupon('YUYO10');

    const p = store.pricing();
    expect(p.isFullAlbum).toBe(true);
    expect(p.couponDiscountAmount).toBe(950);
    expect(p.finalTotal).toBe(8550);
  });

  it('debe alternar (toggle) fotos correctamente y limpiar carrito', () => {
    const foto = createDummyPhoto('foto-1');
    store.togglePhoto(foto);
    expect(store.isPhotoSelected('foto-1')).toBe(true);

    store.togglePhoto(foto);
    expect(store.isPhotoSelected('foto-1')).toBe(false);
    expect(store.hasItems()).toBe(false);

    store.togglePhoto(foto);
    store.clearCart();
    expect(store.hasItems()).toBe(false);
    expect(store.pricing().finalTotal).toBe(0);
  });

  it('debe permitir remover fotos individualmente con removePhoto', () => {
    store.togglePhoto(createDummyPhoto('foto-1'));
    store.togglePhoto(createDummyPhoto('foto-2'));
    expect(store.totalItemsCount()).toBe(2);

    store.removePhoto('foto-1');
    expect(store.totalItemsCount()).toBe(1);
    expect(store.isPhotoSelected('foto-1')).toBe(false);
    expect(store.isPhotoSelected('foto-2')).toBe(true);

    store.removePhoto('foto-2');
    expect(store.hasItems()).toBe(false);
  });

  it('debe soportar precios dinámicos por álbum con setAlbumPricing', () => {
    store.setAlbumPricing('album-custom', 15000, 2000);
    store.togglePhoto(createDummyPhoto('foto-custom', 'album-custom'));

    const p = store.pricing();
    expect(p.unitPrice).toBe(2000);
    expect(p.finalTotal).toBe(2000);

    store.setFullAlbumMode('album-custom', 15000, 2000);
    const pFull = store.pricing();
    expect(pFull.rawSubtotal).toBe(15000);
    expect(pFull.finalTotal).toBe(15000);
  });

  it('debe recomendar automáticamente el Pack Completo cuando el subtotal individual se acerca o supera el pack', () => {
    // Configurar álbum con unitPrice: 1200, fullAlbumPrice: 9500
    store.setAlbumPricing('album-1', 9500, 1200);

    // 1 foto ($1.200) -> No recomienda
    store.togglePhoto(createDummyPhoto('foto-1', 'album-1'));
    expect(store.shouldRecommendFullAlbum()).toBe(false);

    // 7 fotos (7 * 1200 = 8400 - 15% desc = 7140) -> 8400 >= 9500 * 0.8 (7600) -> Recomienda
    for (let i = 2; i <= 7; i++) {
      store.togglePhoto(createDummyPhoto(`foto-${i}`, 'album-1'));
    }
    expect(store.shouldRecommendFullAlbum()).toBe(true);

    // Al cambiar al pack completo, deja de recomendar porque ya está en modo pack
    store.switchToFullAlbum();
    expect(store.isFullAlbum()).toBe(true);
    expect(store.shouldRecommendFullAlbum()).toBe(false);
    expect(store.pricing().finalTotal).toBe(9500);
  });
});
