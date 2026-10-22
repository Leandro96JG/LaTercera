# Reglas de Negocio e Invariantes Inquebrantables - LA TERCERA

> [!IMPORTANT]
> **DOCUMENTO NORMATIVO VINCULANTE (ZERO-TRUST)**
> Las reglas y restricciones descritas en este documento constituyen las invariantes de negocio, seguridad y arquitectura de **LA TERCERA** (Fotografía Deportiva y Social - Jenifer "Yuyo" Espeche, La Rioja, Argentina).
> Ningún desarrollo futuro, refactorización o corrección de bugs puede flexibilizar, puentear o vulnerar estas normas bajo ninguna circunstancia.

---

## 1. Protección de Imágenes en 3 Capas

La integridad y comercialización de los activos visuales de la fotógrafa se protegen mediante una estrategia defensiva de tres capas estrictamente desacopladas:

```
[Cliente Web / Móvil]
       │
       ├─► 1. Previews Públicas (Bucket 'previews'): WebP 800px + Marca de agua quemada en píxeles (Sharp)
       ├─► 2. Muestras HD (isSampleHd): WebP máx. 1400px + Marca translúcida + Badge '✦ LA TERCERA HD MASTER'
       └─► 3. Originales (Bucket 'originals'): Privado Zero-Trust. Streaming / Signed URLs (72h) solo tras pago confirmado
```

### Capa 1: Catálogo Público (`previews` bucket)
- **Formato y Resolución:** Miniaturas WebP optimizadas a máximo 800px en su lado mayor (`sharp.resize(800, 800, { fit: 'inside' })`).
- **Marca de Agua Quemada en Píxeles:** Marca de agua diagonal generada vectorialmente con SVG y fusionada de manera destructiva en los píxeles de la imagen con `sharp.composite()`.
- **Sanitización Obligatoria:** Todo texto de evento o marca de agua debe pasar por `escapeXml()` antes de interpolarse en el SVG para evitar inyecciones XML / SVG.
- **Prohibición Expresa:** Prohibido utilizar marcas de agua basadas en capas HTML/DOM o CSS superpuestas. La protección debe existir en los píxeles del archivo servido por el servidor.

### Capa 2: Muestras HD (`isSampleHd: true`)
- **Resolución:** Máximo 1400px en el lado mayor, permitiendo apreciar nitidez profesional en pantallas Retina y smartphones modernos sin comprometer el original de impresión.
- **Estampado Dual:** Marca diagonal translúcida centrada con el nombre del álbum + insignia física integrada `"✦ LA TERCERA HD MASTER"`.
- **Uso Exclusivo:** Solo hasta 2 o 3 fotos seleccionadas por álbum por la fotógrafa en el panel de administración.

### Capa 3: Archivos Originales (`originals` bucket privado Zero-Trust)
- **Aislamiento Total:** El bucket `originals` de Supabase Storage tiene acceso público completamente bloqueado (RLS estricto, sin lectura anónima).
- **Entrega Condicional:** Solo se entregan tras verificar criptográficamente en backend que la orden asociada tiene estado inmutable `order.status === 'PAID'`.
- **Canal de Entrega:**
  1. **Streaming Binario:** Servido directamente por Node.js Express con `Content-Disposition: attachment` y sanitización estricta contra Path Traversal (`path.posix.basename`).
  2. **Signed URLs:** URLs firmadas con token criptográfico HMAC-SHA256 con ventana de validez estricta de **72 horas**.

---

## 2. Subida Masiva y Procesamiento Anti-OOM (Out Of Memory)

Para operar de forma confiable dentro de los límites de Supabase Storage (Free Tier: máx. 50 MB por archivo) y de los servidores de procesamiento:

1. **Límite Estricto por Archivo:** 50 MB por imagen individual. Archivos superiores son rechazados preventivamente en el middleware `multer` seguro sin provocar fallos 500 en el servidor.
2. **Previsualizaciones en Frontend Ultra-Ligeras:**
   - La selección de archivos en el navegador genera miniaturas locales dibujadas en un Canvas fuera de pantalla redimensionadas a **320x320 píxeles** en formato WebP comprimido.
   - Prohibido acumular objetos `File` o URLs de objeto no controladas que saturen la memoria RAM del smartphone o navegador de escritorio.
3. **Subida en Micro-Lotes Secuenciales (`BULK_UPLOAD_BATCH_SIZE = 4`):**
   - El frontend despacha los archivos en micro-lotes concurrentes de máximo 4 fotos, esperando la confirmación y persistencia exitosa de cada lote antes de emitir el siguiente.
   - Muestra porcentaje exacto y previene la saturación de workers de Sharp en el contenedor Docker.

---

## 3. Álbumes Privados y Álbumes de Cortesía

