import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { PinUnlockModalComponent } from './pin-unlock-modal.component';
import { AlbumService } from '../../core/services/album.service';
import { AlbumAccessStore } from '../../core/state/album-access.store';
import { Album } from '../../core/models/album.model';

describe('PinUnlockModalComponent', () => {
  let component: PinUnlockModalComponent;
  let fixture: ComponentFixture<PinUnlockModalComponent>;
  let albumService: AlbumService;
  let accessStore: AlbumAccessStore;

  const mockAlbum: Album = {
    id: 'alb-123',
    title: 'Torneo Privado Sub-16',
    subtitle: 'Final Clausura',
    category: 'Fútbol',
    date: '2026-11-03',
    photosCount: 42,
    unitPrice: 1200,
    fullAlbumPrice: 8500,
    coverUrl: 'https://images.unsplash.com/photo-1.jpg',
    badge: 'Exclusivo',
    isPrivate: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PinUnlockModalComponent],
      providers: [
        AlbumService,
        AlbumAccessStore,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PinUnlockModalComponent);
    component = fixture.componentInstance;
    albumService = TestBed.inject(AlbumService);
    accessStore = TestBed.inject(AlbumAccessStore);
    accessStore.clearAll();

    fixture.componentRef.setInput('album', mockAlbum);
    fixture.componentRef.setInput('isOpen', false);
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('no debe mostrarse en el DOM si isOpen es false', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(modal).toBeNull();
  });

  it('debe renderizarse en el DOM con el título del álbum cuando isOpen es true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(modal).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Torneo Privado Sub-16');
    expect(fixture.nativeElement.textContent).toContain('Acceso privado protegido');
  });

  it('debe emitir el evento closed al hacer clic en el botón cerrar', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    let closedEmitted = false;
    component.closed.subscribe(() => {
      closedEmitted = true;
    });

    const closeBtn = fixture.nativeElement.querySelector('button[aria-label="Cerrar ventana de desbloqueo"]');
    expect(closeBtn).not.toBeNull();
    closeBtn.click();

    expect(closedEmitted).toBe(true);
  });

  it('no debe invocar verifyAccess si el PIN está vacío al enviar', () => {
    const spy = vi.spyOn(albumService, 'verifyAccess');
    component.pinInput.set('');

    component.submitPin();

    expect(spy).not.toHaveBeenCalled();
  });

  it('debe invocar verifyAccess y emitir unlocked cuando el PIN es válido', () => {
    vi.spyOn(albumService, 'verifyAccess').mockReturnValue(
      of({ success: true, valid: true, albumId: 'alb-123', accessToken: 'token-jwt-secure-123' })
    );

    let emittedPayload: { albumId: string; accessToken?: string } | null = null;
    component.unlocked.subscribe((val) => {
      emittedPayload = val;
    });

    component.pinInput.set('4321');
    component.submitPin();

    expect(albumService.verifyAccess).toHaveBeenCalledWith('alb-123', '4321');
    expect(accessStore.isUnlocked('alb-123')).toBe(true);
    expect(accessStore.getAccessToken('alb-123')).toBe('token-jwt-secure-123');
    expect(emittedPayload).toEqual({ albumId: 'alb-123', accessToken: 'token-jwt-secure-123' });
    expect(component.pinInput()).toBe('');
  });

  it('debe mostrar mensaje de error si el PIN no es válido', () => {
    vi.spyOn(albumService, 'verifyAccess').mockReturnValue(
      of({ success: false, valid: false, albumId: 'alb-123', message: 'Código de acceso incorrecto' })
    );

    component.pinInput.set('9999');
    component.submitPin();

    expect(component.errorMessage()).toBe('Código de acceso incorrecto');
    expect(accessStore.isUnlocked('alb-123')).toBe(false);
  });

  it('debe manejar error HTTP de backend mostrando mensaje claro', () => {
    vi.spyOn(albumService, 'verifyAccess').mockReturnValue(
      throwError(() => ({ error: { message: 'Servicio no disponible momentáneamente' } }))
    );

    component.pinInput.set('1111');
    component.submitPin();

    expect(component.errorMessage()).toBe('Servicio no disponible momentáneamente');
    expect(component.isLoading()).toBe(false);
  });
});
