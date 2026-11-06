# MEMORY.md - Estado Vivo del Proyecto (LA TERCERA)

> **REGLA DE CONTEXTO:** Este archivo debe mantenerse ultraligero (<95 líneas).
> Para invariantes de negocio y seguridad, consultar [docs/BUSINESS_LOGIC.md](file:///e:/code/IA/fotos/docs/BUSINESS_LOGIC.md).
> Para el historial completo de decisiones (ADR-001 al ADR-064), consultar [docs/ADR_HISTORY.md](file:///e:/code/IA/fotos/docs/ADR_HISTORY.md).

---

## 1. Stack Activo en Producción
- **Identidad:** E-Commerce de fotografía deportiva y social para **Jenifer "Yuyo" Espeche** (`+54 9 380 486-8714`, `@latercera.fotos`, La Rioja, Argentina).
- **Frontend (Vercel):** Angular 21 (100% Standalone, Signals reactivos, `ChangeDetectionStrategy.OnPush`, View Transitions API, Tailwind CSS compilado local sin CDN).
- **Backend (Railway Docker Alpine 22):** Node.js 22 + Express + TypeScript estricto + `sharp` (con `fontconfig` y `ttf-dejavu` para rasterizado SVG).
- **Persistencia Híbrida (Patrón Repository):**
  - Supabase PostgreSQL y Supabase Storage en producción (Buckets `previews` y `originals`).
  - Fallback determinista en memoria (`Memory*Repository`) activo durante tests (`NODE_ENV=test` / `VITEST=true`) para garantizar 0% de contaminación de datos live y ejecución 100% offline.
- **Pasarela de Pagos:** Mercado Pago SDK en ARS (Checkout Pro, webhooks con validación HMAC-SHA256, tolerancia anti-replay ±300s y Zero-Trust).

---

## 2. Documentación Central e Invariantes
- **Reglas de Negocio Inmutables:** [docs/BUSINESS_LOGIC.md](file:///e:/code/IA/fotos/docs/BUSINESS_LOGIC.md)
  - Protección de imágenes en 3 capas (`previews` 800px Sharp, Muestras HD 1400px, `originals` privado 72h).
  - Subida masiva anti-OOM (Canvas 320px WebP, límite 50 MB, micro-lotes de 4 fotos).
  - Álbumes privados con PIN criptográfico (`timingSafeEqual`) y cortesía en modo Store.
  - Pagos Zero-Trust (backend calcula precios, tope de álbum completo y cupones atómicos).
  - Estándares UI/UX Bento y movimiento 3D a 120fps sin bloqueos en scroll.
- **Historial Completo de Decisiones Arquitectónicas:** [docs/ADR_HISTORY.md](file:///e:/code/IA/fotos/docs/ADR_HISTORY.md) (Trazabilidad detallada de ADR-001 a ADR-063).

---

## 3. Subagentes y Skills Activas en el Proyecto
- **Skills de Diseño y Frontend:**
  - `frontend-design` (`.agents/skills/frontend-design`): Guía de diseño visual distintivo, anti-clichés de IA, tipografía intencional y ergonomía mobile/desktop.
  - Regla permanente vinculada: [.agents/rules/frontend-design.md](file:///e:/code/IA/fotos/.agents/rules/frontend-design.md).
- **Persistencia y Datos Supabase:**
  - `supabase-architect`: Diseño de esquemas relacionales, modelado y migraciones SQL.
  - `supabase-security-auditor`: Auditoría y blindaje de políticas RLS y Storage Buckets.
  - `supabase-dba`: Optimización de índices B-Tree, planes de consulta y diagnósticos.
- **Frontend y Experiencia Angular:**
  - `angular-architect`: Arquitectura Standalone, Signal Stores y optimización OnPush.
  - `angular-tester`: Suites de pruebas unitarias TDD con Vitest y TestBed.
  - `angular-zoneless-migrator`: Control flow nativo, Signals puros y optimización CD.
  - `motion-ux-specialist`: Animaciones GPU 3D, Bento Grid, Splash y Skeletons.
  - `media-upload-specialist`: Subida masiva, canvas previews y colas de subida.
- **Garantía de Calidad y Revisión:**
  - `tdd-tester`: Pruebas de integración, verificación de invariantes y edge cases.
  - `guardian-reviewer`: Auditoría previa a la entrega (Zero-Trust, tipado estricto y regresiones).

---

## 4. Estado Actual y Últimos Hitos (ADRs Recientes)
- **Suite de Pruebas Automatizadas:** **542 tests pasando al 100%** (238 backend con Vitest + 304 frontend con Angular TestBed/Vitest).
- **Últimos ADRs Consolidados:**
  - **ADR-077:** Sincronización Categorías Supabase Live, Rediseño Anti-Desborde Polaroid y Logo PNG en Drive & HD: (1) Sincronizadas las 6 categorías oficiales (`futbol`, `motos`, `hockey`, `basquet`, `sociales`, `otros`) en Supabase Live; corregido UTF-8 en `categories.json` y blindada la validación de unicidad en `SupabaseCategoryRepository.createCategory`. (2) Rediseñado el pie de `photo-card-polaroid` en álbumes gratuitos a 2 filas (`Foto #N` y `Descarga Gratis` arriba + `grid grid-cols-2` abajo para `+ Elegir` y `Descargar HD`), eliminando duplicidad de iconos y garantizando 0 desborde (`overflow-hidden`). (3) Corregido el logo de marca de agua en Google Drive Import: conversión a base64 inmediata (`watermarkLogoBase64`) + subida a storage, descartando URLs locales `blob:` que Node.js no puede resolver; estampe verificado en muestras HD y regulares.
  - **ADR-076:** Numeración Secuencial Comercial Limpia, Insignias `#001` y Persistencia de Tutorial: Helpers de nombres comerciales (`formatSequenceBadge`, `buildAlbumPhotoTitle`, `buildCleanDownloadFilename`, `buildCleanZipFilename`); numeración correlativa en subida (`existingCount + idx + 1`); descargas individuales, URLs firmadas y empaquetado `.zip` con nombres limpios y ordenados (`La_Tercera_${cleanAlbum}_${paddedSeq}.jpg`); insignias `#001` en `photo-card-polaroid` y `lightbox` con `z-20` visible sobre oscurecimiento; persistencia estricta en `localStorage` del tutorial de linterna (`hasSeenTutorial()`, apertura manual y bloqueo automático).
  - **ADR-075:** UX Móvil Táctil Linterna (Spotlight), Persistencia de Tutorial y Botón Flotante (FAB): Persistencia de tutorial (`SpotlightTutorialComponent.hasSeenTutorial()`); Botón Flotante (FAB) animado en esquina inferior derecha (`fixed bottom-24/bottom-6 right-4 z-40`) con estados Linterna OFF/ON, haz SVG, pulso y ayuda `?`; Prevención de cancelación táctil en celulares vía `touch-action: none; user-select: none;`, eventos `touchstart/touchmove/touchend` con offset vertical `-40px`, retención suave de 600ms y 0 regresiones en desktop.
  - **ADR-074:** Corrección Quirúrgica de 5 Bugs Visuales y Navegación: Descarte instantáneo de `SpotlightTutorialComponent` (`isDismissedInternally`, Escape y cierre dual); Capa `.spotlight-darkness-layer` sólida (0.86 rest / 0.25 selected / radial hole 135px en hover/touch); Tarjetas 3D uniformes en grilla (`h-full`, título `min-h-[2.75rem]`, subtítulo `min-h-[1.125rem]` y remoción de `contain: paint`); Limpieza de URL en retorno de pasarela (`window.history.replaceState` a `/`); Sincronía matemática perfecta en animación tutorial (`clip-path: circle(48px)` en lockstep con anillo).
  - **ADR-073:** Rendimiento Móvil 120fps, Linterna GPU y Blindaje de Pagos: M1 (Efecto Linterna GPU 20% base/75% carrito/100% libre); M2 (Bandeja de cortesía en `CartStore`, píldora esmeralda y ZIP selectivo); M3 (120fps en carpetas 3D sin `backdrop-filter` ni tilt en scroll); M4 (Splash screen determinista 450ms-1800ms); M5 (Preferencia MP 45m, polling 3s x 6 intentos y revocación con WhatsApp).
  - **ADR-065 a ADR-072:** Rediseño Bento Grid, elevación UI/UX fases 1 a 4 (`frontend-design`), pipeline de marcas de agua con logo remoto Sharp, identidad oficial y portadas dinámicas.
  - **ADR-061 a ADR-064:** Optimización Canvas WebP 320px, subidas masivas por lotes, tipografía DejaVu en Dockerfile Alpine y persistencia híbrida.

---

## 5. Próximos Pasos Pendientes
- [x] Aplicar la skill `frontend-design` sección por sección y formulario por formulario:
  - [x] Fase 1: Hero & Header (Identidad, tipografía y navegación táctil).
  - [x] Fase 2: Catálogo de Álbumes (3D Cards) y Galería Polaroid (Microinteracciones y selección).
  - [x] Fase 3: Lightbox & Carrito Flotante (Ergonomía de compra mobile y desktop).
  - [x] Fase 4: Modales y Formularios (Checkout, PIN Unlock, Order Recovery, Admin Login, Payment Success).
- [ ] Fase 5 opcional: Auditoría de diseño del Panel de Administración (`admin-panel.component.html`).
- [ ] Monitoreo continuo de salud y métricas de producción en Railway y Vercel.
