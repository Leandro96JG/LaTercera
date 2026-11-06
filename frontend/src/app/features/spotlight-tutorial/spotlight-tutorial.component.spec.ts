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

  it('debe reportar hasSeenTutorial() correctamente según el estado de localStorage', () => {
    localStorage.clear();
    expect(SpotlightTutorialComponent.hasSeenTutorial()).toBe(false);

    localStorage.setItem(SpotlightTutorialComponent.STORAGE_KEY, 'true');
    expect(SpotlightTutorialComponent.hasSeenTutorial()).toBe(true);

    localStorage.setItem(SpotlightTutorialComponent.STORAGE_KEY, 'false');
    expect(SpotlightTutorialComponent.hasSeenTutorial()).toBe(false);
  });

  it('no debe renderizarse automáticamente cuando isOpen es true si ya fue visto previamente en localStorage', () => {
    localStorage.setItem(SpotlightTutorialComponent.STORAGE_KEY, 'true');

    fixture.componentRef.setInput('forceManualOpen', false);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(component.isDismissedInternally()).toBe(true);
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('debe forzar la apertura cuando forceManualOpen es true incluso si ya fue visto previamente', () => {
    localStorage.setItem(SpotlightTutorialComponent.STORAGE_KEY, 'true');

    fixture.componentRef.setInput('forceManualOpen', true);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(component.isDismissedInternally()).toBe(false);
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
  });

  it('debe persistir en localStorage inmediatamente tan pronto como se abre por primera vez', () => {
    localStorage.clear();
    expect(localStorage.getItem(SpotlightTutorialComponent.STORAGE_KEY)).toBeNull();

    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(localStorage.getItem(SpotlightTutorialComponent.STORAGE_KEY)).toBe('true');
  });
});
