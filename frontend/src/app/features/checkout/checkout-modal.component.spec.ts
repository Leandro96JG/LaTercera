import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CheckoutModalComponent } from './checkout-modal.component';
import { CartStore } from '../../core/state/cart.store';
import { PaymentService } from '../../core/services/payment.service';

describe('CheckoutModalComponent - Validaciones y Feedback de Cupones Zero-Trust', () => {
  let component: CheckoutModalComponent;
  let cartStore: CartStore;
  let mockPaymentService: {
    createPreference: ReturnType<typeof vi.fn>;
    validateCoupon: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    sessionStorage.clear();
    mockPaymentService = {
      createPreference: vi.fn(),
      validateCoupon: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutModalComponent],
      providers: [
        CartStore,
        { provide: PaymentService, useValue: mockPaymentService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(CheckoutModalComponent);
    component = fixture.componentInstance;
    cartStore = TestBed.inject(CartStore);
    cartStore.setAlbumPricing('album-1', 9500, 1200);
    fixture.detectChanges();
  });

  it('debe tener el formulario de checkout inicializado con placeholder sin spoiler', () => {
    expect(component.form.controls.email.value).toBe('');
    expect(component.form.controls.coupon.value).toBe('');
    expect(component.couponFeedback()).toBeNull();
  });

  it('debe validar un cupón válido mediante PaymentService y mostrar feedback exitoso', () => {
    mockPaymentService.validateCoupon.mockReturnValue(of({
      valid: true,
      code: 'FIESTA20',
      discountPercentage: 20,
      message: '¡Cupón aplicado!'
    }));

    component.form.controls.coupon.setValue('fiesta20');
    component.applyCoupon();

    expect(mockPaymentService.validateCoupon).toHaveBeenCalledWith('fiesta20', 'album-1', 0, false);
    expect(component.couponFeedback()?.success).toBe(true);
    expect(component.couponFeedback()?.message).toContain('20%');
    expect(cartStore.couponCode()).toBe('FIESTA20');
  });

  it('debe rechazar un cupón inválido y mostrar feedback de error en rojo', () => {
    mockPaymentService.validateCoupon.mockReturnValue(of({
      valid: false,
      message: 'Cupón inexistente o expirado'
    }));

    component.form.controls.coupon.setValue('INVALID99');
    component.applyCoupon();

    expect(mockPaymentService.validateCoupon).toHaveBeenCalledWith('INVALID99', 'album-1', 0, false);
    expect(component.couponFeedback()?.success).toBe(false);
    expect(component.couponFeedback()?.message).toContain('Cupón inexistente o expirado');
    expect(cartStore.couponCode()).toBeNull();
  });

  it('debe limpiar el cupón si se envía un código vacío', () => {
    cartStore.applyCoupon('YUYO10', 10);
    expect(cartStore.couponCode()).toBe('YUYO10');

    component.form.controls.coupon.setValue('');
    component.applyCoupon();

    expect(mockPaymentService.validateCoupon).not.toHaveBeenCalled();
    expect(cartStore.couponCode()).toBeNull();
    expect(component.couponFeedback()).toBeNull();
  });

  it('debe manejar errores de red defensivamente al validar un cupón', () => {
    mockPaymentService.validateCoupon.mockReturnValue(throwError(() => new Error('Network error')));

    component.form.controls.coupon.setValue('ERROR500');
    component.applyCoupon();

    expect(component.couponFeedback()?.success).toBe(false);
    expect(component.couponFeedback()?.message).toContain('Error al validar cupón');
  });

  it('debe procesar el canje gratuito directo sin Mercado Pago cuando createPreference retorna isFreeRedemption', () => {
    let closed = false;
    component.close.subscribe(() => { closed = true; });

    cartStore.applyCoupon('SORTEO100', 100);
    expect(cartStore.pricing().finalTotal).toBe(0);

    mockPaymentService.createPreference.mockReturnValue(of({
      success: true,
      isFreeRedemption: true,
      orderId: 'free-order-123',
      downloadToken: 'token-free-abc',
      redirectUrl: '/pago-exitoso?token=token-free-abc',
      totalAmount: 0
    }));

    component.form.controls.email.setValue('ganador@gmail.com');
    component.submitPayment();

    expect(closed).toBe(true);
    expect(cartStore.totalItemsCount()).toBe(0);
    expect(component.isSubmitting()).toBe(false);
  });
});
