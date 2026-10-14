-- ============================================================================
-- PARCHE: Fechas y Horarios Estructurados en Tabla albums
-- Base de datos: Supabase (PostgreSQL 15+)
-- Permite búsqueda por fecha exacta, rango y ordenamiento cronológico preciso
-- ============================================================================

-- 1. Añadir columnas estructuradas si no existen
ALTER TABLE albums ADD COLUMN IF NOT EXISTS event_date_display VARCHAR(100);
ALTER TABLE albums ADD COLUMN IF NOT EXISTS event_date_iso DATE;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS event_time VARCHAR(10) DEFAULT '16:00';
ALTER TABLE albums ADD COLUMN IF NOT EXISTS event_datetime TIMESTAMPTZ;

-- 2. Preservar y respaldar texto display existente
UPDATE albums 
SET event_date_display = event_date 
WHERE event_date_display IS NULL AND event_date IS NOT NULL;

-- 3. Backfill para álbumes oficiales existentes de La Tercera
UPDATE albums 
SET 
    event_date_iso = '2026-10-12',
    event_time = '16:30',
    event_datetime = '2026-10-12 16:30:00-03'::TIMESTAMPTZ
WHERE id = 'album-1';

UPDATE albums 
SET 
    event_date_iso = '2026-10-05',
    event_time = '10:00',
    event_datetime = '2026-10-05 10:00:00-03'::TIMESTAMPTZ
WHERE id = 'album-2';

UPDATE albums 
SET 
    event_date_iso = '2026-09-28',
    event_time = '20:00',
    event_datetime = '2026-09-28 20:00:00-03'::TIMESTAMPTZ
WHERE id = 'album-3';

UPDATE albums 
SET 
    event_date_iso = '2026-09-20',
    event_time = '22:30',
    event_datetime = '2026-09-20 22:30:00-03'::TIMESTAMPTZ
WHERE id = 'album-4';

-- 4. Índices B-Tree para consultas y filtros rápidos por fecha
CREATE INDEX IF NOT EXISTS idx_albums_event_date_iso ON albums(event_date_iso DESC);
CREATE INDEX IF NOT EXISTS idx_albums_event_datetime ON albums(event_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_albums_category_date ON albums(category, event_date_iso DESC);
