# Reglas de Diseño Visual y Experiencia de Usuario (`frontend-design`)

Este documento establece las directrices obligatorias de diseño UI/UX para **La Tercera** (E-Commerce de Fotografía Deportiva y Social). Toda intervención visual en vistas móviles o de escritorio debe regirse por la skill local `frontend-design` (`.agents/skills/frontend-design/SKILL.md`).

---

## 1. Identidad Distintiva y Libre de Clichés de Plantillas / IA

1. **Anclaje en la Materia Prima (Fotografía Deportiva y Social):**
   - El protagonista indiscutible es la **fotografía en alta definición**. La interfaz es el marco que realza el trabajo de Jenifer "Yuyo" Espeche: estética oscura profunda, transparencias sutiles (*ambient glassmorphism*), contraste impecable y energía visual.
2. **Erradicación de Clichés Visuales de IA:**
   - **PROHIBIDO** el uso de paletas genéricas (crema cálido con terracota, negro con verde ácido genérico).
   - **PROHIBIDO** el "SaaS-card kit": cajas redondeadas idénticas con sombras difusas grises repetitivas sin jerarquía de contenido.
   - **PROHIBIDO** el uso de etiquetas con mayúsculas sostenidas espaciadas (*tracked-out ALL-CAPS eyebrows*) en cada encabezado.
   - **PROHIBIDO** acentuar una única palabra en cursiva o color distinto dentro de un título como mero artificio.
   - Los números ordinales (`01 / 02 / 03`) solo se usan si el contenido representa una secuencia estricta de pasos (ej. proceso de compra), no como adorno.

---

## 2. Tipografía y Jerarquía de Información

1. **Escala y Legibilidad:**
   - Máximo 2 familias tipográficas con roles claramente diferenciados.
   - Largo de línea controlado (<80 caracteres por línea en textos y descripciones).
   - Interlineado generoso para lectura descansada.
2. **Estructura con Propósito:**
   - Bordes, líneas divisorias y separadores deben codificar información jerárquica real, nunca servir de relleno decorativo.
   - "Menos es más": antes de agregar un contenedor o adorno, verificar si la tipografía y el espacio en blanco (*whitespace*) resuelven la jerarquía.

---

## 3. Movimiento y Animaciones con Propósito

1. **Animaciones Guiadas por la Acción del Usuario:**
   - Priorizar transiciones que respondan directamente a interacciones (abrir Lightbox, agregar foto al carrito, expandir modal, desbloquear PIN).
   - Evitar transiciones de entrada tipo *fade-in-up* en todos los bloques que retarden la percepción de carga.
   - Respetar siempre `@media (prefers-reduced-motion: reduce)`.

---

## 4. Copywriting y Microcopia de Interfaz

1. **Voz Activa y Directa:**
   - Botones y CTAs indican exactamente la acción: *"Descargar fotos originales"*, *"Ver álbum completo"*, *"Pagar con Mercado Pago"*, en lugar de *"Enviar"* o *"Aceptar"*.
   - Consistencia terminológica: la acción iniciada en el botón mantiene el mismo nombre en las notificaciones y confirmaciones.
2. **Estados Vacíos y de Error Orientados a la Solución:**
   - Los mensajes de error explican qué ocurrió y cómo resolverlo de inmediato, sin disculpas corporativas ni lenguaje vago.
   - Las pantallas vacías (ej. carrito vacío o sin fotos coincidentes) son una invitación clara a explorar el catálogo.

---

## 5. Diseño de Formularios y Ergonomía Móvil

1. **Ergonomía Táctil (*Thumb Zone*):**
   - Áreas interactivas mínimas de 44x44px en móviles para botones, checkboxes de selección de fotos y controles de Lightbox.
   - Inputs con teclados adecuados (`type="email"`, `type="tel"`, `inputmode="numeric"` para PIN y cupones).
2. **Accesibilidad WCAG AA:**
   - Contraste cromático mínimo 4.5:1 en textos sobre fondos oscuros o vidriados.
   - Indicadores visuales de foco claros para navegación con teclado.
