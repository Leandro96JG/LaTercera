-- ============================================================================
-- LA TERCERA FOTOGRAFÍA - PARCHE DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- ADR-070: Soporte para Álbumes Destacados en Hero y Marcas de Agua Personalizadas
-- ============================================================================

-- 1. Agregar columnas para control editorial de carrusel Hero y logo de torneo opcional
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS is_hero_featured BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS watermark_logo_url TEXT NULL;

-- 2. Índice Parcial en PostgreSQL para consultas ultrarrápidas del Hero
-- Un índice estándar sobre un booleano es ineficiente; indexamos solo las filas con is_hero_featured = true
CREATE INDEX IF NOT EXISTS idx_albums_hero_featured 
ON albums (created_at DESC) 
WHERE is_hero_featured = true;

-- 3. Comentario descriptivo para auditoría de esquema
COMMENT ON COLUMN albums.is_hero_featured IS 'Determina si la portada del álbum rota como destacada en el carrusel de inicio Hero';
COMMENT ON COLUMN albums.watermark_logo_url IS 'URL o ruta en storage del logo PNG transparente del torneo/evento para marcas de agua compuestas';
