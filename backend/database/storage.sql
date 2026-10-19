-- ============================================================================
-- LA TERCERA FOTOGRAFÍA - CONFIGURACIÓN DE SUPABASE STORAGE BUCKETS & RLS
-- Versión compatible con permisos del SQL Editor de Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CREACIÓN IDEMPOTENTE DE BUCKETS EN storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'previews',
    'previews',
    TRUE,
    5242880, -- 5 MB
    ARRAY['image/webp', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'originals',
    'originals',
    FALSE, -- PRIVADO Zero-Trust
    52428800, -- 50 MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. FUNCIÓN DE SEGURIDAD REUTILIZABLE: VERIFICACIÓN DE ADMINISTRADOR
CREATE OR REPLACE FUNCTION public.is_storage_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 
            FROM public.photographers 
            WHERE photographers.id::text = auth.uid()::text 
              AND photographers.role = 'admin' 
              AND photographers.is_active = TRUE
        )
    );
$$;

-- 3. POLÍTICAS DE SEGURIDAD RLS EN storage.objects
-- (Nota: storage.objects ya tiene RLS habilitado por defecto en Supabase)

DROP POLICY IF EXISTS "previews_public_read" ON storage.objects;
DROP POLICY IF EXISTS "previews_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "previews_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "previews_admin_delete" ON storage.objects;

DROP POLICY IF EXISTS "originals_admin_read" ON storage.objects;
DROP POLICY IF EXISTS "originals_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "originals_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "originals_admin_delete" ON storage.objects;

-- 3.1 POLÍTICAS PARA EL BUCKET 'previews' (Público)
CREATE POLICY "previews_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'previews');

CREATE POLICY "previews_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'previews'
    AND public.is_storage_admin()
);

CREATE POLICY "previews_admin_update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'previews'
    AND public.is_storage_admin()
);

CREATE POLICY "previews_admin_delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'previews'
    AND public.is_storage_admin()
);

-- 3.2 POLÍTICAS PARA EL BUCKET 'originals' (Privado Zero-Trust)
CREATE POLICY "originals_admin_read"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'originals'
    AND public.is_storage_admin()
);

CREATE POLICY "originals_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'originals'
    AND public.is_storage_admin()
);

CREATE POLICY "originals_admin_update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'originals'
    AND public.is_storage_admin()
);

CREATE POLICY "originals_admin_delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'originals'
    AND public.is_storage_admin()
);