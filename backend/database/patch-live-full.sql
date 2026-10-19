-- ============================================================================
-- LA TERCERA FOTOGRAFÍA - PARCHE UNIFICADO SUPABASE LIVE
-- Tablas, Constraints, Resiliencia FK, Categorías Dinámicas y Promociones
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIÓN DE LA TABLA 'albums' (Papelera, Cortesía y Privacidad)
-- ----------------------------------------------------------------------------
ALTER TABLE public.albums 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL DEFAULT NULL;

ALTER TABLE public.albums 
    ADD COLUMN IF NOT EXISTS is_free_download BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.albums 
    ADD COLUMN IF NOT EXISTS free_download_unlocked_at TIMESTAMPTZ NULL DEFAULT NULL;

ALTER TABLE public.albums 
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.albums 
    ADD COLUMN IF NOT EXISTS access_code VARCHAR(100) NULL DEFAULT NULL;

ALTER TABLE public.albums 
    ADD COLUMN IF NOT EXISTS event_date_iso DATE NULL;

ALTER TABLE public.albums 
    ADD COLUMN IF NOT EXISTS event_time VARCHAR(20) NULL;

ALTER TABLE public.albums 
    ADD COLUMN IF NOT EXISTS event_datetime TIMESTAMPTZ NULL;

ALTER TABLE public.albums 
    ADD COLUMN IF NOT EXISTS event_date_display VARCHAR(100) NULL;

-- Relajar la restricción de categoría para soportar categorías dinámicas (ej: 'motos', 'karting')
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_category_check;

-- Índices en albums
CREATE INDEX IF NOT EXISTS idx_albums_deleted_at ON public.albums(deleted_at);
CREATE INDEX IF NOT EXISTS idx_albums_category ON public.albums(category);
CREATE INDEX IF NOT EXISTS idx_albums_privacy ON public.albums(is_private) WHERE is_private = TRUE;

-- ----------------------------------------------------------------------------
-- 2. DESACOPLAMIENTO DE CLAVE FORÁNEA EN 'orders' (Ledger Contable Seguro)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_album_id_fkey' AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_album_id_fkey;
    END IF;
    
    -- Permitir que album_id sea NULL para poder purgar álbumes demo o eliminados
    ALTER TABLE public.orders ALTER COLUMN album_id DROP NOT NULL;
    
    -- Snapshot del título del álbum para trazabilidad contable
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS album_title_snapshot VARCHAR(255) NULL;

    -- Reasociar como SET NULL para blindar la contabilidad
    ALTER TABLE public.orders 
        ADD CONSTRAINT orders_album_id_fkey 
        FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE SET NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 3. TABLA: PROMOTIONS_CONFIG (Descuentos por Cantidad / Volumen)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enable_tier_discounts BOOLEAN NOT NULL DEFAULT TRUE,
    tier3_discount_percent INTEGER NOT NULL DEFAULT 20 CHECK (tier3_discount_percent >= 0 AND tier3_discount_percent <= 100),
    tier5_discount_percent INTEGER NOT NULL DEFAULT 30 CHECK (tier5_discount_percent >= 0 AND tier5_discount_percent <= 100),
    cap_at_full_album_price BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.promotions_config (id, enable_tier_discounts, tier3_discount_percent, tier5_discount_percent, cap_at_full_album_price)
VALUES (1, TRUE, 20, 30, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. TABLA: COUPONS (Cupones de Descuento y Sorteos 100% OFF)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    code VARCHAR(50) PRIMARY KEY,
    discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    album_id VARCHAR(100) REFERENCES public.albums(id) ON DELETE SET NULL,
    max_uses INTEGER NULL CHECK (max_uses IS NULL OR max_uses > 0),
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    max_photos INTEGER NULL CHECK (max_photos IS NULL OR max_photos > 0),
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_album_id ON public.coupons(album_id);

INSERT INTO public.coupons (code, discount_percent, is_active, album_id, max_uses, used_count, max_photos, expires_at)
VALUES ('YUYO10', 10, TRUE, NULL, NULL, 0, NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. TABLA: CATEGORIES (Sistema Dinámico de Categorías e Insignias)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    badge_label VARCHAR(120) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_active_order ON public.categories(is_active, display_order);

INSERT INTO public.categories (id, name, icon, badge_label, display_order, is_active)
VALUES 
    ('futbol', 'Fútbol', '⚽', '⚽ Fútbol', 1, TRUE),
    ('motos', 'Motos & Enduro', '🏍️', '🏍️ Motos', 2, TRUE),
    ('hockey', 'Hockey', '🏑', '🏑 Hockey', 3, TRUE),
    ('basquet', 'Básquet', '🏀', '🏀 Básquet', 4, TRUE),
    ('sociales', 'Cumpleaños & 15s', '🎉', '🎉 Cumpleaños & Social', 5, TRUE),
    ('otros', 'Otros Eventos', '📸', '📸 General', 6, TRUE)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    badge_label = EXCLUDED.badge_label,
    display_order = EXCLUDED.display_order;

-- ----------------------------------------------------------------------------
-- 6. POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.promotions_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Lectura pública para promotions_config y categories
DROP POLICY IF EXISTS "Public read promotions_config" ON public.promotions_config;
CREATE POLICY "Public read promotions_config" ON public.promotions_config FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (TRUE);

-- Gestión para authenticated (admin)
DROP POLICY IF EXISTS "Admin manage promotions_config" ON public.promotions_config;
CREATE POLICY "Admin manage promotions_config" ON public.promotions_config FOR ALL TO authenticated USING ((auth.jwt() ->> 'role') = 'admin') WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admin manage coupons" ON public.coupons;
CREATE POLICY "Admin manage coupons" ON public.coupons FOR ALL TO authenticated USING ((auth.jwt() ->> 'role') = 'admin') WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated USING ((auth.jwt() ->> 'role') = 'admin') WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- 7. RECARGA DE CACHÉ DE ESQUEMA EN POSTGREST
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
