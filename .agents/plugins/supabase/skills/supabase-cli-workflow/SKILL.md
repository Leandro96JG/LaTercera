---
name: supabase-cli-workflow
description: >-
  Uso de Supabase CLI para desarrollo local, migraciones, generación de tipos TypeScript y sincronización de proyectos.
  Úsalo cuando el usuario necesite ejecutar comandos con `npx supabase`, inicializar proyectos locales,
  generar tipos TypeScript automáticamente a partir del esquema remoto, crear migraciones de base de datos o sincronizar el estado.
---

# Supabase CLI: Flujo de Trabajo, Migraciones y Generación de Tipos

Esta guía detalla los comandos y mejores prácticas para utilizar la CLI oficial de Supabase (`npx supabase`) en el ciclo de vida de desarrollo.

---

## 1. Comandos Esenciales de Supabase CLI

Al no requerir instalación global obligatoria, todos los comandos pueden ejecutarse directamente usando `npx supabase`:

```bash
# Verificar versión de la CLI
npx supabase --version

# Iniciar sesión en la cuenta de Supabase
npx supabase login

# Vincular el proyecto local con el proyecto remoto
npx supabase link --project-ref <PROJECT_REF>
```

---

## 2. Generación Automática de Tipos TypeScript

Uno de los mayores beneficios de Supabase CLI es la generación directa de definiciones TypeScript sincronizadas al 100% con las tablas y esquemas de PostgreSQL:

### Generar Tipos desde el Proyecto Remoto:
```bash
# Generar tipos TypeScript directamente desde la base de datos vinculada
npx supabase gen types typescript --project-id <PROJECT_REF> --schema public > src/types/supabase.types.ts
```

### Generar Tipos en Entorno Local (Docker):
```bash
npx supabase gen types typescript --local > src/types/supabase.types.ts
```

---

## 3. Gestión de Migraciones de Base de Datos

### A. Crear una Nueva Migración:
```bash
npx supabase migration new nombre_de_la_migracion
# Crea un archivo en supabase/migrations/<timestamp>_nombre_de_la_migracion.sql
```

### B. Aplicar Migraciones al Entorno Local:
```bash
npx supabase db reset
```

### C. Inspeccionar Diferencias de Esquema (Diff):
```bash
# Compara el estado actual de la base de datos contra los archivos de migración
npx supabase db diff -f nombre_del_cambio
```

### D. Empujar Migraciones al Proyecto Remoto:
```bash
npx supabase db push
```

---

## 4. Uso del Servidor MCP para Inspección Rápida

Cuando el servidor MCP de Supabase está activo, muchas de estas operaciones pueden ejecutarse directamente a través de las herramientas del agente:
- `execute_sql`: Ejecución rápida de consultas DDL y DML.
- `apply_migration`: Despliegue de scripts SQL versionados.
- `generate_typescript_types`: Extracción directa de interfaces tipadas.
- `get_advisors`: Diagnóstico de salud, índices faltantes y brechas de seguridad RLS.
