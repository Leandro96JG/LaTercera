---
name: supabase-auth-ssr
description: >-
  Autenticación moderna en Supabase con Server-Side Rendering (SSR) y PKCE.
  Úsalo cuando el usuario necesite configurar inicio de sesión con correo/contraseña o OAuth,
  gestionar cookies HTTP-only, refrescar tokens JWT, o proteger rutas de servidor y cliente.
---

# Supabase Auth con SSR: Flujo PKCE y Manejo Seguro de Sesiones

Esta guía describe cómo implementar autenticación robusta con Supabase utilizando `@supabase/ssr`, cookies seguras y el flujo PKCE (*Proof Key for Code Exchange*).

---

## 1. Por qué Usar `@supabase/ssr` en Lugar de `localStorage`

En arquitecturas cliente-servidor o aplicaciones con API backend:
- `localStorage` es vulnerable a ataques de inyección de scripts (XSS).
- Las cookies `HttpOnly; Secure; SameSite=Lax` garantizan que los tokens JWT no puedan ser leídos por scripts de terceros y se envíen automáticamente al backend en cada petición.

---

## 2. Creación del Cliente Supabase SSR en Node.js / Express

```typescript
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { Request, Response } from 'express';

export function createExpressSupabaseClient(req: Request, res: Response) {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.cookie ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.append('Set-Cookie', serializeCookieHeader(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            }));
          });
        }
      }
    }
  );
}
```

---

## 3. Middleware de Protección de Rutas

Validar la identidad del usuario en el servidor antes de permitir el acceso a endpoints protegidos:

```typescript
import { Request, Response, NextFunction } from 'express';
import { createExpressSupabaseClient } from './supabase-ssr';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const supabase = createExpressSupabaseClient(req, res);
  
  // getUser() valida criptográficamente el token contra el servidor de Supabase
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return res.status(401).json({ error: 'Acceso no autorizado' });
  }

  // Inyectar usuario en la solicitud
  (req as any).user = user;
  next();
}
```

---

## 4. Prácticas de Seguridad en Producción

1. **Nunca Confiar en `getSession()` en el Servidor:** Usar siempre `auth.getUser()`, ya que `getSession()` solo lee los datos del token sin validar si ha sido revocado en Supabase.
2. **Rotación Automática:** `@supabase/ssr` gestiona automáticamente la renovación del `access_token` cuando expira, actualizando las cookies de respuesta sin fricción para el usuario.
