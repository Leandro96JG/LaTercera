import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeroComponent } from './hero.component';

describe('HeroComponent', () => {
  let component: HeroComponent;
  let fixture: ComponentFixture<HeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar el nombre de la fotógrafa Jenifer "Yuyo" Espeche y su disponibilidad', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Jenifer "Yuyo" Espeche');
    expect(compiled.textContent).toContain('Disponible para coberturas');
  });

  it('debe incluir enlace directo a WhatsApp para presupuesto con mensaje preconfigurado', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const whatsappLinks = Array.from(compiled.querySelectorAll('a[href*="wa.me"]')) as HTMLAnchorElement[];
    expect(whatsappLinks.length).toBeGreaterThanOrEqual(1);

    const ctaBudget = whatsappLinks.find(link => link.href.includes('presupuesto') || link.href.includes('cobertura'));
    expect(ctaBudget).toBeDefined();
    expect(ctaBudget?.getAttribute('target')).toBe('_blank');
    expect(ctaBudget?.getAttribute('rel')).toContain('noopener');
  });

  it('debe renderizar las 4 disciplinas de cobertura deportiva y social', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Fútbol');
    expect(compiled.textContent).toContain('Hockey');
    expect(compiled.textContent).toContain('Cumpleaños');
    expect(compiled.textContent).toContain('Premiaciones');
  });
});
