---
name: supabase-rls-security
description: >-
  Auditoría, diseño y endurecimiento de políticas Row Level Security (RLS) en Supabase.
  Úsalo cuando el usuario solicite asegurar tablas, crear políticas de lectura/escritura (SELECT, INSERT, UPDATE, DELETE),
  proteger datos sensibles, configurar vistas públicas seguras o auditar riesgos de filtración de información.
---

# Supabase Row Level Security (RLS): Seguridad, Auditoría y Buenas Prácticas

Esta guía detalla los principios, patrones y procedimientos para implementar y auditar políticas Row Level Security (RLS) en PostgreSQL sobre Supabase.

---

## 1. Principio Fundamental de Aislamiento

Por defecto en PostgreSQL, cuando RLS está habilitado en una tabla y no existe ninguna política definida, **nadie (excepto superusuarios y roles con bypass como `service_role`) puede leer ni escribir datos**.

### Activación Obligatoria:
```sql
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
```

---

## 2. Patrones de Políticas RLS Comunes

### A. Acceso Público de Solo Lectura con Filtro de Estado
Permitir que cualquier visitante (rol `anon` o `authenticated`) consulte registros publicados:
```sql
CREATE POLICY "Public Read Published Albums"
    ON public.albums
    FOR SELECT
    TO anon, authenticated
    USING (is_published = true);
```

### B. Control Administrativo Basado en Roles / Tokens
Permitir a los administradores o fotógrafos autenticados gestionar sus propios registros:
```sql
CREATE POLICY "Photographer Manage Own Albums"
    ON public.albums
    FOR ALL
    TO authenticated
    USING (
        auth.uid()::text = photographer_id 
        OR (auth.jwt() ->> 'role') = 'admin'
    )
    WITH CHECK (
        auth.uid()::text = photographer_id 
        OR (auth.jwt() ->> 'role') = 'admin'
    );
```

### C. Zero-Trust en Tablas Transaccionales y de Pagos
Tablas como `orders` y `order_items` contienen emails, teléfonos, montos e información sensible:
- **Regla:** Bloquear completamente el acceso directo al rol `anon`.
- Las consultas y creaciones se delegan al servidor backend mediante `service_role` o endpoints protegidos con token de descarga firmado.
```sql
-- Denegar explícitamente lectura anónima directa
DROP POLICY IF EXISTS "Deny Public Read Orders" ON public.orders;
-- Al tener RLS activo sin política SELECT para anon, el acceso queda 100% blindado.
```

---

## 3. Patrón de Vistas Públicas Seguras (`public_*`)

Cuando una tabla contiene campos sensibles (ej.: `original_path` en fotos o `password_hash` en usuarios), crear una vista pública que excluya deliberadamente dichos campos:

```sql
-- 1. Vista pública segura de fotos (excluye original_path)
CREATE OR REPLACE VIEW public.public_photos AS
SELECT 
    p.id,
    p.album_id,
    p.preview_url,
    p.filename,
    p.is_sample,
    p.created_at
FROM public.photos p
JOIN public.albums a ON p.album_id = a.id
WHERE a.is_published = true;

-- Conceder lectura a anon y authenticated
GRANT SELECT ON public.public_photos TO anon, authenticated;
```

---

## 4. Checklist de Auditoría Guardian Angel para RLS

Antes de aprobar cambios en base de datos, verificar:
- [ ] ¿Todas las tablas creadas tienen `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`?
- [ ] ¿Se previene que el rol `anon` consulte campos privados (rutas de originales, hashes de contraseñas, tokens de pago)?
- [ ] ¿Las políticas `UPDATE` y `DELETE` tienen cláusulas `USING` estrictas que evitan modificaciones no autorizadas?
- [ ] ¿Se verificó que los endpoints de cliente usen vistas públicas o APIs seguras en lugar de consultar tablas maestras directamente?
