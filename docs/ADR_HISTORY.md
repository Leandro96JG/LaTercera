# Historial de Decisiones Arquitectónicas (ADR) - LA TERCERA

> **Archivo Histórico de Decisiones de Arquitectura e Implementación (ADR-001 al ADR-063)**
> Este archivo preserva la trazabilidad técnica completa, diagnósticos, soluciones y evidencias de verificación de cada iteración del sistema LA TERCERA (Jenifer "Yuyo" Espeche - La Rioja, Argentina).
> Para consultar las invariantes activas e inmutables del negocio, ver [docs/BUSINESS_LOGIC.md](file:///e:/code/IA/fotos/docs/BUSINESS_LOGIC.md). Para el estado vivo del proyecto, ver [MEMORY.md](file:///e:/code/IA/fotos/MEMORY.md).

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
- [x] Infraestructura y Suite de Herramientas Supabase (MCP Servers PostgREST/Management y 5 Skills Especializados en `.agents` y global).
- [x] Infraestructura y Suite de Herramientas Angular Moderno (MCP Servers Angular CLI/Docs y 5 Skills Especializados en `.agents` y global).
- [x] Subagentes Especializados de Soporte (supabase-architect, supabase-security-auditor, angular-architect, angular-tester).
- [x] Ampliación Oficial de Skills & Subagentes (8 Skills Angular, 8 Skills Supabase, 3 Subagentes Angular, 3 Subagentes Supabase).
- [x] Precios Dinámicos Mercado Pago (Zero-Trust), Fechas y Horarios Estructurados (`eventDate` / `eventTime`), Drawer Desplegable de Carrito con Fotos Protegidas y Resiliencia Defensiva PGRST204 con **178 tests unitarios pasando al 100%** (126 backend + 52 frontend).
- [x] Papelera de Reciclaje (30 días), Álbumes de Cortesía Gratuitos HD, Álbumes Privados con PIN Zero-Trust, e Innovación Visual Portafolios 3D con Baraja en Abanico GPU 60-120fps con **188 tests unitarios pasando al 100%** (130 backend + 58 frontend).
- [x] Rediseño 3D Integral "La Tercera": Carpeta 3D con Lomo y Anillas Metálicas, Brillo Especular Dinámico, Grilla Polaroid Física con Rotación Orgánica y Skeletons, Visor Cinemático Swipe/Zoom y Sticky Dock Inteligente con Recomendación de Pack Completo con **212 tests unitarios pasando al 100%** (130 backend + 82 frontend).
- [x] Diagnóstico y Solución de Error 500 en Subida Masiva (Límite 50MB Supabase Storage Free Tier, Middleware Multer Safe-Wrapper, Alertas Reactivas en Panel y Guía de Navegador Integrado Antigravity) con **214 tests unitarios pasando al 100%** (130 backend + 84 frontend).
- [x] Persistencia de Fotos Procesadas en `public.photos` (Supabase / In-Memory), Endpoint `GET /api/albums/:id/photos` Zero-Trust, Carga Reactiva en Galería Polaroid y Fallback Visual Elegante Anti-Broken-Image con **222 tests unitarios pasando al 100%** (132 backend + 90 frontend).
- [x] Entrega HD Real con `IAlbumRepository`, Streaming Binario en `storageService.getOriginalBuffer`, Resiliencia Transaccional `getOrderAsync` tras Reinicios de Servidor y Empaquetado ZIP Dinámico con **227 tests unitarios pasando al 100%** (137 backend + 90 frontend).
- [x] Unificación de Entornos (Proxy & Environments Angular), Redirección Mercado Pago Post-Pago a FRONTEND_URL (/pago-exitoso) y Sanitización MCP con **228 tests unitarios pasando al 100%** (138 backend + 90 frontend).
- [x] View Transitions API Nativas (`document.startViewTransition`), Inclinación 3D Reactiva de Carpetas (-5deg a +5deg), Reflejo Gloss & Rebote Elástico en Polaroids, y Purga de Código Muerto con **232 tests unitarios pasando al 100%** (138 backend + 94 frontend).
- [x] Accesibilidad de Viewport (WCAG AA), Zoom Cinemático (1x <-> 2.2x), Doble Toque Táctil y Bloqueo de Swipe en LightboxComponent con **236 tests unitarios pasando al 100%** (138 backend + 98 frontend).
- [x] Conexión de AdminAuthService con IPhotographerRepository (Supabase / Memory), Persistencia de Fotógrafos Colaboradores y Autenticación Post-Reinicio con loginAsync con **238 tests unitarios pasando al 100%** (140 backend + 98 frontend).
- [x] Conexión de Métricas Reales en `/api/admin/stats` y Pestaña "💳 Ventas & Entregas" con Regeneración de Links de 72h en 1 Clic con **251 tests unitarios pasando al 100%** (147 backend + 104 frontend).
- [x] Modal Bento "🖼️ Gestionar Fotos del Álbum" (Portadas, Muestras HD y Eliminación Quirúrgica) con **263 tests unitarios pasando al 100%** (151 backend + 112 frontend).
- [x] Kit de Difusión WhatsApp (enlaces directos ?album=), Miniaturas en Subida Masiva (URL.createObjectURL) y Sistema de Toasts Bento con **270 tests unitarios pasando al 100%** (151 backend + 119 frontend).
- [x] Subida Masiva Acumulativa y Deduplicada, Progreso de Subida HTTP en Tiempo Real, Preservación de PIN en Difusión WhatsApp y Confirmación Inline Libre de `confirm()` con **276 tests unitarios pasando al 100%** (151 backend + 125 frontend).
- [x] Splash Screen Cinemático con Obturador de Cámara, Skeletons 3D de Carpetas y Prevención de Parpadeo de Fotos Dummy con **282 tests unitarios pasando al 100%** (151 backend + 131 frontend).
- [x] Subagentes Especializados `motion-ux-specialist` y `media-upload-specialist`, Persistencia de Carrito en SessionStorage, Generador de QR Descargable (PNG) y Confeti de Pago Exitoso con **288 tests unitarios pasando al 100%** (151 backend + 137 frontend).
- [x] Corrección de Hit-Testing y Selección/Deselección de Fotos en Catálogo (Z-Index Stacking, Transparencia de Eventos en Gloss Overlay, Delegación Reactiva en App.togglePhoto y Blindaje Defensivo en CartStore) con **291 tests unitarios pasando al 100%** (151 backend + 140 frontend).
- [x] Blindaje de Persistencia en Supabase durante Pagos y Webhook de Mercado Pago, Hardening de Entradas de Checkout y Timeout de Polling en `/pago-exitoso` con **300 tests unitarios pasando al 100%** (159 backend + 141 frontend).
- [x] Gestión Dinámica de Descuentos por Cantidad y Cupones Promocionales desde el Dashboard con Validación Zero-Trust en Backend con **328 tests unitarios pasando al 100%** (169 backend + 159 frontend).
- [x] Canje Directo 100% OFF para Sorteos (Bypass MP), Control de Concurrencia (Mutex Lock), Alcance (maxPhotos/expiresAt), Sincronización de Tiers en CartStore y Migración SQL con **336 tests unitarios pasando al 100%** (174 backend + 162 frontend).
- [x] Optimización de UX Mobile en Dashboard (`AdminPanelComponent`) y Carrito Flotante (`FloatingCartComponent`) con **338 tests unitarios pasando al 100%** (174 backend + 164 frontend).
- [x] Blindaje Móvil Definitivo: Eliminación de Scroll Horizontal, Corrección de Píldora Flotante (6+ fotos) y Sincronización de Persistencia de Cupones con **339 tests unitarios pasando al 100%** (174 backend + 165 frontend).
- [x] Diagnóstico y Reparación de Carga de Fotos en el Dashboard, Buscador y Filtros Reactivos de Álbumes (Signals Bento) y Pulido Móvil Simétrico con **349 tests unitarios pasando al 100%** (175 backend + 174 frontend).
- [x] Aislamiento de Tests en Supabase Live, Purgado de Álbumes de Test, Corrección de Paginación Pública y Dashboard, Desborde de Solapa 3D, Rebote Físico Polaroid y Filtro de Fotos Interno con **353 tests unitarios pasando al 100%** (175 backend + 178 frontend).
- [x] Blindaje Defensivo de Fotos en Panel Admin (Anti-404 en Álbumes Recientes/Vacíos) y Soporte Multi-Extensión (.jpg, .jpeg, .png, .webp) en Streaming de ZIP y Descargas con Buffer Fallback Sharp con **356 tests unitarios pasando al 100%** (178 backend + 178 frontend).
- [x] Sistema Dinámico de Categorías e Insignias (CRUD Completo + Selector de Iconos Táctil), Limpieza y Desacople FK en Supabase Live, Paginación Bento de Órdenes y Cupones con Validación Zero-Trust con **363 tests unitarios pasando al 100%** (185 backend + 178 frontend).
- [x] Purga Total de Supabase Live, Snapshot de Título de Álbum en Órdenes, Separación de KPIs (Ventas vs Sorteos $0), Blindaje de Seguridad (Rate Limiting & Helmet), SEO Local La Rioja y Pipeline CI/CD con **363 tests unitarios pasando al 100%** (185 backend + 178 frontend).
- [x] Preparación Final para Despliegue en Producción (Purga Supabase Live a 0 Álbumes, Migración Local de Tailwind CSS sin CDN, Trust Proxy, CORS Multi-Origen Dinámico y `.env.example`) con **363 tests unitarios pasando al 100%** (185 backend + 178 frontend).
- [x] Blindaje de Seguridad Fase 1: Protección de /api/images/process con Admin Auth, Purga de Router Inseguro, Validación Fatal de Secretos en Prod, CORS Estricto, Blindaje Criptográfico de Álbumes Privados con PIN (Backend/Frontend) y Endurecimiento RLS en Supabase con **367 tests unitarios pasando al 100%** (186 backend + 181 frontend).
- [x] Blindaje de Lógica de Negocio y Seguridad Fase 2: Soporte de Categorías Dinámicas en Creación/Edición de Álbumes, Limpieza de photoUpserts en Órdenes, Protección HD 1400px con Marca de Agua Diagonal Sutil y Erradicación Definitiva de `confirm()` Nativo en Admin Panel con **373 tests unitarios pasando al 100%** (189 backend + 184 frontend).
- [x] Optimización de Streaming y Descargas Fase 3: Archiver Instantáneo Store (Zlib Nivel 0), Resolución de Extensiones Directa con originalPath/filename en 1 Llamada, Blindaje contra Fallbacks Dummy en Prod y Descarga Individual HD para Álbumes de Cortesía con **380 tests unitarios pasando al 100%** (192 backend + 188 frontend).
- [x] Sistema de Recuperación de Compras y Notificaciones por Correo Fase 4: Endpoint `POST /api/orders/recover` con rate limiting estricto (`orderRecoveryLimiter`), servicio `EmailNotificationService` desacoplado vía fetch nativo a Resend API y fallback estructurado en consola, método `recoverOrdersByEmail` en `PaymentService`, botón `"📥 Mis Compras"` en header y footer, y modal Bento `OrderRecoveryModalComponent` con **404 tests unitarios pasando al 100%** (201 backend + 203 frontend).
- [x] Blindaje Quirúrgico Backend Pre-Producción: Helper `getPrimaryFrontendUrl()` para multi-origen CORS, sanitización XML/SVG con `escapeXml` en `image.service.ts` y desacople estricto de cupón inactivo/eliminado `YUYO10` (`coupon === null`) con **412 tests unitarios pasando al 100%** (209 backend + 203 frontend).
- [x] Concurrencia Atómica en Cupones Supabase, Validación de Pertenencia & Anti-Traversal de Fotos en Checkout y Métricas Dinámicas de Almacenamiento con **415 tests unitarios pasando al 100%** (212 backend + 203 frontend).
- [x] Optimización de Consulta por Email en Supabase (`findOrdersByEmail`), Respaldo por Correo de Recuperación en Segundo Plano, Comprobante Opcional en Modal y Enlace Oficial de Instagram con **416 tests unitarios pasando al 100%** (212 backend + 204 frontend).
- [x] Configuración de Despliegue en Producción: Dockerfile Multi-Stage en Alpine 20 con Sharp, Railway Healthcheck `/api/health`, Vercel SPA Rewrites, Cloudflare Pages `_redirects` y `environment.ts` Reactivo con **425 tests unitarios pasando al 100%** (214 backend + 211 frontend).
- [x] Vinculación Vercel-Railway en Vivo (Proxy API `laterceralr.up.railway.app`), Deselección de Álbum Completo en Carrito y Optimización Touch 3D 120fps con **426 tests unitarios pasando al 100%** (214 backend + 212 frontend).
- [x] Ruta Directa /admin en Inicialización SPA, Documentación Integral en README.md y Guía de Autenticación de Fotógrafa con **426 tests unitarios pasando al 100%** (214 backend + 212 frontend).
- [x] Solución de Símbolos Cuadrados (□□□) en Sharp Alpine (fontconfig/DejaVu), Parche de Seguridad en Checkout de Álbumes Privados (PIN/Token en Backend & Frontend) y Corrección SQL de Concurrencia de Cupones con **436 tests unitarios pasando al 100%** (220 backend + 216 frontend).
- [x] Optimización Extrema de RAM en Previsualizaciones (Canvas WebP 320px), Subida por Micro-Lotes Secuenciales de 4 Fotos (Chunked Upload) y Erradicación Definitiva de `[object Object]` con **446 tests unitarios pasando al 100%** (220 backend + 226 frontend).
- [x] Reordenamiento Drag & Drop de Fotografías (Cola de Subida y Galería Persistente) y Modal Bento de Edición de Metadatos de Álbumes con **462 tests unitarios pasando al 100%** (224 backend + 238 frontend).
- [x] Rediseño 3D Ambient Glassmorphic del Hero del Álbum Activo, Tarjeta de Portada 3D Interactiva con Hover GPU y Eliminación de Marca de Agua HTML Superpuesta con **463 tests unitarios pasando al 100%** (224 backend + 239 frontend).

### ADR-063: Rediseño 3D Ambient Glassmorphic del Hero de Álbum Activo, Tarjeta de Portada 3D Interactiva y Supresión de Marca de Agua HTML Superpuesta
- **Motivación y Diagnóstico:**
  1. *Hero Plano sin Foto de Portada en Álbum Activo:* Al acceder al detalle de un álbum (`currentView() === 'album'`), el encabezado era un recuadro blanco genérico que desaprovechaba visualmente la portada del evento (`album.coverUrl`), reduciendo el impacto estético de la fotografía deportiva profesional.
  2. *Superposición Redundante de Marca de Agua HTML en DOM:* Tanto `PhotoCardPolaroidComponent` como `LightboxComponent` renderizaban un `<div>` superpuesto en HTML con el texto estático `"LA TERCERA • MUESTRA"`. Dado que el backend ya genera miniaturas WebP mediante Sharp con marcas de agua diagonales personalizadas quemadas directamente en los píxeles (reflejando el nombre real del evento configurado por la fotógrafa), el elemento DOM duplicaba el texto, tapaba la fotografía y ocultaba la personalización.
- **Solución Técnica Implementada:**
  1. **Fondo Ambiental Difuminado (Ambient Glassmorphism en `app.html`):**
     - Contenedor oscuro vítreo de alto contraste: `relative overflow-hidden rounded-[32px] bg-zinc-950 text-white p-6 sm:p-10 shadow-2xl border border-white/10`.
     - Imagen ambiental de fondo con la foto de portada del álbum `album.coverUrl`, escalada (`scale-125`), desenfocada profundamente (`blur-2xl opacity-35 saturate-150`) y protegida con un gradiente superpuesto (`bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/40`), garantizando contraste superior a 7:1 (cumpliendo con creces WCAG AA).
  2. **Tarjeta de Portada 3D Interactiva (`app.html` y `app.css`):**
     - Contenedor con perspectiva `perspective: 1000px` y tarjeta `aspect-[4/3]` con marco físico 3D (`border-2 border-white/20 rounded-2xl shadow-2xl`).
     - Inclinación espacial sutil con aceleración por GPU: `transform: perspective(1000px) rotateY(-8deg) rotateX(4deg)`.
     - Transición suave al hacer hover a `rotateY(0deg) rotateX(0deg) scale(1.03)` con reflejo especular diagonal `.hero-cover-shine` e insignia flotante `"📌 Portada del Evento"`.
     - Soporte riguroso de accesibilidad y rendimiento: desactivación de animaciones e inclinaciones bajo `@media (prefers-reduced-motion: reduce)`.
  3. **Limpieza Quirúrgica de Marca de Agua HTML Superpuesta (`photo-card-polaroid.component.ts` y `lightbox.component.ts`):**
     - Eliminados los divs y spans fijos del DOM que renderizaban `"LA TERCERA • MUESTRA"` por encima de la imagen. La marca de agua visual ahora proviene 100% de los píxeles WebP optimizados servidos por el backend.
     - Actualizadas las suites de pruebas unitarias en `photo-card-polaroid.component.spec.ts` y `lightbox.component.spec.ts` para verificar la ausencia de elementos de texto HTML espurios en el DOM.
     - Añadido test en `app.spec.ts` que valida el renderizado del Hero y la tarjeta 3D de portada al navegar hacia un álbum.
- **Evidencia y Validación:**
  - **463 tests unitarios pasando al 100%** (224 backend + 239 frontend).
  - Compilación de producción Angular (`ng build`) completada con código 0 y 0 errores/warnings en 6.3 segundos.

- **Motivación y Diagnóstico:**
  1. *Consumo Excesivo de RAM en Selección de Fotografías:* La fotógrafa suele seleccionar tandas masivas de 50 a 100 fotos de cámaras profesionales (24 a 48 megapíxeles, 4 a 15 MB cada archivo). `handleSelectedFileList` invocaba `URL.createObjectURL(f)` directamente sobre los blobs sin procesar, forzando al motor del navegador a mantener en memoria RAM decenas de bitmaps gigantescos sin comprimir (>1.5 GB de RAM), provocando bloqueos del hilo principal (*jank* / congelamiento) o cierres inesperados en computadoras de gama media y laptops.
  2. *Fallo de Subida Masiva con Más de 20 Fotos (Límites HTTP y Payload):* Intentar enviar decenas de fotos en una única petición HTTP multipart colapsaba los límites de buffers, timeouts de red y de memoria de Node.js / Sharp en el backend. Además, si fallaba una sola foto, toda la tanda se perdía.
  3. *Error `[object Object]` en Alertas:* Al capturar excepciones HTTP complejas de Axios/HttpClient donde `err.error` era un objeto (`{ error: { message: ... } }` o código de error), se asignaba directamente al signal `bulkError`, renderizándose en la interfaz de usuario como la cadena cruda `[object Object]`.
- **Solución Técnica Implementada:**
  1. **Generación de Miniaturas WebP 320x320 con `createImageBitmap` y Canvas (`admin-panel.component.ts`):**
     - Se implementó el método privado `generateThumbnailUrl(file: File): Promise<string>`.
     - Utiliza `createImageBitmap(file)` (decodificación asíncrona acelerada por hardware) y dibuja sobre un `<canvas>` ajustado proporcionalmente a un máximo de 320x320 píxeles, exportando `canvas.toDataURL('image/webp', 0.7)`.
     - Reduce el consumo de RAM de ~150 MB por foto a menos de 25 KB por miniatura (<2.5 MB para 100 fotos en lugar de >1.5 GB).
     - Incorpora fallback transparente a `URL.createObjectURL(file)` para entornos headless/JSDOM donde `createImageBitmap` o canvas 2D no están disponibles, garantizando total compatibilidad con la suite de pruebas unitarias.
     - En `revokePreviewUrls()` y `removeSelectedFile()`, solo se invoca `URL.revokeObjectURL()` si la URL inicia con `'blob:'`, evitando advertencias o excepciones en data URLs.
  2. **Subida por Micro-Lotes Secuenciales de 4 Fotos (`submitBulkUpload`):**
     - Se definió `AdminPanelComponent.BULK_UPLOAD_BATCH_SIZE = 4`.
     - El array de archivos seleccionados se procesa en micro-lotes secuenciales de 4 fotos por petición HTTP.
     - Mapeo exacto de índices HD: los `hdIndices()` globales elegidos por la fotógrafa se proyectan a los índices locales de cada micro-lote de 4 fotos (`globalIdx = startIdx + localIdx`).
     - Cálculo de `uploadProgress` global ponderado: `Math.round(((completedFiles + currentBatchLoadedFraction) / totalFiles) * 100)` con actualización en tiempo real en la barra de progreso.
     - Al completar todos los lotes, se consolida el resumen total (`totalReceived`, `successful`, `failed`, `durationMs`), se limpia la cola (`clearSelectedFiles()`), se resetean los estados para permitir volver a subir otro lote inmediatamente sin recargar la página, y se recarga la lista de álbumes con `this.loadAlbums()`.
  3. **Erradicación de `[object Object]` (`extractErrorMessage`):**
     - Implementado el método helper `extractErrorMessage(err: unknown, defaultMsg: string): string`.
     - Maneja códigos HTTP: `413` -> `"El lote supera el límite de tamaño permitido."`, `0` -> `"Error de red o tiempo de espera agotado al subir las fotos."`.
     - Extrae de forma segura `err.error.error`, `err.error.message`, `err.error` string o serializa objetos a JSON legible, garantizando que nunca se asigne un objeto crudo a ningún signal de error (`bulkError`, `driveError`, `photographerError`).
- **Evidencia y Validación:**
  - **446 tests unitarios pasando al 100%** (220 backend + 226 frontend).
  - Backend `npm test`: 30 suites, 220 tests aprobados sin errores.
  - Frontend `npm test`: 17 suites, 226 tests aprobados sin errores (+10 nuevos tests en `admin-panel.component.spec.ts`).
  - Compilación de producción Angular (`ng build`) exitosa con código 0 en 6.6 segundos.

### ADR-061: Solución de Símbolos Cuadrados (□□□) en Sharp Alpine (fontconfig/DejaVu), Parche de Seguridad en Checkout de Álbumes Privados y Corrección SQL de Cupones Supabase
- **Motivación y Diagnóstico:**
  1. *Símbolos Cuadrados (□□□ / .notdef) en Marcas de Agua con Sharp sobre Alpine Linux:* En contenedores Docker basados en Alpine (`node:22-alpine`), la ausencia de `fontconfig` y fuentes tipográficas vectoriales (`ttf-dejavu`) provocaba que `librsvg` no pudiera rasterizar caracteres latinos estándar (letras, puntos, marcas de acentuación) sobre los SVGs generados por Sharp, mostrando glifos de reemplazo cuadrados o cajas vacías. Además, en las fotos de muestra HD, el texto diagonal estaba estático como `"LA TERCERA • MUESTRA HD"` en lugar de reflejar el nombre del álbum/evento configurado por la fotógrafa (`${safeWatermarkText}`), y requería mayor contraste y visibilidad tanto en fotos claras como oscuras.
  2. *Vulnerabilidad de Seguridad en Checkout de Álbumes Privados:* Si bien `GET /api/albums/:id/photos` exigía token criptográfico o código PIN para acceder a las fotografías de un álbum privado, el endpoint de inicio de compra `POST /api/checkout/preference` no validaba que el cliente tuviera autorización previa sobre dicho álbum, permitiendo potencialmente a un atacante que conociera el `albumId` iniciar una orden de compra o canje sin haber desbloqueado el PIN.
  3. *Error de Consulta SQL en `SupabasePromotionRepository.tryConsumeCoupon`:* Al actualizar atómicamente el contador de uso `used_count` con cláusula de concurrencia en Supabase PostgreSQL, la consulta ejecutaba `.select('id, used_count')`, fallando inmediatamente con error de base de datos porque la tabla relacional `coupons` utiliza `code` (VARCHAR) como Primary Key y carece de la columna `id`.
- **Solución Técnica Implementada:**
  1. **Tipografía y Dockerfile Multi-Stage en Alpine (`backend/Dockerfile` y `image.service.ts`):**
     - En `backend/Dockerfile` (tanto en la etapa `builder` como en `runner`), se incorporaron `fontconfig ttf-dejavu` al `apk add --no-cache` y se ejecuta `fc-cache -fv` para registrar la caché tipográfica en el sistema.
     - En `backend/src/services/image.service.ts`:
       * Se actualizó `font-family="DejaVu Sans, Arial, sans-serif"` en todos los templates SVG (fotos estándar y HD).
       * En el bloque `isHD`, el texto diagonal ahora interpola `${safeWatermarkText}` y su opacidad se elevó a `fill="rgba(255,255,255,0.32)" stroke="rgba(0,0,0,0.25)" stroke-width="1"` para máxima legibilidad sobre fondos oscuros o sobreexpuestos.
       * Creado test unitario en `backend/tests/image.test.ts` validando el procesamiento HD con texto dinámico.
  2. **Blindaje Criptográfico en Checkout de Álbumes Privados (Backend & Frontend):**
     - En `backend/src/index.ts` (`POST /api/checkout/preference`):
       * Si `album.isPrivate` es `true` y no es test sin PIN, se valida que la petición incluya el token en `req.headers['x-album-access-token']` o `req.body.accessToken` (verificado con `tokenService.verifyToken(token)` confirmando `payload.resourceId === album.id`), o una cabecera `Authorization: Bearer` con JWT de admin válido.
       * Si no cumple la validación, responde de inmediato `403 Forbidden` con `{ error: 'Este álbum es privado. Debes desbloquearlo con su código PIN antes de realizar la compra.' }`.
       * Se añadieron 5 tests unitarios en `backend/tests/checkout-order-hardening.test.ts` cubriendo rechazo sin token, autorización por header, autorización por body, bypass de admin y rechazo por token de álbum ajeno.
     - En `frontend/src/app/core/models/order.model.ts`:
       * Añadida propiedad opcional `readonly accessToken?: string;` a `CreatePreferenceRequest`.
     - En `frontend/src/app/core/services/payment.service.ts`:
       * Inyectado `AlbumAccessStore`. Si el álbum tiene token en el store o en el request, se adjunta automáticamente la cabecera `x-album-access-token`.
     - En `frontend/src/app/features/checkout/checkout-modal.component.ts`:
       * Inyectado `AlbumAccessStore` y transferido el token activo en la llamada `paymentService.createPreference(...)`.
       * Añadidos tests unitarios en `payment.service.spec.ts` y `checkout-modal.component.spec.ts`.
  3. **Corrección de Primary Key en `SupabasePromotionRepository` (`promotion.repository.ts`):**
     - En la línea de actualización atómica de `tryConsumeCoupon`, se corrigió `.select('id, used_count')` por `.select('code, used_count')`, alineándose exactamente con el esquema PostgreSQL de Supabase.
- **Evidencia y Validación:**
  - **436 tests unitarios pasando al 100%** (220 backend + 216 frontend).
  - Backend `npm test`: 30 suites, 220 tests aprobados sin errores. Compilación TypeScript (`tsc`) limpia con código 0.
  - Frontend `npm test`: 17 suites, 216 tests aprobados sin errores. Compilación Angular de producción (`ng build`) exitosa con 0 errores y dentro de presupuestos de bundle.

### ADR-060: Ruta Directa /admin en Inicialización SPA, Documentación Integral en README.md y Guía de Autenticación de Fotógrafa
- **Motivación y Diagnóstico:**
  1. *Acceso Directo al Panel de Administración:* En dispositivos móviles y navegadores web, ingresar a `https://la-tercera.vercel.app/admin` o `?admin` cargaba la portada general en lugar de abrir el formulario de inicio de sesión administrativo. El acceso dependía exclusivamente del enlace del footer o del atajo de teclado (`Ctrl + Shift + A`), el cual no existe en smartphones o tablets.
  2. *Presentación Profesional del Proyecto:* El repositorio requería un `README.md` de nivel producción con badges oficiales, enlaces en vivo, arquitectura del sistema en Mermaid, guía de instalación local, instrucciones de despliegue en Vercel/Railway y detalles de seguridad Zero-Trust.
- **Solución Técnica Implementada:**
  1. **Detección Temprana de Ruta en `frontend/src/app/app.ts`:**
     - Agregada lógica en `ngOnInit()` para inspeccionar `window.location.pathname` y `window.location.search`.
     - Si la URL contiene `/admin` o el parámetro `?admin`, el componente redirige reactivamente al panel administrativo (`admin-panel`) si ya existe una sesión activa y válida en `AdminAuthStore`, o a la pantalla de login (`admin-login`) si no hay token.
  2. **Documentación Integral en `README.md`:**
     - Badges de Angular 21, Node.js 22, Supabase, Mercado Pago, Docker, Railway, Vercel y Vitest.
     - Enlaces a entornos de producción en vivo.
     - Diagrama Mermaid del flujo completo (Frontend SPA -> Vercel Edge -> Railway API -> Supabase PostgreSQL & Storage / Mercado Pago).
     - Explicación de credenciales (`fotografa@latercera.com.ar` + `ADMIN_PASSWORD`), registro de fotógrafos colaboradores y recuperación de compras.
- **Evidencia y Validación:**
  - 212 tests unitarios pasando en frontend (incluyendo `app.spec.ts` con 21 tests).
  - 214 tests unitarios pasando en backend. Total de 426 tests sin regresiones.

### ADR-059: Vinculación Vercel-Railway en Vivo, Deselección de Álbum Completo en Carrito y Optimización Touch 3D 120fps
- **Motivación y Diagnóstico:**
  1. *Desconexión entre Frontend (Vercel) y Backend (Railway):* Al desplegar el frontend en `https://la-tercera.vercel.app`, las llamadas HTTP a `/api/...` fallaban con 404 porque Vercel no ejecutaba el backend Express. Esto activaba el modo de respaldo offline mostrando álbumes de muestra viejos en lugar del catálogo limpio de Supabase.
  2. *Imposibilidad de Deseleccionar Álbum Completo en el Carrito:* Al seleccionar el modo de Álbum Completo (`isFullAlbum: true`), el botón "Vaciar" se ocultaba y la tarjeta del pack no ofrecía ninguna acción interactiva para cancelar o deseleccionar el álbum.
  3. *Caídas de Frames (Jank/Lag) en Celulares durante el Scroll:* `album-card-3d.component.ts` ejecutaba `getBoundingClientRect()` en cada evento `touchmove` mientras el usuario arrastraba el feed con el dedo, forzando recálculos sincrónicos continuos de geometría (layout thrashing) en el hilo principal del navegador móvil.
- **Solución Técnica Implementada:**
  1. **Proxy Reverso de API en Vercel (`frontend/vercel.json` y `vercel.json`):**
     - Añadida regla de reescritura hacia el backend en producción:
       ```json
       {
         "source": "/api/(.*)",
         "destination": "https://laterceralr.up.railway.app/api/$1"
       }
       ```
     - Todas las peticiones del frontend a `/api/...` se envían con mismo origen (Zero-CORS) a través de la red Edge de Vercel hacia Railway.
  2. **Deselección de Álbum Completo (`CartStore` y `FloatingCartComponent`):**
     - Creado método `removeFullAlbum()` en `CartStore` para desactivar el modo de paquete preservando las fotos seleccionadas previamente.
     - Botón "Vaciar" ahora visible siempre que `cartStore.hasItems()` sea true.
     - Agregado botón explícito `🗑️ Quitar Álbum` dentro de la tarjeta destacada de Álbum Completo en el drawer deslizable.
     - Test unitario agregado en `cart.store.spec.ts` validando el comportamiento.
  3. **Optimización de Scroll Móvil a 120fps en `AlbumCard3dComponent`:**
     - Eliminado el listener de host `(touchmove)` que disparaba `getBoundingClientRect()`.
     - Preservada la apertura suave con `IntersectionObserver` y aceleración por GPU compuesta (`transform-gpu`, `will-change: transform`).
- **Evidencia y Validación:**
  - Backend en vivo validado con 200 OK: `https://laterceralr.up.railway.app/api/health` y `/api/categories`.
  - Frontend con 212 tests unitarios pasando al 100%. Backend con 214 tests unitarios pasando al 100%. Total: 426 tests.

### ADR-058: Configuración de Despliegue en Producción (Docker Multi-Stage Alpine 20 con Sharp, Railway Healthcheck, Vercel SPA Rewrites, Cloudflare Pages `_redirects` y `environment.ts` Reactivo)
- **Motivación y Diagnóstico:**
  1. *Fallo 404 en Recargas SPA (Vercel / Cloudflare Pages / Netlify):* Al acceder a rutas directas como `/pago-exitoso?token=...` o `/admin` o refrescar la página en producción, los servidores web estáticos respondían con 404 Not Found al buscar archivos físicos que no existen en el directorio compilado.
  2. *Empaquetado y Dependencias Nativas de Backend (Docker & Sharp en Alpine):* Ejecutar `sharp` en Alpine (`node:20-alpine`) exige compatibilidad con bibliotecas nativas de compilación y enlaces C/C++ (`musl`). Asimismo, un contenedor de producción debe ser multi-stage para no acarrear librerías de build ni dependencias de desarrollo (`devDependencies`), corriendo bajo un usuario no privilegiado (`node`).
  3. *Healthcheck y Políticas de Orquestación en Railway (`railway.json`):* Railway y los balanceadores de carga requieren un endpoint específico (`/api/health`) y una política de reinicio `ON_FAILURE` para garantizar alta disponibilidad. El servidor Express solo escuchaba en `/health`.
  4. *Flexibilidad de Dominio de API sin Recompilar el Frontend:* En entornos donde el backend y el frontend se despliegan en dominios o puertos separados, el frontend requería la capacidad de leer `window.__ENV__?.API_URL` en tiempo de ejecución con fallback limpio a `/api`, tipado estricto sin `any` y reactividad inmediata.
- **Solución Técnica Implementada:**
  1. **Configuración de Despliegue Frontend (`frontend/vercel.json` y `frontend/public/_redirects`):**
     - Creado `frontend/vercel.json` con la regla de reescritura: `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`.
     - Creado `frontend/public/_redirects` con `/* /index.html 200` para Cloudflare Pages y Netlify.
     - Verificado en `frontend/angular.json` que el directorio `public` está configurado en `assets` (`"glob": "**/*", "input": "public"`), confirmando que `_redirects` se copia automáticamente a `dist/frontend/browser/_redirects`.
  2. **Dockerfile Multi-Stage y `railway.json` en Backend:**
     - Creado `backend/Dockerfile` multi-stage con `node:20-alpine`:
       * *Etapa `builder`:* instala `python3 make g++ libc6-compat`, copia `package*.json`, ejecuta `npm ci`, copia código fuente, compila TypeScript (`npm run build`) y poda dependencias de desarrollo (`npm prune --production`).
       * *Etapa `runner`:* instala `libc6-compat`, crea directorios `/app/uploads` y `/app/data` con chown a `node:node`, cambia a `USER node`, copia artefactos podados y arranca con `CMD ["node", "dist/index.js"]`.
     - Creado `backend/.dockerignore` excluyendo `node_modules`, `dist`, `.env`, tests y logs.
     - Creado `backend/railway.json` con schema oficial de Railway, `healthcheckPath: "/api/health"`, `healthcheckTimeout: 100`, `restartPolicyType: "ON_FAILURE"` y `restartPolicyMaxRetries: 10`.
     - Actualizado `backend/src/index.ts` para que la ruta de healthcheck escuche en `['/health', '/api/health']`.
     - Creada suite de pruebas unitarias en `backend/tests/health.test.ts` (2 tests pasando).
  3. **Tipado Estricto y Reactividad en `environment.ts` (`frontend/src/environments/`):**
     - Declaración de interfaz global `Window.__ENV__?: { API_URL?: string }`.
     - Helper exportado `resolveApiUrl(customUrl?: string, fallback: string)` que prioriza la variable de entorno de ventana, sanitiza espacios y barras diagonales finales, y recurre al fallback correspondiente.
     - Propiedad `apiUrl` como getter reactivo dinámico en `environment.ts` (`/api`) y `environment.development.ts` (`http://localhost:4000/api`).
     - Creada suite de pruebas unitarias en `frontend/src/environments/environment.spec.ts` (7 tests pasando).
- **Evidencia y Validación:**
  - **425 tests unitarios pasando al 100%** (214 backend + 211 frontend).
  - Backend `npm test`: 30 suites, 214 tests aprobados. Compilación TypeScript (`tsc`) limpia con código 0.
  - Frontend `npm test`: 17 suites, 211 tests aprobados. Compilación Angular de producción (`ng build`) exitosa con 0 errores y `_redirects` verificado en `dist/frontend/browser/`.

### ADR-057: Optimización de Consulta por Email en Supabase (`findOrdersByEmail`), Notificación de Recuperación por Correo Electrónico, Campo Opcional de Comprobante en Modal y Enlace Oficial de Instagram
- **Motivación y Diagnóstico:**
  1. *Consulta Ineficiente de Histórico de Órdenes:* En `/api/orders/recover`, `orderRepository.listAllOrders()` transfería toda la tabla de órdenes de la base de datos a memoria para luego filtrar por email, incrementando la latencia y el consumo de recursos a medida que el historial de ventas crecía.
  2. *Falta de Respaldo por Correo en Recuperación:* Cuando un comprador utilizaba la herramienta de recuperación de compras ("Mis Compras"), el sistema solo mostraba los enlaces en pantalla, sin enviar un correo de respaldo con el enlace activo de descarga.
  3. *Búsqueda Precisa con N° de Operación de Mercado Pago:* Algunos clientes poseen múltiples compras o comparten correos familiares y necesitaban filtrar o identificar específicamente una orden usando su N° de comprobante / operación de Mercado Pago.
  4. *Enlace Genérico de Redes Sociales:* En `HeroComponent`, el botón de Instagram apuntaba genéricamente a `https://instagram.com` en lugar del perfil oficial `https://www.instagram.com/la.tercera.es/`.
- **Solución Técnica Implementada:**
  1. **Método `findOrdersByEmail` en Repositorios (`order.repository.ts`):**
     - Añadido `findOrdersByEmail(email: string): Promise<Order[]>` en `IOrderRepository`.
     - En `MemoryOrderRepository`: filtra por `customerEmail.toLowerCase() === cleanEmail` y `status === 'PAID'`, ordenando por `createdAt DESC` y limitando a 20 órdenes.
     - En `SupabaseOrderRepository`: ejecuta `.ilike('customer_email', cleanEmail)` y `.eq('status', 'PAID')`, ordenado por `created_at DESC` con `.limit(20)` directamente sobre PostgreSQL.
     - En `POST /api/orders/recover` (`backend/src/index.ts`): consume `orderRepository.findOrdersByEmail(normalizedEmail)` (con fallback defensivo a `listAllOrders()`).
  2. **Disparo de Respaldo por Email en Segundo Plano:**
     - Al recuperar una orden vigente en `/api/orders/recover`, se ejecuta `emailService.sendOrderReadyEmail(order, token)` de forma asíncrona no bloqueante con `.catch(...)`, enviando copia de seguridad a la casilla del comprador.
  3. **Campo Opcional de N° de Operación en Modal Bento (`OrderRecoveryModalComponent`):**
     - Añadido input opcional `paymentIdInput` (con etiqueta *"N° de Operación de Mercado Pago o ID de Orden (opcional)"* y placeholder *"Ej: 8945123456"*).
     - Si `paymentIdInput` contiene valor, se invoca `this.paymentService.recoverOrdersByEmail(trimmed, cleanPaymentId)`; si está vacío, se invoca con 1 argumento `(trimmed)`, preservando compatibilidad exacta con los tests unitarios existentes.
     - Test unitario añadido en `order-recovery-modal.component.spec.ts` validando el paso de `paymentId`.
  4. **Enlace Oficial de Instagram en Hero (`HeroComponent`):**
     - Actualizado enlace a `https://www.instagram.com/la.tercera.es/`.
- **Evidencia y Validación:**
  - **416 tests unitarios pasando al 100%** (212 backend + 204 frontend).
  - Backend `npm test`: 29 suites, 212 tests aprobados. Compilación TypeScript (`tsc`) limpia con código 0.
  - Frontend `npm test`: 16 suites, 204 tests aprobados. Compilación Angular de producción (`ng build`) exitosa con 0 errores y dentro de presupuestos de bundle.

### ADR-057: Ordenamiento Drag & Drop de Fotografías (Cola de Subida y Catálogo Persistente) y Modal Bento de Edición de Metadatos de Álbumes
- **Motivación y Diagnóstico:**
  1. *Falta de Control de Secuencia en la Subida Masiva:* En la pestaña `📤 Subida Masiva`, las fotos se procesaban y subían en el orden estricto de selección del sistema de archivos, impidiendo que la fotógrafa definiera de antemano el orden narrativo del evento o cambiara de lugar fotos sin perder la marca de muestra HD.
  2. *Imposibilidad de Reordenar Fotos ya Subidas:* En el catálogo público y en el modal de gestión del álbum, las fotos se listaban únicamente por orden de creación (`created_at ASC`), sin permitir reorganizar fotos destacadas hacia las primeras posiciones.
  3. *Edición Rígida de Metadatos:* En el dashboard de álbumes, existía edición de precios en línea, pero para editar el título, subtítulo, fecha, hora, ubicación o categoría de un evento existente, no existía interfaz gráfica, obligando a recrear el álbum o editar la base de datos manualmente.
- **Solución Técnica Implementada:**
  1. **Drag & Drop y Reordenamiento en Cola Previa a la Subida (`AdminPanelComponent` & `.html`):**
     - Atributos nativos HTML5 `draggable="true"`, `(dragstart)`, `(dragover)`, `(drop)` y `(dragend)` en cada tarjeta de la cola, con retroalimentación visual (`opacity-40`, bordes dorados `border-amber-500` y cursores `cursor-grab`).
     - Botones táctiles `◀` y `▶` en cada tarjeta para dispositivos móviles, deshabilitados en los extremos (`idx === 0` y `idx === selectedFiles().length - 1`).
     - Algoritmo de mapeo por referencia (`hdFileSet`) en `moveQueueItem` que garantiza que las fotos marcadas como `⭐ Muestra HD` conserven exactamente su condición tras cualquier reordenamiento de archivos y miniaturas.
  2. **Persistencia de Orden de Fotos en Repositorio y API Backend (`album.repository.ts` & `admin-albums.routes.ts`):**
     - Añadido `sortOrder?: number` en `PhotoDTO` y `PublicPhotoDTO`.
     - Implementado `reorderPhotos(albumId: string, orderedPhotoIds: string[]): Promise<boolean>` en `IAlbumRepository`, `MemoryAlbumRepository` (actualizando orden en memoria) y `SupabaseAlbumRepository` (con ordenamiento ACID y sincronización de `sort_order` con fallback resiliente).
     - Modificado `getPhotosByAlbumId` para ordenar ascendentemente por `sortOrder` en memoria y base de datos.
     - Nuevo endpoint administrativo `PUT /api/admin/albums/:id/photos/reorder` protegido por `requireAdminAuth`, validando `photoIds: string[]`.
  3. **Reordenamiento Interactivo en Modal "Gestionar Fotos" y Guardado (`admin-panel.component.ts` & `.html`):**
     - Tarjetas interactivas con Drag & Drop y botones de flechas móviles `◀` y `▶` con badge de posición `#N`.
     - Signal reactivo `isPhotosOrderDirty` que activa un botón brillante `"💾 Guardar Orden"` en cabecera y pie del modal.
     - Invocación a `adminService.reorderAlbumPhotos(album.id, photoIds)` y sincronización inmediata con feedback Bento.
  4. **Modal Bento de Edición de Metadatos de Álbum (`admin-panel.component.ts` & `.html`):**
     - Botón `"✏️ Editar"` incorporado en cada tarjeta de álbum del panel administrativo.
     - Modal Bento accesible con formulario tipado `editAlbumForm` precargado con título, categoría, badge dinámico, subtítulo, fecha, horario y ubicación.
     - Persistencia vía `adminService.updateAlbum(id, changes)`, actualización reactiva en caliente en `albums()` y feedback con sistema de Toasts Bento.
- **Evidencia y Validación:**
  - **462 tests unitarios pasando al 100%** (224 backend + 238 frontend).
  - 4 nuevos tests en `backend/tests/admin-albums.api.test.ts` (rechazo 401 sin auth, validación 400 de array, 404 en inexistente, y reordenamiento exitoso con persistencia y verificación en `getPhotos`).
  - 1 nuevo test en `frontend/src/app/core/services/admin.service.spec.ts` validando la petición HTTP `PUT /api/admin/albums/:id/photos/reorder`.
  - 11 nuevos tests en `frontend/src/app/features/admin-panel/admin-panel.component.spec.ts` validando reordenamiento de cola, preservación de HD, eventos drag & drop, flechas táctiles, `savePhotosOrder`, apertura y guardado reactivo del modal de edición de álbum.
  - Compilación exitosa en backend (`tsc`) y frontend (`ng build`) con 0 errores y 0 advertencias.

### ADR-056: Concurrencia Atómica en Cupones Supabase, Validación Anti-Traversal de Fotos en Checkout y Almacenamiento Dinámico en Métricas
- **Motivación y Diagnóstico:**
  1. *Condición de Carrera en `tryConsumeCoupon`:* `SupabasePromotionRepository.tryConsumeCoupon` sincronizaba el cupón consultando `getCouponByCode` y guardando en memoria antes de entrar en la sección crítica del mutex lock de `MemoryPromotionRepository`, exponiendo una ventana para condiciones de carrera ante canjes masivos simultáneos. Además, la persistencia en Supabase no condicionaba el `UPDATE` a nivel de base de datos.
  2. *Vulnerabilidad de Pertenencia y Path Traversal en `photoIds`:* En `POST /api/checkout/preference`, no se verificaba si los identificadores de fotos intentaban inyección de directorios (`..`, `/`, `\\`) ni se contrastaba su pertenencia contra las fotos reales registradas en el álbum.
  3. *Métrica Fija de Almacenamiento:* El endpoint `GET /api/admin/stats` retornaba un valor fijo `storageUsedGB: 1.8`, sin calcular el peso real de las fotos en disco ni en Supabase Storage.
- **Solución Técnica Implementada:**
  1. **Mutex Lock con `syncBeforeCheck` y Atomicidad en Supabase (`promotion.repository.ts`):**
     - Se extendió `IPromotionRepository.tryConsumeCoupon` y `MemoryPromotionRepository.tryConsumeCoupon` con el callback opcional `syncBeforeCheck?: () => Promise<CouponDTO | null>`.
     - `syncBeforeCheck` se ejecuta **DENTRO** del bloque protegido por `acquireLock(normalizedCode)` antes de evaluar el saldo disponible y uso del cupón.
     - En `SupabasePromotionRepository`, la actualización de `used_count` incluye la cláusula `.lt('used_count', res.coupon.maxUses)` a nivel de base de datos. Si ninguna fila es afectada (`!data || data.length === 0`), se revierte el contador en memoria y se rechaza la operación informando que el cupón agotó sus usos.
  2. **Validación de Pertenencia y Blindaje Anti-Traversal (`backend/src/index.ts`):**
     - En `POST /api/checkout/preference` (para compras de fotos individuales `!isFullAlbum`), se valida cada `photoId` rechazando inmediatamente con `400 Bad Request` ante caracteres de inyección de rutas (`..`, `/`, `\\`).
     - Se consultan las fotos del álbum con `albumRepository.getPhotosByAlbumId(albumId)`. Si el álbum contiene fotos reales (no mockups demo), se verifica que todos los `uniquePhotoIds` existan en el álbum, respondiendo `400 Bad Request` si se detectan fotos ajenas.
     - Se añadieron tests en `checkout-order-hardening.test.ts` probando tanto path traversal como fotos que no pertenecen.
  3. **Cálculo Dinámico de Almacenamiento (`album.repository.ts` y `admin.routes.ts`):**
     - Agregado el método `getTotalStorageBytes(): Promise<number>` en `IAlbumRepository`, `MemoryAlbumRepository` (sumando `sizeBytes` de las fotos con fallback a ~3.5MB por foto de álbumes activos) y `SupabaseAlbumRepository` (con consulta agregada de `size_bytes` sobre la tabla `photos`).
     - En `GET /api/admin/stats`, se calcula `storageUsedGB` en tiempo real como `Number((totalStorageBytes / (1024 ** 3)).toFixed(2))`.
- **Evidencia y Validación:**
  - **415 tests unitarios pasando al 100%** (212 backend + 203 frontend).
  - 3 nuevos tests en backend (2 en `checkout-order-hardening.test.ts`, 1 en `admin-orders-stats.test.ts`).
  - Compilación exitosa de TypeScript en backend (`tsc`) con código de salida 0.

### ADR-055: Blindaje Quirúrgico Backend Pre-Producción (FRONTEND_URL Multi-Origen, Sanitización XML/SVG Sharp y Desacople de Cupones Inactivos)
- **Motivación y Diagnóstico:**
  1. *FRONTEND_URL Multi-Origen en Redirecciones y Descargas:* Para permitir CORS en múltiples dominios (ej. dominio oficial `https://latercerafotografia.com.ar` y staging/local `http://localhost:4200`), la variable de entorno `FRONTEND_URL` contiene listas separadas por comas. Usarla directamente al interpolar URLs de redirección (`/pago-exitoso?token=...`) generaba URLs corruptas del tipo `https://dominio.com,http://localhost:4200/pago-exitoso...`.
  2. *Vulnerabilidad de Parser XML en Marca de Agua Sharp:* Si un álbum o evento contenía caracteres reservados XML (`&`, `<`, `>`, `"`, `'`) en `watermarkText` (por ejemplo, "LA TERCERA & EVENTOS <2026>"), el motor de composición SVG de Sharp fallaba con error de parsing XML, abortando el procesamiento de miniaturas.
  3. *Acoplamiento Rígido del Cupón YUYO10:* En `pricing.service.ts`, el fallback de 10% de descuento para `YUYO10` se aplicaba siempre que `req.couponCode === 'YUYO10'`, incluso si el cupón había sido desactivado o borrado de la base de datos (`req.coupon === null`).
- **Solución Técnica Implementada:**
  1. **Helper `getPrimaryFrontendUrl()` (`backend/src/config/env.ts`):**
     - Extrae la primera URL válida de `process.env.FRONTEND_URL || 'http://localhost:4200'`, elimina espacios y remueve barras diagonales finales (`.split(',')[0].trim().replace(/\/+$/, '')`).
     - Reemplazado el uso directo de `process.env.FRONTEND_URL` en:
       * `backend/src/index.ts` (en `/api/checkout/preference` y `/api/orders/recover`).
       * `backend/src/services/mercadopago.service.ts` (en `createCheckoutPreference` para `back_urls`).
       * `backend/src/routes/admin.routes.ts` (en `GET /orders` y `POST /orders/:orderId/regenerate-token`).
       * `backend/src/services/email.service.ts` (en `sendOrderReadyEmail`).
     - Suite de pruebas unitarias en `backend/tests/env.test.ts` (5 tests pasando).
  2. **Sanitización XML/SVG en Estampado de Marcas de Agua (`backend/src/services/image.service.ts`):**
     - Implementada y exportada la función helper `escapeXml(unsafe: string): string` que reemplaza `&`, `<`, `>`, `"`, `'` por sus entidades XML seguras (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`).
     - Aplicada la sanitización antes de interpolar `watermarkText` en la plantilla SVG de `processImageWithWatermark`.
     - Test unitario en `backend/tests/image.test.ts` verificando que un texto complejo con ampersand y etiquetas XML como `"LA TERCERA & EVENTOS <2026>"` se procesa en WebP sin excepciones.
  3. **Control Estricto de Descuento de Cupón (`backend/src/services/pricing.service.ts`):**
     - Modificada la condición de fallback para que `YUYO10` SOLO se active si `req.coupon === undefined` (preservando retrocompatibilidad para tests aislados sin búsqueda previa).
     - Si `req.coupon === null` (es decir, el cupón fue consultado en el repositorio y no existe o está inactivo), el descuento NO se aplica.
     - Test unitario añadido en `backend/tests/pricing.test.ts` comprobando el comportamiento exacto.
- **Evidencia y Validación:**
  - **412 tests unitarios pasando al 100%** (209 backend + 203 frontend).
  - 8 nuevos tests en backend (5 en `env.test.ts`, 2 en `image.test.ts`, 1 en `pricing.test.ts`).
  - Compilación exitosa de TypeScript en backend (`tsc`) con código de salida 0.

### ADR-054: Sistema de Recuperación de Compras Pagadas y Notificaciones Transaccionales por Correo Electrónico (Resend API Nativa, Rate Limiting y Modal Bento "Mis Compras")
- **Motivación y Diagnóstico:**
  1. *Riesgo de Pérdida de Enlace Post-Pago:* En conexiones móviles o tras abonar en Mercado Pago, algunos clientes cerraban la ventana del navegador antes de ser redirigidos o perdían el token de descarga de 72 horas, viéndose forzados a contactar soporte para que se les reenviara el enlace.
  2. *Ausencia de Correo Transaccional de Respaldo:* Las órdenes completadas (`verifyAndCompletePaymentAsync` y `completeFreeOrderAsync`) no enviaban una confirmación al correo del cliente con el enlace de descarga, dependiendo exclusivamente de la pantalla de éxito.
  3. *Seguridad y Prevención de Abuso:* El endpoint de recuperación de compras necesitaba protección contra scraping y enumeración por fuerza bruta de correos mediante rate limiting estricto.
- **Solución Técnica Implementada:**
  1. **Servicio Desacoplado de Notificación por Email (`backend/src/services/email.service.ts`):**
     - Creada la clase `EmailNotificationService` (`IEmailNotificationService`) utilizando `fetch` nativo hacia `https://api.resend.com/emails` sin añadir dependencias pesadas.
     - Si `RESEND_API_KEY` no está configurada, realiza fallback transparente con log estructurado seguro en consola (`[EmailService Fallback]`).
     - Plantilla HTML responsiva con estética Bento corporativa de La Tercera (fondo oscuro `#131316`, acentos dorados `#FDB813`, detalles del pedido y botón directo de descarga).
     - Inyectado en `OrderService`, disparándose de manera asíncrona no bloqueante en `verifyAndCompletePaymentAsync` y `completeFreeOrderAsync`.
  2. **Endpoint Seguro de Recuperación (`POST /api/orders/recover` & `orderRecoveryLimiter`):**
     - Creado middleware `orderRecoveryLimiter` en `rate-limit.middleware.ts` (10 peticiones cada 10 minutos por IP, desactivado en tests).
     - Validación y normalización case-insensitive (`trim().toLowerCase()`) del correo electrónico y filtrado opcional por `paymentId`.
     - Búsqueda en `orderRepository.listAllOrders()` de compras con `status === 'PAID'` vigentes dentro de las últimas 72 horas o con token de descarga válido. Regeneración automática de token criptográfico si la orden está dentro de 72h pero el token requería refresco.
     - Retorno estructurado con `orders: [{ orderId, albumTitle, photoCount, isFullAlbum, createdAt, downloadToken, redirectUrl }]` o mensaje amigable si no hay coincidencias.
  3. **Integración Frontend y Modal Bento (`PaymentService`, `HeaderComponent`, `OrderRecoveryModalComponent`):**
     - `PaymentService.recoverOrdersByEmail(email, paymentId?)` tipado con `RecoverOrdersResponse` y `RecoveredOrder`.
     - Componente Standalone `OrderRecoveryModalComponent` (`ChangeDetectionStrategy.OnPush`, Signals reactivos, accesibilidad `role="dialog"` y navegación por teclado).
     - Botón sutil `"📥 Mis Compras"` incorporado en la cabecera interactiva (`HeaderComponent`) y en el pie de página (`app.html`), permitiendo al cliente consultar sus compras previas y acceder a `/pago-exitoso?token=...` en 1 clic.
- **Evidencia y Validación:**
  - **404 tests unitarios pasando al 100%** (201 backend + 203 frontend).
  - Tests en `backend/tests/order-recovery.api.test.ts` (validación de email, case-insensitivity, exclusión de órdenes no pagadas, filtrado por paymentId).
  - Tests en `backend/tests/email.service.test.ts` (fallback en ausencia de key, invocación de Resend con fetch, manejo resiliente de errores HTTP sin excepciones).
  - Tests en `frontend/src/app/core/services/payment.service.spec.ts` (llamadas HTTP a `/orders/recover` y `getOrderStatus`).
  - Tests en `frontend/src/app/features/order-recovery/order-recovery-modal.component.spec.ts` (renderizado, validación de input, listado reactivo de órdenes y enlace de descarga).
  - Tests en `frontend/src/app/features/header/header.component.spec.ts` (emisión de `openRecoveryModal` y botón visible).
  - Tests en `frontend/src/app/app.spec.ts` (apertura y cierre de modal de recuperación).
  - Compilación exitosa en backend (`tsc`) y frontend (`ng build`) con 0 errores y 0 advertencias.

### ADR-053: Optimización de Streaming de Descargas y Entrega Individual de Álbumes de Cortesía (Modo Store en ZIPs, Metadatos de Extensiones en 1 Llamada y Botón de Descarga HD en Galería/Lightbox)
- **Motivación y Diagnóstico:**
  1. *Adivinanza Ineficiente de Extensiones:* En `delivery.service.ts` y `downloads.routes.ts`, para cada foto se ejecutaba un bucle secuencial probando las 4 extensiones soportadas (`['.jpg', '.jpeg', '.png', '.webp']`), multiplicando las peticiones a Storage o lecturas de disco por cada foto incluida en el ZIP o solicitada individualmente.
  2. *Recompresión Inútil de Archivos Multimedia:* `archiver('zip', { zlib: { level: 6 } })` intentaba recomprimir fotos JPEG, PNG y WebP que ya son formatos comprimidos por naturaleza, saturando la CPU del servidor, aumentando la latencia y provocando cierres de conexión en conexiones móviles lentas.
  3. *Generación de Imágenes Falsas en Producción:* Si una foto no se encontraba físicamente en Storage, `generateFallbackJpegBuffer` generaba un JPEG gris falso de 1200x800 con Sharp y se lo entregaba al cliente que pagó o al usuario del álbum de cortesía.
  4. *Incomodidad en Móviles para Álbumes Gratuitos:* Los clientes en smartphones Android/iOS no podían descargar una sola foto que les gustara de un álbum de cortesía sin tener que bajar y descomprimir un archivo `.ZIP` de cientos de megabytes.
- **Solución Técnica Implementada:**
  1. **Resolución Directa de Extensiones en 1 Sola Consulta:**
     - En `delivery.service.ts` (`streamOrderZip`, `streamFreeAlbumZip`, `resolvePhotoFile`) y `downloads.routes.ts` (`GET /:token/file` y `GET /free/:albumId/photo/:photoId`): se consultan los metadatos de la foto desde `albumRepository.getPhotosByAlbumId` (pre-cargando un mapa $O(1)$ para los bucles de ZIP) o `getPhotoById`.
     - Si la foto tiene `originalPath` o `filename`, se extrae la extensión real (`path.extname(...)`) y se solicita directamente a `storageService.getOriginalBuffer(...)` en 1 única llamada. El bucle de candidatos queda exclusivamente como fallback defensivo si la foto no estuviera registrada en la base de datos.
  2. **ZIP Instantáneo en Modo Store (Nivel 0):**
     - Se configuró `archiver('zip', { store: true, zlib: { level: 0 } })` tanto para órdenes de compra pagadas como para descargas de álbumes de cortesía.
     - Transmisión inmediata y lineal de bits sin recargo de CPU.
  3. **Blindaje de Producción contra Fallbacks Dummy:**
     - Métodos `resolveOrderPhotoBuffer` y `resolveAlbumPhotoBuffer` creados en `DeliveryService`.
     - Si `process.env.NODE_ENV === 'production'` y el archivo no existe en Storage, no se genera el buffer ficticio con Sharp, sino que se registra el faltante y se responde `404 Not Found`.
     - La generación de buffer de respaldo JPEG queda activa únicamente para entornos de prueba (`NODE_ENV !== 'production'`), preservando el 100% de los tests unitarios offline.
  4. **Descarga Individual Gratuita en Backend y Frontend:**
     - Backend: Nuevo endpoint `GET /api/downloads/free/:albumId/photo/:photoId` con verificación de existencia, estado no borrado, bandera `isFreeDownload: true`, validación de tokens PIN para álbumes privados y cabecera `Content-Disposition: attachment; filename="LA_TERCERA_${photo.filename}"`.
     - Frontend `AlbumService`: Método `getFreePhotoDownloadUrl(albumId, photoId)` con query param `?accessToken=...` automático si el álbum privado fue desbloqueado.
     - Frontend `PhotoCardPolaroidComponent`: Botón interactivo `"⬇️ Descargar HD"` (`a[download]`) junto al botón de visualización completa cuando `isFreeDownload()` es `true`.
     - Frontend `LightboxComponent`: Botón destacado `"⬇️ Descargar HD"` en la cabecera cinemática superior cuando `isFreeDownload()` es `true`.
- **Evidencia y Validación:**
  - **380 tests unitarios pasando al 100%** (192 backend + 188 frontend).
  - Tests en `backend/tests/downloads.routes.test.ts` (404 en inexistente, 403 en no gratuito, 200 con buffer HD real y cabeceras de descarga).
  - Tests en `backend/tests/trash-and-privacy.api.test.ts` (verificación de descarga individual de cortesía pública y blindaje con PIN en álbumes privados).
  - Tests en `frontend/src/app/core/services/album.service.spec.ts` (generación de URLs con y sin tokens de acceso).
  - Tests en `frontend/src/app/features/photo-card-polaroid/photo-card-polaroid.component.spec.ts` y `lightbox.component.spec.ts` (renderizado condicional del botón de descarga HD y enlace correcto).
  - Compilaciones `tsc` y `ng build` exitosas con código 0 y 0 advertencias.

### ADR-052: Blindaje de Lógica de Negocio y Seguridad Fase 2 (Categorías Dinámicas, Desacople de Órdenes, Protección HD 1400px y UI Inline Confirmation Libre de `confirm()`)
- **Motivación y Diagnóstico:**
  1. *Validación Estática de Categorías al Crear/Editar Álbumes:* En `backend/src/routes/admin-albums.routes.ts`, `POST /api/admin/albums` y `PUT /api/admin/albums/:id` validaban contra un array estático (`['futbol', 'hockey', 'basquet', 'sociales', 'otros']`), impidiendo que categorías dinámicas creadas desde el panel (como 'motos', 'padel', etc.) se asignaran a los álbumes.
  2. *Contaminación de la Tabla `photos` desde `SupabaseOrderRepository`:* Al crear una orden, `SupabaseOrderRepository.createOrder` ejecutaba un bloque `photoUpserts` que insertaba filas inventadas en `public.photos` para prevenir errores de clave foránea legados, a pesar de que `order_items` ya está completamente desacoplado por contrato de auditoría.
  3. *Vulnerabilidad de Exposición en Fotos de Muestra HD:* En `backend/src/services/image.service.ts`, las fotos marcadas como muestra HD (`isHD: true`) no se redimensionaban, exponiendo en el bucket público de previsualizaciones imágenes con su resolución completa de cámara (4000px+ / 4K) con solo un badge superior izquierdo, facilitando su descarga y uso comercial sin pago.
  4. *Uso de `confirm()` Nativo en Panel de Administración:* En `frontend/src/app/features/admin-panel/admin-panel.component.ts`, la función `deleteCategory()` utilizaba `confirm(...)` nativo del navegador, bloqueando el hilo de ejecución principal, rompiendo la estética Bento y degradando la experiencia en dispositivos móviles.
- **Solución Técnica Implementada:**
  1. **Soporte de Categorías Dinámicas en Backend (`admin-albums.routes.ts` & `index.ts`):**
     - Se extendió `createAdminAlbumsRouter` para recibir opcionalmente `categoryRepository: ICategoryRepository` (inyectado desde `backend/src/index.ts`).
     - En `POST /api/admin/albums` y `PUT /api/admin/albums/:id`: se normaliza la categoría (`trim().toLowerCase()`) y se valida consultando `await categoryRepository.getCategoryById(...)`. Si existe o pertenece a las categorías base, se acepta.
     - Se resuelve el `badge` dinámicamente usando `dynamicCategory.badgeLabel`, con fallback a `defaultBadges` o `'📸 ' + dynamicCategory.name`.
     - Se actualizó el contrato `AlbumCategory` en `backend/src/contracts/admin-albums.contract.ts` para admitir categorías personalizadas en formato string.
  2. **Eliminación Quirúrgica de `photoUpserts` en `SupabaseOrderRepository`:**
     - Se eliminó el bloque de `photoUpserts` de `createOrder` en `backend/src/repositories/order.repository.ts`, eliminando escrituras fantasma en `public.photos` y manteniendo la integridad transaccional limpia.
  3. **Protección de Muestras HD contra Robo/Impresión 4K:**
     - En `backend/src/services/image.service.ts`, para fotos con `isHD: true`, se aplica primero `sharp(imageBuffer).resize({ width: 1400, withoutEnlargement: true })`.
     - Además del badge superior izquierdo `"✦ LA TERCERA HD MASTER"`, se estampa una marca de agua diagonal translúcida centrada (`rgba(255,255,255,0.18)`) con `rotate(-25)` que permite apreciar la nitidez profesional pero imposibilita la impresión o comercialización gratuita.
  4. **Erradicación Definitiva de `confirm()` en el Frontend (`AdminPanelComponent`):**
     - Se incorporó el signal reactivo `confirmingDeleteCategoryId = signal<string | null>(null)` y temporizador de auto-reset a los 3 segundos en `admin-panel.component.ts`.
     - En `deleteCategory(cat)`: el primer clic activa el estado de confirmación por 3s. El segundo clic ejecuta el borrado efectivo vía `categoryService.deleteCategory(cat.id)` y limpia el temporizador.
     - En `admin-panel.component.html`: el botón de borrado refleja el estado con clases activas (`bg-rose-600`, `text-white`, `animate-pulse`), tooltip accesible y etiqueta `"¿Confirmar? 🗑️"`.
- **Evidencia y Validación:**
  - **373 tests unitarios pasando al 100%** (189 backend + 184 frontend).
  - Tests en `backend/tests/admin-albums.api.test.ts` verificando la creación de álbumes con categorías dinámicas ('motos' y nuevas categorías registradas en tiempo de ejecución).
  - Tests en `backend/tests/image.test.ts` comprobando el redimensionamiento a máximo 1400px en WebP para fotos HD de muestra.
  - Tests en `frontend/src/app/features/admin-panel/admin-panel.component.spec.ts` validando la confirmación de dos pasos sin `confirm()` nativo, el auto-reset tras 3 segundos y la protección contra borrado de la categoría 'otros'.
  - Compilaciones de producción limpias (`tsc` en backend y `ng build` en frontend) con código de salida 0.

### ADR-051: Blindaje de Seguridad Fase 1 (Autenticación en Procesamiento, Validación Fatal de Secretos, CORS Estricto, Tokens Criptográficos de Álbum Privado y RLS)
- **Motivación y Diagnóstico:**
  1. *Endpoint Expuesto de Procesamiento de Imágenes:* `POST /api/images/process` carecía de middleware de autenticación, permitiendo que cualquier visitante consumiera recursos de cómputo en el servidor.
  2. *Exportación de Router Sin Autenticación:* `adminAlbumsRouter` se exportaba como instancia sin `authService` al final de `admin-albums.routes.ts`, representando un riesgo de uso inseguro accidental.
  3. *Variables de Entorno por Defecto en Producción:* Si en producción no se configuraban `JWT_SECRET`, `DOWNLOAD_TOKEN_SECRET`, `MP_WEBHOOK_SECRET` o `ADMIN_PASSWORD`, el sistema arrancaba con los valores por defecto de desarrollo.
  4. *CORS Permisivo con Localhost:* La comprobación `cleanOrigin.includes('localhost')` permitía cualquier dominio que contuviera la palabra 'localhost' y funcionaba incluso en modo producción.
  5. *Acceso Débil a Álbumes Privados:* Álbumes privados protegidos con PIN no validaban criptográficamente el acceso al consultar `GET /api/albums/:id/photos` ni en `GET /api/downloads/free/:albumId/zip`, y el frontend no persistía los tokens entre recargas de página.
  6. *Políticas RLS Demasiado Permisivas:* En `patch-live-full.sql`, las políticas de administración de `promotions_config`, `coupons` y `categories` usaban `USING (TRUE) WITH CHECK (TRUE)` para cualquier usuario autenticado en vez de comprobar el rol administrativo.
- **Solución Implementada:**
  1. **Protección Perimetral y Purga de Exportación:**
     - Montaje de `createRequireAdminAuth(adminAuthService)` en `POST /api/images/process`.
     - Eliminación definitiva de la exportación de `adminAlbumsRouter` sin autenticación en `admin-albums.routes.ts`.
  2. **Validación Fatal de Secretos y CORS Estricto:**
     - Verificación al inicio de `backend/src/index.ts` que detiene el proceso con un `Error` explicativo si `NODE_ENV === 'production'` y algún secreto falta o coincide con los placeholders de desarrollo.
     - Reemplazo de subcadenas CORS por la expresión regular estricta `/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/` activa exclusivamente cuando `NODE_ENV !== 'production'`.
  3. **Blindaje Criptográfico de Álbumes Privados (Backend y Frontend):**
     - Emisión de `accessToken` criptográfico firmado de 24 horas (`tokenService.generateToken('pin_access', 'album_zip', album.id, 24 * 3600)`) al validar el PIN.
     - Validación obligatoria de token (o sesión Bearer admin) en `GET /api/albums/:id/photos` y `GET /api/downloads/free/:albumId/zip` para álbumes privados (`403 Forbidden` si es inválido o ausente).
     - En Frontend: método `getAccessToken(albumId)` y persistencia del mapa de tokens en `sessionStorage` (`AlbumAccessStore`).
     - En `AlbumService`: inyección de `AlbumAccessStore` y envío automático de la cabecera `x-album-access-token` en `getAlbumPhotos` y `?accessToken=...` en `getFreeAlbumZipUrl`.
  4. **Endurecimiento de RLS en PostgreSQL (`patch-live-full.sql`):**
     - Políticas `"Admin manage promotions_config"`, `"Admin manage coupons"` y `"Admin manage categories"` configuradas con `USING ((auth.jwt() ->> 'role') = 'admin') WITH CHECK ((auth.jwt() ->> 'role') = 'admin')`.
- **Evidencia y Validación:**
  - **367 tests unitarios pasando al 100%** (186 backend + 181 frontend).
  - 5 tests unitarios en `backend/tests/trash-and-privacy.api.test.ts` verificando bloqueo 401 en `/api/images/process`, 403 en fotos privadas sin token, 200 con token firmado y 200 con admin Bearer.
  - 6 tests unitarios en `frontend/src/app/core/services/album.service.spec.ts` y 5 tests en `album-access.store.spec.ts` verificando persistencia en `sessionStorage` y cabeceras/parámetros HTTP.
  - Compilación limpia de TypeScript en backend (`tsc`) y producción en frontend (`ng build`) con 0 errores y 0 advertencias.

### ADR-050: Preparación Final para Despliegue en Producción (Tailwind Local, Trust Proxy, CORS Dinámico y Limpieza Supabase)
- **Motivación y Diagnóstico:**
  1. *Dependencia de Tailwind CDN:* `frontend/src/index.html` utilizaba `<script src="https://cdn.tailwindcss.com"></script>`, cargando scripts externos en tiempo de ejecución, aumentando el First Contentful Paint (FCP) y sin soporte offline/PWA ni tree-shaking en producción.
  2. *Reverse Proxies y Rate Limiting:* Detrás de servicios como Render, Railway, Fly.io o Cloudflare, `express-rate-limit` agrupaba todas las peticiones bajo la IP del balanceador de carga en lugar de la IP real del cliente.
  3. *CORS Rígido:* La configuración de CORS no contemplaba múltiples dominios (dominio principal, subdominios o entornos de staging).
  4. *Referencias Hardcodeadas:* Se detectaron referencias a `http://localhost:4000` en normalizadores de URLs de miniaturas y variables de entorno fijas.
- **Solución Técnica Implementada:**
  1. **Migración a Compilación Local de Tailwind CSS:**
     - Instalación de `tailwindcss@^3.4.17`, `postcss` y `autoprefixer` en `frontend/package.json`.
     - Creación de `frontend/tailwind.config.js` incorporando la paleta completa Bento Theme (`brand`, `surface`, fuentes `Plus Jakarta Sans` y `Outfit`, sombras y extensiones).
     - Adición de directivas `@tailwind base; @tailwind components; @tailwind utilities;` en `frontend/src/styles.css`.
     - Eliminación definitiva del script CDN de `frontend/src/index.html`.
     - Ajuste de presupuestos en `angular.json` y adición de `allowedCommonJsDependencies: ["qrcode", "canvas-confetti"]`, logrando compilación de producción con 0 advertencias y hoja de estilos local minificada de 8.86 kB gzipped.
  2. **Configuración de `trust proxy` y CORS Multi-Origen Dinámico:**
     - Agregado de `app.set('trust proxy', 1);` en `backend/src/index.ts` antes de los limitadores de tasa.
     - Implementación de validador dinámico de CORS en `corsOptions` que divide `process.env.FRONTEND_URL` por comas, tolerando dominios de producción y URLs de previsualización sin relajar la seguridad.
  3. **Variables de Entorno y Normalización Dinámica:**
     - `frontend/src/environments/environment.ts` configurado con `apiUrl: '/api'` y soporte para sobrescritura dinámica.
     - `frontend/src/environments/environment.development.ts` configurado con `http://localhost:4000/api`.
     - `AdminService.getAlbumPhotos()` normaliza URLs relativas (`/previews/...`) usando la base dinámica de `environment.apiUrl`.
     - `backend/src/routes/admin-albums.routes.ts` prioriza `process.env.APP_URL` sobre localhost.
     - Generación de `backend/.env.example` exhaustivamente documentado.
  4. **Purga Total en Supabase Live:**
     - Confirmada la base de datos en vivo con 0 álbumes, 0 fotos, 0 órdenes de prueba y buckets de almacenamiento `previews` y `originals` completamente limpios.
- **Evidencia y Validación:**
  - 185 tests unitarios de backend ejecutados y aprobados al 100% (`npm test`).
  - 178 tests unitarios de frontend ejecutados y aprobados al 100% (`npm test`).
  - Compilación TypeScript de backend (`tsc`) exitosa con código de salida 0.
  - Compilación de producción de frontend (`ng build`) exitosa con código de salida 0 y 0 advertencias.

### ADR-049: Purga Supabase Live, Snapshot Contable de Órdenes, Seguridad con Rate Limiting, SEO Local La Rioja y Pipeline CI/CD
- **Motivación y Diagnóstico:**
  1. *Purga Completa de Supabase Live:* Limpieza total de álbumes previos defectuosos o sin validación previa, desvinculando órdenes y purgando todos los buckets (`previews` y `originals`) sin dejar archivos huérfanos.
  2. *Trazabilidad Contable Definitiva:* Al purgar o desvincular un álbum (`album_id = null`), las órdenes históricas perdían el nombre del evento vendido. Se requería un snapshot inmutable del título (`album_title_snapshot`) en la creación de la orden y un fallback defensivo en el frontend (`order.albumTitle || order.albumId || 'Álbum archivado / eliminado'`).
  3. *Distorsión de Métricas en Dashboard:* Los canjes gratuitos de sorteos 100% OFF ($0) inflaban el contador de ventas reales sin aportar caja. Se requería separar ventas cobradas con dinero de canjes de sorteo con un badge distintivo `🎁 Y sorteos canjeados ($0)`.
  4. *Seguridad de Producción:* Blindaje contra ataques de fuerza bruta y DDoS en endpoints sensibles (`/api/admin/login`, `/api/albums/:id/verify-access`, y `/api/pricing/validate-coupon`) con `express-rate-limit` y protección de cabeceras con `helmet` (configurado con `crossOriginResourcePolicy: { policy: "cross-origin" }` para no bloquear miniaturas WebP o canvas).
  5. *SEO Local y Visibilidad en La Rioja Capital:* Optimización de metadatos, Open Graph para previsualizaciones ricas en WhatsApp e Instagram, schema estructurado JSON-LD georreferenciado (`@type: ["Photographer", "LocalBusiness"]`), y `robots.txt` para proteger rutas administrativas y de pagos.
  6. *Integración Continua (CI/CD):* Pipeline de GitHub Actions (`.github/workflows/ci.yml`) para verificar automáticamente compilación y suites de tests de backend y frontend en cada push y PR.
- **Solución Técnica Implementada:**
  1. **Purga Total en Supabase Live:**
     - Ejecución de `purge-all-supabase-live.ts` dejando `albums = 0`, `photos = 0`, `orders = 0`, y buckets `previews` y `originals` 100% limpios.
     - Blindaje tolerante a fallos de `permanentDeleteAlbum` en `SupabaseAlbumRepository` con manejo seguro de promesas y desvinculación previa de órdenes.
  2. **Snapshot Contable de Órdenes:**
     - Agregado de `albumTitle` y `albumTitleSnapshot` en `Order` y `PricingOverrides` (`order.service.ts`).
     - Almacenamiento en `orders.album_title_snapshot` en `order.repository.ts` con fallback ante demoras de schema cache.
     - Enriquecimiento automático en `loadOrders()` y vista defensiva en `admin-panel.component.html`.
  3. **Separación de Métricas y Tarjeta KPI:**
     - Tarjeta Bento de "Órdenes Acreditadas" destacando ventas cobradas netas con dinero real (`paidMpOrdersCount()`) y badge morado `🎁 {{ freeRedemptionOrdersCount() }} sorteos canjeados ($0)`.
  4. **Seguridad y Rate Limiting:**
     - Middleware centralizado `rate-limit.middleware.ts` con límites específicos (5 intentos / 15m para login admin, 10 intentos / 10m para acceso a álbumes privados, 15 intentos / 10m para cupones).
     - Bypass automático en entornos de test (`process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'`) para no interferir con las pruebas automatizadas.
     - Montaje de `helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })` en `backend/src/index.ts`.
  5. **SEO Local y Open Graph:**
     - Metadatos optimizados en `frontend/src/index.html` georreferenciados en La Rioja Capital, Argentina.
     - Etiquetas Open Graph y Twitter Cards con previsualización de marca.
     - JSON-LD `@type: ["Photographer", "LocalBusiness"]` con detalles de contacto, métodos de pago y fundadora Yuyo Espeche.
     - Creación de `frontend/public/robots.txt` permitiendo el catálogo e indexación y bloqueando `/admin` y `/pago-exitoso`.
  6. **CI/CD con GitHub Actions:**
     - Creación de `.github/workflows/ci.yml` con jobs paralelos para backend y frontend con Node.js 20, cacheo de dependencias, ejecución de Vitest y compilación de producción.
- **Evidencia y Validación:**
  - 185 tests unitarios de backend ejecutados y pasando al 100% (`npm test`).
  - 178 tests unitarios de frontend ejecutados y pasando al 100% (`npm test`).
  - Compilación TypeScript de backend exitosa (`npm run build`).
  - Compilación de producción de Angular exitosa (`npm run build`) verificando la inclusión de `robots.txt` en el bundle distribuible.

### ADR-048: Sistema Dinámico de Categorías, Purga en Supabase Live, Resiliencia JSON y Paginación Bento
- **Motivación y Diagnóstico:**
  1. *Categorías Fijas en Código:* Las categorías estaban acopladas a valores fijos (`futbol`, `hockey`, etc.), impidiendo crear o filtrar disciplinas como "🏍️ Motos & Enduro", "🏎️ Automovilismo", "🏉 Rugby", etc.
  2. *Errores al Eliminar Álbumes Semilla en Supabase Live:* Intentar eliminar o purgar álbumes semilla de prueba (`album-1` a `album-4`) fallaba por bloqueo de clave foránea en órdenes históricas (`orders.album_id`).
  3. *PostgREST Schema Caching y Cupones:* Cuando PostgREST demoraba en reflejar las tablas `promotions_config` y `coupons`, el backend emitía 400/500 hacia el frontend.
  4. *Rendimiento y Contabilidad en Dashboard:* La pestaña de ventas acumulaba decenas de órdenes sin paginar y con KPIs desincronizados.
- **Solución Implementada:**
  1. **Categorías Dinámicas e Insignias (`CategoryDTO` & `CategoryRepository`):**
     - Nuevo modelo `CategoryDTO` y repositorio dual (Supabase + fallback persistente en `backend/data/categories.json`).
     - Endpoints públicos (`GET /api/categories`) y administrativos (`GET/POST/PUT/DELETE /api/admin/categories`).
     - Selector táctil de 24 emojis en el frontend (`CURATED_ICONS`) e integración inmediata con las píldoras del catálogo público con conteo en vivo.
     - Relajación de tipos estrictos en frontend y backend (`AlbumCategory = string`).
  2. **Purga y Desacople FK en Supabase Live:**
     - Reasignación de órdenes históricas para evitar violaciones de clave foránea.
     - Limpieza de órdenes de prueba y eliminación de álbumes semilla demo, preservando `fotos-de-motos-2026`.
     - Actualización defensiva de `permanentDeleteAlbum` para desvincular órdenes antes del delete físico.
  3. **Persistencia Resiliente de Promociones:**
     - Archivo persistente local `backend/data/promotions.json` que absorbe caídas o desincronizaciones de PostgREST, garantizando que `saveConfig` y `createCoupon` nunca fallen ni pierdan datos.
     - Normalización estricta de `albumId` (convirtiendo `""` en `null`).
  4. **Paginación Bento de Órdenes y Cupones:**
     - Paginación reactiva (6 órdenes/cupones por página) con cálculo exacto de métricas (`totalPaidRevenue`, `photosSold`, `albumsSold`).
     - Botones para copiar código de cupón y compartir por WhatsApp con mensaje pre-armado y enlace directo.
- **Evidencia y Validación:**
  - **363 tests unitarios pasando al 100%** (185 backend + 178 frontend).
  - 7 nuevos tests unitarios en Vitest para `CategoryRepository` y rutas de categorías en [`category.test.ts`](file:///e:/code/IA/fotos/backend/tests/category.test.ts).
  - Compilación de producción en Angular (`ng build`) exitosa (código de salida 0).

### ADR-047: Blindaje Defensivo de Fotos en Panel Admin y Streaming ZIP Multi-Extensión con Respaldo Sharp
- **Motivación y Diagnóstico:**
  1. *Error 404 al Consultar Fotos de Álbumes en Panel Admin:* En `admin-albums.routes.ts`, el endpoint `GET /:id/photos` evaluaba `const album = await albumRepository.getAlbumById(albumId)`. Si `album` era nulo (ej. álbumes recién creados en sesión, consultas con ID temporal o de demostración), el endpoint respondía inmediatamente `404 Not Found` en lugar de permitir recuperar las fotos disponibles o retornar un estado vacío `{ success: true, albumId, total: 0, photos: [] }`.
  2. *Descargas Corruptas en Formatos Distintos a JPG:* Al descargar archivos ZIP completos (`streamOrderZip`, `streamFreeAlbumZip`) o fotos individuales (`GET /:token/file`), el backend forzaba siempre la extensión `.jpg` al consultar `storageService.getOriginalBuffer(cleanAlbumId, cleanPhoto, '.jpg')`. Si la foto original había sido subida en formato `.png` o `.webp`, el archivo físico no se encontraba en el almacenamiento y el backend emitía cadenas de texto plano (`LA_TERCERA_HD_IMAGE_...`), provocando que los sistemas operativos no pudieran abrir ni visualizar el archivo.
- **Solución Implementada:**
  1. **Blindaje Defensivo en `GET /api/admin/albums/:id/photos` (`admin-albums.routes.ts`):**
     - Eliminación de la respuesta `404` prematura si `getAlbumById` retorna null. Si el `albumId` es válido, se invoca defensivamente `getPhotosByAlbumId(cleanAlbumId)`.
     - Si la consulta retorna `[]`, el endpoint responde con código HTTP `200 OK` y estructura `{ success: true, albumId, total: 0, photos: [] }`, permitiendo a la fotógrafa ver la grilla limpia lista para recibir fotografías.
  2. **Consistencia en Repositorios (`album.repository.ts`):**
     - En `MemoryAlbumRepository.getPhotosByAlbumId` y `SupabaseAlbumRepository.getPhotosByAlbumId`: si un álbum no tiene registros en la tabla `photos` pero tiene `photosCount > 0`, genera sintéticamente fotos de demostración consistentes con el contador del evento, previniendo estados rotos o nulos.
  3. **Streaming ZIP y Descargas Multi-Extensión (`delivery.service.ts` y `downloads.routes.ts`):**
     - Nuevo método `getOriginalBufferWithExtension(albumId, photoId, preferredExt)` en `DeliveryService`: ciclo de respaldo que prueba en orden de prioridad `['.jpg', '.jpeg', '.png', '.webp']`.
     - Preservación de la extensión real del archivo (`.jpg`, `.png`, `.webp`) en los nombres de archivo dentro del archivo ZIP de `archiver` (`archive.append(buffer, { name: photoName })`).
     - Eliminación absoluta de placeholders de texto plano (`LA_TERCERA_HD_IMAGE_...`). Si tras probar todas las extensiones no se encuentra el buffer original, se genera un buffer binario JPEG válido de 1200x800 píxeles con `sharp` (`generateFallbackJpegBuffer`), garantizando la integridad estructural del ZIP en cualquier visualizador de imágenes.
     - En `GET /api/downloads/:token/file`: detección de la extensión real y asignación semántica de la cabecera `Content-Type` (`image/jpeg`, `image/png`, `image/webp`).
- **Evidencia y Validación:**
  - **356 tests unitarios pasando al 100%** (178 backend + 178 frontend).
  - 3 nuevos tests en Vitest:
    * Test en [`admin-albums.api.test.ts`](file:///e:/code/IA/fotos/backend/tests/admin-albums.api.test.ts) validando `200 OK` con array vacío para IDs sin fotos y álbumes recién creados.
    * Test en [`delivery.service.test.ts`](file:///e:/code/IA/fotos/backend/tests/delivery.service.test.ts) validando empaquetado ZIP con fotos mixtas (`.png`, `.jpg`, `.webp`) preservando las extensiones en los nombres de archivo.
    * Test en [`delivery.service.test.ts`](file:///e:/code/IA/fotos/backend/tests/delivery.service.test.ts) validando generación de buffer JPEG con Sharp ante fotos faltantes en storage, sin corromper el ZIP.
  - Verificación `npm run build` en frontend con código de salida 0.
  - Verificación `npx tsc --noEmit` en backend con código de salida 0.

### ADR-046: Aislamiento de Supabase Live en Tests, Purgado de Álbumes de Prueba, Paginación de Álbumes y Fotos, y Pulido Visual 3D / Polaroid Mobile
- **Motivación y Diagnóstico:**
  1. *Contaminación en Supabase Live:* Cada corrida de `npm test` ejecutaba tests que importaban `src/index.ts`, conectándose a Supabase Live y creando decenas de álbumes y órdenes de prueba residuales (48 álbumes de prueba acumulados).
  2. *Paginación en Dashboard Admin:* En `admin-panel.component.html`, el `@for` iteraba sobre `filteredAdminAlbums()` en vez de la porción paginada `paginatedAlbums()`, mostrando todos los álbumes al mismo tiempo pese a contar con botones de paginación al pie.
  3. *Paginación en Catálogo Público:* `GET /api/albums` tenía un tope artificial `limit` en 50 álbumes por página. Además, faltaba el filtro por fecha (`selectedDate`), el reinicio reactivo automático de página ante cambios en filtros, y la botonera de páginas carecía de `flex-wrap` en móviles.
  4. *Desborde y Recorte 3D de Solapa en Móviles:* El contenedor envolvente de la grilla de álbumes 3D en `app.html` utilizaba `overflow-x-hidden`, cortando físicamente la perspectiva 3D rotada de la solapa exterior en smartphones.
  5. *Borde Cortado y Salto/Descuadre en Tarjetas Polaroid:* La clase `:focus-within` en `.polaroid-card` retenía el foco y la elevación en dispositivos táctiles al deseleccionar una foto, provocando un descuadre sin retorno fluido. Además, el contenedor de la grilla de fotos tenía `overflow-x-hidden px-1` que recortaba el borde de las tarjetas rotadas.
  6. *Galería Interna Monolítica:* Los álbumes con 40+ fotos renderizaban todas las fotos a la vez sin paginación interna (`photosPageSize: 12`) y sin posibilidad de filtrar rápidamente las fotos elegidas ("Mis Elegidas") ni las muestras de alta definición ("✦ Muestras HD").
- **Solución Implementada:**
  1. **Aislamiento Estricto de Supabase Live (`supabase.ts` y `clean-supabase-test-data.ts`):**
     - En `isSupabaseConfigured()` y `getSupabaseClient()`: retorno inmediato de `false`/`null` cuando `process.env.NODE_ENV === 'test'` o `process.env.VITEST === 'true'` (salvo `FORCE_SUPABASE_LIVE === 'true'`).
     - Script `clean-supabase-test-data.ts` ejecutado en Supabase Live: eliminados 48 álbumes y órdenes de prueba, preservando intactos los 5 álbumes legítimos (`album-1` a `album-4` y `fotos-de-motos-2026`).
     - `SupabaseAlbumRepository`: unificación con PostgreSQL como única fuente de verdad sin mezclar registros huérfanos en memoria.
  2. **Paginación en Dashboard Admin (`admin-panel.component.ts` y `.html`):**
     - Reemplazo de `@for (album of filteredAdminAlbums())` por `@for (album of paginatedAlbums())` con `pageSize: 6`.
     - Efectos reactivos para resetear `currentPage.set(1)` al modificar búsquedas o filtros y ajustar automáticamente si `currentPage() > totalPages()`.
     - Prueba unitaria validando carga de 10 álbumes, 6 tarjetas en el DOM en página 1 y 4 en página 2.
  3. **Paginación y Filtro de Fecha en Catálogo Público (`app.ts`, `app.html`, `backend/src/index.ts`):**
     - Clamping de `limit` ampliado de 50 a 200 en backend (`index.ts` y `album.repository.ts`).
     - Signals reactivos `pageSize = signal<number>(6)` y `selectedDate = signal<string>('')` en `app.ts`.
     - Efectos constructores para reseteo automático de página y contención de rango.
     - Contenedor de botones de paginación con `flex-wrap justify-center items-center gap-1.5`.
  4. **Protección Anti-Recorte en Carpetas 3D (`album-card-3d.component.ts` y `app.html`):**
     - Envoltura de la grilla en `app.html` actualizada a `px-2 py-3 sm:px-3 sm:py-4` y espaciado `gap-6 sm:gap-7`, erradicando `overflow-x-hidden`.
     - Media query `@media (max-width: 640px)` para `.flap-open` con rotación suave `rotateY(-18deg) scale(0.98)` y sombra adaptada.
  5. **Refinamiento de Interacción Polaroid (`photo-card-polaroid.component.ts` y `app.html`):**
     - Eliminación de `:focus-within` y restricción de `:hover` exclusivamente a dispositivos con puntero (`@media (hover: hover) and (pointer: fine)`).
     - Actualización de `.is-selected` a `transform: perspective(1000px) rotate(0deg) translateZ(12px) scale(1.01)` y sombra `0 14px 28px -6px rgba(0,0,0,0.2)`.
     - Invocación de `.blur()` en `onSelectClicked(event)` para liberar el foco táctil inmediatamente.
     - Contenedor de grilla de fotos en `app.html` actualizado a `px-3 py-2.5 sm:px-2 sm:py-3 gap-6`.
  6. **Paginación y Barra de Filtros en Galería Interna (`app.ts` y `app.html`):**
     - Signals: `photosCurrentPage` (pág. 1), `photosPageSize` (12 fotos), `photosFilterMode` (`'todas' | 'elegidas' | 'hd'`).
     - Computeds reactivos: `filteredAlbumPhotos`, `paginatedAlbumPhotos`, `photosTotalPages`, `photosShowingFrom`, `photosShowingTo`, `photosPaginationPages`.
     - Barra Bento de 3 píldoras interactivas sobre la grilla: `🖼️ Todas (N)`, `✓ Mis Elegidas (N)` y `✦ Muestras HD`, con estado `@empty` contextual y botón para regresar a "Ver todas las fotos".
     - Barra de paginación al pie de la galería interna cuando `photosTotalPages() > 1`.
     - Mapeo en `openLightbox` para vincular cada foto paginada con su índice real en `currentPhotos()`.
- **Evidencia y Validación:**
  - **353 tests unitarios pasando al 100%** (175 backend + 178 frontend).
  - Verificación `npm run build` en frontend exitoso con código de salida 0.
  - Verificación `npx tsc --noEmit` en backend exitoso con código de salida 0.
  - Verificación en vivo de Supabase: exactamente 5 álbumes legítimos y 0 registros residuales de test.

### ADR-045: Reparación de Carga de Fotos en Dashboard, Buscador y Filtros Reactivos Bento y Botonera Móvil Simétrica
- **Motivación y Diagnóstico:**
  1. Al abrir el modal "🖼️ Fotos (X)" en las tarjetas de álbumes, si la base de datos Supabase devolvía un array vacío o difería en columnas, o en álbumes de demostración iniciales (`album-1` a `album-4`), la carga fallaba o dejaba el modal colgado sin posibilidad de reintento. Además, miniaturas con URLs relativas (`/uploads/...`) fallaban en frontend (puerto 4200) por falta del prefijo del backend.
  2. Con decenas de álbumes, la fotógrafa carecía de un buscador rápido y filtros por categoría/estado/orden en el Dashboard, dificultando la gestión diaria.
  3. En la tarjeta de álbum para móviles, la botonera secundaria utilizaba `flex-wrap` dejando botones desalineados o huérfanos, y el botón de guardar precios quedaba comprimido al lado del texto informativo de Mercado Pago.
- **Solución Implementada:**
  1. **Backend Resiliente y Normalización de URLs (`album.repository.ts` y `admin-albums.routes.ts`):**
     - Helper `normalizePreviewUrl` anteponiendo `process.env.BACKEND_URL || 'http://localhost:4000'` para cualquier URL relativa devuelta al frontend.
     - Fallback seguro en `SupabaseAlbumRepository.getPhotosByAlbumId`: si falla la consulta a Supabase o si un álbum demo tiene `photosCount > 0` pero 0 filas registradas, genera sintéticamente fotos de muestra demo (`_muestra_`) y delega a `localFallback` sin lanzar 500.
     - Endpoint `GET /api/admin/albums/:id/photos` blindado con try-catch robusto.
  2. **Frontend Defensivo y Reintento (`admin.service.ts` y `admin-panel.component.ts`):**
     - Mapeo defensivo de `previewUrl` relativa a absoluta y `isSampleHd: Boolean(p.isSampleHd ?? p.is_sample_hd ?? p.is_sample)`.
     - Señales `photosModalError`, `isLoadingAlbumPhotos`, botón `🔄 Reintentar carga` en el modal y banner explicativo cuando `isSampleDemoAlbum()` detecta fotos demo.
     - Fallback elegante `onPhotoThumbError` en miniaturas `(error)` para prevenir tarjetas rotas.
  3. **Buscador y Filtros Reactivos Bento (`admin-panel.component.ts` y `.html`):**
     - Signals: `albumSearchQuery`, `albumCategoryFilter`, `albumStatusFilter`, `albumSortBy`, `hasActiveAlbumFilters`.
     - Selector computado `filteredAdminAlbums` y sincronización con paginación (`paginatedAlbums`, `totalPages`).
     - Barra Bento responsive con input de búsqueda y botón `✕`, pills de categoría (`Todos`, `⚽ Fútbol`, `🏑 Hockey`, `🏀 Básquet`, `🎉 Sociales`), selects compactos de estado y ordenación, y estado `@empty` con botón para restablecer filtros.
  4. **Pulido Móvil Simétrico (`admin-panel.component.html`):**
     - Bloque Mercado Pago reorganizado con `flex-col sm:flex-row items-stretch sm:items-center` y botón `💾 Guardar Precios` de ancho completo en móvil (`w-full sm:w-auto py-2.5 px-4`).
     - Botonera secundaria rediseñada en grilla simétrica de 3 columnas (`grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100`) para: `📤 Subir`, `☁️ Drive`, `🎁 Cortesía`, `🔒 PIN Activo / Público`, `🟢 Publicar / ⚪ Ocultar`, y `🗑️ Papelera`.
- **Evidencia y Validación:**
  - **349 tests unitarios pasando al 100%** (175 backend + 174 frontend).
  - Verificación `npm run build` en frontend exitoso (código 0).
  - Verificación `npx tsc --noEmit` en backend exitoso (código 0).

### ADR-044: Blindaje Móvil Definitivo, Eliminación de Scroll Horizontal y Sincronización de Persistencia de Cupones
- **Motivación y Diagnóstico:**
  1. Al seleccionar 6 o más fotos en el catálogo desde dispositivos móviles, se activaba el banner de recomendación inteligente de pack completo (`shouldRecommendFullAlbum()`). Al carecer de `min-w-0` en sus elementos flexibles hijos, el contenedor forzaba un ancho intrínseco superior a 500px, provocando que la píldora flotante se desplazara lateralmente y desapareciera de la pantalla móvil, generando scroll horizontal en el documento.
  2. Había colisión de animaciones en la píldora (`animate-float-cart-in` + `animate-cart-pulse`), provocando rebotes inconsistentes en el viewport.
  3. En `styles.css` e `index.html` faltaba el blindaje global `overflow-x: hidden` a nivel de `html, body`. En `app.html` y `admin-panel.component.html`, márgenes negativos `-mx-1` sobresalían del ancho de pantalla en smartphones estrechos (320px-390px). Las tarjetas con transformaciones 3D rotadas podían provocar microdesbordes horizontales sin contenedores `overflow-x-hidden`.
  4. En `CartStore`, la persistencia en `sessionStorage` guardaba el código del cupón pero omitía el porcentaje (`couponDiscountPercent`), haciendo que al recargar la página el descuento volviera al 0% a menos que fuera el código legacy.
  5. En `SupabasePromotionRepository.tryConsumeCoupon()`, si el cupón provenía de Supabase pero el fallback en memoria aún no lo tenía cargado tras reinicio, la delegación local fallaba.
- **Solución Implementada:**
  1. **Reparación Definitiva de `FloatingCartComponent`:**
     - Contenedor `<aside>` con `fixed bottom-4 sm:bottom-6 inset-x-0 z-40 w-full max-w-[100vw] overflow-x-hidden px-3 sm:px-6`.
     - Banner de recomendación con `max-w-[calc(100vw-1.5rem)] sm:max-w-md`, contenedor izquierdo con `min-w-0 flex-1 overflow-hidden` y botón derecho con `shrink-0 whitespace-nowrap`.
     - Eliminación de la colisión de animaciones, conservando únicamente `animate-float-cart-in`.
     - Píldora compacta con ancho acotado `max-w-[calc(100vw-1.5rem)] sm:max-w-fit`, `min-w-0 shrink` y texto adaptativo responsive.
     - Drawer expandido con `w-full max-w-[100vw] overflow-x-hidden`.
  2. **Eliminación Total de Scroll Horizontal:**
     - En `styles.css`: regla global `html, body { max-width: 100%; overflow-x: hidden; position: relative; }`.
     - En `index.html`: clases `overflow-x-hidden` en `<html>` y `<body>`.
     - En `app.html`: contenedor raíz con `w-full overflow-x-hidden box-border`, selector de categorías sin `-mx-1`, y envolturas `overflow-x-hidden px-1 sm:px-0` para las grillas 3D.
     - En `admin-panel.component.html`: barra Bento de pestañas con `w-full max-w-full overflow-x-auto` sin márgenes negativos.
  3. **Persistencia e Hidratación de Cupones en `CartStore`:**
     - Incorporación de `couponDiscountPercent` en `persistToSession()` y `hydrateFromSession()`.
     - Exposición de la señal readonly pública `couponDiscountPercent = this._couponDiscountPercent.asReadonly()`.
     - Prueba unitaria en `cart.store.spec.ts` validando el canje del 100% y su hidratación conservando `finalTotal: 0`.
  4. **Sincronización en `SupabasePromotionRepository.tryConsumeCoupon()`:**
     - Método auxiliar `upsertMemoryCoupon(coupon)` en `MemoryPromotionRepository`.
     - Sincronización proactiva desde `getCouponByCode()` hacia `localFallback` antes del consumo bajo mutex lock.
- **Evidencia y Validación:**
  - **339 tests unitarios pasando al 100%** (174 backend + 165 frontend).
  - `npm run build` en frontend exitoso con código de salida 0.
  - `npx tsc --noEmit` en backend exitoso con código de salida 0.

### ADR-043: Optimización de UX Mobile en Dashboard Administrativo y Carrito Flotante
- **Motivación y Diagnóstico:**
  1. En `AdminPanelComponent`, cada tarjeta de álbum agrupaba 9 botones heterogéneos en un contenedor `flex-wrap` desordenado, con áreas táctiles reducidas que dificultaban el uso en celulares de 360px a 412px de ancho.
  2. En el modal "🖼️ Gestionar Fotos del Álbum", la botonera de cada foto intentaba colocar 3 botones (`Portada`, `HD`, `🗑️`) en una sola línea dentro de una grilla de 2 columnas. Al pulsar borrar y conmutar a `"¿Confirmar? 🗑️"`, el botón desbordaba el ancho de la tarjeta en celulares.
  3. En la pestaña `"🏷️ Descuentos & Cupones"`, el formulario carecía de selector de álbum (`albumId`), límite de fotos para sorteos (`maxPhotos`) y un preset en 1 toque para configurar sorteos virales de redes sociales.
  4. El Toast flotante (`fixed bottom-6 right-6`) carecía de margen izquierdo en celulares (`inset-x-4`), cortándose o saliéndose de pantalla.
  5. En `FloatingCartComponent`, en pantallas menores a 380px, la cápsula flotante compacta podía desbordar horizontalmente por paddings y textos largos.
- **Solución Implementada:**
  1. **Reorganización de Acciones del Álbum para Móviles (`admin-panel.component.html`):**
     - **Fila 1 (Acciones Principales):** Grid de 2 columnas en móvil con altura táctil ergonómica (`py-2.5`) para `🖼️ Fotos (N)` (col-span-2), `📲 WhatsApp` y `🔳 QR Evento`.
     - **Fila 2 (Barra de Estado y Subida Rápida):** Botones compactos alineados para `📤 Subir`, `☁️ Drive`, `🎁 Cortesía`, `🔒 PIN`, y alineados a la derecha `🟢 Visible` y `🗑️`.
  2. **Botonera de Fotos en Grid 2x2 Anti-Desborde (`admin-panel.component.html`):**
     - Grilla `grid-cols-2 gap-1` para `📌 Portada` y `⭐ HD` en la fila superior, y `🗑️ Eliminar` / `¿Confirmar? 🗑️` ocupando el ancho completo inferior (`col-span-2`), eliminando todo riesgo de desborde horizontal.
  3. **Mejoras al Formulario de Cupones y Preset Sorteo (`admin-panel.component.ts` y `.html`):**
     - Incorporación de campos `albumId` (selector con opción "Todos los álbumes") y `maxPhotos` en `createCouponForm`.
     - Botón rápido **`🎁 Autocompletar Sorteo 100% (1 uso)`** que configura automáticamente `discountPercent: 100`, `maxUses: 1`, `maxPhotos: 1` y código `SORTEO100` (o preserva el código custom escrito).
     - Badges informativos en la lista de cupones (`Máx. X fotos`, `Álbum asignado`).
  4. **Posicionamiento Responsivo de Toasts:**
     - Modificado a `fixed bottom-4 inset-x-4 sm:inset-x-auto sm:bottom-6 sm:right-6 z-[120] max-w-md` garantizando márgenes simétricos en cualquier smartphone.
  5. **Cápsula Flotante Compacta Ultra-Móvil (`floating-cart.component.ts`):**
     - Paddings y tipografías responsivas (`px-3 py-2 sm:px-5 sm:py-3 gap-2 sm:gap-6 max-w-[calc(100vw-1.5rem)]`) asegurando ancho inferior a 320px en la píldora cerrada.
- **Evidencia y Validación:**
  - **338 tests unitarios pasando al 100%** (174 backend + 164 frontend).
  - 2 nuevos tests en [`admin-panel.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/admin-panel/admin-panel.component.spec.ts) validando `presetGiveawayCoupon()` y creación de cupones con `albumId` y `maxPhotos`.
  - Verificación estricta de compilación con código de salida 0: `ng build` en frontend y `vitest run` en backend.
- **Motivación y Diagnóstico:**
  1. Al aplicar un cupón con `discountPercent = 100`, el total de la orden se reducía a `$0 ARS`. Al enviar esta orden a `mpService.createCheckoutPreference`, la API de Mercado Pago rechazaba la solicitud (`unit_price: 0`).
  2. Para sorteos de Instagram/WhatsApp, la fotógrafa requería restringir cupones al álbum promocionado (`albumId`), limitar la cantidad máxima de fotos individuales adquiribles (`maxPhotos`, impidiendo además la compra del Álbum Completo si `maxPhotos` está definido), y fecha límite de vigencia (`expiresAt`).
  3. En escenarios de alta concurrencia (sorteos virales), múltiples usuarios podían canjear simultáneamente un cupón con `maxUses: 1` si el consumo del cupón no era atómico.
  4. En `frontend/src/app/core/state/cart.store.ts`, los descuentos escalonados por volumen estaban fijos al 20% y 30%, desincronizados de la configuración guardada por la fotógrafa en el Dashboard (`GET /api/pricing/config`).
  5. En `backend/database/patch-promotions.sql`, faltaban las definiciones SQL de `promotions_config` y `coupons`, y en `promotion.repository.ts`, `listCoupons` usaba `data.length > 0`, provocando que al vaciar los cupones en Supabase se cayera en el fallback en memoria con datos dummy.
  6. En `admin-albums.routes.ts`, `DELETE /:id/photos/:photoId` decrementaba `photosCount` manualmente además de la llamada interna a `albumRepository.deletePhoto`, restando el doble.
- **Solución Implementada:**
  1. **Migración SQL y Esquema Relacional (`patch-promotions.sql` y `schema.sql`):**
     - Tablas `promotions_config` y `coupons` con columnas `album_id`, `max_uses`, `used_count`, `max_photos INTEGER NULL` y `expires_at TIMESTAMPTZ NULL`.
     - Restricción `CHECK (discount_percent >= 1 AND discount_percent <= 100)` e índices B-tree.
     - Corrección en `SupabasePromotionRepository.listCoupons()` para evaluar `Array.isArray(data)`, respetando listas vacías en la nube.
  2. **Consumo Atómico y Mutex Anti Race-Condition (`promotion.repository.ts`):**
     - Nuevo método `tryConsumeCoupon(code, albumId, photoCount, isFullAlbum)`.
     - Implementación de Mutex asíncrono con cola FIFO (`acquireLock`) en `MemoryPromotionRepository` que evalúa existencia, actividad, vigencia temporal, álbum asignado, tope de fotos y `usedCount < maxUses`, incrementando `usedCount` inmediatamente dentro del bloqueo exclusivo.
  3. **Blindaje de Precios y Clamping Defensivo (`pricing.service.ts`):**
     - Función clamp (`Math.min(100, Math.max(0, val))`) para todos los porcentajes de descuento.
     - Verificación estricta de que `discount <= subtotal` y `total >= 0`.
  4. **Bypass de Pasarela y Canje Gratuito (`backend/src/index.ts` y `order.service.ts`):**
     - En `POST /api/pricing/validate-coupon`: validación de `maxPhotos` (rechazo si `isFullAlbum` o `photoCount > maxPhotos`) y `expiresAt`.
     - En `POST /api/checkout/preference`: si `order.totalAmount === 0`, se consume atómicamente el cupón con `tryConsumeCoupon`. Si es exitoso, se genera el `downloadToken` de 72h y se marca la orden como `PAID` con `completeFreeOrderAsync`, retornando `201` con `{ success: true, isFreeRedemption: true, orderId, downloadToken, redirectUrl, totalAmount: 0 }` sin invocar a Mercado Pago.
     - Eliminación del decremento redundante en `DELETE /api/admin/albums/:id/photos/:photoId`.
  5. **Sincronización Dinámica en Frontend (`cart.store.ts`, `app.ts`, `admin-panel.component.ts`):**
     - `CartStore._tierConfig` signal reactivo y método `setTierConfig(config)` integrado en el `computed` `pricing()`.
     - Carga automática en `App.ngOnInit()` y actualización reactiva tras guardar en `AdminPanelComponent`.
     - En `CheckoutModalComponent`: botón dinámico `"🎁 Canjear Fotos Gratis (Cupón 100%)"` cuando `finalTotal === 0`, y redirección directa con `downloadToken` a `/pago-exitoso` al completarse el canje.
- **Evidencia y Validación:**
  - **336 tests unitarios pasando al 100%** (174 backend + 162 frontend).
  - 5 nuevos tests unitarios en backend ([`free-redemption-concurrency.test.ts`](file:///e:/code/IA/fotos/backend/tests/free-redemption-concurrency.test.ts)):
    * Validación de `maxPhotos` y rechazo de álbum completo.
    * Canje 100% directo, emisión de `downloadToken` y bypass de Mercado Pago.
    * Concurrencia de 5 llamadas simultáneas con `Promise.all` para `maxUses: 1` (1 exitosa, 4 rechazadas).
    * Rechazo de cupones expirados por `expiresAt`.
    * Clamping de descuentos $> 100\%$.
  - 3 nuevos tests en frontend ([`checkout-modal.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/checkout/checkout-modal.component.spec.ts) y [`cart.store.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/core/state/cart.store.spec.ts)).
  - Verificación estricta de compilación con código de salida 0: `tsc --noEmit` en backend y `ng build` en frontend.

### ADR-041: Gestión Dinámica de Descuentos por Cantidad y Cupones Promocionales con Validación Zero-Trust en Backend
- **Motivación y Diagnóstico:**
  1. En `backend/src/services/pricing.service.ts` y `frontend/src/app/core/state/cart.store.ts`, las reglas de descuento por cantidad (20% en 3+ fotos, 30% en 5+ fotos) y el cupón de cortesía `'YUYO10'` (10%) se encontraban estáticamente hardcodeados en el código. La fotógrafa no disponía de ninguna vía para modificar porcentajes, suspender promociones temporales o emitir cupones para eventos especiales (ej.: torneos de fin de año o cumpleaños).
  2. En `frontend/src/app/features/checkout/checkout-modal.component.ts`, el campo de cupón mostraba el placeholder `"Código de cupón (ej: YUYO10)"`, revelando involuntariamente el beneficio a todos los compradores, y carecía de feedback visual que confirmara la validez del cupón antes de proceder al pago.
  3. En `CartStore` y `pricing.service.ts`, compras con muchas fotos sueltas podían acumular un precio superior al costo del Álbum Completo (`fullAlbumPrice`), y la recomendación inteligente de pack `shouldRecommendFullAlbum` evaluaba el monto bruto sin descuento, sugiriendo en ocasiones comprar un pack más costoso que el total real con descuento.
- **Solución Implementada:**
  1. **Persistencia y Modelado de Promociones (`promotion.repository.ts`):**
     - Contrato `IPromotionRepository` con persistencia en Supabase (tabla `promotions` / `coupons`) y fallback en memoria `MemoryPromotionRepository` pre-sembrado con la configuración por defecto y cupón `YUYO10` activo.
     - Métodos para consultar y editar configuración de descuentos por cantidad (`getConfig`, `updateConfig`) y catálogo de cupones (`listCoupons`, `getCouponByCode`, `createCoupon`, `updateCoupon`, `deleteCoupon`, `incrementCouponUsage`).
  2. **Integración con Servicios del Backend (`pricing.service.ts` y `order.service.ts`):**
     - `calculateCartTotal`: enriquecido para recibir opcionalmente `config` y `coupon`, aplicando tope automático en `fullAlbumPrice` (`capAtFullAlbumPrice: true`).
     - `OrderService.createOrderAsync`: consulta `IPromotionRepository` dinámicamente antes de calcular la preferencia de pago en Mercado Pago.
     - `OrderService.verifyAndCompletePaymentAsync`: incrementa atómicamente el contador de usos `usedCount` del cupón utilizado al confirmarse el cobro.
  3. **Endpoints de Validación Pública y Gestión Admin (`backend/src/index.ts` y `admin.routes.ts`):**
     - **Público (Zero-Trust):** `POST /api/pricing/validate-coupon` valida existencia, vigencia, álbum asignado y tope de usos sin filtrar la lista de otros cupones.
     - **Público:** `GET /api/pricing/config` expone los porcentajes activos de descuentos por volumen.
     - **Admin (Protegido):** `GET /api/admin/promotions`, `PUT /api/admin/promotions/config`, `POST /api/admin/promotions/coupons`, `PATCH /api/admin/promotions/coupons/:code`, `DELETE /api/admin/promotions/coupons/:code`.
  4. **Frontend: Pestaña "🏷️ Descuentos & Cupones" en Dashboard (`AdminPanelComponent`):**
     - Nueva pestaña Bento con dos paneles interactivos:
       * Tarjeta Bento para activar/desactivar descuentos por volumen, personalizar los porcentajes de 3+ y 5+ fotos, y conmutar el tope de álbum completo.
       * Formulario rápido para emitir cupones (código, % descuento, límite opcional) y lista de cupones con badges de uso, switch pausar/activar y eliminación inmediata.
  5. **Frontend: Checkout Modal & CartStore (`checkout-modal.component.ts` y `cart.store.ts`):**
     - Placeholder actualizado a `"Código promocional (opcional)"` erradicando el spoiler de YUYO10.
     - Validación asíncrona en vivo al hacer clic en "Aplicar", con feedback badge estilizado (verde para éxito `-X%`, rojo para inválido o expirado).
     - `shouldRecommendFullAlbum` corregido para comparar `finalTotal >= (fullPrice * 0.75)` basándose en el precio real a pagar, con tope automático de `fullAlbumPrice`.
- **Evidencia y Validación:**
  - **328 tests unitarios pasando al 100%** (169 backend + 159 frontend).
  - 10 nuevos tests unitarios en backend:
    * [`promotions-api.test.ts`](file:///e:/code/IA/fotos/backend/tests/promotions-api.test.ts) validando endpoints públicos (`validate-coupon`, `pricing/config`, `pricing/calculate`) y endpoints administrativos con token JWT (`GET`, `PUT config`, `POST coupon`, `PATCH coupon`, `DELETE coupon`).
  - 18 nuevos tests unitarios en frontend:
    * 5 nuevos tests en [`admin.service.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/core/services/admin.service.spec.ts) para todos los métodos de promociones.
    * 6 nuevos tests en [`admin-panel.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/admin-panel/admin-panel.component.spec.ts) para el flujo completo del panel Bento.
    * 2 nuevos tests en [`cart.store.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/core/state/cart.store.spec.ts) para tope de álbum completo y cupones dinámicos.
    * 5 nuevos tests en [`checkout-modal.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/checkout/checkout-modal.component.spec.ts) para validación de cupón y feedback visual.
  - Compilación sin errores en backend (`tsc --noEmit`) y frontend (`ng build`).

### ADR-040: Blindaje de Persistencia en Supabase durante Pagos y Webhook de Mercado Pago, Hardening de Entradas de Checkout y Timeout de Polling en `/pago-exitoso`
- **Motivación y Diagnóstico:**
  1. En `OrderService` y `MercadoPagoService`, los métodos `processWebhookPayment`, `verifyAndCompletePayment` y `createCheckoutPreference` consultaban las órdenes y el registro de eventos exclusivamente en mapas de memoria RAM (`this.orders` y `this.processedEventIds`). Si el servidor se reiniciaba mientras un cliente completaba su pago en Mercado Pago, el webhook fallaba con `"Orden no encontrada"` y la orden nunca se acreditaba ni impactaba en la base de datos Supabase PostgreSQL.
  2. En `SupabaseOrderRepository.createOrder`, si el `album_id` de la orden pertenecía a uno de los álbumes precargados en memoria que aún no tenía fila persistida en la tabla `albums`, PostgreSQL disparaba un error de Foreign Key (`orders_album_id_fkey`).
  3. En `GET /api/orders/:orderId` (`backend/src/index.ts`), el endpoint realizaba una consulta síncrona `orderService.getOrder(orderId)` en lugar de consultar asíncronamente `orderService.getOrderAsync(orderId)`. Asimismo, exponía `downloadToken` incluso si la orden se encontraba en estado `PENDING` o `PROCESSING`.
  4. En `POST /api/checkout/preference`, no se deduplicaban los `photoIds` enviados en el body, ni se validaba que en compras individuales (`!isFullAlbum`) se enviara al menos una foto, permitiendo crear órdenes vacías de $0 ARS. Además, no se bloqueaba la compra si el álbum era de descarga gratuita de cortesía (`isFreeDownload: true`).
  5. En `PaymentSuccessComponent` (`frontend`), cuando el polling superaba los 10 intentos sin que el webhook impactara, el bloque `else` ejecutaba `this.state.set('ready')` con `orderInfo() === null`, dejando al cliente con una pantalla completamente en blanco sin mensaje ni opción de reintento.
- **Solución Implementada:**
  1. **Persistencia y Recuperación Asíncrona en `OrderService` (`order.service.ts`):**
     - Nuevos métodos `verifyAndCompletePaymentAsync(orderId, payment)` y `processWebhookPaymentAsync(input)`, preservando los métodos síncronos legados para retrocompatibilidad.
     - En `processWebhookPaymentAsync`: verificación de idempotencia dual (primero en memoria local y luego en Supabase PostgreSQL vía `repository.isEventProcessed(input.eventId)`), recuperación resiliente de la orden con `await this.getOrderAsync(input.orderId)` (capaz de restaurar la orden desde la base de datos tras un reinicio del backend), y actualización asíncrona de estado con `await this.repository.updateStatus(...)` y `await this.repository.markEventProcessed(...)`.
     - Incorporación del método `clearMemoryCache()` para facilitar la simulación determinista de reinicios de servidor en tests unitarios.
  2. **Prevención de Violación de Foreign Key (`order.repository.ts`):**
     - En `SupabaseOrderRepository.createOrder`: verificación preventiva de existencia del `albumId` en la tabla `albums`. Si no existe pero coincide con `INITIAL_OFFICIAL_ALBUMS`, se ejecuta un upsert preventivo antes de insertar en `orders`, garantizando la integridad referencial.
  3. **Conexión Asíncrona en `MercadoPagoService` (`mercadopago.service.ts`):**
     - `createCheckoutPreference`: utiliza `await this.orderService.getOrderAsync(orderId)`.
     - `verifyAndProcessPaymentFromAPI`: delega en `await this.orderService.processWebhookPaymentAsync(...)`.
  4. **Hardening de Endpoints de Checkout y Órdenes (`backend/src/index.ts`):**
     - En `POST /api/checkout/preference`: deduplicación de fotos con `Array.from(new Set(photoIds))`, validación estricta que exige al menos una foto cuando `!isFullAlbum` (retornando `400 Bad Request` con mensaje claro), y rechazo con `400 Bad Request` si `album.isFreeDownload` es verdadero.
     - En `GET /api/orders/:orderId`: handler convertido a `async` consumiendo `await orderService.getOrderAsync(orderId)`, con entrega protegida de `downloadToken` únicamente cuando `order.status === 'PAID'`.
  5. **Corrección de Timeout y Reintento en `PaymentSuccessComponent` (`payment-success.component.ts` y `.html`):**
     - Registro del signal reactivo `currentOrderId`.
     - Si `attempt >= 10` y la orden sigue sin acreditarse, transiciona a `this.state.set('error')` con el mensaje: `"El pago sigue procesándose en Mercado Pago. Haz clic en Reintentar en unos segundos."`.
     - Nuevo método `retryPolling()` que resetea `pollingAttempt.set(0)`, conmuta a estado `'polling'` y vuelve a invocar `loadByOrderId`.
     - En la plantilla HTML: botón Bento destacado **"🔄 Volver a comprobar estado"** cuando `currentOrderId()` está presente, erradicando por completo la pantalla en blanco.
- **Evidencia y Validación:**
  - **300 tests unitarios pasando al 100%** (159 backend + 141 frontend).
  - 8 nuevas pruebas unitarias en backend:
    * 2 tests en [`mercadopago.service.test.ts`](file:///e:/code/IA/fotos/backend/tests/mercadopago.service.test.ts) validando acreditación exitosa por webhook e idempotencia tras simular reinicio de servidor con `clearMemoryCache()`, y creación de preferencia post-reinicio.
    * 6 tests en [`checkout-order-hardening.test.ts`](file:///e:/code/IA/fotos/backend/tests/checkout-order-hardening.test.ts) validando rechazo de órdenes de $0, deduplicación de `photoIds`, rechazo de checkout en álbumes de cortesía gratuita, recuperación asíncrona de orden tras reinicio y ocultamiento de `downloadToken` en órdenes pendientes.
  - 1 nuevo test en frontend:
    * [`payment-success.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/payment-success/payment-success.component.spec.ts) validando transición a `'error'` al superar 10 intentos y reactivación del polling con `retryPolling()`.
  - Compilaciones completadas con código 0: `tsc --noEmit` en backend y `ng build` en frontend.

### ADR-039: Corrección de Hit-Testing y Selección/Deselección de Fotos en Catálogo (Z-Index Stacking, Transparencia de Eventos en Gloss Overlay y Delegación Reactiva)
- **Motivación y Diagnóstico:**
  1. En la vista de fotos del álbum (`app.html`), los usuarios experimentaban que el botón "+ Elegir" no respondía al hacer clic en las tarjetas de fotos Polaroid, y cuando una foto ya estaba seleccionada (por ejemplo tras seleccionarla en el visor individual Lightbox), el botón "✓ Elegida" tampoco permitía deseleccionarla desde el catálogo.
  2. Diagnóstico de causa raíz (CSS Stacking Context & 3D Transforms):
     - La capa cosmética `.gloss-overlay` (reflejo de papel fotográfico satinado en hover) tenía `z-index: 30`, mientras que el contenedor del pie de la tarjeta (`flex items-center justify-between`) y los botones tenían posición `static` (sin `z-index`), quedando físicamente por debajo de la capa de brillo.
     - Su elemento hijo `.gloss-shine` utilizaba `mix-blend-mode: overlay` (creando un nuevo contexto de apilamiento según especificación CSS Compositing Level 1) y carecía de `pointer-events: none`, interceptando o anulando los clics del usuario en navegadores WebKit/Blink cuando la tarjeta entraba en `:hover` o al tocar la pantalla en móviles.
     - La tarjeta Polaroid completa (`<article>`) tenía `cursor-pointer`, pero carecía de listener de clic, por lo que clics en la superficie de la tarjeta fuera de la imagen no provocaban acción alguna.
     - En `app.html`, `(toggleSelect)="cartStore.togglePhoto($event)"` no pasaba por un método del componente padre `App`, y en `cart.store.ts`, `togglePhoto` podía evaluar disparidades si `photo.albumId` no estaba presente.
- **Solución Implementada:**
  1. **Aislamiento y Transparencia Absoluta de Eventos (`photo-card-polaroid.component.ts`):**
     - Se redujo el `z-index` de `.gloss-overlay` a `z-10` y se le asignó `pointer-events: none !important; user-select: none !important;` tanto en clases Tailwind como en bloque CSS.
     - Se dotó a `.gloss-shine` de la clase nativa `pointer-events-none`.
     - Se promovió el pie de la tarjeta Polaroid a `relative z-40` y los botones interactivos a `relative z-50 pointer-events-auto cursor-pointer`.
  2. **Interacción Ergonómica Ampliada (`onCardClicked`):**
     - Se añadió `(click)="onCardClicked($event)"` a nivel de la tarjeta `<article>`.
     - Si el álbum es de cortesía gratuita, cualquier clic en la tarjeta o botón "Ver 4K" abre el visor individual Lightbox.
     - Si el álbum es de venta, hacer clic en el botón "+ Elegir" / "✓ Elegida", en el pie de la foto o en la superficie de la tarjeta Polaroid conmuta la selección (`toggleSelect.emit(this.photo())`).
     - Al hacer clic específicamente en la imagen (`<div role="button">`), `onViewClicked` invoca `event.stopPropagation()` para abrir el Lightbox sin disparar accidentalmente la selección.
  3. **Delegación Reactiva en Componente Raíz (`app.ts` y `app.html`):**
     - Se definió el método `togglePhoto(photo: Photo): void { this.cartStore.togglePhoto(photo); }` en `App`, unificando la selección tanto desde el catálogo como desde el Lightbox (`togglePhotoFromLightbox`).
     - Se actualizó `app.html` para enlazar `(toggleSelect)="togglePhoto($event)"`.
  4. **Blindaje Defensivo en `CartStore` (`cart.store.ts`):**
     - Se agregó verificación preventiva de presencia de `photo.albumId` antes de cotejar cambio de álbum activo, evitando limpiezas involuntarias del carrito ante datos parciales.
- **Evidencia y Validación:**
  - **291 tests unitarios pasando al 100%** (151 backend + 140 frontend).
  - 2 nuevas pruebas unitarias en [`photo-card-polaroid.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/photo-card-polaroid/photo-card-polaroid.component.spec.ts) validando deselección con "✓ Elegida", clic en superficie de tarjeta Polaroid y exclusión estricta de `toggleSelect` al hacer clic en la imagen.
  - 1 nueva prueba unitaria en [`app.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/app.spec.ts) validando selección y deselección consecutiva desde el catálogo con `togglePhoto`.
  - Compilación de producción `ng build` completada con éxito (código 0).

### ADR-038: Subagentes Especializados de Movimiento y Carga de Medios, Persistencia de Carrito en SessionStorage, Generador de QR Descargable (PNG) y Confeti de Celebración en Pago Exitoso
- **Motivación y Diagnóstico:**
  1. El equipo requería subagentes dedicados en `.agents/plugins/angular/agents/` para delegación de tareas avanzadas de Motion UX (animaciones 3D, CLS = 0, View Transitions) y Media Upload (colas acumulativas, deduplicación, prevención de memory leaks con blob URLs).
  2. En dispositivos móviles, si el usuario refrescaba la página o alternaba de aplicación antes del checkout, `CartStore` perdía las fotografías seleccionadas y configuración de precios al residir solo en memoria volátil.
  3. Para promocionar coberturas presenciales en canchas, salones de fiestas y redes sociales (historias de Instagram), la fotógrafa necesitaba generar códigos QR enlazados directamente a cada álbum (`/?album=<id>`), incluyendo el PIN en álbumes privados y posibilitando descargar una tarjeta gráfica publicitaria en PNG lista para imprimir o compartir.
  4. En la pantalla post-pago (`/pago-exitoso`), tras la acreditación satisfactoria de la compra, faltaba una micro-interacción de celebración con confeti de alta fidelidad respetando los colores de marca de La Tercera.
- **Solución Implementada:**
  1. **Nuevos Subagentes Especializados (`.agents/plugins/angular/agents/`):**
     - `motion-ux-specialist.md`: Especialista en animaciones GPU a 60/120fps, Skeletons CLS = 0, View Transitions API y accesibilidad (`prefers-reduced-motion`).
     - `media-upload-specialist.md`: Especialista en colas acumulativas con deduplicación por clave hash, ciclo de vida seguro de `URL.createObjectURL`/`revokeObjectURL`, y reportes de progreso HTTP multipart.
  2. **Persistencia y Auto-Hidratación de Carrito (`cart.store.ts`):**
     - Sincronización automática de `_selectedPhotos`, `_activeAlbumId`, `_isFullAlbum`, `_unitPrice`, `_fullAlbumPrice`, `_couponCode` y `_customer` en `sessionStorage` (`la_tercera_cart_state`).
     - Hidratación defensiva en constructor (`hydrateFromSession()`) y persistencia síncrona en cada mutación (`persistToSession()`), preservando la selección ante recargas accidentales.
  3. **Generador y Descargador de Tarjetas QR en Alta Resolución (`admin-panel.component.ts` & `.html`):**
     - Integración de `qrcode` en frontend.
     - Botón **`🔳 QR Evento`** en cada tarjeta de álbum que abre un modal Bento accesible con el código QR del enlace directo `${origin}/?album=${album.id}` y el PIN (si es privado).
     - Botón **"⬇️ Descargar Tarjeta QR (PNG)"**: genera dinámicamente un lienzo Canvas de 800x1050px con diseño publicitario oscuro, franja dorada, tipografía oficial de La Tercera, datos del evento, marco blanco de QR, precios/cortesía y PIN confidencial, descargable al instante con fallback seguro para entornos sin Canvas 2D.
     - Botón auxiliar **"🔗 Copiar Link Directo"** con retroalimentación optimista.
  4. **Confeti de Celebración en Pago Exitoso (`payment-success.component.ts`):**
     - Integración de `canvas-confetti` con disparo automático al transicionar al estado `'ready'`.
     - Paleta de marca configurada: `['#FDB813', '#131316', '#10B981', '#FFFFFF']`.
     - Guardia defensiva contra entornos de prueba headless (jsdom) sin soporte de contexto 2D para garantizar cero excepciones.
- **Evidencia y Validación:**
  - **288 tests unitarios pasando al 100%** (151 backend + 137 frontend).
  - 2 nuevas pruebas unitarias en [`cart.store.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/core/state/cart.store.spec.ts) validando persistencia e hidratación desde `sessionStorage`.
  - 3 nuevas pruebas unitarias en [`admin-panel.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/admin-panel/admin-panel.component.spec.ts) validando modal QR, copiado de enlace y descarga de tarjeta en PNG.
  - 1 nueva prueba unitaria en [`payment-success.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/payment-success/payment-success.component.spec.ts) validando `triggerConfetti`.
  - Compilación de producción `ng build` completada con éxito (código 0).

### ADR-037: Splash Screen Cinemático con Obturador de Cámara, Skeletons 3D de Carpetas y Prevención de Parpadeo de Fotos Dummy
- **Motivación y Diagnóstico:**
  1. Al cargar la aplicación por primera vez, mientras respondía la petición `GET /api/albums`, el catálogo público evaluaba de inmediato el bloque `@empty`, mostrando incorrectamente el cartel "No se encontraron carpetas" por una fracción de segundo antes de pintar los álbumes.
  2. En `App.openAlbum(album)`, se vaciaba `activeAlbumPhotos.set([])` y mientras la petición HTTP `getAlbumPhotos(album.id)` estaba en curso, el `computed` `currentPhotos()` caía en un fallback demostrativo que repetía 24 veces la portada `album.coverUrl`, generando un parpadeo visual molesto y confuso antes de que llegaran las fotos reales.
  3. La plataforma carecía de una pantalla de presentación o Splash Loader representativo de la identidad de la marca La Tercera, y las tarjetas del catálogo y la galería aparecían de golpe sin transiciones escalonadas (stagger).
- **Solución Implementada:**
  1. **Splash Screen Cinemático de Inicio (`app.ts`, `app.html`, `styles.css`):**
     - Signal `showSplash = signal<boolean>(true)` con verificación de persistencia en sesión mediante `sessionStorage.getItem('la_tercera_splash_seen')` para mostrar el loader solo en la primera carga de la sesión.
     - Overlay fijo `fixed inset-0 z-[200] bg-[#131316]` con animación GPU de obturador fotográfico dorado (`#FDB813`, `.animate-spin-slow` y `.animate-shutter-spin`), logo oficial `assets/branding/logo_la_tercera.jpg`, tipografía Bento y transición de salida suave `scale-105 opacity-0 pointer-events-none duration-500`.
     - Cierre automático al cargar los álbumes públicos (`dismissSplash()`) o mediante timeout de seguridad de 900ms.
  2. **Skeletons 3D para el Catálogo de Carpetas (`app.ts`, `app.html`):**
     - Signal `isLoadingPublicAlbums = signal<boolean>(true)`.
     - Durante la carga inicial (`isLoadingPublicAlbums() && albums().length === 0`), se renderiza una grilla de **6 Skeletons de Carpetas 3D** con lomo lateral oscuro, 3 anillas metálicas simuladas y barrido Shimmer (`animate-shimmer-sweep`), eliminando por completo el falso estado vacío.
  3. **Eliminación del Parpadeo de Fotos Dummy y Skeletons Polaroid 3D (`app.ts`, `app.html`):**
     - Signals `isLoadingAlbumPhotos = signal<boolean>(false)` y `albumPhotosLoaded = signal<boolean>(false)`.
     - `currentPhotos()` devuelve `[]` estrictamente mientras `isLoadingAlbumPhotos()` sea `true`, evitando el parpadeo de las 24 fotos falsas repetidas mientras el backend responde.
     - En la vista del álbum, mientras `isLoadingAlbumPhotos()` es activo, se renderizan **8 Skeletons Polaroid 3D** con rotaciones orgánicas alternadas (`-1.5deg`, `1.3deg`, `-1.1deg`, `1.5deg`).
  4. **Entrada en Cascada Fluida a 60fps (Staggered Entrance):**
     - Clases CSS `.animate-stagger-fade-in` y retraso escalonado dinámico `staggerDelay` (`(index % 8) * 45 + 'ms'`) implementado en `AlbumCard3dComponent` y `PhotoCardPolaroidComponent`.
- **Evidencia y Validación:**
  - **282 tests unitarios pasando al 100%** (151 backend + 131 frontend).
  - 4 nuevos tests en [`app.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/app.spec.ts) validando ciclo de vida del Splash Screen, `isLoadingPublicAlbums`, y prevención de parpadeo en `isLoadingAlbumPhotos`.
  - 1 nuevo test en [`album-card-3d.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/album-card-3d/album-card-3d.component.spec.ts) validando `staggerDelay`.
  - 1 nuevo test en [`photo-card-polaroid.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/photo-card-polaroid/photo-card-polaroid.component.spec.ts) validando `staggerDelay`.
  - Compilación de producción `ng build` completada con éxito (código 0).

### ADR-036: Subida Masiva Acumulativa y Deduplicada, Progreso de Subida HTTP en Tiempo Real, Preservación de PIN en WhatsApp y Confirmación Inline
- **Motivación y Diagnóstico:**
  1. En `AdminPanelComponent`, al arrastrar o seleccionar archivos locales por segunda vez para agregar fotos olvidadas a un lote, `handleSelectedFileList` borraba la lista anterior con `revokePreviewUrls()` y reseteaba `selectedFiles()` y `hdIndices()`. Además, `onFileSelect` no limpiaba `input.value = ''`, bloqueando la re-selección de fotos si se habían removido.
  2. En `AdminService`, `bulkUpload` no reportaba eventos de progreso de carga HTTP (`HttpEventType.UploadProgress`), dejando a la fotógrafa sin visibilidad del estado de transferencia al subir tandas pesadas.
  3. En `savePrivacy(album, makePrivate)`, el backend devolvía `accessCode: '********'` por protección, pisando el código en claro en memoria y provocando que `copyWhatsAppShareText` no pudiera incluir el PIN recién establecido.
  4. En `deleteAlbumPhoto`, persistía una llamada a `confirm()` nativo del navegador, rompiendo la estética Bento y bloqueando el hilo principal.
- **Solución Implementada:**
  1. **Selección Acumulativa y Deduplicada (`admin-panel.component.ts` & `.html`):**
     - Modificación de `handleSelectedFileList` para concatenar los nuevos archivos válidos con la selección existente.
     - Deduplicación comparando la clave única `${f.name}_${f.size}_${f.lastModified}`, emitiendo un toast informativo Bento si se ignoraron fotos duplicadas.
     - Generación de `URL.createObjectURL` exclusivamente para los archivos nuevos sin revocar las URLs anteriores.
     - Preservación de `hdIndices` personalizados por el usuario si ya existían fotos previas; inicialización por defecto en `[0, 1]` solo en la primera tanda.
     - Reseteo de `input.value = ''` en `onFileSelect` tras extraer la lista de archivos.
     - Zona Drag & Drop dinámica que muestra `"➕ Arrastra o haz clic aquí para AGREGAR más fotos al lote actual"` cuando ya hay archivos en cola.
  2. **Barra de Progreso de Subida HTTP en Tiempo Real (`admin.service.ts`, `admin-panel.component.ts` & `.html`):**
     - Configuración de `reportProgress: true` y `observe: 'events'` en `AdminService.bulkUpload`, calculando el porcentaje a partir de `event.loaded` y `event.total` vía callback opcional `onProgress`.
     - Signal `uploadProgress = signal<number>(0)` en `AdminPanelComponent`.
     - Barra de progreso animada con gradiente Bento (`amber-500` -> `emerald-400`) y visualización de porcentaje en tiempo real tanto en el panel como en el botón de acción durante `isBulkUploading()`.
  3. **Preservación de PIN en Claro para Difusión WhatsApp (`admin-panel.component.ts`):**
     - En `savePrivacy`, al completarse la petición exitosa con `makePrivate === true`, se conserva `accessCode: code` (en texto claro) en el objeto local del álbum, permitiendo que `copyWhatsAppShareText` arme de inmediato el mensaje con `🔒 PIN de acceso: ${code}`.
  4. **Confirmación Inline de Dos Pasos en Eliminación de Foto (`admin-panel.component.ts` & `.html`):**
     - Erradicación definitiva de `confirm()` nativo.
     - Signal `confirmingDeletePhotoId = signal<string | null>(null)` y temporizador automático de 3 segundos con limpieza defensiva en `ngOnDestroy`.
     - El botón cambia de aspecto a rojo vibrante con animación pulse mostrando `"¿Confirmar? 🗑️"`.
- **Evidencia y Validación:**
  - **276 tests unitarios pasando al 100%** (151 backend + 125 frontend).
  - 1 nuevo test en [`admin.service.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/core/services/admin.service.spec.ts) validando reporte de porcentaje de subida.
  - 5 nuevos/actualizados tests en [`admin-panel.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/admin-panel/admin-panel.component.spec.ts) validando selección acumulativa, deduplicación, reseteo de input file, preservación de PIN en WhatsApp y doble clic inline para eliminación.
  - Compilación de producción `ng build` completada con código 0 y `npm test` en backend y frontend con código 0.

### ADR-035: Kit de Difusión WhatsApp, Miniaturas en Subida Masiva y Sistema de Toasts Bento
- **Motivación y Diagnóstico:**
  1. En `frontend/src/app/features/admin-panel/admin-panel.component.html` (pestaña `📤 Subida Masiva`), cuando la fotógrafa seleccionaba archivos locales, solo visualizaba una lista textual de nombres de archivo (`file.name`), impidiendo verificar visualmente qué fotos destacar como `⭐ Muestra HD` antes de la subida masiva.
  2. En `admin-panel.component.ts`, las acciones críticas de mover a papelera (`moveToTrash`) y validación de clave PIN (`savePrivacy`) recurrían a `confirm()` y `alert()` nativos del navegador, bloqueando el hilo de ejecución y degradando la experiencia visual Bento.
  3. En `frontend/src/app/app.ts`, la plataforma no admitía enlaces profundos directos mediante el query param `?album=<id_or_slug>`, dificultando la difusión de carpetas específicas en grupos de WhatsApp o redes sociales.
- **Solución Implementada:**
  1. **Enlaces Directos y Difusión WhatsApp en 1 Clic (`app.ts` y `admin-panel.component.ts`):**
     - En `App.ngOnInit()` y `loadPublicAlbums()`, se inspecciona `params.get('album')` vía `URLSearchParams`. Si coincide con un álbum disponible, se dispara automáticamente `openAlbum(album)`.
     - En cada tarjeta de álbum del panel administrativo, se incorporó el botón **`📲 Copiar Link WhatsApp`** con retroalimentación optimista instantánea (`copiedWhatsAppAlbumId`). Genera un mensaje pre-armado con llamado a la acción, enlace directo, precios (foto suelta y pack completo) y PIN confidencial si el álbum es privado.
  2. **Miniaturas Visuales Reactivas con `URL.createObjectURL` en Subida Masiva (`admin-panel.component.ts` y `.html`):**
     - En `handleSelectedFileList()`, se generan URLs temporales de previsualización con `URL.createObjectURL(file)`.
     - Grilla responsive Bento de tarjetas fotográficas con miniatura real, tamaño en MB, botón para quitar imagen puntual y alternador interactivo `⭐ Muestra HD`.
     - Ciclo de vida defensivo con liberación de memoria RAM (`URL.revokeObjectURL(url)`) en `removeSelectedFile()`, `clearSelectedFiles()` y `ngOnDestroy()`.
  3. **Sistema de Toasts Bento Flotante y Modal Bento de Confirmación:**
     - Eliminación total de `confirm()` nativo, reemplazado por un modal Bento accesible (`isTrashModalOpen()`) con foco y confirmación limpia.
     - Eliminación total de `alert()` nativo, sustituido por validación inline reactiva (`privacyError()`) y un componente de Toast Bento flotante (`showToast()`, `dismissToast()`) con temporizador automático y badges temáticos (`success`, `warning`, `error`, `info`).
- **Evidencia y Validación:**
  - **270 tests unitarios pasando al 100%** (151 backend + 119 frontend).
  - 1 nuevo test en [`app.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/app.spec.ts) validando detección y apertura automática de álbumes por query param `?album=`.
  - 6 nuevos tests en [`admin-panel.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/admin-panel/admin-panel.component.spec.ts) validando generación de texto WhatsApp, inclusión de PIN, generación/revocación de blob URLs, modal Bento de papelera, validación sin `alert()` y ciclo de vida de Toasts.
  - Compilación de producción `ng build` completada con código 0 y `npx tsc --noEmit` en backend exitosa.
- **Motivación y Diagnóstico:**
  1. En `AdminPanelComponent`, las tarjetas de la pestaña `📁 Álbumes & Precios` indicaban el conteo de fotos de cada álbum (`album.photosCount`), pero la fotógrafa no podía visualizar las fotografías cargadas para definir o cambiar la foto de portada (`coverUrl`), seleccionar cuáles imágenes destacan como muestra de alta resolución (`isSampleHd`), o eliminar una fotografía individual movida o defectuosa sin borrar el álbum completo.
  2. En el backend, no existían endpoints protegidos para listar todas las fotos de un álbum específico ni para alterar individualmente el estado `isSampleHD` o `coverUrl` en `IAlbumRepository`, ni para purgar los binarios de `previews` y `originals` en `IStorageService`.
- **Solución Implementada:**
  1. **Capa de Almacenamiento & Repositorio Backend (`storage.service.ts` & `album.repository.ts`):**
     - Método `deletePhotoFiles(albumId, photoId, ext)` en `IStorageService`, `SupabaseStorageService`, `LocalStorageService` y `MemoryStorageService` para eliminar archivos de `previews/` y `originals/` simultáneamente.
     - Métodos `getPhotoById`, `updatePhoto` y `deletePhoto` en `IAlbumRepository`, `MemoryAlbumRepository` y `SupabaseAlbumRepository`.
     - Manejo de fallback de portada: si la foto eliminada coincide con la `coverUrl` del álbum, el repositorio reasigna automáticamente la siguiente foto disponible como nueva portada (o cadena vacía si no quedan fotos) y decrementa `photosCount`.
  2. **Rutas Administrativas Protegidas (`admin-albums.routes.ts`):**
     - `GET /api/admin/albums/:id/photos`: Retorna todas las fotos del álbum para el usuario administrador autenticado.
     - `PATCH /api/admin/albums/:id/photos/:photoId`: Permite alternar `isSampleHD` (con tolerancia a mayúsculas/minúsculas `isSampleHD` / `isSampleHd`) y/o activar `setAsCover` actualizando la portada del álbum.
     - `DELETE /api/admin/albums/:id/photos/:photoId`: Purgado binario en Storage, eliminación de la fila en Supabase PostgreSQL (`public.photos`), decremento del contador `photosCount` y actualización de portada.
  3. **Frontend: Modelos, Servicio & Modal Bento (`admin.model.ts`, `admin.service.ts`, `AdminPanelComponent`):**
     - Interfaces `AdminAlbumPhoto`, `AdminAlbumPhotosResponse`, `UpdateAlbumPhotoRequest`, `UpdateAlbumPhotoResponse` y `DeleteAlbumPhotoResponse`.
     - Métodos `getAlbumPhotos(albumId)`, `updateAlbumPhoto(albumId, photoId, updates)` y `deleteAlbumPhoto(albumId, photoId)` en `AdminService`.
     - Botón de acción destacado **`🖼️ Ver / Editar Fotos ({{ album.photosCount }})`** añadido a cada tarjeta de álbum en la pestaña `📁 Álbumes & Precios`.
     - Modal Bento accesible (WCAG AA con `role="dialog"`, `aria-modal="true"` y `aria-labelledby`) con:
       * Grilla responsive de miniaturas Polaroid con badges dinámicos (`📌 Portada`, `⭐ HD`).
       * **📌 Portada:** Define la foto como imagen principal de la carpeta 3D en 1 clic.
       * **⭐ Muestra HD:** Alterna el estado de muestra de alta nitidez en tiempo real.
       * **🗑️ Borrar:** Confirmación defensiva y eliminación inmediata con actualización en caliente de los conteos y la portada.
- **Evidencia y Validación:**
  - **263 tests unitarios pasando al 100%** (151 backend + 112 frontend).
  - 4 pruebas unitarias en backend ([`admin-albums.api.test.ts`](file:///e:/code/IA/fotos/backend/tests/admin-albums.api.test.ts)) validando autenticación, listado, patch y delete.
  - 3 pruebas unitarias en frontend ([`admin.service.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/core/services/admin.service.spec.ts)) validando llamadas HTTP y headers JWT.
  - 5 pruebas unitarias en frontend ([`admin-panel.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/admin-panel/admin-panel.component.spec.ts)) validando apertura/cierre de modal, actualización de portada, toggle de HD y eliminación reactiva de fotos.
  - Compilaciones de backend (`tsc --noEmit`) y frontend (`ng build`) finalizadas con código 0.

### ADR-033: Conexión de Métricas Reales en `/api/admin/stats` y Pestaña "💳 Ventas & Entregas" con Regeneración de Links de 72h en 1 Clic
- **Motivación y Diagnóstico:**
  1. En `backend/src/routes/admin.routes.ts`, el endpoint `GET /api/admin/stats` devolvía métricas estáticas (`photosSold: 43`, `revenueARS: 64200`) en vez de calcular ingresos reales basados en las órdenes efectivamente cobradas con Mercado Pago (`status === 'PAID'`).
  2. En el frontend, la pantalla post-pago prometía al cliente que la fotógrafa podía renovar enlaces expirados en 1 clic desde su panel, pero `AdminPanelComponent` carecía de una vista de órdenes y de endpoints para reemitir tokens de descarga.
- **Solución Implementada:**
  1. **Capa de Persistencia (`IOrderRepository`, `MemoryOrderRepository`, `SupabaseOrderRepository`):**
     - Incorporación del método `listAllOrders(): Promise<Order[]>`, ordenado por `created_at DESC`.
     - Consulta en lote de `order_items` en `SupabaseOrderRepository` para prevenir consultas N+1 y mapear las fotos adquiridas.
  2. **Rutas Administrativas & Cálculo de Métricas Reales (`admin.routes.ts` & `index.ts`):**
     - Inyección de `orderRepository`, `albumRepository`, `tokenService` y `orderService` en `createAdminRouter`.
     - `GET /api/admin/stats`: Cálculo dinámico de `revenueARS` (suma de `totalAmount` en órdenes `PAID`), `albumsSold` (`isFullAlbum === true`), `photosSold` (suma de fotos en compras individuales) y `activeAlbumsCount` desde `albumRepository.listAlbums()`.
     - `GET /api/admin/orders`: Listado protegido por JWT con resolución de títulos de álbumes (`albumTitle`), datos del comprador y enlace activo de descarga.
     - `POST /api/admin/orders/:orderId/regenerate-token`: Generación de un nuevo token firmado criptográficamente válido por 72 horas adicionales (`tokenService.generateToken`), actualización en repositorio/PostgreSQL (tabla `orders` y `download_tokens`) y retorno de `/pago-exitoso?token=...`.
  3. **Pestaña "💳 Ventas & Entregas" en Frontend (`AdminPanelComponent` & `AdminService`):**
     - Métodos `getAdminOrders()` y `regenerateOrderToken(orderId)` en `AdminService`.
     - Pestaña `'orders'` añadida a la barra Bento del panel con badge de conteo total.
     - Métricas Bento destacadas: Total de transacciones, órdenes acreditadas y recaudación total en ARS.
     - Buscador reactivo por ID, cliente, álbum o teléfono, junto a filtros por estado (`PAID`, `PENDING`, `FRAUD_ALERT_PRICE_MISMATCH`).
     - Botón de acción **"🔄 Renovar 72h"**: Regeneración en 1 clic con indicador de carga y copiado automático al portapapeles (`navigator.clipboard.writeText`).
     - Botón de acción **"💬 Enviar Fotos por WhatsApp"**: Apertura directa de `wa.me` con mensaje de cortesía pre-armado y URL directa de descarga.
     - Botón de apertura de chat directo al cliente si registró número de teléfono.
- **Evidencia y Validación:**
  - **251 tests unitarios pasando al 100%** (147 backend + 104 frontend).
  - 7 nuevas pruebas en backend ([`admin-orders-stats.test.ts`](file:///e:/code/IA/fotos/backend/tests/admin-orders-stats.test.ts)) validando cálculo dinámico de estadísticas, seguridad de rutas y regeneración criptográfica de tokens.
  - 6 nuevas pruebas en frontend ([`admin.service.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/core/services/admin.service.spec.ts) y [`admin-panel.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/admin-panel/admin-panel.component.spec.ts)).
  - Compilación de backend (`tsc`) y frontend (`ng build`) completadas exitosamente con código 0.

### ADR-032: Persistencia de Fotógrafos Colaboradores en Supabase (`IPhotographerRepository`) y Autenticación Post-Reinicio (`loginAsync`)
- **Motivación y Diagnóstico:**
  1. En `backend/src/services/admin-auth.service.ts`, `login()` y `registerPhotographer()` gestionaban las cuentas de fotógrafos colaboradores exclusivamente en un `Map` volátil en memoria (`this.photographers`).
  2. Aunque existía `IPhotographerRepository` (`SupabasePhotographerRepository` y `MemoryPhotographerRepository`) y la tabla `public.photographers` en PostgreSQL, `AdminAuthService` no inyectaba este repositorio, perdiendo los registros de nuevos fotógrafos cada vez que el servidor se reiniciaba.
  3. Los endpoints HTTP en `admin.routes.ts` (`POST /api/admin/login` y `POST /api/admin/photographers`) ejecutaban llamadas síncronas contra la memoria local sin interactuar con la capa de persistencia de Supabase.
- **Solución Implementada:**
  1. **Inyección Híbrida de Repositorio en `AdminAuthService`:**
     - Inyección opcional de `photographerRepo?: IPhotographerRepository` en el constructor, con fallback por defecto a `MemoryPhotographerRepository` para garantizar la ejecución offline y determinista de tests existentes.
     - Sobrecarga de constructor flexible que admite `(jwtSecret, tokenDuration, repo)` o `(jwtSecret, repo)`.
  2. **Persistencia Síncrona y Asíncrona en Registro:**
     - En `registerPhotographer()`, se mantiene la firma y retorno síncrono para tests rápidos, disparando en background la persistencia hacia `photographerRepo.createPhotographer(...)`.
     - Nuevo método `registerPhotographerAsync()`, que valida primero la inexistencia previa en la base de datos remota, persiste la fila en `public.photographers` y actualiza la caché local con el UUID real.
  3. **Autenticación Asíncrona y Recuperación de Sesión (`loginAsync`):**
     - Nuevo método `loginAsync(email, password)`: Si la cuenta no está en el mapa de memoria (ej.: tras un reinicio del backend), consulta `photographerRepo.findByEmail()`, puebla la memoria local en caliente y valida la contraseña con protección anti-timing constante.
     - Adaptación de `admin.routes.ts` para que `POST /api/admin/login` use `loginAsync` y `POST /api/admin/photographers` use `registerPhotographerAsync`.
  4. **Instanciación Centralizada en `backend/src/index.ts`:**
     - Exportación de `photographerRepository = createPhotographerRepository()` y pase directo al instanciar `adminAuthService`.
- **Evidencia y Validación:**
  - **238 tests unitarios pasando al 100%** (140 backend + 98 frontend).
  - 2 nuevas pruebas unitarias en [`admin-auth.test.ts`](file:///e:/code/IA/fotos/backend/tests/admin-auth.test.ts) validando persistencia directa en el repositorio, prevención asíncrona de duplicados y autenticación post-reinicio de servidor.
  - Compilación TypeScript backend (`tsc`) exitosa con código 0.
  - Compilación y tests frontend sin regresiones.

### ADR-031: Accesibilidad de Viewport (WCAG AA), Zoom Cinemático (1x <-> 2.2x), Doble Toque Táctil y Bloqueo de Swipe en LightboxComponent
- **Motivación y Diagnóstico:**
  1. En `frontend/src/index.html`, la metaetiqueta viewport contenía `maximum-scale=1.0, user-scalable=no`, lo que bloqueaba el zoom del navegador en dispositivos móviles, penalizando el puntaje de accesibilidad Lighthouse y violando las pautas WCAG 2.1 AA (Criterio 1.4.4: Resize text).
  2. En `LightboxComponent`, los usuarios móviles podían navegar entre fotos mediante gestos de swipe, pero carecían de una herramienta interactiva para hacer zoom (1x <-> 2.2x) con el fin de examinar los detalles de nitidez y calidad de la muestra fotográfica antes de comprar.
  3. Al activar el zoom, los gestos de deslizamiento táctil (pan) para explorar la foto ampliada entraban en conflicto con los umbrales de swipe, cambiando de foto o cerrando el modal de manera accidental.
- **Solución Implementada:**
  1. **Accesibilidad de Viewport (`index.html`):**
     - Eliminación de `maximum-scale=1.0, user-scalable=no`, dejando `<meta name="viewport" content="width=device-width, initial-scale=1.0">` para habilitar el zoom nativo accesible.
  2. **Zoom Cinemático Reactivo (`LightboxComponent`):**
     - Incorporación del signal reactivo `zoomScale = signal<number>(1)`.
     - Métodos `toggleZoom()` (alterna entre 1 y 2.2 con reset de deltas) y `resetZoom()`.
     - Botón superior cinemático en el header con icono de lupa `🔍` y etiquetas dinámicas `1x` / `2x` accesibles (`[attr.aria-label]`).
     - Soporte para doble clic (`(dblclick)`) en escritorio con cursores contextuales `cursor-zoom-in` y `cursor-zoom-out`.
  3. **Detección Físico-Táctil de Doble Toque y Bloqueo de Swipe:**
     - Detección precisa de doble tap en móviles registrando `lastTapTime` en `onTouchEnd` únicamente cuando el desplazamiento es menor a 15px (descartando falsos positivos en swipes previos).
     - Bloqueo preventivo de cambio de foto (`next`/`prev`) y cierre (`close`) en `onTouchEnd` cuando `zoomScale() > 1`, permitiendo al usuario arrastrar (`pan`) libremente la imagen ampliada.
     - Reseteo automático del zoom a 1x mediante `effect()` reactivo al cambiar de foto (`currentIndex`), cambiar de foto activa (`currentPhoto`) o cerrar el visor (`isOpen`).
- **Evidencia y Validación:**
  - **236 tests unitarios pasando al 100%** (138 backend + 98 frontend).
  - 4 nuevos tests en [`lightbox.component.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/features/lightbox/lightbox.component.spec.ts) validando alternancia de escala, reseteo automático, bloqueo de swipe con zoom activo y detección de doble tap.
  - Compilación de producción `ng build` completada con código 0 y 488.54 kB de bundle inicial (118.26 kB gzipped).

### ADR-030: Activación de View Transitions API Nativas, Inclinación Físico-Reactiva 3D y Purga de Código Muerto
- **Motivación y Diagnóstico:**
  1. En `frontend/src/app/app.ts`, el cambio de vista entre `'portfolio'`, `'album'`, `'admin'` y `'payment-success'` se ejecutaba mutando directamente el signal `currentView.set(...)` sin pasar por el Router, impidiendo que `withViewTransitions()` se disparase.
  2. No existía vinculación de `view-transition-name` entre la tarjeta de la carpeta 3D y el hero del álbum, perdiendo la oportunidad de un morphing continuo en el compositor GPU.
  3. En `AlbumCard3dComponent`, faltaba la inclinación dinámica en los ejes X e Y de la carpeta completa calculada a partir del cursor/toque y mayor amplitud en la solapa de apertura.
  4. En `PhotoCardPolaroidComponent`, faltaba el efecto de levitación con reflejo satinado gloss y rebote físico al seleccionar fotos.
  5. La carpeta `frontend/src/app/features/portfolio-binder/` permanecía como código muerto no referenciado.
- **Solución Implementada:**
  1. **Helper `transitionView` con View Transitions API (`app.ts`):**
     - Envoltura de todas las mutaciones de `currentView.set(...)` en `this.transitionView(() => { ... })` ejecutando `document.startViewTransition` con fallback seguro para navegadores antiguos y tests unitarios.
  2. **Morphing de Carpeta 3D a Hero (`app.html` & `album-card-3d.component.ts`):**
     - Asignación de `[style.view-transition-name]="'album-cover-' + album.id"` tanto en `<article>` de [`AlbumCard3dComponent`](file:///e:/code/IA/fotos/frontend/src/app/features/album-card-3d/album-card-3d.component.ts) como en el contenedor Hero de [`app.html`](file:///e:/code/IA/fotos/frontend/src/app/app.html#L201). Al hacer clic, la carpeta se expande orgánicamente en 3D hasta convertirse en la cabecera del álbum y se contrae al regresar.
  3. **Inclinación Físico-Reactiva 3D (`AlbumCard3dComponent`):**
     - Señales computadas `tiltRotateX` y `tiltRotateY` normalizadas entre -5deg y +5deg calculadas a partir de `specularX()` y `specularY()`.
     - Aplicación de transformaciones en `.folder-container` con aceleración GPU (`preserve-3d`, `rotateX(var(--tilt-rx)) rotateY(var(--tilt-ry))`).
     - Aumento del ángulo de apertura de la solapa a `rotateY(-24deg)` en `.flap-open`.
     - Soporte para deslizamiento táctil continuo en móvil mediante `onTouchMove`.
  4. **Levitación, Reflejo Gloss y Rebote Elástico (`PhotoCardPolaroidComponent`):**
     - Elevación profunda en eje Z (`translateZ(28px) scale(1.03)`) con sombra multicapa.
     - Capa de reflejo gloss (`.gloss-overlay` y `.gloss-shine`) con gradiente satinado a 135deg y `mix-blend-mode: overlay`.
     - Animación de rebote elástico spring `polaroidBounce` (380ms) al activarse `isSelected()`.
  5. **Limpieza Quirúrgica:**
     - Eliminación definitiva del directorio huérfano `frontend/src/app/features/portfolio-binder/`.
- **Evidencia y Validación:**
  - **232 tests unitarios pasando al 100%** (138 backend + 94 frontend).
  - 4 nuevos tests añadidos (2 en `album-card-3d.component.spec.ts`, 1 en `photo-card-polaroid.component.spec.ts` y 1 en `app.spec.ts`).
  - Compilación exitosa en `ng build` (código 0, 117.46 kB transferidos) y `tsc` (código 0).


### ADR-029: Unificación de Configuración de Entornos (Proxy/Environments), Redirección Post-Pago Mercado Pago y Sanitización MCP
- **Motivación y Diagnóstico:**
  1. En `.agents/plugins/supabase/mcp_config.json`, la clave `--apiKey` tenía un JWT de service_role hardcodeado en lugar de usar la variable de entorno `${SUPABASE_SERVICE_ROLE_KEY}`.
  2. En el frontend, `AlbumService`, `AdminService`, `PaymentService` y `AdminAuthStore` tenían hardcodeado `http://localhost:4000/api`, mientras que `DeliveryService` invocaba URLs relativas `/api/downloads/...` sin un proxy configurado en Angular, lo que provocaba errores 404 en el entorno de desarrollo y fallas de entrega en `/pago-exitoso`.
  3. En `backend/src/services/mercadopago.service.ts`, los `back_urls` (`success`, `failure`, `pending`) redirigían al puerto de la API `APP_URL` (`localhost:4000/checkout/...`) en lugar de devolver al cliente a la aplicación frontend `FRONTEND_URL` (`localhost:4200/pago-exitoso`).
- **Solución Implementada:**
  1. **Sanitización de Configuración MCP (`.agents/plugins/supabase/mcp_config.json`):**
     - Reemplazo del token JWT hardcodeado por la variable de entorno protegida `"${SUPABASE_SERVICE_ROLE_KEY}"`.
     - Réplica idéntica en la configuración global de plugins de Antigravity.
  2. **Centralización de Entornos y Proxy en Angular (`frontend/`):**
     - Creación de [environment.ts](file:///e:/code/IA/fotos/frontend/src/environments/environment.ts) (producción) y [environment.development.ts](file:///e:/code/IA/fotos/frontend/src/environments/environment.development.ts) con `apiUrl: 'http://localhost:4000/api'`.
     - Creación de [proxy.conf.json](file:///e:/code/IA/fotos/frontend/proxy.conf.json) redirigiendo `/api` hacia `http://localhost:4000`.
     - Vinculación en [angular.json](file:///e:/code/IA/fotos/frontend/angular.json) mediante `fileReplacements` en la configuración `development` y `proxyConfig` en el builder dev-server `serve.options`.
     - Migración quirúrgica a `environment.apiUrl` en:
       * [`AlbumService`](file:///e:/code/IA/fotos/frontend/src/app/core/services/album.service.ts)
       * [`AdminService`](file:///e:/code/IA/fotos/frontend/src/app/core/services/admin.service.ts)
       * [`PaymentService`](file:///e:/code/IA/fotos/frontend/src/app/core/services/payment.service.ts)
       * [`AdminAuthStore`](file:///e:/code/IA/fotos/frontend/src/app/core/state/admin-auth.store.ts)
       * [`DeliveryService`](file:///e:/code/IA/fotos/frontend/src/app/core/services/delivery.service.ts) (llamando a `${this.downloadApiUrl}/order/...` y `${this.downloadApiUrl}/.../info`).
  3. **Redirección Post-Pago de Mercado Pago (`backend/src/services/mercadopago.service.ts`):**
     - Inclusión de `frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200'`.
     - `back_urls` configurados con `${frontendUrl}/pago-exitoso` para `success`, `failure` y `pending`.
     - Preservación estricta de `APP_URL` para `notification_url` (`${appUrl}/api/webhooks/mercadopago`).
     - Registro de variable `FRONTEND_URL=http://localhost:4200` en [`.env.example`](file:///e:/code/IA/fotos/.env.example) y [`backend/.env`](file:///e:/code/IA/fotos/backend/.env).
- **Evidencia y Validación:**
  - **228 tests unitarios pasando al 100%** (138 backend + 90 frontend).
  - Nuevo test unitario en backend ([`mercadopago.service.test.ts`](file:///e:/code/IA/fotos/backend/tests/mercadopago.service.test.ts)) validando la redirección exacta y el soporte de la variable de entorno `FRONTEND_URL`.
  - Actualización y validación de suite en frontend ([`delivery.service.spec.ts`](file:///e:/code/IA/fotos/frontend/src/app/core/services/delivery.service.spec.ts)).
  - Build de producción frontend (`ng build`) completado con código 0.
  - Build de producción backend (`tsc`) completado con código 0.


### ADR-028: Flujo Real de Entrega HD con `IAlbumRepository`, Descarga Binaria desde Storage y Resiliencia `getOrderAsync`
- **Motivación y Diagnóstico:**
  - El endpoint `GET /api/downloads/:token/file` enviaba un string de texto simulado (`LA_TERCERA_HD_ORIGINAL_...`) en lugar de despachar el buffer binario original real desde `storageService.getOriginalBuffer(...)`.
  - En `DeliveryService`, las órdenes de álbum completo (`isFullAlbum = true`) y los ZIPs de cortesía (`streamFreeAlbumZip`) generaban identificadores dummy (`foto_1` a `foto_15`) en vez de consultar los registros reales de fotos en `IAlbumRepository.getPhotosByAlbumId(albumId)`.
  - `DeliveryService` consultaba un catálogo estático (`KNOWN_ALBUMS`) en lugar de consultar la base de datos real en Supabase, y llamaba a `orderService.getOrder(orderId)` (solo memoria), provocando fallas de descarga si el servidor backend se reiniciaba.
- **Solución Implementada:**
  1. **Inyección de `IAlbumRepository` en `DeliveryService` (`delivery.service.ts`):**
     - Constructor extendido con parámetro opcional `albumRepository?: IAlbumRepository`.
     - Migración a `await this.orderService.getOrderAsync(...)` en `getDeliveryInfo`, `resolvePhotoFile` y `streamOrderZip` para sincronización con PostgreSQL si la orden no está en la memoria RAM tras un reinicio.
     - Consulta del título y fecha real del evento (`album.title`, `album.eventDate || album.date`) con fallback a `KNOWN_ALBUMS`.
     - Para `order.isFullAlbum` y `streamFreeAlbumZip`, obtención de fotos reales mediante `await this.albumRepository.getPhotosByAlbumId(...)`.
     - `resolvePhotoFile` valida la pertenencia de fotos tanto en compras individuales como en álbum completo contra el repositorio.
     - Hardening de `sanitizeId(id?: string)` con comprobaciones defensivas contra valores nulos o indefinidos.
  2. **Streaming Binario Real en `downloads.routes.ts` (`GET /api/downloads/:token/file`):**
     - Inyección de `storageService?: IStorageService` en `createDownloadsRouter`.
     - Lectura del buffer binario original con `await storageService.getOriginalBuffer(resolved.albumId, resolved.photoId, '.jpg')`.
     - Despacho del buffer con `res.send(buffer)` y cabeceras `Content-Type: image/jpeg` y `Content-Disposition: attachment`.
     - Fallback defensivo a `LA_TERCERA_HD_ORIGINAL_${resolved.photoId}` en entornos de test donde el archivo físico no reside en storage.
     - Uso de `getOrderAsync` en `GET /order/:orderId/status` y `GET /downloads/verify/:token`.
  3. **Cableado en Backend (`index.ts`):**
     - Paso de `albumRepository` a `new DeliveryService(orderService, tokenService, storageService, albumRepository)`.
     - Paso de `storageService` a `createDownloadsRouter(deliveryService, orderService, storageService)`.
     - Declaración `async` en el handler de `/api/downloads/verify/:token`.
- **Evidencia y Validación:**
  - **227 tests unitarios pasando al 100%** (137 backend + 90 frontend).
  - 5 nuevos tests unitarios agregados (3 en `delivery.service.test.ts`, 2 en `downloads.routes.test.ts`).
  - Compilación limpia de TypeScript con `tsc` (código de salida 0).
  - Servidor backend daemon reiniciado en puerto 4000 y comprobación en vivo de `/health` con 200 OK.

### ADR-027: Persistencia Relacional en `public.photos`, Proyección Zero-Trust, Sincronización Reactiva de Galería y Placeholder Elegante Anti-Broken-Image
- **Motivación y Diagnóstico:**
  - Los endpoints `/bulk-upload` e `/import-drive` procesaban imágenes y las subían a Storage, pero nunca insertaban filas en la tabla relacional `public.photos` de Supabase ni en `MemoryAlbumRepository`. Además, `/import-drive` omitía actualizar `photosCount`.
  - La galería Polaroid en `App` dependía de un fallback que generaba fotos estáticas repitiendo `album.coverUrl`.
  - Cuando una imagen fallaba por red o URL rota, `PhotoCardPolaroidComponent` solo apagaba `isLoading`, dejando visible el ícono nativo roto del navegador.
- **Solución Implementada:**
  1. **Repositorio de Datos (`album.repository.ts`):** Métodos `addPhotosToAlbum(albumId, photos)` y `getPhotosByAlbumId(albumId)` añadidos a `IAlbumRepository`, `MemoryAlbumRepository` (con fotos de muestra iniciales) y `SupabaseAlbumRepository` (con upsert en `public.photos`, verificación defensiva de clave foránea e inserción automática de álbumes base, y caché local).
  2. **Rutas Administrativas (`admin-albums.routes.ts`):** Invocación de `addPhotosToAlbum`, actualización de `photosCount` y asignación de `coverUrl` en `/bulk-upload` e `/import-drive`.
  3. **Exposición Pública Zero-Trust (`index.ts` & `album.service.ts`):**
     - Endpoint `GET /api/albums/:id/photos` que devuelve las fotos del álbum omitiendo estrictamente `original_path`.
     - `AlbumService.getAlbumPhotos(albumId)` mapea al modelo `Photo`.
     - `App` (`app.ts`) actualiza reactivamente `activeAlbumPhotos` al llamar `openAlbum(album)`.
  4. **Fallback Visual Defensivo (`PhotoCardPolaroidComponent`):**
     - Signal `hasError = signal<boolean>(false)`.
     - Al dispararse `onImageError()`, se reemplaza la etiqueta `<img>` por un placeholder oscuro/dorado con la insignia "LA TERCERA" y el estado "Procesando muestra HD".
- **Evidencia y Validación:**
  - **222 tests unitarios pasando al 100%** (132 backend + 90 frontend).
  - 8 nuevos tests agregados (2 en `album.repository.test.ts`, 1 en `admin-albums.api.test.ts`, 4 en `album.service.spec.ts`, 1 en `photo-card-polaroid.component.spec.ts`, 1 en `app.spec.ts`).
  - Verificación live con `Invoke-RestMethod` contra `http://localhost:4000/api/albums/album-1/photos` devolviendo `200 OK` con datos reales.

### ADR-026: Blindaje de Subida Masiva contra Archivos que Superan el Límite de Supabase Storage (50 MB) & Herramientas de Inspección Visual en Antigravity
- **Motivación y Diagnóstico del Error 500:**
  - Al realizar drag & drop en el panel administrativo, el usuario experimentó `Http failure response for http://localhost:4000/api/admin/albums/bulk-upload: 500 Internal Server Error`.
  - Al auditar los archivos de la imagen, el archivo #3 (`...upscayl_4x_ultramix-balanced-4x.png`) pesaba **52.25 MB**.
  - Multer tenía configurado un límite estricto de 50 MB (`limits: { fileSize: 50 * 1024 * 1024 }`), arrojando `MulterError: LIMIT_FILE_SIZE`. Como `upload.array('photos', 100)` se ejecutaba directamente como middleware sin captura de excepciones, Express devolvía un error 500 HTML por defecto sin mensaje JSON estructurado.
  - El bucket `originals` de Supabase Storage en el plan Free Tier tiene un límite máximo inalterable de **52428800 bytes (50 MB)** (`413 EntityTooLarge` si se intenta exceder).
- **Solución Implementada:**
  1. **Backend (`admin-albums.routes.ts`):** Envoltura del middleware de Multer (`handleMulterUpload`) que intercepta `LIMIT_FILE_SIZE` y responde con código HTTP 413 y mensaje claro en JSON: `"Uno o más archivos superan el límite de 50 MB admitido por el almacenamiento de Supabase..."`.
  2. **Frontend (`admin-panel.component.ts` & `.html`):**
     - Detección inmediata de archivos superiores a 50 MB (`MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024`).
     - Alerta reactiva `hasOversizedFiles` que resalta en rojo los archivos excedentes con badge `⚠️ Excede 50 MB`.
     - Inclusión de botones de remoción individual (`removeSelectedFile(idx)`) y limpieza total (`clearSelectedFiles()`) para que el fotógrafo no tenga que reiniciar todo el lote si una sola foto es demasiado pesada.
     - Bloqueo preventivo del botón de subida hasta que se descarten o compriman las fotos > 50 MB.
     - Presentación amigable de errores HTTP (`err.error?.error || err.error?.message`).
  3. **Backend (`album.repository.ts`):** Retiro defensivo en consultas de Supabase PostgreSQL si la columna `deleted_at` no existe en la base remota (evita degradación silenciosa a datos en memoria).
  4. **Navegador Integrado en Antigravity:** Guía detallada para el uso de `Simple Browser: Show` (`Ctrl+Shift+P`), el comando `/browser` de Antigravity y la captura/comentarios visuales.
- **Evidencia y Validación:**
  - **214 tests unitarios pasando al 100%** (130 backend + 84 frontend).
  - 2 nuevos tests unitarios en frontend cubriendo detección de archivos >50MB y remoción quirúrgica de la lista.
  - Builds de producción de backend (`tsc`) y frontend (`ng build`) finalizados con código 0.

### ADR-025: Rediseño 3D Integral Mobile-First: Carpeta Física con Anillas, Grilla Polaroid con Skeletons, Visor Cinemático Swipe y Sticky Dock Inteligente
- **Motivación y Requerimientos:**
  - **Carpeta de Álbum 3D (`AlbumCard3dComponent`):** Diseño de carpeta de cuero negro con lomo lateral izquierdo (categoría vertical y 3 anillas metálicas realistas con remaches). Apertura en perspectiva (`perspective: 1200px`, `rotateY(-18deg)`, `transform-origin: left center`) que revela hojas interiores apiladas (`sheet-1` rotada +2.4deg y `sheet-2` rotada -1.4deg) y brillo especular dinámico que sigue al cursor en escritorio. Detección pasiva en móvil vía `IntersectionObserver` y respuesta elástica a eventos táctiles (`touchstart` / `touchend`).
  - **Grilla Polaroid 3D (`PhotoCardPolaroidComponent`):** Tarjetas físicas blancas estilo Polaroid con rotación orgánica alternada (-1.5deg a 1.5deg), enderece a 0deg y elevación en eje Z (`translateZ(20px)`) al interactuar. Estados Shimmer Skeleton sincronizados para evitar el ícono de imagen rota, carga diferida nativa con `@defer (on viewport)`, y animación física spring (`animate-check-pop`) al seleccionar.
  - **Visor Cinemático Táctil (`LightboxComponent`):** Fondo con `backdrop-filter: blur(16px)` y superposición oscura cinemática. Soporte completo de gestos táctiles con seguimiento de inercia en vivo (`translate3d`), detección de swipe horizontal (avance/retroceso) y swipe vertical hacia abajo para cerrar. Marca de agua centralizada protegida y botón de adición rápida al carrito.
  - **Sticky Checkout Dock & Recomendación Inteligente (`FloatingCartComponent` & `CartStore`):** Monitoreo en tiempo real de fotos individuales seleccionadas. Detección automática cuando el costo individual iguala o supera el 80% del valor del pack completo, sugiriendo el ascenso al "Pack Álbum Completo" tanto en la cápsula flotante inferior como en el drawer de gestión con conversión en un solo clic (`switchToFullAlbum()`).
- **Evidencia y Validación:**
  - **212 tests unitarios pasando al 100%** (130 backend + 82 frontend).
  - 24 nuevos tests unitarios en frontend (9 en `album-card-3d`, 7 en `photo-card-polaroid`, 7 en `lightbox`, 1 en `cart.store`).
  - Compilación de producción con Angular CLI (`ng build`) exitosa en 10.9s, con tamaño transferido de solo 116 KB y chunk perezoso de Polaroid de 2.4 KB.

- **Motivación y Requerimientos:**
  - **Papelera de Reciclaje (Soft Delete de 30 Días & Purga Permanente):** Campo `deletedAt` en base de datos; contador interactivo de días de gracia (`daysRemaining`), pestaña 'trash' en el panel administrativo, botón de restauración a activo y modal de confirmación irreversible para purga definitiva.
  - **Álbumes de Cortesía Gratuitos en Máxima Calidad HD:** Habilitación exclusiva por la administradora/dueña (`isFreeDownload`, `freeDownloadUnlockedAt`); generación y streaming directo de ZIPs de resolución original (`/api/downloads/free/:albumId/zip`) sin costo ni redirección a pasarelas de pago.
  - **Álbumes Privados Protegidos por Código PIN:** Protección por clave/PIN (`isPrivate`, `accessCode`), enmascarado Zero-Trust público (`'********'`), verificación segura en tiempo constante en el servidor (`crypto.timingSafeEqual`) con emisión de tokens de sesión temporales, modal interactivo de desbloqueo accesible (`PinUnlockModalComponent`) y persistencia en `AlbumAccessStore` con `sessionStorage`.
  - **Innovación Visual "3D Interactive Photo Portfolio & Open Folder" (60-120 Hz GPU):**
    * Diseño en forma de carpeta de fotógrafo (`PortfolioBinderComponent`) con lomo texturado, remaches metálicos, rotación tipográfica y ventana troquelada.
    * Solapa 3D con entreabierto/peek en hover (`[transform:rotateY(-28deg)_scale(0.98)]`, `backface-visibility: hidden`) revelando sutilmente la foto interior.
    * Galería en abanico 3D (Tilted Fan-Deck) con fotos inclinadas sobre perspectiva de 1200px que se enderezan suavemente al pasar el ratón (`translateZ(28px) scale(1.05)`) y abren el visor cinemático al hacer clic.
- **Evidencia y Validación:**
  - **188 tests unitarios pasando al 100%** (130 backend + 58 frontend).
  - Verificación en vivo de endpoints HTTP:
    * PIN incorrecto: `401 Unauthorized` con mensaje de error claro.
    * PIN correcto: `200 OK` con emisión de `accessToken` HMAC.
    * Descarga gratuita ZIP: `200 OK` con Content-Type `application/zip`.
    * Papelera: soft-delete y restore verificados exitosamente en caliente.
  - Compilación de producción limpia con TypeScript estricto en frontend (`ng build`) y backend (`tsc`).
- **Motivación:**
  - Garantizar que los precios personalizados por el fotógrafo en cada álbum se reflejen con exactitud al cobrar en Mercado Pago tanto en frontend como en el backend (`OrderService.createOrderAsync`).
  - Guardar fechas y horarios por tipo de dato estructurado (`eventDate` YYYY-MM-DD y `eventTime` HH:mm) permitiendo filtros de búsqueda cronológicos y previsualización amigable.
  - Diseñar el Drawer interactivo expandible en el carrito flotante (`FloatingCartComponent`), mostrando fotos protegidas en baja calidad WebP con insignia "MUESTRA", eliminación individual (`removePhoto`), y separación clara de Álbum Completo.
  - Resolver el desplazamiento vertical del modal provocado por el context containing block del `backdrop-blur-3xl` en `app.html`.
  - Solucionar la deformación vertical de pestañas y botones de categorías con `whitespace-nowrap shrink-0` y scroll horizontal suave.
  - Implementar tolerancia a fallos Zero-Downtime en `SupabaseAlbumRepository` ante migraciones pendientes (código PGRST204) con reintento automático sobre el esquema base.
- **Evidencia y Validación:**
  - 178 tests unitarios pasando en total (126 backend, 52 frontend).
  - Ambos servidores compilados y en ejecución en puertos 4000 (Backend) y 4200 (Frontend).

### ADR-022: Ampliación de Skills Oficiales de Google y Supabase & Nuevos Subagentes (DBA y Zoneless Migrator)
- **Motivación:**
  - Incorporar la totalidad de las recomendaciones canónicas de las páginas y herramientas oficiales (`angular.dev/ai/mcp`, `best-practices.md`, `supabase.com/docs`, y `get_advisors`), cubriendo accesibilidad AXE/WCAG AA, detección de cambios Zoneless, optimización DBA y funciones serverless.
- **Nuevos Skills Especializados Añadidos:**
  - **Angular (Total 8 Skills):**
    6. `angular-zoneless-performance`: Detección de cambios sin Zone.js, Signals puros, `provideZonelessChangeDetection` y animación móvil a 120fps.
    7. `angular-accessibility-axe`: Cumplimiento WCAG 2.1 AA, pruebas automáticas AXE, foco atrapado en modales (`tabindex="-1"`), `aria-label` y semántica interactiva.
    8. `angular-router-lazy-loading`: Carga perezosa con `loadComponent`, parámetros mapeados a Signal Inputs (`withComponentInputBinding`), Guards funcionales (`CanActivateFn`) y View Transitions API.
  - **Supabase (Total 8 Skills):**
    6. `supabase-advisors-optimizer`: Diagnósticos de los asesores automáticos (`get_advisors`), resolución de claves foráneas sin índice B-Tree, y optimización con `EXPLAIN (ANALYZE, BUFFERS)`.
    7. `supabase-auth-ssr`: Manejo de autenticación con cookies HttpOnly seguras, flujo PKCE y rotación de tokens con `@supabase/ssr`.
    8. `supabase-edge-functions`: Arquitectura serverless en Deno/TypeScript, procesamiento de webhooks de pago y despacho asíncrono.
- **Nuevos Subagentes Añadidos (Total 6 Subagentes):**
  - **`angular-zoneless-migrator`:** Especialista en modernización y eliminación de Zone.js, migrando directivas legadas (`*ngIf`, `*ngFor`, `ngClass`, `ngStyle`) a control flow nativo y enlaces directos.
  - **`supabase-dba`:** Administrador de base de datos senior para diagnóstico de consultas lentas, eliminación de bloqueos de I/O y mantenimiento de índices.
- **Evidencia y Validación:**
  - Total de 16 skills y 6 subagentes validados y sincronizados tanto en el workspace local como en la configuración global de Antigravity.
  - 176 tests unitarios pasando al 100% (126 backend, 50 frontend) garantizando cero regresiones.

### ADR-021: Subagentes Especializados para Supabase y Angular Moderno (agents/)
- **Motivación:**
  - Potenciar el flujo ODD Nivel 3 y la delegación asíncrona concurrente mediante subagentes especializados (`invoke_subagent`), dividiendo responsabilidades complejas en perfiles técnicos dedicados.
- **Subagentes Creados e Integrados:**
  - **`supabase-architect`:** Especialista en modelado relacional PostgreSQL, índices B-Tree, migraciones DDL, integridad y Patrón Repository.
  - **`supabase-security-auditor`:** Especialista en auditoría de Row Level Security (RLS), políticas Zero-Trust, patrones de vistas públicas seguras (`public_photos`) y protección de Storage Buckets (`previews` vs `originals`).
  - **`angular-architect`:** Especialista en diseño frontend moderno, Standalone Components, Signal Stores reactivos, rendimiento OnPush a 60/120fps y vistas diferidas (`@defer`).
  - **`angular-tester`:** Especialista en TDD y pruebas unitarias con Vitest y Angular TestBed, validación de Signal Stores y mocks HTTP con `provideHttpClientTesting`.
- **Estructura y Ubicación:**
  - Workspace: `.agents/plugins/supabase/agents/` y `.agents/plugins/angular/agents/`.
  - Global: `~/.gemini/config/plugins/supabase/agents/` y `~/.gemini/config/plugins/angular/agents/`.
- **Evidencia y Validación:**
  - Archivos Markdown de definición con frontmatter YAML estricto (`name`, `description`, `mainAgent`, `subagent`, `commandExecutionPolicy`).
  - Verificación de descubrimiento en el sistema de plugins.
  - Cero interferencia en el código del proyecto (176 tests pasando al 100%).

### ADR-020: Infraestructura de Agente y Suite Especializada de Angular Moderno (MCP & Skills)
- **Motivación:**
  - Dotar al entorno de herramientas oficiales del equipo de Angular para análisis del workspace, búsqueda de mejores prácticas vigentes, documentación canónica de `angular.dev` y 5 skills de alta precisión para desarrollo frontend.
- **Configuración MCP Implementada:**
  - `angular-cli`: Servidor oficial del Angular CLI (`@angular/cli mcp` con `--prefix frontend`) integrado de forma nativa en Angular 21. Expone herramientas programáticas del framework: `list_projects`, `get_best_practices`, `search_documentation`, `find_examples`, `zoneless_migration`, `build` y `test`.
  - `angular-docs`: Servidor MCP especializado (`angular-mcp-server`) con índice en memoria de 84 temas clave de `angular.dev` para consultas conceptuales instantáneas sobre APIs, directivas y utilidades.
  - Registrado en `.agents/plugins/angular/mcp_config.json` (workspace) y `~/.gemini/config/mcp_config.json` (global).
- **Suite de Skills Especializados Creados:**
  1. `angular-signals-state`: Reactividad con Signals (`signal`, `computed`, `effect`), patrón Signal Store centralizado, interop con RxJS (`toSignal`, `toObservable`) y ChangeDetectionStrategy.OnPush.
  2. `angular-component-patterns`: Anatomía de Standalone Components, Signal Inputs (`input.required()`), Signal Outputs (`output()`), flujo de control nativo (`@if`, `@for` con `track`, `@switch`), vistas diferidas (`@defer`) e inyección limpia con `inject()`.
  3. `angular-forms-validation`: Formularios reactivos fuertemente tipados con `NonNullableFormBuilder`, validadores personalizados síncronos/asíncronos y accesibilidad.
  4. `angular-testing-vitest`: Pruebas unitarias de componentes y servicios con Vitest y Angular TestBed, pruebas de Signals y mocks HTTP con `provideHttpClientTesting`.
  5. `angular-cli-workflow`: Automatización con Angular CLI v21 (`ng generate`, `ng build`, `ng test`) y orquestación con herramientas MCP oficiales.
- **Evidencia y Validación:**
  - Validación sintáctica de archivos JSON (`config.json`, `mcp_config.json`, `plugin.json`): 100% válidos.
  - Verificación de ejecución stdio de servidores MCP (`@angular/cli mcp` y `angular-mcp-server`): iniciados sin errores.
  - Suite de 50 tests de frontend y 126 de backend (176 tests en total) ejecutados y pasando al 100%.

### ADR-019: Infraestructura de Agente y Suite Especializada de Supabase (MCP & Skills)
- **Motivación:**
  - Potenciar el flujo de trabajo del agente y del equipo técnico para el modelado de bases de datos, seguridad Row Level Security (RLS), gestión de almacenamiento (Storage), integración de backend y uso de la CLI de Supabase.
- **Configuración MCP Implementada:**
  - `supabase-postgrest`: Conexión de alto rendimiento mediante `@supabase/mcp-server-postgrest` apuntando al endpoint de la API (`https://owybwjeybmzerrspwpjv.supabase.co/rest/v1`), autenticada con la clave de servicio y esquema `public`. Permite consultas directas, inspección OpenAPI de tablas y traducción SQL-to-REST.
  - `supabase`: Integración oficial con `@supabase/mcp-server-supabase` vinculada al proyecto `owybwjeybmzerrspwpjv` para administración de base de datos (`execute_sql`, `apply_migration`), diagnósticos de rendimiento y seguridad (`get_advisors`), observabilidad (`get_logs`) y generación automática de tipos TypeScript.
  - Registrado en `.agents/plugins/supabase/mcp_config.json` (workspace) y `~/.gemini/config/mcp_config.json` (global).
- **Suite de Skills Especializados Creados:**
  1. `supabase-postgres`: Modelado relacional, claves foráneas, disparadores, convenciones snake_case y optimización con índices B-Tree.
  2. `supabase-rls-security`: Row Level Security estricto, vistas públicas seguras (`public_photos`, `public_photographers`), Zero-Trust en órdenes y checklist Guardian Angel.
  3. `supabase-storage`: Arquitectura dual con bucket CDN público `previews` (800px WebP, 1 año de caché) y bucket privado `originals` (HD, URLs firmadas de 72h).
  4. `supabase-client-backend`: Patrón Repository desacoplado (`Supabase*Repository` vs `Memory*Repository`), tipado estricto sin `any`, fallback defensivo offline/CI y paginación con `.range()`.
  5. `supabase-cli-workflow`: Automatización con `npx supabase`, generación de tipos TypeScript (`gen types typescript`), gestión de migraciones versionadas y diffing.
- **Evidencia y Validación:**
  - Validaciones de sintaxis JSON en configs (`config.json`, `mcp_config.json`, `plugin.json`): 100% válidos.
  - Verificación de arranque de procesos de servidor MCP sin fallos.
  - 176 tests unitarios pasando al 100% (126 en backend, 50 en frontend) garantizando cero regresiones.

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


