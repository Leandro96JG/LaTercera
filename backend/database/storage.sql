-- ============================================================================
-- LA TERCERA FOTOGRAFÍA - CONFIGURACIÓN DE SUPABASE STORAGE BUCKETS & RLS
-- Autora: Jenifer "Yuyo" Espeche (La Rioja, Argentina)
-- Arquitectura: Capa Dual (Previews Públicas WebP vs Originales Privadas Zero-Trust)
-- Archivo: backend/database/storage.sql
-- ============================================================================

-- Habilitar extensiones requeridas para identificación criptográfica
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. CREACIÓN IDEMPOTENTE DE BUCKETS EN storage.buckets
-- ----------------------------------------------------------------------------

-- 1.1 Bucket 'previews': Público para CDN, miniaturas WebP 800px con marca de agua
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'previews',
    'previews',
    TRUE,
    5242880, -- 5 MB (Las miniaturas WebP de 800px rondan ~150KB)
    ARRAY['image/webp', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 1.2 Bucket 'originals': Privado Zero-Trust para fotos HD originales sin marca de agua
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'originals',
    'originals',
    FALSE, -- PRIVADO: Ningún usuario anónimo puede leer directamente
    52428800, -- 50 MB (Archivos de cámara profesional RAW exportados a JPEG/PNG HD)
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. FUNCIÓN DE SEGURIDAD REUTILIZABLE: VERIFICACIÓN DE ADMINISTRADOR
-- ----------------------------------------------------------------------------

-- Valida si el llamador posee permisos administrativos (Service Role o Fotógrafo Admin)
CREATE OR REPLACE FUNCTION public.is_storage_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        -- Service Role Key (backend Express en operaciones transaccionales)
        auth.role() = 'service_role'
        -- Token JWT con rol explícito admin en claims
        OR (auth.jwt() ->> 'role') = 'admin'
        -- Usuario autenticado en Supabase Auth mapeado a fotógrafo activo con rol admin
        OR EXISTS (
            SELECT 1 
            FROM public.photographers 
            WHERE photographers.id = auth.uid() 
              AND photographers.role = 'admin' 
              AND photographers.is_active = TRUE
        )
    );
$$;

-- ----------------------------------------------------------------------------
-- 3. POLÍTICAS DE SEGURIDAD RLS EN storage.objects
-- ----------------------------------------------------------------------------

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas para evitar colisiones
DROP POLICY IF EXISTS "previews_public_read" ON storage.objects;
DROP POLICY IF EXISTS "previews_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "previews_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "previews_admin_delete" ON storage.objects;

DROP POLICY IF EXISTS "originals_admin_read" ON storage.objects;
DROP POLICY IF EXISTS "originals_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "originals_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "originals_admin_delete" ON storage.objects;

-- ============================================================================
-- 3.1 POLÍTICAS PARA EL BUCKET 'previews' (Público)
-- ============================================================================

-- Lectura pública anónima por CDN para el frontend Angular y visitas
CREATE POLICY "previews_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'previews');

-- Inserción exclusiva para fotógrafos administradores o Service Role
CREATE POLICY "previews_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'previews'
    AND public.is_storage_admin()
);

-- Actualización exclusiva para administradores o Service Role
CREATE POLICY "previews_admin_update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'previews'
    AND public.is_storage_admin()
);

-- Eliminación exclusiva para administradores o Service Role
CREATE POLICY "previews_admin_delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'previews'
    AND public.is_storage_admin()
);

-- ============================================================================
-- 3.2 POLÍTICAS PARA EL BUCKET 'originals' (Privado Zero-Trust)
-- ============================================================================

-- Lectura restringida: Ningún anónimo ni usuario no-admin puede leer de 'originals'
-- Solo accesible mediante URLs firmadas por el backend o clientes con Service Role
CREATE POLICY "originals_admin_read"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'originals'
    AND public.is_storage_admin()
);

-- Inserción exclusiva para administradores o Service Role
CREATE POLICY "originals_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'originals'
    AND public.is_storage_admin()
);

-- Actualización exclusiva para administradores o Service Role
CREATE POLICY "originals_admin_update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'originals'
    AND public.is_storage_admin()
);

-- Eliminación exclusiva para administradores o Service Role
CREATE POLICY "originals_admin_delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'originals'
    AND public.is_storage_admin()
);

COMMENT ON TABLE storage.objects IS 'Objetos multimedia de La Tercera: previews públicas WebP y originales HD protegidos.';
