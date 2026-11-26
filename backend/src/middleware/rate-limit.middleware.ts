import rateLimit from 'express-rate-limit';

const isTesting = (): boolean =>
  process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

/**
 * Limitador para intentos de inicio de sesión administrativo
 * Máximo 5 intentos cada 15 minutos por IP
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Por favor intente nuevamente en 15 minutos.'
  },
  skip: () => isTesting()
});

/**
 * Limitador para verificación de código de acceso a álbumes privados
 * Máximo 10 intentos cada 10 minutos por IP
 */
export const albumAccessLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    valid: false,
    error: 'Demasiados intentos de verificación de código de acceso. Por favor espere 10 minutos.'
  },
  skip: () => isTesting()
});

/**
 * Limitador para validación y canje de cupones de descuento
 * Máximo 15 intentos cada 10 minutos por IP
 */
export const couponValidationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    valid: false,
    message: 'Demasiadas consultas de cupones de descuento. Por favor intente en unos minutos.'
  },
  skip: () => isTesting()
});

/**
 * Limitador para recuperación de órdenes pagadas por correo
 * Máximo 10 consultas cada 10 minutos por IP
 */
export const orderRecoveryLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de recuperación de órdenes. Por favor intente nuevamente en 10 minutos.'
  },
  skip: () => isTesting()
});

/**
 * Limitador para creación de preferencias de pago
 * Máximo 20 intentos cada 10 minutos por IP
 */
export const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes de checkout. Por favor espere unos minutos antes de reintentar.'
  },
  skip: () => isTesting()
});

/**
 * Limitador para cálculo de precios y enumeración de cupones
 * Máximo 40 consultas cada 5 minutos por IP
 */
export const pricingCalculateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiadas consultas de cálculo de precios. Por favor intente en unos minutos.'
  },
  skip: () => isTesting()
});

/**
 * Limitador para endpoints de descarga y generación de ZIPs
 * Máximo 60 peticiones cada 10 minutos por IP
 */
export const downloadsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes de descarga. Por favor espere unos minutos.'
  },
  skip: () => isTesting()
});

