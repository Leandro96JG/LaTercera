import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { environment, resolveApiUrl } from './environment';

describe('Environment Configuration Suite', () => {
  const originalEnv = window.__ENV__;

  beforeEach(() => {
    delete window.__ENV__;
  });

  afterEach(() => {
    if (originalEnv) {
      window.__ENV__ = originalEnv;
    } else {
      delete window.__ENV__;
    }
  });

  describe('resolveApiUrl Helper', () => {
    it('debe retornar el fallback especificado cuando la URL no está definida', () => {
      expect(resolveApiUrl(undefined, '/api')).toBe('/api');
      expect(resolveApiUrl(undefined, 'http://localhost:4000/api')).toBe('http://localhost:4000/api');
    });

    it('debe retornar el fallback si la URL es una cadena vacía o solo espacios en blanco', () => {
      expect(resolveApiUrl('', '/api')).toBe('/api');
      expect(resolveApiUrl('   ', '/api')).toBe('/api');
    });

    it('debe priorizar la URL personalizada cuando está presente', () => {
      expect(resolveApiUrl('https://api.latercerafotografia.com.ar/api', '/api'))
        .toBe('https://api.latercerafotografia.com.ar/api');
    });

    it('debe sanitizar espacios en blanco y barras diagonales finales', () => {
      expect(resolveApiUrl('  https://backend-production-latercera.up.railway.app/api///  ', '/api'))
        .toBe('https://backend-production-latercera.up.railway.app/api');
    });
  });

  describe('Acceso Reactivo a environment.apiUrl en Runtime', () => {
    it('debe priorizar dinámicamente window.__ENV__.API_URL cuando está presente', () => {
      window.__ENV__ = {
        API_URL: 'https://backend-production-latercera.up.railway.app/api'
      };
      expect(environment.apiUrl).toBe('https://backend-production-latercera.up.railway.app/api');
    });

    it('debe limpiar barras diagonales finales de window.__ENV__.API_URL dinámicamente', () => {
      window.__ENV__ = {
        API_URL: 'https://api.latercera.com/api/'
      };
      expect(environment.apiUrl).toBe('https://api.latercera.com/api');
    });

    it('debe recurrir al fallback configurado si window.__ENV__.API_URL no está definido', () => {
      delete window.__ENV__;
      expect(environment.apiUrl).toBeDefined();
      expect(typeof environment.apiUrl).toBe('string');
      expect(environment.apiUrl.length).toBeGreaterThan(0);
    });
  });
});
