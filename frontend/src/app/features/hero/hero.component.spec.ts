import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('debe mostrar la cabecera de la fotógrafa y el badge de disponibilidad en La Rioja con la bandera argentina', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Jenifer "Yuyo" Espeche');
    expect(compiled.textContent).toContain('Fotografía Deportiva y Social • La Tercera');
    expect(compiled.textContent).toContain('Disponible en La Rioja, Argentina 🇦🇷');

    const avatar = compiled.querySelector('img[alt*="Fotógrafa"]');
    expect(avatar).toBeTruthy();
  });

  it('debe mostrar el copy corregido con la tipografía intencional', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(
      'Transformando momentos efímeros en imágenes permanentes para que cada recuerdo sea inolvidable.'
    );
  });

  it('debe inicializar el rotador de texto dinámico con las disciplinas requeridas', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Buscá tus fotos de');
    expect(component.currentCategory()).toBe('Fútbol');

    // Cambiar categoría manualmente para verificar reactividad del Signal
    component.currentCategoryIndex.set(1);
    fixture.detectChanges();
    expect(component.currentCategory()).toBe('Básquet');

    component.currentCategoryIndex.set(4);
    fixture.detectChanges();
    expect(component.currentCategory()).toBe('Eventos Sociales');
  });

  it('debe incluir el CTA primario "Ver Galerías y Buscar mis Fotos" que activa scroll suave', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const ctaButton = compiled.querySelector('a[href="#catalogo-albumes"]') as HTMLAnchorElement;
    expect(ctaButton).toBeTruthy();
    expect(ctaButton.textContent).toContain('Ver Galerías y Buscar mis Fotos');

    // Simular clic en el CTA
    const scrollSpy = vi.fn();
    const mockElement = document.createElement('div');
    mockElement.id = 'catalogo-albumes';
    mockElement.scrollIntoView = scrollSpy;
    document.body.appendChild(mockElement);

    const event = new MouseEvent('click');
    const preventSpy = vi.spyOn(event, 'preventDefault');
    component.scrollToGalleries(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    mockElement.remove();
  });

  it('debe incluir los CTAs secundarios de Instagram y WhatsApp', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const instaLink = compiled.querySelector('a[href*="instagram.com"]') as HTMLAnchorElement;
    const waLink = compiled.querySelector('a[href*="wa.me"]') as HTMLAnchorElement;

    expect(instaLink).toBeTruthy();
    expect(instaLink.getAttribute('target')).toBe('_blank');

    expect(waLink).toBeTruthy();
    expect(waLink.getAttribute('target')).toBe('_blank');
  });

  it('debe renderizar el carrusel de muestras visuales con el badge flotante en vidrio esmerilado', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Últimas coberturas subidas');

    // Muestra 5 slides disponibles
    expect(component.slides().length).toBe(5);
    expect(component.currentSlideIndex()).toBe(0);

    // Cambiar slide manualmente
    component.goToSlide(2);
    fixture.detectChanges();
    expect(component.currentSlideIndex()).toBe(2);
    expect(component.activeSlide().title).toContain('Hockey Provincial');
  });

  it('debe optimizar LCP en la primera diapositiva con fetchpriority="high" y loading="eager"', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const images = compiled.querySelectorAll('img[alt*="Cancha"], img[alt*="Riojano"], img[alt*="Hockey"], img[alt*="Sociales"], img[alt*="Vóley"]');
    expect(images.length).toBeGreaterThan(0);
    const firstImg = images[0] as HTMLImageElement;
    expect(firstImg.getAttribute('fetchpriority')).toBe('high');
    expect(firstImg.getAttribute('loading')).toBe('eager');
  });

  it('debe priorizar álbumes con isHeroFeatured y emitir selectAlbum al hacer clic', () => {
    const mockAlbum1 = {
      id: 'alb-1',
      title: 'Torneo Apertura 2026',
      subtitle: 'Final Andino',
      category: 'futbol',
      date: '2026-05-10',
      photosCount: 40,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://images.unsplash.com/photo-custom-cover-1.jpg',
      badge: '⚽ Torneo Apertura',
      isPublished: true,
      isHeroFeatured: false
    };

    const mockAlbumHero = {
      id: 'alb-hero',
      title: 'Copa Ciudad de La Rioja',
      subtitle: 'Gran Final',
      category: 'basquet',
      date: '2026-05-12',
      photosCount: 65,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://images.unsplash.com/photo-custom-hero.jpg',
      badge: '🏀 Copa Ciudad',
      isPublished: true,
      isHeroFeatured: true
    };

    // Proveer álbumes al componente
    fixture.componentRef.setInput('albums', [mockAlbum1, mockAlbumHero]);
    fixture.detectChanges();

    // El primer slide debe ser el que tiene isHeroFeatured = true
    const currentSlides = component.slides();
    expect(currentSlides[0].title).toBe('Copa Ciudad de La Rioja');
    expect(currentSlides[0].url).toBe('https://images.unsplash.com/photo-custom-hero.jpg');
    expect(currentSlides[0].album?.id).toBe('alb-hero');

    // El segundo slide debe ser el álbum regular
    expect(currentSlides[1].title).toBe('Torneo Apertura 2026');

    // Verificar emisión de selectAlbum
    let emittedAlbum: any = null;
    component.selectAlbum.subscribe((alb: any) => {
      emittedAlbum = alb;
    });

    component.onSlideClick(currentSlides[0]);
    expect(emittedAlbum).toEqual(mockAlbumHero);
  });

  it('debe renderizar el bloque oscuro de coberturas con chips deportivos y sociales', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('¿Qué eventos cubro?');
    expect(compiled.textContent).toContain('Eventos deportivos y sociales');

    // Chips deportivos en Desktop
    expect(compiled.textContent).toContain('Fútbol');
    expect(compiled.textContent).toContain('Básquet');
    expect(compiled.textContent).toContain('Hockey');
    expect(compiled.textContent).toContain('Vóley');
    expect(compiled.textContent).toContain('+ Otras disciplinas');

    // Chips sociales en Desktop
    expect(compiled.textContent).toContain('Cumpleaños');
    expect(compiled.textContent).toContain('Comuniones');
    expect(compiled.textContent).toContain('Bautismos');
    expect(compiled.textContent).toContain('Egresos');
    expect(compiled.textContent).toContain('Casamientos');
    expect(compiled.textContent).toContain('+ Eventos privados');
  });

  it('debe permitir alternar tabs entre deportivos y sociales en la vista móvil', () => {
    expect(component.selectedCoverageTab()).toBe('deportivos');

    component.setCoverageTab('sociales');
    fixture.detectChanges();
    expect(component.selectedCoverageTab()).toBe('sociales');

    component.setCoverageTab('deportivos');
    fixture.detectChanges();
    expect(component.selectedCoverageTab()).toBe('deportivos');
  });

  it('debe incluir el botón para pedir presupuesto de evento a WhatsApp', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const budgetLinks = Array.from(compiled.querySelectorAll('a[href*="wa.me"]')) as HTMLAnchorElement[];
    const budgetLink = budgetLinks.find(link => link.textContent?.includes('Pedir presupuesto'));

    expect(budgetLink).toBeDefined();
    expect(budgetLink?.href).toContain('presupuesto');
  });
});
