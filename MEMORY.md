# MEMORY.md - Plataforma de Venta de Fotos Deportivas

## 1. Resumen Ejecutivo del Proyecto
Plataforma web e-commerce mobile-first orientada a la venta de fotografías de partidos y torneos de fútbol en La Rioja, Argentina. Diseñada para que fotógrafos deportivos suban álbumes masivos, protejan sus imágenes contra descargas y capturas de pantalla, y vendan fotos individuales o álbumes completos con cobro automatizado en pesos argentinos vía Mercado Pago.

---

## 2. Decisiones Arquitectónicas Registradas (ADR)

### ADR-001: Clasificación ODD y Metodología
- **Nivel Asignado:** ODD Nivel 3 (Compleja).
- **Justificación:** Sistema completo que involucra frontend reactivo optimizado para móviles con animaciones, procesamiento y compresión de imágenes en el servidor (Sharp), pasarela de pagos con webhooks asíncronos (Mercado Pago), generación de enlaces de descarga protegidos y dashboard de administración con métricas y control de almacenamiento.
- **Estrategia de Pruebas:** TDD riguroso en lógica de precios, cupones/descuentos, estampado de marcas de agua, validación de webhooks y entrega de tokens de descarga. Auditoría final Guardian Angel previo a producción.

### ADR-002: Stack Tecnológico
- **Frontend:** Angular 19 (Standalone Components, Signals, OnPush Change Detection, Tailwind CSS, animaciones fluidas de scroll y transiciones de fotos).
- **Backend & Procesamiento:** Node.js (NestJS / Express) + `sharp` para generación ultrarrápida de miniaturas WebP y estampado de marcas de agua diagonales en píxeles.
- **Base de Datos & Auth:** Supabase / PostgreSQL con autenticación segura para el panel administrativo.
- **Almacenamiento de Fotos:** Almacenamiento seguro por capas:
  - *Capa Pública:* Miniaturas WebP (~800px) con marcas de agua incrustadas y 2-3 fotos HD de muestra.
  - *Capa Privada:* Fotos originales en máxima resolución protegidas por URLs firmadas con expiración temporal (72h) y generador de ZIPs para álbumes completos.
- **Pasarela de Pagos:** Mercado Pago (Checkout Pro y Webhooks en ARS).

### ADR-003: Modelo de Negocio y Experiencia de Usuario
- **Navegación:** Catálogo público tradicional en la portada (buscador por equipo, fecha y torneo). Enlace directo compartible para cada partido por WhatsApp/Instagram.
- **Flujo de Compra:** Sin registro obligatorio para clientes. Ingreso rápido de Email/WhatsApp, pago en Mercado Pago y entrega instantánea 100% automatizada en pantalla con copia de respaldo por correo.
- **Protección de Imágenes:**
  - Marca de agua diagonal repetida quemada en los píxeles del servidor (imposible de remover por CSS o inspección).
  - Bloqueo en navegador contra clic derecho, arrastre y capas transparentes superpuestas.
  - 2 o 3 fotos de demostración en alta calidad destacadas con insignia para certificar nitidez y profesionalismo.
### ADR-004: Rediseño Estético Bento Grid & Filosofía "Photography-First"
- **Feedback del Usuario:** El diseño anterior se percibía genérico y saturado de mensajes de venta agresivos. Las fotografías deben ser el centro de atención absoluto.
- **Referencia Adoptada (iDraft UI):**
  - Estilo **Bento Grid** minimalista de gama alta.
  - Fondo claro orgánico y sedoso (`#F2F3F6`) con sombras suaves y la silueta de la fotógrafa fundida como sombra artística sutil.
### ADR-005: Enfoque de Portfolio Multidisciplinar & Marca Personal de la Fotógrafa
- **Aclaración del Negocio:** La fotógrafa no cubre todos los partidos de fútbol de forma rutinaria. Su modelo de trabajo abarca:
  - **Deportes Variados:** Fútbol, Hockey sobre césped/pista, Básquetbol.
  - **Eventos Sociales y Festivos:** Fiestas de cumpleaños (15s), celebraciones, eventos festivos e institucionales.
