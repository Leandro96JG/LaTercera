# LA TERCERA • Fotografía Deportiva y de Eventos

Plataforma web e-commerce y portfolio profesional de fotografía deportiva (fútbol, hockey, básquet) y eventos sociales (cumpleaños, fiestas, festivales) para **La Tercera**, en La Rioja, Argentina.

---

## 🌟 Características Principales

- **Diseño Bento Grid Minimalista:** Experiencia visual inspirada en galerías de arte y revistas de autor (Photography-First), sin ruido invasivo de ventas.
- **Protección de Fotografías:** Generación automática de versiones WebP en baja resolución con marcas de agua sutiles estampadas en píxeles con `sharp` para evitar capturas de pantalla o robos de imagen.
- **Muestras en Alta Calidad:** Soporte para 2 o 3 fotos de demostración en calidad original 4K certificando la nitidez del lente y la cámara.
- **Cápsula de Compra Silenciosa:** Barra flotante minimalista que solo emerge al seleccionar fotos para adquirir.
- **Venta Automatizada con Mercado Pago:** Soporte para compra de fotos individuales (con packs de descuento automático) o álbumes completos. Entrega inmediata post-pago con enlaces temporales seguros y empaquetado en archivo `.ZIP`.
- **Importador de Google Drive:** Integración para cargar lotes de fotos directamente desde carpetas compartidas de Google Drive.
- **Dashboard de la Fotógrafa:** Métricas de facturación en pesos argentinos ($ ARS), subida masiva drag-and-drop, gestión de precios y eliminación de álbumes antiguos.

---

## 🛠️ Stack Tecnológico

- **Frontend:** Angular 19 / HTML5 + Tailwind CSS + Lucide Icons (Diseño Bento Grid mobile-first).
- **Backend:** Node.js (Express / Fastify) + Sharp (procesamiento de imágenes).
- **Base de Datos & Auth:** PostgreSQL / Supabase.
- **Pasarela de Pagos:** Mercado Pago SDK (Argentina - ARS).
- **Almacenamiento:** Cloudflare R2 / S3 Storage.

---

## 🚀 Prototipo Interactivo Local

Para probar el prototipo visual e interactivo:

```bash
# Iniciar servidor local
node server.js
```
Abre en tu navegador: `http://localhost:3001/preview/index.html`