### Álbumes Privados (`isPrivate: true`)
1. **Validación Criptográfica de PIN:** El acceso requiere un PIN numérico/alfanumérico configurado por la fotógrafa. La verificación en backend debe realizarse en tiempo constante usando `crypto.timingSafeEqual` para prevenir ataques de temporización (*timing attacks*).
2. **Token de Acceso Temporal (`x-album-access-token`):**
   - La validación exitosa emite un token firmado con vida útil de **24 horas**.
   - **Obligatoriedad Absoluta:** La cabecera o parámetro `x-album-access-token` es obligatoria para:
     - Consultar fotos protegidas: `GET /api/albums/:id/photos`
     - Crear preferencia de compra: `POST /api/checkout/preference`
     - Solicitar descargas de cortesía gratuitas.
   - Peticiones sin token o con token expirado/inválido en álbumes privados deben ser rechazadas con código HTTP `403 Forbidden`.

### Álbumes de Cortesía Gratuitos (`isFreeDownload: true`)
1. **Descarga Directa Sin Checkout:** Los álbumes de cortesía institucional o promocional no pasan por la pasarela de Mercado Pago.
2. **Descarga Individual y ZIP:** El usuario puede descargar fotos sueltas o el álbum completo directamente.
3. **Empaquetado ZIP en Modo Store:** El streaming del archivo ZIP usa `archiver` con compresión `zlib: { level: 0 }` (Store / Sin compresión). Dado que las fotos JPEG/WebP ya están comprimidas, esto reduce drásticamente el uso de CPU a casi 0% y permite streaming inmediato a velocidad de red.
4. **Bloqueo de Pagos:** Si un cliente intenta iniciar checkout pago sobre un álbum marcado como `isFreeDownload: true`, la operación debe ser rechazada.

---

## 4. Pagos Zero-Trust (Mercado Pago ARS) y Gestión de Cupones

### Principio Zero-Trust en Precios
- **El Frontend Nunca Envía Precios:** El payload del cliente hacia `POST /api/checkout/preference` solo contiene `albumId`, `photoIds` y opcionalmente `couponCode`.
- **Cálculo de Precios Exclusivo en Backend:** El backend valida la existencia de cada foto, verifica su pertenencia al álbum (`belongsToAlbum`), aplica la sanitización contra Path Traversal y computa los importes según las tarifas vigentes.
- **Tope Automático de Álbum Completo:** Si la suma de las fotos sueltas seleccionadas supera el precio del álbum completo (`fullAlbumPrice`), el backend automáticamente aplica el tope cobrando como máximo el valor del álbum completo.
- **Validación del Webhook de Mercado Pago:**
  - Validación del manifest con firma criptográfica HMAC-SHA256 (`MP_WEBHOOK_SECRET`) y `crypto.timingSafeEqual`.
  - Ventana de tolerancia anti-replay de ±300 segundos (5 minutos).
  - Consulta directa `GET /v1/payments/{id}` a la API oficial de Mercado Pago para comprobar:
    - `status === 'approved'`
    - `currency_id === 'ARS'`
    - `transaction_amount >= order.total_amount`
  - Cualquier discrepancia genera la alerta inmutable `FRAUD_ALERT_PRICE_MISMATCH` y bloquea la entrega.

### Cupones y Sorteos 100% OFF
- **Consumo Atómico con Mutex Lock:** El canje de cupones se ejecuta de forma estrictamente serializada y atómica (`tryConsumeCoupon`) verificando `.lt('used_count', maxUses)` directamente a nivel de base de datos sobre la clave primaria `code`.
- **Bypass de Mercado Pago:** Si el cupón cubre el 100% del valor ($0 ARS), el backend marca la orden como `PAID` inmediatamente, emite los tokens de descarga correspondientes y omite la invocación a la API externa de Mercado Pago.
- **Trazabilidad Contable:** Toda orden persistida incluye `album_title_snapshot` para preservar el registro contable y la descripción histórica aunque el álbum original sufra modificaciones o sea archivado.

---

## 5. Estándares de Experiencia de Usuario e Interfaz (Bento & 3D 120fps)

1. **Cero Diálogos Nativos:** Prohibido el uso de `window.alert()`, `window.confirm()` o `window.prompt()`.
   - Las confirmaciones de acciones destructivas deben implementarse mediante confirmación en dos clics inline (con cuenta regresiva o estado visual transitorio) o modales Bento integrados.
   - Las notificaciones de estado deben utilizar el sistema de Toasts reactivo Bento.
2. **Rendimiento Móvil a 60/120fps:**
   - Queda terminantemente prohibido ejecutar `getBoundingClientRect()` o lecturas síncronas de layout dentro de listeners de eventos continuos (`touchmove`, `scroll`).
   - Las animaciones deben confinarse al compositor de la GPU mediante `transform` y `opacity`.
   - El viewport móvil debe mantener `overflow-x: hidden` a nivel estructural para impedir deslizamientos o rebotes horizontales indeseados.
3. **Accesibilidad y Movimiento Reducido:** Toda animación, rotación 3D o reflejo especular debe deshabilitarse automáticamente cuando el usuario active `@media (prefers-reduced-motion: reduce)`.
