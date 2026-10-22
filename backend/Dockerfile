# syntax=docker/dockerfile:1

# ==========================================
# Etapa 1: Compilación (Build Stage)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Dependencias nativas del sistema requeridas para módulos C++, Sharp y renderizado tipográfico SVG en Alpine Linux
RUN apk add --no-cache python3 make g++ libc6-compat fontconfig && \
    (apk add --no-cache font-dejavu || apk add --no-cache ttf-dejavu || true) && \
    fc-cache -fv

# Copiar manifiestos de dependencias para aprovechar la caché de capas de Docker
COPY package*.json ./

# Instalación limpia y exacta según package-lock.json
RUN npm ci

# Copiar el código fuente completo del backend
COPY . .

# Compilar TypeScript a JavaScript en dist/
RUN npm run build

# Podar dependencias de desarrollo para reducir el tamaño final de la imagen
RUN npm prune --production


# ==========================================
# Etapa 2: Entorno de Ejecución (Runtime Stage)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Instalar compatibilidad de librerías del sistema y fuentes tipográficas reales para librsvg / Sharp en Alpine
RUN apk add --no-cache libc6-compat fontconfig && \
    (apk add --no-cache font-dejavu || apk add --no-cache ttf-dejavu || true) && \
    fc-cache -fv

# Configurar variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=4000

# Crear directorios de trabajo y asegurar permisos para el usuario del sistema 'node'
RUN mkdir -p /app/uploads /app/data && chown -R node:node /app

# Seguridad OWASP: cambiar al usuario no privilegiado 'node'
USER node

# Copiar artefactos de compilación y dependencias de producción podadas
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/data ./data

# Exponer el puerto de la aplicación
EXPOSE 4000

# Comando de inicio del servidor en producción
CMD ["node", "dist/index.js"]
