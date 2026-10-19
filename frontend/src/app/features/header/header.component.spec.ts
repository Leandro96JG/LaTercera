import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe renderizar el botón "Mis Compras" y emitir openRecoveryModal al hacer clic', () => {
    let emitted = false;
    component.openRecoveryModal.subscribe(() => {
      emitted = true;
    });

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const recoveryBtn = buttons.find(b => b.textContent?.includes('Mis Compras'));
    expect(recoveryBtn).toBeDefined();

    recoveryBtn?.click();
    expect(emitted).toBe(true);
  });

  it('debe emitir goHome al hacer clic en el logo principal', () => {
    let goHomeEmitted = false;
    component.goHome.subscribe(() => {
      goHomeEmitted = true;
    });

    const logoBtn = fixture.nativeElement.querySelector('header button');
    logoBtn?.click();

    expect(goHomeEmitted).toBe(true);
  });
});
