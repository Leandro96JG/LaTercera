---
name: supabase-postgres
description: >-
  Diseño, modelado y optimización de esquemas relacionales en PostgreSQL para Supabase.
  Úsalo cuando el usuario solicite crear o modificar tablas, agregar columnas, crear índices B-Tree,
  diseñar claves foráneas, escribir migraciones SQL o resolver problemas de integridad de datos en Supabase.
---

# Supabase PostgreSQL: Modelado, Migraciones e Integridad Relacional

Esta guía proporciona las directrices y procedimientos para crear, mantener y optimizar esquemas de base de datos relacionales en PostgreSQL sobre Supabase.

---

## 1. Convenciones de Nomenclatura y Tipos de Datos

- **Tablas:** Nombres en plural, minúsculas, separados por guión bajo (`snake_case`):
  - Ejemplos: `photographers`, `albums`, `photos`, `orders`, `order_items`.
- **Columnas:** Minúsculas en `snake_case`:
  - `id`: Identificador único (usar `TEXT` o `UUID` con `gen_random_uuid()` por defecto, o `BIGSERIAL` para secuencias).
  - Fechas: `TIMESTAMPTZ` con valor por defecto `NOW()`.
  - Estados/Enums: Usar `TEXT` con restricción `CHECK (status IN ('PENDING', 'PAID', ...))` o un `CREATE TYPE mi_enum AS ENUM (...)`.
  - Monedas y Precios: Usar `NUMERIC(12, 2)` o `INTEGER` en centavos para precisión exacta sin errores de redondeo de punto flotante.

---

## 2. Creación de Tablas con Patrón Idempotente

Estructurar siempre las sentencias DDL con cláusulas de existencia preventiva:

```sql
-- 1. Crear tabla principal
CREATE TABLE IF NOT EXISTS public.albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('futbol', 'hockey', 'basquet', 'sociales', 'otros')),
    event_date DATE NOT NULL,
    location TEXT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    full_album_price NUMERIC(12, 2) NOT NULL CHECK (full_album_price > 0),
    is_published BOOLEAN NOT NULL DEFAULT true,
    photographer_id TEXT REFERENCES public.photographers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_price_coherence CHECK (unit_price <= full_album_price)
);

-- 2. Trigger para actualización automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_albums_updated_at ON public.albums;
CREATE TRIGGER trg_albums_updated_at
    BEFORE UPDATE ON public.albums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 3. Estrategia de Indexación de Alto Rendimiento

Crear índices para acelerar búsquedas frecuentes y evitar escaneos secuenciales completos (*Sequential Scans*):

```sql
-- Índices en campos de filtrado y ordenamiento frecuente
CREATE INDEX IF NOT EXISTS idx_albums_category ON public.albums(category);
CREATE INDEX IF NOT EXISTS idx_albums_created_at_desc ON public.albums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON public.photos(album_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON public.orders(payment_id);
```

---

## 4. Resiliencia en Claves Foráneas y Registros Contables Inmutables

En sistemas de comercio electrónico, los registros de compras (`order_items`) no deben bloquearse si un producto o foto tiene identificadores dinámicos o externos.

**Regla de Oro:**
- Preferir desacoplar `order_items.photo_id` de una clave foránea rígida si el catálogo maneja identificadores virtuales o externos.
- Mantener la integridad referencial en entidades maestras (`albums -> photographers`), pero aislar la contabilidad como ledger histórico inmutable.

```sql
-- Desacoplamiento seguro para ledger de ventas
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_photo_id_fkey;
CREATE INDEX IF NOT EXISTS idx_order_items_photo_id ON public.order_items(photo_id);
```

---

## 5. Procedimiento para Aplicar Cambios

1. Diseñar el script SQL en un archivo de migración o parche (ej.: `backend/database/migrations/YYYYMMDD_nombre.sql`).
2. Verificar la sintaxis SQL y las restricciones `CHECK`.
3. Ejecutar la migración a través de Supabase Dashboard (SQL Editor), Supabase CLI (`npx supabase db push`), o mediante el MCP Tool `execute_sql`.
4. Actualizar los mappers y tipos TypeScript en el backend/frontend para reflejar los nuevos campos.
