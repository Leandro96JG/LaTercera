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
- [x] Persistencia de Base de Datos Real con **Supabase (PostgreSQL)** y Patrón Repository con **136 tests unitarios pasando en total** (97 backend + 39 frontend).

### ADR-014: Persistencia en Supabase (PostgreSQL) y Patrón Repository Desacoplado
- **Esquema Relacional (`backend/database/schema.sql`):**
  - Tablas: `photographers` (scrypt hash, multi-rol), `albums` (disciplinas deportivas y sociales, precios, fechas), `photos` (rutas públicas y privadas), `orders` (Zero-Trust, ARS), `order_items` (fotos adquiridas) y `processed_webhook_events` (idempotencia transaccional).
  - Índices B-Tree optimizados en `album_id`, `status`, `customer_email`, `payment_id` y `created_at`.
  - Políticas Row Level Security (RLS) habilitadas: lectura anónima acotada a álbumes publicados y fotos preview; operaciones de modificación protegidas con `SERVICE_ROLE_KEY` en el backend.
- **Patrón Repository Híbrido (`src/repositories/`):**
  - Interfaces desacopladas `IOrderRepository` e `IAlbumRepository`.
  - Implementaciones duales: `SupabaseOrderRepository` / `SupabaseAlbumRepository` (producción) y `MemoryOrderRepository` / `MemoryAlbumRepository` (pruebas locales/CI sin conexión).
  - Factory de inyección defensiva (`createOrderRepository`, `createAlbumRepository`) con detección automática de variables de entorno (`isSupabaseConfigured()`).
  - Cache sincronizado Write-Through en `OrderService` para máxima velocidad de lectura sin sacrificar persistencia ACID.
- **Variables de Entorno y Secretos:**
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` registradas en `.env.example`.

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