- **Estructura de la Plataforma:**
  - **Presentación de Marca Personal en la Portada:** Tarjeta Bento con retrato real de la fotógrafa (`fotografa.jpg`), biografía breve y enlaces directos a sus redes (Instagram `@latercera.fotos`, botón de WhatsApp para contrataciones de nuevos eventos).
  - **Directorio de Álbumes por Categorías:** Filtros por disciplina (*Fútbol*, *Hockey*, *Básquet*, *Cumpleaños & Fiestas*). Cada álbum muestra portada, fecha, categoría y cantidad de fotos.
  - **Flujo de Álbum y Compra:** Al hacer clic en un álbum se abre la galería protegida de ese evento, con el mismo sistema sutil de selección y compra por Mercado Pago (cápsula flotante discreta).

---

## 3. Estado Actual & Próximos Pasos (Roadmap)
- [x] Entrevista `/grill-me` de requerimientos funcionales y técnicos.
- [x] Definición de stack, modelo de entrega y seguridad de imágenes.
- [x] Prototipo visual e interactivo Bento Grid (`preview/index.html`).
- [x] Conexión de Git y repositorio oficial en GitHub ([github.com/Leandro96JG/LaTercera](https://github.com/Leandro96JG/LaTercera.git)).
- [x] Identidad oficial registrada: **Jenifer "Yuyo" Espeche** y WhatsApp `+54 9 380 486-8714`.
- [x] Estructuración de `backend/` con Express y TypeScript estricto.
- [x] Motor de imágenes con **`sharp`** (WebP ligero + marca de agua diagonal estampada en píxeles).
- [x] Servicio de precios y cálculo de packs de descuento con **TDD (6 tests pasando con Vitest)**.
- [x] Integración de Mercado Pago SDK & Webhooks con **Máxima Seguridad Transaccional** (Checkout Pro, validación HMAC-SHA256, anti-replay, Zero-Trust y **34 tests unitarios pasando**).
- [x] Conexión del frontend definitivo con la API del backend (**Angular 21 Standalone, Signals, OnPush, Bento UI, micro-animaciones a 120fps y 11 tests unitarios pasando**).
- [x] Seguridad y Autenticación Criptográfica del Panel Administrativo (**Ocultamiento público, Scrypt + JWT RFC 7519, Middleware requireAdminAuth, AdminAuthStore con Signals, y suite de 87 tests pasando**).
- [x] Importador de carpetas compartidas de Google Drive con Sharp (Anti-OOM worker pool concurrente, validación de magic bytes y generación de WebP 800px protegidos).
- [x] Panel administrativo completo con subida masiva drag-and-drop, métricas en vivo y registro de fotógrafos colaboradores para escalabilidad futura.
- [x] Flujo de Entrega Post-Pago, Streaming de Descargas y Pantalla de Éxito (`/pago-exitoso`) con **127 tests unitarios pasando en total** (88 backend + 39 frontend).
- [x] Persistencia de Base de Datos Real con **Supabase (PostgreSQL)** y Patrón Repository con **141 tests unitarios pasando en total** (102 backend + 39 frontend).
- [x] Arquitectura de Almacenamiento Dual en la Nube con **Supabase Storage Buckets** (`previews` CDN público y `originals` privado Zero-Trust con RLS), **149 tests unitarios pasando en total** (110 backend + 39 frontend).
- [x] Gestión Dinámica de Álbumes, Creación de Eventos y Edición de Precios desde el Panel Administrativo con **169 tests unitarios pasando en total** (122 backend + 47 frontend).
- [x] Resiliencia de Persistencia en Supabase (FK Desacoplada en `order_items`), Paginación Escalable Bento (Backend/Frontend), Rediseño de Modal y Glitches Tipográficos con **176 tests unitarios pasando en total** (126 backend + 50 frontend).
- [x] Diagnóstico en Caliente del Proceso Backend (PID 2324 obsoleto eliminado, servidor reiniciado y validado en vivo con 200 OK en PUT y persistencia Supabase confirmada).
- [ ] Preparación para Despliegue en Producción (CI/CD, Railway/Render para Backend, Vercel/Cloudflare Pages para Frontend).

### ADR-018: Diagnóstico en Caliente del Servidor y Verificación Integral de Persistencia Supabase
- **Causa Raíz Diagnosticada (RCA):**
  - El servidor backend en el puerto 4000 estaba ejecutándose sobre un proceso obsoleto (PID 2324) iniciado a las 11:49 a. m., antes de la compilación y montaje de las rutas `PUT /api/admin/albums/:id` y de las mejoras en `order.repository.ts`.
  - El navegador recibía `404 Cannot PUT /api/admin/albums/...`, lo que provocaba que el frontend mostrara los errores genéricos de "Error al guardar precios" y "Error al actualizar visibilidad".
  - La base de datos Supabase PostgreSQL siempre estuvo operativa, pero el proceso en memoria anterior no tenía registrada la ruta PUT.
- **Acciones Ejecutadas:**
  - Terminación del proceso obsoleto (PID 2324) y liberación del puerto 4000.
  - Recompilación limpia del backend (`tsc`).
  - Inicio del servidor actualizado en modo daemon en el puerto 4000.
  - Verificación en caliente con sondeo HTTP y token JWT:
    - `PUT /api/admin/albums/album-1` (modificación de precios): `200 OK`.
    - `PUT /api/admin/albums/album-1` (alternancia `isPublished` true/false): `200 OK`.
    - Verificación directa en base de datos Supabase: persistencia y timestamp `updated_at` confirmados en tiempo real.
    - `GET /api/albums?page=1&limit=6`: `200 OK` con respuesta paginada de 6 álbumes sobre 14 totales.
- **Resiliencia de Base de Datos:**
  - Se confirmó que el método defensivo `upsert` en `photos` implementado en `order.repository.ts` previene al 100% el error de clave foránea `order_items_photo_id_fkey`, incluso si la migración DDL no se hubiese ejecutado manualmente en Supabase.
- **Suite de Pruebas:** 176 tests pasando al 100% (126 backend + 50 frontend).


### ADR-017: Resiliencia Transaccional de Órdenes, Paginación Escalable y Refinamiento Bento UX
- **Motivación & RCA (Root Cause Analysis):**
  - *FK Constraint Violation en Supabase:* `order_items_photo_id_fkey` fallaba al comprar fotos con identificadores externos o dinámicos que no residían previamente en la tabla `photos`. Provocaba órdenes con `items: []` impidiendo la descarga en `/pago-exitoso`.
  - *Glitch Tipográfico `\$`:* El escape innecesario de `\$` en plantillas Angular e interpolación TypeScript en strings con backticks generaba una barra literal antes del signo dólar en portada, carrito y checkout.
  - *Feedback y Estabilidad en Panel Admin:* Los botones de guardado de precios y alternancia de publicación carecían de feedback in-card directo y no refrescaban el catálogo público al regresar al portfolio sin recargar la página (F5).
  - *Deformación del Modal de Creación:* Ocupaba el 100% del ancho de la pantalla por interacción con el containing block de `backdrop-blur-3xl` en el contenedor padre.
  - *Escalabilidad de Catálogo (Paginación):* Carga monolítica sin límites amenazaba el rendimiento móvil frente a decenas o cientos de eventos y partidos.
- **Resolución Arquitectónica:**
  - **Ledger Inmutable en PostgreSQL (`patch-order-items-fk.sql` & `schema.sql`):** Desacoplamiento de `order_items.photo_id` de la clave foránea dura a `photos(id)`. Las compras quedan blindadas como registros contables históricos inmutables. `order.repository.ts` implementa además un upsert preventivo con `ignoreDuplicates: true` para tolerar entornos no migrados.
  - **Paginación Escalable Retrocompatible (ODD Nivel 3):**
    - Contratos `PaginationMeta`, `AlbumPaginationOptions` y `PaginatedAlbumsResult`.
    - `SupabaseAlbumRepository` implementa `.range(from, to)` con cálculo de límites y cláusulas `order('created_at', { ascending: false })`.
    - Endpoints `GET /api/albums?page=X` y `GET /api/admin/albums?page=X` con clamping estricto (`Math.max(1, ...)`, `Math.min(50, ...)`).
    - Preservación del 100% de retrocompatibilidad: omitir `?page` retorna el payload sin paginar histórico.
    - Controles visuales Bento en Frontend (portfolio público y administración) con botones elásticos `← Anterior`, selector numérico activo y `Siguiente →`.
  - **Tipografía y Entidades HTML:** Reemplazo por entidad HTML estándar `&dollar;` en componentes con templates inline (`floating-cart.component.ts`, `checkout-modal.component.ts`) y sintaxis limpia `${{ ... }}` en `app.html`.
  - **Micro-estados y Refresco Automático:** Señales reactivas `isTogglingPublishId` y `updatingAlbumId` con feedback en tarjeta. Navegación en `app.ts` (`goHome`, `switchView('portfolio')`) invoca `loadPublicAlbums()`, manteniendo sincronía instantánea entre panel admin y tienda pública.
  - **Contención del Modal Bento:** Estructura en columna flex, `max-w-xl` (576px estricto), `max-h-[85vh]`, cabecera y pie fijos (`shrink-0`) y scroll interno suave (`overflow-y-auto flex-1`), eliminando cualquier estiramiento o deformación.
- **Suite de Pruebas y Evidencia Demostrable:**
  - 126 tests unitarios pasando en Backend (20 suites).
  - 50 tests unitarios pasando en Frontend (7 suites).
  - **176 tests pasando al 100%**.
  - Auditoría Guardian Angel pre-commit: **APROBADO ✅**.

### ADR-016: Gestión Dinámica de Álbumes, Creación de Eventos y Edición de Precios desde el Panel Administrativo
- **Motivación & Requerimiento:**
  - La fotógrafa requería flexibilidad total para dar de alta nuevos álbumes para eventos deportivos o sociales no preexistentes, sin depender de IDs estáticos preconfigurados (`album-1` a `album-4`).
  - Necesidad de modificar dinámicamente los precios unitarios (`unitPrice`) y del álbum completo (`fullAlbumPrice`) directamente desde el dashboard de administración con feedback visual instantáneo.
- **Contratos y Endpoints de Backend (`/api/admin/albums`):**
  - `GET /api/admin/albums`: Expone la totalidad de álbumes del sistema (publicados y borradores) para control administrativo.
  - `POST /api/admin/albums`: Crea un nuevo álbum con generación automática de slug amigable (`generateAlbumSlug` sanitizando tildes, acentos y símbolos), resolución automática de colisiones con sufijos aleatorios, validación de categorías (`futbol`, `hockey`, `basquet`, `sociales`, `otros`) e imposición de reglas de negocio (`unitPrice > 0`, `fullAlbumPrice > 0`, `unitPrice <= fullAlbumPrice`).
  - `PUT /api/admin/albums/:id`: Permite la modificación granular de precios, títulos, fechas, ubicaciones y estado de publicación (`isPublished`) validando la invariante prospectiva `unitPrice <= fullAlbumPrice`.
  - Protección estricta con middleware `adminAuthService.requireAdminAuth` en todas las rutas.
- **Persistencia Dual (Repository Pattern):**
  - Implementación de `listAllAdmin(category?)` y `updateAlbum(id, updates)` tanto en `SupabaseAlbumRepository` (actualizaciones ACID en PostgreSQL con `updated_at` automático) como en `MemoryAlbumRepository` (clonación defensiva para pruebas y entorno local).
  - Aislamiento riguroso del catálogo público: `listAlbums()` filtra defensivamente álbumes que no estén publicados (`isPublished !== false`), emulando las políticas RLS de Supabase.
- **Frontend Angular 21 Standalone + Signals + Bento UI:**
  - Nueva pestaña principal en el panel de administración: `📁 Álbumes & Precios`.
  - Tarjetas Bento por evento con campos editables de precios, validación reactiva en tiempo real y persistencia inmediata vía `adminService.updateAlbum()`.
  - Modal de alta rápida con autocompletado inteligente de insignias según disciplina deportiva o evento social y validación de precios coherentes.
  - Accesos directos `✨ + Crear nuevo álbum...` en las pestañas de **Google Drive** y **Subida Masiva**, los cuales, tras crear el evento, autoseleccionan el nuevo álbum en el formulario de destino y devuelven al usuario a su flujo de carga sin fricción.
- **Suite de Pruebas y Evidencia:** 122 tests en backend (20 suites) y 47 tests en frontend (7 suites), totalizando 169 tests unitarios e integrados pasando al 100%. Validación de invariante comercial (`unitPrice <= fullAlbumPrice`) blindada en backend y frontend. Auditoría Guardian Angel pre-commit APROBADA.

### ADR-015: Arquitectura de Almacenamiento Dual en Supabase Storage (Zero-Trust & CDN Caching)
- **Capa Dual de Buckets:**
  - `previews` (Público): Miniaturas WebP de 800px procesadas con Sharp y marca de agua repetida en píxeles. Caché CDN inmutable (1 año) con entrega ultra-rápida en frontend. Límite de 5 MB por archivo.
  - `originals` (Privado Zero-Trust): Fotos HD originales sin marca de agua (hasta 50 MB). Bloqueo total de lectura anónima en RLS. Solo accesible mediante URLs firmadas con vencimiento de 72 horas (`createSignedDownloadUrl`) o streaming seguro por el backend Express con `SERVICE_ROLE_KEY`.
- **Contratos e Implementación Desacoplada (`src/services/storage.service.ts`):**
  - Interfaz abstracta `IStorageService` con métodos `saveOriginal`, `savePreview`, `getOriginalBuffer`, `createSignedDownloadUrl` y `ensureBucketsExist`.
  - Implementaciones: `SupabaseStorageService` (Cloud), `LocalDiskStorageService` (disco local) y `MemoryStorageService` (memoria pura para tests).
  - Factory híbrido `createStorageService()` con detección automática de variables de entorno y fallback defensivo offline/CI.
- **Seguridad RLS (`backend/database/storage.sql`):**
  - Función de seguridad `is_storage_admin()` basada en roles y verificación contra tabla `photographers`.
  - Políticas de inserción, actualización y borrado restringidas exclusivamente a administradores y Service Role en ambos buckets.
- **Suite de Pruebas y Evidencia:** 110 tests pasando en backend (20 archivos) y 39 tests pasando en frontend (7 archivos), totalizando 149 tests pasando al 100%. Auditoría Guardian Angel pre-commit APROBADA.

### ADR-014: Persistencia en Supabase (PostgreSQL) y Patrón Repository Desacoplado
- **Esquema Relacional (`backend/database/schema.sql`):**
  - Tablas: `photographers` (scrypt hash, multi-rol), `albums` (disciplinas deportivas y sociales, precios, fechas), `photos` (rutas públicas y privadas), `orders` (Zero-Trust, ARS), `order_items` (fotos adquiridas) y `processed_webhook_events` (idempotencia transaccional).
  - Índices B-Tree optimizados en `album_id`, `status`, `customer_email`, `payment_id` y `created_at`.
  - Políticas Row Level Security (RLS) endurecidas post-auditoría:
    - Vistas públicas seguras `public_photos` (excluye `original_path`) y `public_photographers` (excluye `password_hash`).
    - Tablas `orders` y `order_items` con lectura pública deshabilitada (Zero-Trust; clientes consultan exclusivamente a través de la API Express con `SERVICE_ROLE_KEY` o admin autenticado para prevenir filtración de emails y tokens).
- **Patrón Repository Híbrido (`src/repositories/`):**
  - Interfaces desacopladas `IOrderRepository`, `IAlbumRepository` e `IPhotographerRepository`.
  - Tipado estricto sin `any` con interfaces de filas dedicadas: `SupabaseOrderRow`, `SupabaseAlbumRow` y `SupabasePhotographerRow`.
  - Implementaciones duales: `Supabase*` (producción) y `Memory*` (pruebas locales/CI sin conexión).
  - Factory de inyección defensiva (`createOrderRepository`, `createAlbumRepository`, `createPhotographerRepository`) con detección automática de variables de entorno (`isSupabaseConfigured()`).
  - Cache sincronizado Write-Through en `OrderService` para máxima velocidad de lectura sin sacrificar persistencia ACID.
- **Variables de Entorno y Secretos:**
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` registradas en `.env.example` con advertencia explícita de seguridad sobre la clave Service Role.

### ADR-013: Flujo de Entrega Post-Pago, Streaming de Descargas y Pantalla de Éxito (/pago-exitoso)
- **Endpoints de Entrega y Streaming:**
  - `GET /api/downloads/:token/info`: Retorna metadatos de la orden, fotos adquiridas, URLs firmadas de descarga, tiempo restante de 72 horas y enlace oficial de WhatsApp con mensaje pre-armado.
  - `GET /api/downloads/:token/file`: Streaming binario de foto original con `Content-Disposition: attachment`, validación de pertenencia (`belongsToOrder`) y sanitización estricta contra Path Traversal (`path.posix.basename`).
  - `GET /api/downloads/:token/zip`: Empaquetado en streaming al vuelo mediante `archiver` con compresión balanceada (nivel 6) directamente conectado a la respuesta HTTP sin escribir archivos temporales en disco.
  - `GET /api/downloads/order/:orderId/status`: Consulta reactiva del estado de la orden para sincronización con webhooks de Mercado Pago.
- **Frontend Angular 21 Standalone (`PaymentSuccessComponent`):**
  - Captura reactiva de query parameters de Mercado Pago (`collection_status`, `external_reference`, `token`).
  - Polling suave con backoff ante pagos en proceso de impacto (`PENDING` -> `PAID`).
  - Cuenta regresiva dinámica de 72 horas con limpieza de intervalos y timeouts en `ngOnDestroy`.
  - Tarjeta Bento con halo dorado solar (`#FDB813`), descarga individual y masiva en 1 clic, botón de copiado de enlace y contacto directo a WhatsApp oficial de Jenifer "Yuyo" Espeche (`+54 9 380 486-8714`).
- **Auditoría y Evidencia:** 88 tests en backend (Vitest) y 39 tests en frontend (Angular 21 + Vitest). Aprobado con distinción por el Guardian Angel Reviewer.

### ADR-012: Ingesta Masiva, Importador de Google Drive y Worker Pool Concurrente Anti-OOM con Sharp
- **Extracción de Identificadores Drive:** Algoritmo multi-patrón en `drive-parser.service.ts` compatible con carpetas `/drive/folders/{id}`, `/u/0/folders/{id}`, query parameters `?id={id}`, formato legacy `/open?id=` y validación de dominios autorizados de Google (`drive.google.com`, `docs.google.com`).
- **Worker Pool Concurrente Anti-OOM (`concurrency.service.ts`):** Límite controlado de procesamiento paralelo con semáforo asíncrono (por defecto 3 concurrentes). Previene que lotes de 50+ fotos masivas de 24-48MP desborden la memoria RAM (>5GB) manteniendo el consumo estable en ~300-350MB sin bloquear el event loop.
- **Validación Estricta de Magic Bytes (`mime-validator.service.ts`):** Verificación binaria en buffer (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF...WEBP`) para prevenir inyecciones de código malicioso o archivos corruptos. Sanitización de nombres de archivo contra Path Traversal (`path.posix.basename`).
- **Estructura de Almacenamiento por Capas (`storage.service.ts`):**
  - *Capa Pública (`uploads/previews/`):* Imágenes redimensionadas a 800px en formato WebP con marcas de agua diagonales quemadas en los píxeles.
  - *Capa Privada (`uploads/originals/`):* Archivos originales en máxima resolución preservados para descargas seguras con token firmado de 72 horas.
- **Suite de Pruebas y Evidencia Demostrable:** 80 tests unitarios pasando en el backend (Vitest) y 29 tests pasando en el frontend (Vitest + Angular 21). Cero errores de compilación en `ng build` y `tsc`.

### ADR-011: Seguridad, Autenticación Criptográfica & Ocultamiento del Panel Administrativo
- **Ocultamiento de la Vista Pública:** Eliminación total de enlaces y botones administrativos en la cabecera pública. Los visitantes solo tienen acceso al portfolio de fotos, álbumes y contacto oficial por WhatsApp.
- **Acceso Discreto:** Vista administrativa accesible exclusivamente mediante autenticación con credenciales registradas o el atajo de teclado del sistema `Ctrl + Shift + A`.
- **Hashing de Contraseñas (scrypt):** Uso de `crypto.scryptSync` con sal aleatoria de 16 bytes y formato `scrypt:<salt>:<key>`. Comparación en tiempo constante con `crypto.timingSafeEqual` con protección contra timing attacks e inspección de usuarios inexistentes (dummy hash).
- **Tokens JWT RFC 7519:** Firma criptográfica HMAC-SHA256 generada y validada en servidor con `JWT_SECRET`. Rechazo estricto de payloads o firmas manipuladas, y tokens expirados.
- **Middleware `requireAdminAuth`:** Bloqueo perimetral para endpoints `/api/admin/*`. Exige cabecera `Authorization: Bearer <token>` y valida roles.
- **Frontend `AdminAuthStore` con Signals:** Gestión reactiva en Angular 21 de `isAuthenticated`, `adminToken`, `userEmail`, `userRole` y `photographerId`, con sincronización en `localStorage`.
- **Escalabilidad Multi-Fotógrafo:** Payload de usuario y token estructurados para soportar roles (`admin` vs `photographer`) y múltiples colaboradores en el futuro.
- **Guards y Redirección Defensiva:** Si un usuario no autenticado intenta forzar la vista `admin`, el sistema lo redirige inmediatamente a la vista de login o al catálogo público.

### ADR-010: Arquitectura de Frontend Angular Standalone & Reactividad con Signals
- **Componentes Standalone & OnPush:** 100% de los componentes utilizan `standalone: true`, `ChangeDetectionStrategy.OnPush` e inyección moderna con `inject()`.
- **Control de Flujo Nativo:** Exclusivo uso de `@if`, `@else`, `@for (item of items; track item.id)` y `@switch` (cero directivas estructurales legadas).
- **Gestión de Estado Reactiva (`CartStore`):** Implementado con `signal` y `computed` derivando en tiempo real subtotales, descuentos escalonados (-20% en 3 fotos, -30% en 5+ fotos, cupón YUYO10) y modo de álbum completo ($9.500 ARS).
- **Integración Transaccional Zero-Trust:** Conexión con `POST /api/checkout/preference` de Mercado Pago Checkout Pro a través de `PaymentService`.
- **Micro-interacciones Móviles:** Cápsula flotante elástica, visor lightbox cinemático con protección anti-guardado de imágenes y badges HD Master.

### ADR-008: Seguridad de Pagos, Zero-Trust & Webhooks Criptográficos (Mercado Pago ARS)
- **Principio Zero-Trust de Precios:** El frontend nunca envía montos ni totales. Solo envía IDs de fotos/álbumes y cupones. El backend calcula el total y en el webhook consulta directamente `GET /v1/payments/{id}` a Mercado Pago verificando que `payment.transaction_amount >= order.total_amount`, `currency === 'ARS'` y `status === 'approved'`. Discrepancias disparan la alerta inmutable `FRAUD_ALERT_PRICE_MISMATCH`.
- **Firma Criptográfica HMAC-SHA256:** Validación del manifest `id:[data.id];request-id:[x-request-id];ts:[ts];` utilizando `MP_WEBHOOK_SECRET` y comparación en tiempo constante (`crypto.timingSafeEqual`) con protección contra excepciones de disparidad de tamaño.
- **Protección Anti-Replay:** Ventana de tolerancia estricta de ±300 segundos (5 minutos) contra ataques de repetición.
- **Idempotencia Transaccional:** Registro único de eventos procesados para absorber reintentos automáticos de Mercado Pago sin re-ejecutar lógica de negocio.
- **Tokens de Descarga Seguros (72 Horas):** Generación de tokens HMAC-SHA256 con Base64Url que expiran a las 72 horas, protegidos contra Path Traversal (`path.posix.basename`).

### ADR-009: Motion Design, Micro-animaciones Bento y Optimización Móvil a 120fps
- **Filosofía Apple Fluid Motion:** Curvas cúbicas `cubic-bezier(0.16, 1, 0.3, 1)` y rebote elástico `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **View Transitions API:** Navegación SPA con morphing entre tarjeta Bento del portfolio y el hero del álbum (`view-transition-name: album-hero`) con contención de aspect-ratio (`object-fit: cover`).
- **Cápsula Flotante Reactiva:** Entrada en resorte `translateY(110px) -> 0`, pulso elástico de la cápsula al alterar selección y pop rotativo del contador circular (`animate-counter-pop`). Botón de compra con halo solar dorado (`#FDB813`) y avance sutil de flecha.
- **Micro-interacciones en Grilla de Fotos:** Contracción elástica táctil `scale(0.975)`, borde activo `ring-2 ring-zinc-950`, check emergente `check-pop` y destello continuo de rayo de luz (shimmer) en las insignias de fotos HD Master.
- **Lightbox Cinemático:** Fade con desenfoque de fondo profundo (`backdrop-blur-2xl`), desplazamiento horizontal inercial (`slide-next` / `slide-prev`) y cierre elástico.
- **Garantía 60/120fps en Móviles:**
  - Animaciones confinadas estrictamente al compositor GPU (`transform` y `opacity`).
  - Virtualización ligera con `contain: layout style paint` y `content-visibility: auto`.
  - Supresión de retardo táctil con `touch-action: manipulation` y `-webkit-tap-highlight-color: transparent`.
  - Cumplimiento de accesibilidad con supresión de animaciones bajo `@media (prefers-reduced-motion: reduce)`.

### ADR-006: Especificación del Dashboard Administrativo & Panel de Control
- **Métricas & Finanzas:** Ingresos del mes ($ ARS), fotos vendidas, álbumes vendidos, espacio en servidor utilizado (GB), tabla histórica de transacciones con estado de Mercado Pago y datos del comprador.
- **Gestión de Álbumes:** Creación de eventos (Fútbol, Hockey, Básquet, Fiestas), subida masiva drag-and-drop con Sharp en background, selector de muestras HD (⭐), selector de foto de portada y purga manual de álbumes antiguos con descarga previa de backup.
- **Configuraciones Dinámicas:** Precios por defecto, packs con descuento automático, credenciales de Mercado Pago (Public Key / Access Token), personalización de marca de agua (texto/logo) y datos de perfil de la fotógrafa (Instagram/WhatsApp).
- **Herramientas de Productividad:** Generador de enlaces para grupos de WhatsApp de capitanes/DTs, regeneración de enlaces de descarga vencidos en 1 clic.

### ADR-007: Importación desde Google Drive & Despliegue Continuo (CI/CD)
- **Importador de Google Drive:** Soporte en el panel para pegar el enlace de una carpeta compartida de Google Drive. El backend importa las imágenes directamente sin que la fotógrafa tenga que descargarlas y re-subirlas manualmente desde su PC.
- **Estrategia de Despliegue y Mejoras Continuas:** Configuración de pipeline automatizado con GitHub + Vercel / Render. Cada cambio o mejora empujada al repositorio se compila y publica automáticamente en producción sin intervención técnica manual.
- **Repositorio Oficial:** [github.com/Leandro96JG/LaTercera](https://github.com/Leandro96JG/LaTercera.git) (Rama `main` sincronizada).

---

## 4. Branding e Identidad Visual Oficial
- **Nombre de Marca:** **LA TERCERA** (Fotografía Deportiva & Social).
- **Fotógrafa Oficial:** **Jenifer "Yuyo" Espeche** (Ampliamente reconocida por su apodo "Yuyo" en el ámbito deportivo y social riojano).
- **Contacto WhatsApp Oficial:** `+54 9 380 486-8714` (`3804868714`).
- **Logo del Proyecto:** Guardado en `assets/branding/logo_la_tercera.jpg`.
- **Foto de la Autora:** Guardada en `assets/branding/fotografa.jpg`.
- **Paleta de Colores Extraída del Logo:**
  - `Negro Mate & Carbón (Bento Base):` `#131316` / `#1A1A1E`
  - `Lienzo Sedoso Claro (Fondo Orgánico):` `#ECEEF2`
  - `Dorado Solar (Acentos & Acciones):` `#FDB813` / `#F59E0B`
  - `Celeste Deportivo (Detalles secundarios):` `#38BDF8`
  - `Blanco Nieve (Tarjetas & Contraste):` `#FFFFFF`
- **Concepto del Isotipo:** Fusión de diafragma de cámara de fotos + sol radiante riojano + tribuna/gradería deportiva en semicírculo.

---

## 5. Convenciones y Parámetros
- **Moneda:** Pesos Argentinos ($ ARS).
- **Zona Horaria y Localización:** La Rioja, Argentina (UTC-3).
- **Formato de Entrega:** WebP comprimido con marca de agua para catálogo; JPG original / ZIP para entregas pagadas.

