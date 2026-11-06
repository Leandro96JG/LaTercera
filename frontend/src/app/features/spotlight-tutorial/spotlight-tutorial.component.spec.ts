import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpotlightTutorialComponent } from './spotlight-tutorial.component';

describe('SpotlightTutorialComponent', () => {
  let component: SpotlightTutorialComponent;
  let fixture: ComponentFixture<SpotlightTutorialComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SpotlightTutorialComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SpotlightTutorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('no debe renderizar el diálogo cuando isOpen es false', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('debe renderizar el tutorial Bento Glassmorphism cuando isOpen es true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Modo Linterna');
    expect(fixture.nativeElement.textContent).toContain('¡Entendido, explorar fotos!');
  });

  it('debe emitir closeTutorial y persistir la clave en localStorage al presionar el botón de confirmación', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    let closed = false;
    component.closeTutorial.subscribe(() => {
      closed = true;
    });

    component.dismiss();

    expect(closed).toBe(true);
    expect(localStorage.getItem(SpotlightTutorialComponent.STORAGE_KEY)).toBe('true');
  });
});
