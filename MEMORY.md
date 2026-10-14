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
- [ ] Conexión del frontend definitivo con la API del backend (Angular 19 Standalone / Signals).
- [ ] Importador de carpetas compartidas de Google Drive.
- [ ] Panel administrativo con subida masiva drag-and-drop y métricas en vivo.

### ADR-008: Seguridad de Pagos, Zero-Trust & Webhooks Criptográficos (Mercado Pago ARS)
- **Principio Zero-Trust de Precios:** El frontend nunca envía montos ni totales. Solo envía IDs de fotos/álbumes y cupones. El backend calcula el total y en el webhook consulta directamente `GET /v1/payments/{id}` a Mercado Pago verificando que `payment.transaction_amount >= order.total_amount`, `currency === 'ARS'` y `status === 'approved'`. Discrepancias disparan la alerta inmutable `FRAUD_ALERT_PRICE_MISMATCH`.
- **Firma Criptográfica HMAC-SHA256:** Validación del manifest `id:[data.id];request-id:[x-request-id];ts:[ts];` utilizando `MP_WEBHOOK_SECRET` y comparación en tiempo constante (`crypto.timingSafeEqual`) con protección contra excepciones de disparidad de tamaño.
- **Protección Anti-Replay:** Ventana de tolerancia estricta de ±300 segundos (5 minutos) contra ataques de repetición.
- **Idempotencia Transaccional:** Registro único de eventos procesados para absorber reintentos automáticos de Mercado Pago sin re-ejecutar lógica de negocio.
- **Tokens de Descarga Seguros (72 Horas):** Generación de tokens HMAC-SHA256 con Base64Url que expiran a las 72 horas, protegidos contra Path Traversal (`path.posix.basename`).

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

