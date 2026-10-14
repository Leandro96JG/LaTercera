-- ============================================================================
-- LA TERCERA FOTOGRAFÍA - PARCHE DDL: PAPELERA, CORTESÍA Y PRIVACIDAD PIN
-- Autora: Jenifer "Yuyo" Espeche (La Rioja, Argentina)
-- Archivo: backend/database/patch-trash-and-privacy.sql
-- Motor: PostgreSQL 15+ en Supabase
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIÓN DE LA TABLA 'albums'
-- ----------------------------------------------------------------------------

-- 1.1 Papelera de reciclaje (Soft delete)
ALTER TABLE albums 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL DEFAULT NULL;

-- 1.2 Álbum de descarga gratuita / cortesía de la dueña
ALTER TABLE albums 
    ADD COLUMN IF NOT EXISTS is_free_download BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE albums 
    ADD COLUMN IF NOT EXISTS free_download_unlocked_at TIMESTAMPTZ NULL DEFAULT NULL;

-- 1.3 Privacidad y protección por código PIN / clave alfanumérica
ALTER TABLE albums 
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE albums 
    ADD COLUMN IF NOT EXISTS access_code VARCHAR(100) NULL DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 2. ÍNDICES B-TREE OPTIMIZADOS (Rendimiento Móvil & Consultas Segmentadas)
-- ----------------------------------------------------------------------------

-- Índice para consultas administrativas y filtrado de papelera
CREATE INDEX IF NOT EXISTS idx_albums_deleted_at 
    ON albums(deleted_at);

-- Índice parcial de ultra alto rendimiento para el catálogo público móvil (ignora papelera y borradores)
CREATE INDEX IF NOT EXISTS idx_albums_active_published 
    ON albums(category, created_at DESC) 
    WHERE deleted_at IS NULL AND is_published = TRUE;

-- Índice para búsqueda de álbumes privados
CREATE INDEX IF NOT EXISTS idx_albums_privacy 
    ON albums(is_private) 
    WHERE is_private = TRUE;

-- ----------------------------------------------------------------------------
-- 3. RESILIENCIA TRANSACCIONAL EN HARD DELETE (Ledger Inmutable de Órdenes)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_album_id_fkey' AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_album_id_fkey;
    END IF;
    
    -- Permitir que album_id sea NULL en órdenes históricas archivadas
    ALTER TABLE orders ALTER COLUMN album_id DROP NOT NULL;
    
    -- Reasociar como SET NULL para blindar la contabilidad
    ALTER TABLE orders 
        ADD CONSTRAINT orders_album_id_fkey 
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 4. FUNCIÓN PL/PGSQL: PURGA AUTOMÁTICA DE ÁLBUMES EXPIRADOS (30 DÍAS)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION purge_expired_trash_albums()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    purged_count INTEGER := 0;
BEGIN
    -- Elimina físicamente los álbumes cuya marca de eliminación exceda los 30 días
    WITH purged_rows AS (
        DELETE FROM albums
        WHERE deleted_at IS NOT NULL 
          AND deleted_at < (NOW() - INTERVAL '30 days')
        RETURNING id
    )
    SELECT COUNT(*) INTO purged_count FROM purged_rows;
    
    RETURN purged_count;
END;
$$;

COMMENT ON FUNCTION purge_expired_trash_albums() IS 
'Purga definitiva física de álbumes con más de 30 días en la papelera de reciclaje.';
