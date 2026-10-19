-- ============================================================================
-- PARCHE SQL: PROMOCIONES, DESCUENTOS POR VOLUMEN Y CUPONES (SORTEOS)
-- La Tercera Fotografía - Jenifer "Yuyo" Espeche
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLA: PROMOTIONS_CONFIG (Configuración de Descuentos por Cantidad)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enable_tier_discounts BOOLEAN NOT NULL DEFAULT TRUE,
    tier3_discount_percent INTEGER NOT NULL DEFAULT 20 CHECK (tier3_discount_percent >= 0 AND tier3_discount_percent <= 100),
    tier5_discount_percent INTEGER NOT NULL DEFAULT 30 CHECK (tier5_discount_percent >= 0 AND tier5_discount_percent <= 100),
    cap_at_full_album_price BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserción por defecto de la configuración de promociones
INSERT INTO promotions_config (id, enable_tier_discounts, tier3_discount_percent, tier5_discount_percent, cap_at_full_album_price)
VALUES (1, TRUE, 20, 30, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. TABLA: COUPONS (Cupones de Descuento y Sorteos 100% OFF)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
    code VARCHAR(50) PRIMARY KEY,
    discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    album_id VARCHAR(100) REFERENCES albums(id) ON DELETE SET NULL,
    max_uses INTEGER NULL CHECK (max_uses IS NULL OR max_uses > 0),
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    max_photos INTEGER NULL CHECK (max_photos IS NULL OR max_photos > 0),
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de búsqueda y rendimiento
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_album_id ON coupons(album_id);

-- Inserción del cupón de cortesía oficial por defecto
INSERT INTO coupons (code, discount_percent, is_active, album_id, max_uses, used_count, max_photos, expires_at)
VALUES ('YUYO10', 10, TRUE, NULL, NULL, 0, NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE promotions_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 3.1 promotions_config: Lectura pública y modificación exclusiva para administradores
DROP POLICY IF EXISTS "Public read promotions_config" ON promotions_config;
CREATE POLICY "Public read promotions_config"
    ON promotions_config FOR SELECT
    TO anon, authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Admin manage promotions_config" ON promotions_config;
CREATE POLICY "Admin manage promotions_config"
    ON promotions_config FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 3.2 coupons: Gestión exclusiva para administradores (los clientes validan vía API Backend con Service Role)
DROP POLICY IF EXISTS "Admin manage coupons" ON coupons;
CREATE POLICY "Admin manage coupons"
    ON coupons FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
