# Directrices y Estándares de Arquitectura para Supabase

Este documento define las reglas de ingeniería para interactuar, diseñar y desplegar bases de datos, seguridad y almacenamiento con Supabase en este proyecto.

---

## 1. Principio de Mínimo Privilegio y Credenciales

1. **Aislamiento de Claves:**
   - `SUPABASE_ANON_KEY`: Únicamente para operaciones que respetan Row Level Security (RLS) desde clientes autorizados o consultas públicas.
   - `SUPABASE_SERVICE_ROLE_KEY`: Acceso administrativo con bypass de RLS. **PROHIBIDO** exponer esta clave en el frontend (Angular) o repositorios públicos. Su uso está confinado exclusivamente al backend (Node.js / Express).
2. **Cero Secretos Hardcodeados:**
   - Todas las credenciales deben provenir estrictamente de variables de entorno (`process.env.*`).

---

## 2. Modelado Relacional y PostgreSQL

1. **Convenciones de Nomenclatura:**
   - Nombres de tablas y columnas en `snake_case` minúsculas (ej.: `order_items`, `created_at`, `unit_price`).
   - Claves foráneas nombradas como `<entidad_singular>_id` (ej.: `album_id`, `photographer_id`).
2. **Índices y Rendimiento:**
   - Crear índices B-Tree en todas las columnas utilizadas frecuentemente para filtros `WHERE`, joins o agrupaciones (ej.: `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`).
3. **Resiliencia de Órdenes y Contabilidad:**
   - Las tablas transaccionales de venta (como `order_items`) no deben tener dependencias rígidas en cascada que bloqueen el registro de auditoría si un item dinámico o externo es adquirido.

---

## 3. Seguridad Row Level Security (RLS)

1. **Activación Obligatoria:**
   - Toda tabla creada en Supabase DEBE tener RLS activado de forma explícita:
     ```sql
     ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
     ```
2. **Patrón de Vistas Públicas Seguras:**
   - Para tablas que combinan metadatos públicos con rutas privadas o contraseñas (ej.: `photos`, `photographers`), crear vistas públicas (`SECURITY DEFINER` o filtradas) para exponer solo las columnas seguras:
     - `public_photos`: Excluye `original_path`.
     - `public_photographers`: Excluye `password_hash`.
3. **Zero-Trust en Órdenes:**
   - Deshabilitar el acceso directo anónimo a tablas `orders` y `order_items`. El acceso del cliente a las descargas se realiza exclusivamente mediante tokens criptográficos firmados por el backend.

---

## 4. Almacenamiento Dual en Supabase Storage

1. **Capa Pública (`previews`):**
   - Miniaturas WebP optimizadas con marcas de agua incrustadas en los píxeles.
   - Límite de tamaño estricto (ej.: 5 MB).
   - Caché CDN inmutable (1 año) con cabeceras `Cache-Control: public, max-age=31536000, immutable`.
2. **Capa Privada (`originals`):**
   - Archivos originales en máxima resolución protegidos.
   - Lectura pública completamente bloqueada. Acceso concedido únicamente vía URLs firmadas con vencimiento (`createSignedUrl`) o streaming seguro por el backend con Service Role.

---

## 5. Patrón Repository Desacoplado

1. **Inyección y Fallback en Memoria:**
   - Toda interacción con Supabase debe encapsularse detrás de una interfaz (`IOrderRepository`, `IAlbumRepository`, etc.).
   - Mantener siempre una implementación en memoria (`Memory*Repository`) que permita ejecutar tests unitarios de forma instantánea, determinista y offline sin depender de la red ni credenciales en CI.
