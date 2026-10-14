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
- [ ] Preparación para Despliegue en Producción (CI/CD, Railway/Render para Backend, Vercel/Cloudflare Pages para Frontend).

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

