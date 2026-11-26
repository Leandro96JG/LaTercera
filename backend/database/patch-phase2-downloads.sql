-- ============================================================================
-- PATCH FASE 2: Tracking de descargas en órdenes (download_count, last_downloaded_at)
-- Proyecto: LA TERCERA Fotografía
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION increment_order_download_count(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE orders
  SET download_count = COALESCE(download_count, 0) + 1,
      last_downloaded_at = NOW()
  WHERE id = p_order_id;
END;
$$;
