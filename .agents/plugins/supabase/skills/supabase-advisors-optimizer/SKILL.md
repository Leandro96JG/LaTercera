---
name: supabase-advisors-optimizer
description: >-
  Optimización de bases de datos y resolución de advertencias de Supabase Advisors.
  Úsalo cuando el usuario solicite auditar el rendimiento de PostgreSQL, inspeccionar índices faltantes,
  analizar planes de ejecución (`EXPLAIN ANALYZE`), o resolver diagnósticos de seguridad/rendimiento/salud reportados por el MCP de Supabase.
---

# Supabase Advisors & Optimización de Rendimiento en PostgreSQL

Esta guía describe cómo diagnosticar, auditar y resolver problemas de rendimiento, indexación y salud reportados por los asesores automáticos de Supabase y las herramientas MCP.

---

## 1. Integración con el Servidor MCP de Supabase (`get_advisors`)

El servidor MCP oficial `@supabase/mcp-server-supabase` expone la herramienta `get_advisors`. Puedes invocarla con tres variantes:

* `get_advisors({ type: 'security' })`: Detecta tablas sin RLS, columnas públicas expuestas o roles excesivamente privilegiados.
* `get_advisors({ type: 'performance' })`: Identifica índices faltantes en claves foráneas, consultas lentas y escaneos secuenciales masivos.
* `get_advisors({ type: 'health' })`: Diagnostica saturación de conexiones, bloat en tablas y estado de extensiones.

---

## 2. Detección y Resolución de Claves Foráneas sin Índice

En PostgreSQL, si una clave foránea no tiene un índice B-Tree en la tabla hija, cada `UPDATE` o `DELETE` sobre la tabla padre forzará un escaneo secuencial (*Seq Scan*) de toda la tabla hija.

### Diagnóstico:
```sql
-- Identificar claves foráneas que carecen de índice de soporte
SELECT
    conrelid::regclass AS tabla_con_fk,
    a.attname AS columna_fk,
    confrelid::regclass AS tabla_referenciada
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
  AND NOT EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = c.conrelid
        AND a.attnum = ANY(i.indkey)
  );
```

### Remedio:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_album_id ON public.photos(album_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
```

---

## 3. Análisis de Consultas Lentas con `EXPLAIN (ANALYZE, BUFFERS)`

Antes de alterar índices en producción, inspeccionar el plan de ejecución real:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.albums
WHERE category = 'futbol' AND is_published = true
ORDER BY created_at DESC
LIMIT 12;
```

**Puntos Críticos a Auditar:**
1. **Seq Scan vs. Index Scan:** Si la tabla supera varios cientos de filas, buscar siempre `Index Scan` o `Bitmap Index Scan`.
2. **Sort Method:** Evitar `Sort Method: external merge Disk` (ordenamiento en disco). Un índice compuesto `(category, created_at DESC)` elimina por completo el costo del ordenamiento.

---

## 4. Detección de Índices Inútiles o Duplicados

Tener demasiados índices ralentiza los `INSERT`, `UPDATE` y `DELETE`. Inspeccionar índices que nunca han sido utilizados por el optimizador:

```sql
SELECT 
    schemaname,
    relname AS tabla,
    indexrelname AS indice,
    idx_scan AS veces_usado
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';
```
*(Nota: Evaluar si el índice fue creado recientemente antes de eliminarlo).*
