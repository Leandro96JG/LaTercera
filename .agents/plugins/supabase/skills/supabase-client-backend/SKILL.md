---
name: supabase-client-backend
description: >-
  Patrones de integración de Supabase en backend Node.js / Express con TypeScript.
  Úsalo cuando el usuario necesite conectar el backend a Supabase, implementar el Patrón Repository,
  manejar fallback en memoria para tests/CI, tipar filas de base de datos sin `any`, o gestionar transacciones y cachés.
---

# Supabase Client Backend: Patrón Repository, TypeScript Estricto y Resiliencia

Esta guía describe cómo estructurar la capa de persistencia con Supabase en aplicaciones Node.js / Express siguiendo los principios de Clean Architecture y desarrollo defensivo.

---

## 1. Principio de Desacoplamiento (Repository Pattern)

**Regla de Oro:** El código de negocio (servicios y controladores) nunca debe importar `@supabase/supabase-js` directamente. Debe depender siempre de interfaces de repositorio abstractas.

```
┌────────────────────────────────────────────────────────┐
│                   CAPA DE SERVICIO                     │
│                  (OrderService, etc.)                  │
└───────────────────────────┬────────────────────────────┘
                            │ Depende de
                            ▼
┌────────────────────────────────────────────────────────┐
│                   INTERFAZ ABSTRACTA                   │
│                   (IOrderRepository)                   │
└───────────────────────────┬────────────────────────────┘
                            │ Implementada por
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│  SupabaseOrderRepository  │ │   MemoryOrderRepository   │
│       (Producción)        │ │    (Tests / Modo Local)   │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 2. Tipado Estricto de Filas (Zero `any`)

Definir interfaces explícitas que reflejen con precisión las columnas de las tablas de Supabase en `snake_case`:

```typescript
export interface SupabaseAlbumRow {
  id: string;
  title: string;
  slug: string;
  category: 'futbol' | 'hockey' | 'basquet' | 'sociales' | 'otros';
  event_date: string;
  location: string;
  unit_price: number | string;
  full_album_price: number | string;
  is_published: boolean;
  photographer_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
```

---

## 3. Factory de Inyección Defensiva con Fallback Automático

Detectar en tiempo de ejecución si las variables de entorno de Supabase están configuradas; de lo contrario, utilizar la implementación en memoria sin interrumpir la suite de tests ni el desarrollo local:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== 'none'
  );
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

export function createAlbumRepository(): IAlbumRepository {
  const client = getSupabaseAdminClient();
  if (client) {
    return new SupabaseAlbumRepository(client);
  }
  return new MemoryAlbumRepository();
}
```

---

## 4. Consultas Paginadas y Manejo de Errores

Aprovechar el método `.range(from, to)` de PostgREST para paginación eficiente en el servidor:

```typescript
export async function getPaginatedAlbums(
  supabase: SupabaseClient,
  page: number = 1,
  pageSize: number = 12
): Promise<PaginatedAlbumsResult> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from('albums')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Error consultando álbumes en Supabase: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    albums: (data as SupabaseAlbumRow[]).map(mapRowToAlbum),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNext: to < total - 1,
      hasPrev: page > 1
    }
  };
}
```

---

## 5. Pruebas Unitarias Deterministas (TDD)

Gracias a `Memory*Repository`, los tests de integración y unitarios pueden ejecutarse a máxima velocidad sin llamadas de red:
```typescript
describe('AlbumService con Repository Pattern', () => {
  it('debe listar álbumes paginados correctamente', async () => {
    const memoryRepo = new MemoryAlbumRepository();
    const service = new AlbumService(memoryRepo);
    
    await service.createAlbum({ title: 'Final Torneo', ... });
    const result = await service.listPaginated(1, 10);
    
    expect(result.albums.length).toBe(1);
    expect(result.meta.total).toBe(1);
  });
});
```
