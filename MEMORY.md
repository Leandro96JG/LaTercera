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
- **Suite de Pruebas Automatizadas:** **488 tests pasando al 100%** (224 backend con Vitest + 264 frontend con Angular TestBed/Vitest).
- **Últimos ADRs Consolidados:**
  - **ADR-068:** Elevación UI/UX Fase 4 (`frontend-design`): Erradicación de clichés de IA y emojis en CheckoutModal, PinUnlockModal, OrderRecoveryModal, AdminLogin y PaymentSuccess. Iconografía SVG vectorial, inputs y botones táctiles `min-h-[44px]`, foco accesible y 14 nuevos tests unitarios.
  - **ADR-067:** Elevación UI/UX Fase 3 (`frontend-design`): Lightbox cinemático con iconografía vectorial SVG nativa, controles táctiles accesibles (min 44px) y rediseño de la cápsula y drawer del carrito sin emojis ni flechas genéricas de IA.
  - **ADR-066:** Elevación UI/UX Fase 2 (`frontend-design`): Erradicación de emojis en tarjetas 3D y polaroids, iconos vectoriales SVG limpios, áreas táctiles móviles `min-h-[44px]` y prevención de falsos toques.
  - **ADR-065:** Elevación UI/UX Fase 1 (`frontend-design`): Erradicación de clichés de IA en Header y Hero, iconografía deportiva SVG nativa, tipografía intencional y áreas táctiles de 44px WCAG AA.
  - **ADR-064:** Paquete tipográfico `font-dejavu` en Alpine Dockerfile, desbloqueo de `PUT /photos/reorder` en Railway y sanitización HTML en errores.
  - **ADR-063:** Hero Ambient Glassmorphic 3D en álbum activo, tarjeta de portada interactiva con hover GPU y eliminación definitiva de marca de agua HTML superpuesta.
  - **ADR-062:** Optimización extrema de RAM con miniaturas Canvas WebP 320px, subida por micro-lotes secuenciales de 4 fotos y erradicación de `[object Object]`.

---

## 5. Próximos Pasos Pendientes
- [x] Aplicar la skill `frontend-design` sección por sección y formulario por formulario:
  - [x] Fase 1: Hero & Header (Identidad, tipografía y navegación táctil).
  - [x] Fase 2: Catálogo de Álbumes (3D Cards) y Galería Polaroid (Microinteracciones y selección).
  - [x] Fase 3: Lightbox & Carrito Flotante (Ergonomía de compra mobile y desktop).
  - [x] Fase 4: Modales y Formularios (Checkout, PIN Unlock, Order Recovery, Admin Login, Payment Success).
- [ ] Fase 5 opcional: Auditoría de diseño del Panel de Administración (`admin-panel.component.html`).
- [ ] Monitoreo continuo de salud y métricas de producción en Railway y Vercel.
