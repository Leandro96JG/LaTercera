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
    sessionStorage.clear();
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

    // 9 fotos (9 * 1200 = 10800 - 30% desc = 7560) -> 7560 >= 9500 * 0.75 (7125) -> Recomienda
    for (let i = 2; i <= 9; i++) {
      store.togglePhoto(createDummyPhoto(`foto-${i}`, 'album-1'));
    }
    expect(store.shouldRecommendFullAlbum()).toBe(true);

    // Al cambiar al pack completo, deja de recomendar porque ya está en modo pack
    store.switchToFullAlbum();
    expect(store.isFullAlbum()).toBe(true);
    expect(store.shouldRecommendFullAlbum()).toBe(false);
    expect(store.pricing().finalTotal).toBe(9500);
  });

  it('debe aplicar tope automático de fullAlbumPrice cuando las fotos sueltas superan el precio del álbum completo', () => {
    store.setAlbumPricing('album-1', 9500, 1200);
    // 15 fotos sueltas = 15 * 1200 = 18000. Con 30% desc = 12600 > 9500.
    for (let i = 1; i <= 15; i++) {
      store.togglePhoto(createDummyPhoto(`foto-cap-${i}`, 'album-1'));
    }
    const p = store.pricing();
    expect(p.rawSubtotal).toBe(18000);
    expect(p.finalTotal).toBe(9500);
    expect(p.totalDiscount).toBe(8500);
  });

  it('debe aplicar cupones con porcentaje dinámico en CartStore', () => {
    store.setAlbumPricing('album-1', 9500, 1000);
    store.togglePhoto(createDummyPhoto('foto-promo-1', 'album-1'));
    store.togglePhoto(createDummyPhoto('foto-promo-2', 'album-1'));
    // 2 fotos = 2000
    store.applyCoupon('FIESTA20', 20);

    const p = store.pricing();
    expect(p.couponCode).toBe('FIESTA20');
    expect(p.couponDiscountAmount).toBe(400); // 20% de 2000
    expect(p.finalTotal).toBe(1600);
  });

  it('debe persistir el estado del carrito en sessionStorage al seleccionar fotos', () => {
    store.setAlbumPricing('album-1', 9500, 1200);
    store.togglePhoto(createDummyPhoto('foto-100', 'album-1'));
    store.applyCoupon('YUYO10');

    const storedRaw = sessionStorage.getItem(CartStore.STORAGE_KEY);
    expect(storedRaw).toBeTruthy();
    const stored = JSON.parse(storedRaw!);
    expect(stored.activeAlbumId).toBe('album-1');
    expect(stored.selectedPhotos.length).toBe(1);
    expect(stored.selectedPhotos[0].id).toBe('foto-100');
    expect(stored.couponCode).toBe('YUYO10');
  });

  it('debe hidratar el carrito desde sessionStorage al instanciarse', () => {
    const savedState = {
      selectedPhotos: [createDummyPhoto('foto-hydrated-1', 'album-session')],
      activeAlbumId: 'album-session',
      isFullAlbum: false,
      unitPrice: 1500,
      fullAlbumPrice: 12000,
      couponCode: 'TESTCODE',
      customer: { email: 'test@example.com', name: 'Juan', phone: '123456' }
    };
    sessionStorage.setItem(CartStore.STORAGE_KEY, JSON.stringify(savedState));

    const newStore = new CartStore();
    expect(newStore.activeAlbumId()).toBe('album-session');
    expect(newStore.totalItemsCount()).toBe(1);
    expect(newStore.isPhotoSelected('foto-hydrated-1')).toBe(true);
    expect(newStore.unitPrice()).toBe(1500);
    expect(newStore.fullAlbumPrice()).toBe(12000);
    expect(newStore.couponCode()).toBe('TESTCODE');
    expect(newStore.customer().email).toBe('test@example.com');
  });

  it('debe actualizar los cálculos reactivamente al cambiar la configuración con setTierConfig', () => {
    store.setAlbumPricing('album-1', 9500, 1000);
    store.togglePhoto(createDummyPhoto('foto-1'));
    store.togglePhoto(createDummyPhoto('foto-2'));
    store.togglePhoto(createDummyPhoto('foto-3')); // 3 fotos = subtotal $3.000

    // Configuración por defecto: 20% en 3 fotos -> $600 de descuento -> total $2.400
    expect(store.pricing().baseDiscountPercentage).toBe(20);
    expect(store.pricing().finalTotal).toBe(2400);

    // Actualizar configuración desde Dashboard a 40% en 3 fotos
    store.setTierConfig({
      enableTierDiscounts: true,
      tier3DiscountPercent: 40,
      tier5DiscountPercent: 50,
      capAtFullAlbumPrice: true
    });

    // Debe recalcular reactivamente a 40% -> $1.200 de descuento -> total $1.800
    expect(store.pricing().baseDiscountPercentage).toBe(40);
    expect(store.pricing().baseDiscountAmount).toBe(1200);
    expect(store.pricing().finalTotal).toBe(1800);
  });

  it('debe calcular finalTotal = 0 cuando se aplica un cupón de sorteo del 100%', () => {
    store.setAlbumPricing('album-1', 9500, 1200);
    store.togglePhoto(createDummyPhoto('foto-sorteo-1'));
    store.applyCoupon('SORTEO100', 100);

    const p = store.pricing();
    expect(p.rawSubtotal).toBe(1200);
    expect(p.totalDiscount).toBe(1200);
    expect(p.finalTotal).toBe(0);
    expect(p.couponCode).toBe('SORTEO100');
  });

  it('debe persistir e hidratar el cupón de sorteo del 100% (couponDiscountPercent) manteniendo finalTotal = 0 tras recargar', () => {
    store.setAlbumPricing('album-1', 9500, 1500);
    store.togglePhoto(createDummyPhoto('foto-sorteo', 'album-1'));
    store.applyCoupon('SORTEO100', 100);

    expect(store.pricing().finalTotal).toBe(0);
    expect(store.pricing().couponDiscountAmount).toBe(1500);

    // Persistir y verificar estado en sessionStorage
    store.persistToSession();
    const storedRaw = sessionStorage.getItem(CartStore.STORAGE_KEY);
    expect(storedRaw).toBeTruthy();
    const stored = JSON.parse(storedRaw!);
    expect(stored.couponCode).toBe('SORTEO100');
    expect(stored.couponDiscountPercent).toBe(100);

    // Hidratar en una nueva instancia del store
    const rehydratedStore = new CartStore();
    expect(rehydratedStore.couponCode()).toBe('SORTEO100');
    expect(rehydratedStore.couponDiscountPercent()).toBe(100);
    expect(rehydratedStore.pricing().finalTotal).toBe(0);
  });

  it('debe deseleccionar el modo de álbum completo con removeFullAlbum sin perder las fotos seleccionadas', () => {
    store.setAlbumPricing('album-1', 9500, 1200);
    store.togglePhoto(createDummyPhoto('foto-1', 'album-1'));
    store.setFullAlbumMode('album-1', 9500);

    expect(store.isFullAlbum()).toBe(true);
    expect(store.totalItemsCount()).toBe(1);

    store.removeFullAlbum();

    expect(store.isFullAlbum()).toBe(false);
    expect(store.hasItems()).toBe(true);
    expect(store.totalItemsCount()).toBe(1); // vuelve a la foto que tenía
    expect(store.isPhotoSelected('foto-1')).toBe(true);
  });
});

