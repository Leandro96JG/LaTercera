---
name: supabase-storage
description: >-
  Arquitectura, configuración y seguridad de almacenamiento de archivos con Supabase Storage.
  Úsalo cuando el usuario necesite configurar buckets (públicos y privados), generar URLs firmadas temporales,
  establecer políticas de seguridad en storage.objects, optimizar caché CDN o manejar subidas/descargas de archivos.
---

# Supabase Storage: Buckets, Seguridad Zero-Trust y Entrega de Archivos

Esta guía describe cómo implementar una arquitectura de almacenamiento segura y de alto rendimiento utilizando Supabase Storage.

---

## 1. Arquitectura de Almacenamiento Dual

Para plataformas con contenido protegido (como venta de fotografías o activos digitales), se debe desacoplar el contenido en dos capas:

```
┌────────────────────────────────────────────────────────┐
│                   SUPABASE STORAGE                     │
├────────────────────────────┬───────────────────────────┤
│    BUCKET: previews        │    BUCKET: originals      │
│    (Capa Pública CDN)      │    (Capa Privada Segura)  │
├────────────────────────────┼───────────────────────────┤
│ • Miniaturas WebP (800px)  │ • Archivos HD originales  │
│ • Marcas de agua impresas  │ • Máxima resolución       │
│ • Caché inmutable (1 año)  │ • Zero-Trust RLS          │
│ • Límite: 5 MB             │ • URLs firmadas (72h max) │
└────────────────────────────┴───────────────────────────┘
```

---

## 2. Creación y Configuración de Buckets (SQL)

```sql
-- 1. Bucket público de previews
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'previews',
    'previews',
    true,
    5242880, -- 5 MB
    ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- 2. Bucket privado de originales
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'originals',
    'originals',
    false, -- Acceso público denegado
    52428800, -- 50 MB
    ARRAY['image/jpeg', 'image/png', 'image/tiff', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800;
```

---

## 3. Políticas de Seguridad RLS en `storage.objects`

```sql
-- Habilitar RLS en objetos de almacenamiento
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Permitir lectura pública SOLO en el bucket previews
CREATE POLICY "Public Read Previews Bucket"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'previews');

-- 2. Denegar lectura pública directa en originals (solo accesible vía signed URLs o service_role)
-- No se crea política SELECT para anon en 'originals'.

-- 3. Permitir subida/modificación solo a administradores o service_role
CREATE POLICY "Admin Upload Objects"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id IN ('previews', 'originals')
        AND (auth.jwt() ->> 'role') = 'admin'
    );
```

---

## 4. Uso desde TypeScript con `@supabase/supabase-js`

### A. Subida de Archivo con Caché CDN
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Subida a bucket público con cabeceras de caché inmutables
const { data, error } = await supabase.storage
  .from('previews')
  .upload(`album-1/photo-123.webp`, buffer, {
    contentType: 'image/webp',
    cacheControl: '31536000', // 1 año en caché CDN
    upsert: true
  });
```

### B. Generación de Enlace de Descarga Firmado (Signed URL)
```typescript
// Generar enlace temporal con expiración de 72 horas (259200 segundos)
const { data, error } = await supabase.storage
  .from('originals')
  .createSignedUrl(`album-1/photo-123.jpg`, 259200);

const downloadUrl = data?.signedUrl;
```

### C. Streaming Directo desde el Servidor
```typescript
// Para descargas agregadas en ZIP o verificación estricta de orden:
const { data, error } = await supabase.storage
  .from('originals')
  .download(`album-1/photo-123.jpg`);

const arrayBuffer = await data.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
```
