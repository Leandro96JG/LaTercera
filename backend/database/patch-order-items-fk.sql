-- ============================================================================
-- PARCHE: Desacoplamiento de Clave Foránea en order_items
-- Permite compras resilientes de fotos locales, externas o dinámicas
-- ============================================================================

-- 1. Eliminar la restricción de clave foránea si existe
ALTER TABLE order_items 
    DROP CONSTRAINT IF EXISTS order_items_photo_id_fkey;

-- 2. Asegurar que photo_id sea VARCHAR(100) nullable (para compras de álbum completo)
ALTER TABLE order_items 
    ALTER COLUMN photo_id DROP NOT NULL;

-- 3. Mantener el índice B-Tree para consultas rápidas por photo_id
CREATE INDEX IF NOT EXISTS idx_order_items_photo_id ON order_items(photo_id);
