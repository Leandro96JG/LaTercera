-- ============================================================================
-- PATCH DE SEGURIDAD CRITICA: RLS Estricto y Cupones Atómicos (FASE 0)
-- Proyecto: LA TERCERA Fotografía
-- ============================================================================

-- 1. Cerrar políticas RLS permisivas para rol `anon`
-- Todo el acceso público pasa exclusivamente por la API Express (SERVICE_ROLE_KEY).
-- Esto evita que cualquier cliente con la ANON_KEY inserte órdenes falsas o lea PINs/original_path.
DROP POLICY IF EXISTS "Public create orders" ON orders;
DROP POLICY IF EXISTS "Public insert order items" ON order_items;
DROP POLICY IF EXISTS "Public read for published albums" ON albums;
DROP POLICY IF EXISTS "Public read previews for published albums" ON photos;

-- Si en algún cliente se consultan álbumes públicos directamente, exigir no estar en papelera y ocultar privados:
CREATE POLICY "Public read non-private published albums"
    ON albums FOR SELECT
    TO anon, authenticated
    USING (is_published = TRUE AND is_private = FALSE AND deleted_at IS NULL);

-- 2. RPC Atómica para consumo de cupones 100% OFF / uso limitado (Anti Race-Condition)
CREATE OR REPLACE FUNCTION consume_coupon_atomic(
  p_code TEXT,
  p_album_id TEXT DEFAULT NULL,
  p_photo_count INTEGER DEFAULT NULL,
  p_is_full_album BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  code TEXT,
  discount_percent INTEGER,
  is_active BOOLEAN,
  album_id TEXT,
  max_uses INTEGER,
  used_count INTEGER,
  max_photos INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  error_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_code TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  v_existing RECORD;
  v_updated RECORD;
BEGIN
  IF v_clean_code = '' THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::INTEGER, NULL::BOOLEAN, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 'Código de cupón vacío'::TEXT;
    RETURN;
  END IF;

  -- Intentar incremento atómico condicional en una sola sentencia UPDATE
  UPDATE coupons c
  SET used_count = c.used_count + 1
  WHERE c.code = v_clean_code
    AND c.is_active = TRUE
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
    AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
    AND (c.album_id IS NULL OR c.album_id = p_album_id)
    AND (
      c.max_photos IS NULL
      OR (NOT COALESCE(p_is_full_album, FALSE) AND (p_photo_count IS NULL OR p_photo_count <= c.max_photos))
    )
  RETURNING c.* INTO v_updated;

  IF FOUND THEN
    RETURN QUERY SELECT
      v_updated.code,
      v_updated.discount_percent,
      v_updated.is_active,
      v_updated.album_id,
      v_updated.max_uses,
      v_updated.used_count,
      v_updated.max_photos,
      v_updated.expires_at,
      v_updated.created_at,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Si no actualizó ninguna fila, diagnosticar el motivo exacto
  SELECT * INTO v_existing FROM coupons c WHERE c.code = v_clean_code;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::INTEGER, NULL::BOOLEAN, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 'El cupón no existe o no es válido'::TEXT;
    RETURN;
  END IF;

  IF NOT v_existing.is_active THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::INTEGER, NULL::BOOLEAN, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 'El cupón está pausado o inactivo'::TEXT;
    RETURN;
  END IF;

  IF v_existing.expires_at IS NOT NULL AND v_existing.expires_at <= NOW() THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::INTEGER, NULL::BOOLEAN, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 'Este cupón ha expirado'::TEXT;
    RETURN;
  END IF;

  IF v_existing.album_id IS NOT NULL AND v_existing.album_id IS DISTINCT FROM p_album_id THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::INTEGER, NULL::BOOLEAN, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 'Este cupón no es válido para este álbum específico'::TEXT;
    RETURN;
  END IF;

  IF v_existing.max_photos IS NOT NULL AND (COALESCE(p_is_full_album, FALSE) OR (p_photo_count IS NOT NULL AND p_photo_count > v_existing.max_photos)) THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::INTEGER, NULL::BOOLEAN, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, ('Este cupón de sorteo es válido hasta ' || v_existing.max_photos || ' foto(s) individual(es)')::TEXT;
    RETURN;
  END IF;

  IF v_existing.max_uses IS NOT NULL AND v_existing.used_count >= v_existing.max_uses THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::INTEGER, NULL::BOOLEAN, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 'Este cupón ha alcanzado el límite máximo de usos disponibles'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT NULL::TEXT, NULL::INTEGER, NULL::BOOLEAN, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 'No se pudo validar el cupón'::TEXT;
END;
$$;

-- 3. RPC Atómica para incrementar uso de cupón tras pago acreditado por Mercado Pago
CREATE OR REPLACE FUNCTION increment_coupon_usage_atomic(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE code = UPPER(TRIM(COALESCE(p_code, '')))
    AND (max_uses IS NULL OR used_count < max_uses);
END;
$$;
