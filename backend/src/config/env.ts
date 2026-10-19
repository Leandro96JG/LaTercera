/**
 * Configuración y utilitarios para variables de entorno del Backend.
 */

/**
 * Obtiene la URL primaria del frontend para redirecciones, links de descarga y emails transaccionales.
 * Limpia espacios, elimina barras diagonales finales y selecciona exclusivamente el primer origen
 * cuando FRONTEND_URL contiene múltiples dominios separados por coma (ej. CORS multi-origen).
 */
export function getPrimaryFrontendUrl(): string {
  const rawUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  const cleanUrl = rawUrl.split(',')[0].trim().replace(/\/+$/, '');
  return cleanUrl || 'http://localhost:4200';
}
