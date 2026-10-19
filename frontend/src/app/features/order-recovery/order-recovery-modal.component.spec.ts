import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { OrderRecoveryModalComponent } from './order-recovery-modal.component';
import { PaymentService } from '../../core/services/payment.service';
import { RecoverOrdersResponse } from '../../core/models/order.model';

describe('OrderRecoveryModalComponent', () => {
  let component: OrderRecoveryModalComponent;
  let fixture: ComponentFixture<OrderRecoveryModalComponent>;
  let paymentService: PaymentService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderRecoveryModalComponent],
      providers: [
        PaymentService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderRecoveryModalComponent);
    component = fixture.componentInstance;
    paymentService = TestBed.inject(PaymentService);
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('no debe renderizar el modal cuando isOpen es false', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('debe renderizar el modal cuando isOpen es true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Recuperar Mis Compras');
  });

  it('debe emitir el evento close al hacer clic en el botón de cerrar', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    const closeBtn = fixture.nativeElement.querySelector('button[aria-label="Cerrar modal de recuperación"]');
    closeBtn.click();

    expect(closed).toBe(true);
  });

  it('debe mostrar error si el email ingresado está vacío', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    component.emailInput = '   ';
    component.recoverOrders();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Por favor ingresa un correo electrónico');
  });

  it('debe invocar recoverOrdersByEmail y listar las órdenes encontradas', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const mockResponse: RecoverOrdersResponse = {
      success: true,
      orders: [
        {
          orderId: 'ord_rec_88',
          albumTitle: 'Superclásico Riojano',
          photoCount: 3,
          isFullAlbum: false,
          createdAt: new Date().toISOString(),
          downloadToken: 'tok_valid_test',
          redirectUrl: 'http://localhost:4200/pago-exitoso?token=tok_valid_test'
        }
      ]
    };

    vi.spyOn(paymentService, 'recoverOrdersByEmail').mockReturnValue(of(mockResponse));

    component.emailInput = 'lucas@gmail.com';
    component.recoverOrders();
    fixture.detectChanges();

    expect(paymentService.recoverOrdersByEmail).toHaveBeenCalledWith('lucas@gmail.com');
    expect(component.recoveredOrders().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Superclásico Riojano');
    expect(fixture.nativeElement.textContent).toContain('Descargar Fotos');

    const downloadLink = fixture.nativeElement.querySelector('a[href="http://localhost:4200/pago-exitoso?token=tok_valid_test"]');
    expect(downloadLink).not.toBeNull();
  });

  it('debe mostrar mensaje amigable si no se encontraron compras para ese correo', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const mockResponse: RecoverOrdersResponse = {
      success: false,
      message: 'No se encontraron compras vigentes asociadas a este correo en las últimas 72 horas.'
    };

    vi.spyOn(paymentService, 'recoverOrdersByEmail').mockReturnValue(of(mockResponse));

    component.emailInput = 'nadie@gmail.com';
    component.recoverOrders();
    fixture.detectChanges();

    expect(component.recoveredOrders().length).toBe(0);
    expect(component.errorMessage()).toContain('No se encontraron compras vigentes asociadas a este correo');
  });

  it('debe manejar errores de conexión con el backend', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    vi.spyOn(paymentService, 'recoverOrdersByEmail').mockReturnValue(
      throwError(() => ({ error: { message: 'Servicio no disponible temporalmente' } }))
    );

    component.emailInput = 'error@test.com';
    component.recoverOrders();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Servicio no disponible temporalmente');
  });

  it('debe invocar recoverOrdersByEmail con email y paymentId cuando paymentId es provisto', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const mockResponse: RecoverOrdersResponse = {
      success: true,
      orders: []
    };

    const spy = vi.spyOn(paymentService, 'recoverOrdersByEmail').mockReturnValue(of(mockResponse));

    component.emailInput = 'comprador@gmail.com';
    component.paymentIdInput = '  8945123456  ';
    component.recoverOrders();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('comprador@gmail.com', '8945123456');
  });
});
