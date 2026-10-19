import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPrimaryFrontendUrl } from '../src/config/env';

describe('Environment Config - getPrimaryFrontendUrl', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  afterEach(() => {
    if (originalFrontendUrl !== undefined) {
      process.env.FRONTEND_URL = originalFrontendUrl;
    } else {
      delete process.env.FRONTEND_URL;
    }
  });

  it('debe retornar http://localhost:4200 por defecto si FRONTEND_URL no está definido', () => {
    delete process.env.FRONTEND_URL;
    expect(getPrimaryFrontendUrl()).toBe('http://localhost:4200');
  });

  it('debe retornar http://localhost:4200 si FRONTEND_URL está vacío o solo contiene espacios', () => {
    process.env.FRONTEND_URL = '   ';
    expect(getPrimaryFrontendUrl()).toBe('http://localhost:4200');
  });

  it('debe eliminar barras diagonales al final de una única URL', () => {
    process.env.FRONTEND_URL = 'https://latercerafotografia.com.ar///';
    expect(getPrimaryFrontendUrl()).toBe('https://latercerafotografia.com.ar');
  });

  it('debe extraer únicamente la primera URL limpia cuando hay múltiples orígenes separados por coma', () => {
    process.env.FRONTEND_URL = 'https://latercerafotografia.com.ar,http://localhost:4200,https://admin.latercera.com';
    expect(getPrimaryFrontendUrl()).toBe('https://latercerafotografia.com.ar');
  });

  it('debe manejar espacios y barras diagonales finales en listas de URLs separadas por coma', () => {
    process.env.FRONTEND_URL = '  https://latercerafotografia.com.ar/  ,  http://localhost:4200/ ';
    expect(getPrimaryFrontendUrl()).toBe('https://latercerafotografia.com.ar');
  });
});
