-- ============================================================================
-- LA TERCERA FOTOGRAFÍA - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- Autora: Jenifer "Yuyo" Espeche (La Rioja, Argentina)
-- Plataforma: E-commerce Mobile-First de Fotos Deportivas y Sociales
-- ============================================================================

-- Habilitar extensión para generación de identificadores UUID v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLA: PHOTOGRAPHERS (Fotógrafos y Administradores)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS photographers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Scrypt formato: scrypt:<salt>:<key>
    full_name VARCHAR(150) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'photographer' CHECK (role IN ('admin', 'photographer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserción inicial de la fotógrafa oficial y administradora Jenifer "Yuyo" Espeche
-- Contraseña inicial por defecto: YuyoFotos2026! (hash scrypt criptográfico)
INSERT INTO photographers (id, email, password_hash, full_name, display_name, phone, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'fotografa@latercera.com.ar',
    'scrypt:026da31df149e9beca9264ae0f850bdf:9574bed7b95c19f8823f74534da4ef943d206d39e36a711ea391389cb526bbec22173f1d3940c21deebec6f8d3a9be234ed48b8205e752699b183b2849974f76',
    'Jenifer Espeche',
    'Jenifer "Yuyo" Espeche',
    '+54 9 380 486-8714',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. TABLA: ALBUMS (Álbumes y Eventos Deportivos/Sociales)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS albums (
    id VARCHAR(100) PRIMARY KEY, -- Slug o identificador (ej: 'album-1', 'tesorieri-vs-andino')
    photographer_id UUID REFERENCES photographers(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('futbol', 'hockey', 'basquet', 'sociales', 'otros')),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    event_date VARCHAR(100), -- Display format o ISO (ej: '2026-10-14' o '12 Octubre, 2026')
    event_date_iso DATE, -- Fecha estructurada ISO (YYYY-MM-DD)
    event_time VARCHAR(10) DEFAULT '16:00', -- Horario del partido/evento (HH:MM)
    event_datetime TIMESTAMPTZ, -- Timestamp con zona horaria para ordenamiento cronológico
    event_date_display VARCHAR(100), -- Formato legible para UI
    location VARCHAR(200),
    cover_url TEXT NOT NULL,
    photos_count INTEGER NOT NULL DEFAULT 0 CHECK (photos_count >= 0),
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 1200.00 CHECK (unit_price >= 0),
    full_album_price NUMERIC(10, 2) NOT NULL DEFAULT 9500.00 CHECK (full_album_price >= 0),
    badge VARCHAR(50) DEFAULT '⚽ Fútbol',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    is_free_download BOOLEAN NOT NULL DEFAULT FALSE,
    free_download_unlocked_at TIMESTAMPTZ NULL DEFAULT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    access_code VARCHAR(100) NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserción de los primeros álbumes oficiales de Jenifer "Yuyo" Espeche
INSERT INTO albums (id, photographer_id, category, title, subtitle, event_date, location, cover_url, photos_count, unit_price, full_album_price, badge, is_published)
VALUES
(
    'album-1',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'futbol',
    'Atlético Tesorieri vs Andino SC',
    'Liga Riojana de Fútbol • Fecha 7',
    '12 Octubre, 2026',
    'Estadio Carlos Augusto Mercado Luna',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    48,
    1200.00,
    9500.00,
    '⚽ Fútbol',
    TRUE
),
(
    'album-2',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'hockey',
    'Torneo Provincial de Hockey Femenino',
    'Polideportivo Evita • Semifinales',
    '5 Octubre, 2026',
    'Polideportivo Evita',
    'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=800&q=80',
    36,
    1200.00,
    9500.00,
    '🏑 Hockey',
    TRUE
),
(
    'album-3',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'basquet',
    'Facundo vs Banco Rioja (Primera Básquet)',
    'Torneo Clausura de Básquetbol',
    '28 Septiembre, 2026',
    'Cancha Club Facundo',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
    42,
    1200.00,
    9500.00,
    '🏀 Básquet',
    TRUE
),
(
    'album-4',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'sociales',
    'Cumpleaños de 15 de Martina',
    'Salón Las Retamas • Festejo & Baile',
    '20 Septiembre, 2026',
    'Salón Las Retamas',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
    85,
    1200.00,
    9500.00,
    '🎉 Cumpleaños & 15s',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. TABLA: PHOTOS (Fotografías con Capa Pública y Privada)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS photos (
    id VARCHAR(100) PRIMARY KEY,
    album_id VARCHAR(100) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_path TEXT NOT NULL,      -- Capa Privada: ruta en filesystem o Supabase Storage Bucket privado
    preview_url TEXT NOT NULL,        -- Capa Pública: miniatura WebP 800px con marca de agua quemada
    is_sample_hd BOOLEAN NOT NULL DEFAULT FALSE,
    width INTEGER,
    height INTEGER,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. TABLA: ORDERS (Órdenes de Compra y Cobro Zero-Trust)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id VARCHAR(100) NOT NULL REFERENCES albums(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'PROCESSING',
        'PAID',
        'FRAUD_ALERT_PRICE_MISMATCH',
        'REJECTED',
        'CANCELLED'
    )),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 1200.00,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_full_album BOOLEAN NOT NULL DEFAULT FALSE,
    photo_count INTEGER NOT NULL DEFAULT 0,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(50),
    coupon_applied VARCHAR(50),
    payment_id VARCHAR(100),
    preference_id VARCHAR(100),
    download_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: ORDER_ITEMS (Relación de Fotos Individuales Adquiridas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    photo_id VARCHAR(100), -- Identificador de la foto (desacoplado para resiliencia con fotos dinámicas e histórico inmutable)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. TABLA: DOWNLOAD_TOKENS (Tokens Temporales Criptográficos de Descarga 72h)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS download_tokens (
    token_hash VARCHAR(255) PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('photo', 'album_zip')),
    resource_id TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. TABLA: PROCESSED_WEBHOOK_EVENTS (Idempotencia y Anti-Replay de Webhooks)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processed_webhook_events (
    event_id VARCHAR(255) PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. ÍNDICES ESTRATÉGICOS (B-TREE)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_photographers_email ON photographers(email);
CREATE INDEX IF NOT EXISTS idx_albums_photographer_id ON albums(photographer_id);
CREATE INDEX IF NOT EXISTS idx_albums_category ON albums(category);
CREATE INDEX IF NOT EXISTS idx_albums_is_published ON albums(is_published);
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_is_sample_hd ON photos(is_sample_hd);
CREATE INDEX IF NOT EXISTS idx_orders_album_id ON orders(album_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_photo_id ON order_items(photo_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_order_id ON download_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_expires_at ON download_tokens(expires_at);

-- ----------------------------------------------------------------------------
-- 9. VISTAS PÚBLICAS SEGURAS (Zero-Trust: Excluyen columnas sensibles)
-- ----------------------------------------------------------------------------

-- Vista pública de fotos (excluye original_path)
CREATE OR REPLACE VIEW public_photos AS
SELECT 
    p.id,
    p.album_id,
    p.filename,
    p.preview_url,
    p.is_sample_hd,
    p.width,
    p.height,
    p.size_bytes,
    p.created_at
FROM photos p
JOIN albums a ON p.album_id = a.id
WHERE a.is_published = TRUE;

-- Vista pública de fotógrafos (excluye password_hash)
CREATE OR REPLACE VIEW public_photographers AS
SELECT 
    id,
    full_name,
    display_name,
    phone,
    role,
    is_active,
    created_at
FROM photographers
WHERE is_active = TRUE;

-- ----------------------------------------------------------------------------
-- 10. POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- 10.1 Álbumes: Lectura pública de álbumes publicados
CREATE POLICY "Public read for published albums"
    ON albums FOR SELECT
    TO anon, authenticated
    USING (is_published = TRUE);

-- 10.2 Álbumes: Gestión restringida a administradores/fotógrafos autenticados
CREATE POLICY "Admin and photographers manage albums"
    ON albums FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'photographer'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'photographer'));

-- 10.3 Fotos: Lectura pública anónima restringida a fotos de álbumes publicados
CREATE POLICY "Public read previews for published albums"
    ON photos FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM albums WHERE albums.id = photos.album_id AND albums.is_published = TRUE));

-- 10.4 Fotos: Escritura, modificación y acceso total restringido al Service Role y Admin
CREATE POLICY "Admin full manage photos"
    ON photos FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 10.5 Órdenes: Inserción pública permitida (Checkout Pro sin registro obligatorio)
CREATE POLICY "Public create orders"
    ON orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

-- 10.6 Órdenes: Consulta directa en Supabase restringida al Administrador (los clientes consultan vía Express API)
CREATE POLICY "Admin read orders"
    ON orders FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- 10.7 Órdenes: Actualización de órdenes prohibida a clientes anónimos (solo Admin / Service Role)
CREATE POLICY "Admin update orders"
    ON orders FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 10.8 Order Items: Creación pública al pagar y lectura restringida a Admin
CREATE POLICY "Public insert order items"
    ON order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

CREATE POLICY "Admin read order items"
    ON order_items FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- 10.9 Download Tokens: Restringidos a Service Role y Administradores (Zero-Trust)
CREATE POLICY "Admin read download tokens"
    ON download_tokens FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin manage download tokens"
    ON download_tokens FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 10.10 Fotógrafos: Acceso a la tabla base con password_hash restringido a Administradores (público usa public_photographers)
CREATE POLICY "Admin manage photographers"
    ON photographers FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- NOTA ARQUITECTÓNICA:
-- Las conexiones directas del Backend Express utilizan la clave SERVICE_ROLE_KEY
-- que cuenta con privilegio BYPASSRLS automático para ejecutar transacciones,
-- validaciones HMAC y verificación de descargas en capa privada.
-- ============================================================================
