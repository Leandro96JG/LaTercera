---
name: angular-cli-workflow
description: >-
  Operaciones de Angular CLI v21 y herramientas del servidor MCP oficial de Angular.
  Úsalo cuando el usuario necesite generar componentes/servicios con `ng generate`, compilar con `ng build`,
  ejecutar tests con `ng test`, o aprovechar las herramientas del servidor MCP oficial (`list_projects`, `get_best_practices`, `search_documentation`, `zoneless_migration`).
---

# Angular CLI & MCP Workflow: Automatización y Herramientas del Framework

Esta guía detalla el flujo de trabajo moderno con la CLI de Angular v21 y la integración con las herramientas del servidor MCP oficial.

---

## 1. Comandos Principales de Angular CLI

```bash
# Servidor de desarrollo con recarga en vivo
ng serve

# Compilación de producción optimizada
ng build

# Ejecución de suite de pruebas unitarias
ng test

# Generación de componentes standalone
ng generate component features/mi-componente --standalone

# Generación de servicios inyectables
ng generate service core/services/mi-servicio
```

---

## 2. Herramientas del Servidor MCP Oficial de Angular (`ng mcp`)

El servidor MCP oficial de Angular (`@angular/cli mcp`) expone herramientas que el agente y el entorno pueden invocar programáticamente:

| Herramienta MCP | Descripción | Cuándo Usarla |
| :--- | :--- | :--- |
| `list_projects` | Descubre la estructura del workspace y configuraciones en `angular.json`. | Al comenzar tareas en monorepos o proyectos Angular para identificar proyectos y rutas. |
| `get_best_practices` | Proporciona directrices de codificación oficiales específicas de la versión activa de Angular. | Antes de escribir o refactorizar código para validar estándares vigentes. |
| `search_documentation` | Búsqueda semántica en la documentación oficial de `angular.dev`. | Para responder preguntas conceptuales sobre APIs, directivas o decoradores. |
| `find_examples` | Busca implementaciones y snippets de código de referencia probados. | Para obtener patrones de código canónicos recomendados por el equipo de Google. |
| `zoneless_migration` | Asistencia en la migración de aplicaciones hacia detección de cambios sin Zone.js (Zoneless). | Al optimizar rendimiento y reducir tamaño de bundle. |

---

## 3. Servidor de Documentación Adicional (`angular-docs`)

El servidor complementario `angular-mcp-server` indexa 84 tópicos exhaustivos de `angular.dev` en memoria sobre stdio, permitiendo consultas instantáneas de referencia para:
- Signals y Reactividad (`signal`, `computed`, `effect`).
- Detección de cambios `OnPush` y Zoneless.
- Enrutamiento declarativo y guards funcionales (`CanActivateFn`).
- Interceptores funcionales (`HttpInterceptorFn`).
- SSR e hidratación con `@angular/ssr`.
