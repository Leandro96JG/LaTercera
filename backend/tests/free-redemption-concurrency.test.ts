import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Server } from 'http';
import { app, orderService, albumRepository, promotionRepository, mpService } from '../src/index';

describe('Flujo de Canje Directo 100% OFF, Sorteos y Concurrencia', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Espiar Mercado Pago para verificar que NUNCA sea invocado en órdenes de $0
    vi.spyOn(mpService, 'createCheckoutPreference').mockImplementation(async (orderId: string) => {
      return {
        preferenceId: 'pref-mock-mp',
        initPoint: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-mock-mp',
        sandboxInitPoint: 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-mock-mp',
        orderId
      };
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('1. Validación de restricciones y límites de alcance de sorteos', () => {
    it('debe rechazar la creación de cupones con discountPercent > 100 o < 1', async () => {
      await expect(
        promotionRepository.createCoupon({
          code: 'OVER100',
          discountPercent: 120,
          isActive: true
        })
      ).rejects.toThrow('El porcentaje de descuento debe estar entre 1 y 100');

      await expect(
        promotionRepository.createCoupon({
          code: 'UNDER0',
          discountPercent: 0,
          isActive: true
        })
      ).rejects.toThrow('El porcentaje de descuento debe estar entre 1 y 100');
    });

    it('debe rechazar cupón si ha expirado en POST /api/pricing/validate-coupon', async () => {
      const expiredCode = `EXP_${Date.now()}`;
      await promotionRepository.createCoupon({
        code: expiredCode,
        discountPercent: 100,
        isActive: true,
        expiresAt: new Date(Date.now() - 3600000).toISOString() // Expiró hace 1 hora
      });

      const res = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: expiredCode,
          albumId: 'album-1',
          photoCount: 1,
          isFullAlbum: false
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.message).toBe('Este cupón ha expirado');
    });

    it('debe restringir cupón de sorteo limitado por maxPhotos si el usuario intenta llevar Álbum Completo', async () => {
      const giveawayCode = `SORTEO2FOTOS_${Date.now()}`;
      await promotionRepository.createCoupon({
        code: giveawayCode,
        discountPercent: 100,
        isActive: true,
        maxPhotos: 2,
        maxUses: 10
      });

      // Intento con álbum completo: debe rechazarse
      const resFull = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: giveawayCode,
          albumId: 'album-1',
          photoCount: 1,
          isFullAlbum: true
        })
      });

      const dataFull = await resFull.json();
      expect(dataFull.valid).toBe(false);
      expect(dataFull.message).toBe('Este cupón de sorteo es válido hasta 2 foto(s) individual(es)');

      // Intento con 3 fotos (supera maxPhotos: 2): debe rechazarse
      const res3Photos = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: giveawayCode,
          albumId: 'album-1',
          photoCount: 3,
          isFullAlbum: false
        })
      });

      const data3Photos = await res3Photos.json();
      expect(data3Photos.valid).toBe(false);
      expect(data3Photos.message).toBe('Este cupón de sorteo es válido hasta 2 foto(s) individual(es)');

      // Intento con 2 fotos (exacto): debe aceptarse
      const resOk = await fetch(`${baseUrl}/api/pricing/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: giveawayCode,
          albumId: 'album-1',
          photoCount: 2,
          isFullAlbum: false
        })
      });

      const dataOk = await resOk.json();
      expect(dataOk.valid).toBe(true);
      expect(dataOk.discountPercentage).toBe(100);
    });
  });

  describe('2. Canje Directo Gratuito (100% OFF) en Checkout Preference', () => {
    it('debe acreditar la orden como PAID y emitir downloadToken de 72h sin llamar a Mercado Pago cuando totalAmount === 0', async () => {
      const freeCouponCode = `FREE100_${Date.now()}`;
      await promotionRepository.createCoupon({
        code: freeCouponCode,
        discountPercent: 100,
        isActive: true,
        maxUses: 5
      });

      const mpSpy = vi.spyOn(mpService, 'createCheckoutPreference');
      mpSpy.mockClear();

      const res = await fetch(`${baseUrl}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: 'album-1',
          photoIds: ['p-free-1', 'p-free-2'],
          isFullAlbum: false,
          couponCode: freeCouponCode,
          customer: {
            email: 'ganador.sorteo@latercera.com.ar',
            name: 'Ganador Sorteo Instagram'
          }
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.isFreeRedemption).toBe(true);
      expect(data.totalAmount).toBe(0);
      expect(data.orderId).toBeDefined();
      expect(data.downloadToken).toBeDefined();
      expect(data.redirectUrl).toContain(`/pago-exitoso?token=${data.downloadToken}`);

      // Mercado Pago NO debe haber sido contactado
      expect(mpSpy).not.toHaveBeenCalled();

      // Verificar que la orden en el sistema esté efectivamente en estado PAID
      const savedOrder = await orderService.getOrderAsync(data.orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder?.status).toBe('PAID');
      expect(savedOrder?.paymentId).toBe(`FREE_COUPON_${freeCouponCode}`);
      expect(savedOrder?.downloadToken).toBe(data.downloadToken);

      // Verificar que el usedCount del cupón se incrementó
      const updatedCoupon = await promotionRepository.getCouponByCode(freeCouponCode);
      expect(updatedCoupon?.usedCount).toBe(1);
    });
  });

  describe('3. Prueba de Concurrencia Estricta (Anti Race-Condition en maxUses)', () => {
    it('debe permitir solo 1 canje exitoso y rechazar 4 en 5 peticiones simultáneas para un cupón con maxUses: 1', async () => {
      const singleUseCode = `RACE_1USE_${Date.now()}`;
      await promotionRepository.createCoupon({
        code: singleUseCode,
        discountPercent: 100,
        isActive: true,
        maxUses: 1
      });

      // Disparar 5 peticiones simultáneas mediante Promise.all
      const requests = Array.from({ length: 5 }, (_, i) =>
        fetch(`${baseUrl}/api/checkout/preference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            albumId: 'album-1',
            photoIds: [`photo-race-${i}`],
            isFullAlbum: false,
            couponCode: singleUseCode,
            customer: { email: `concurrente_${i}@test.com` }
          })
        })
      );

      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map(async r => ({ status: r.status, body: await r.json() })));

      const successRedemptions = results.filter(r => r.status === 201 && r.body.isFreeRedemption);
      const rejectedRedemptions = results.filter(r => r.status === 400 || (r.body.error && r.body.error.includes('límite')));

      expect(successRedemptions.length).toBe(1);
      expect(rejectedRedemptions.length).toBe(4);

      // Verificar que el cupón quedó con usedCount exacto de 1
      const couponAfter = await promotionRepository.getCouponByCode(singleUseCode);
      expect(couponAfter?.usedCount).toBe(1);
    });
  });
});
