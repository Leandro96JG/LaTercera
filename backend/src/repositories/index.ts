import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';
import { IOrderRepository, MemoryOrderRepository, SupabaseOrderRepository } from './order.repository';
import { IAlbumRepository, MemoryAlbumRepository, SupabaseAlbumRepository } from './album.repository';
import {
  IPhotographerRepository,
  MemoryPhotographerRepository,
  SupabasePhotographerRepository
} from './photographer.repository';
import {
  IPromotionRepository,
  MemoryPromotionRepository,
  SupabasePromotionRepository
} from './promotion.repository';
import {
  ICategoryRepository,
  MemoryCategoryRepository,
  SupabaseCategoryRepository
} from './category.repository';

export * from './order.repository';
export * from './album.repository';
export * from './photographer.repository';
export * from './promotion.repository';
export * from './category.repository';

/**
 * Fabrica de repositorios con soporte híbrido:
 * Si SUPABASE_URL y llaves están configuradas en el entorno, utiliza PostgreSQL / Supabase;
 * de lo contrario, realiza un fallback transparente a la memoria en modo offline para tests.
 */
export function createOrderRepository(): IOrderRepository {
  const client = getSupabaseClient();
  if (client) {
    console.log('[Persistencia] Conectado a Supabase PostgreSQL para Órdenes');
    return new SupabaseOrderRepository(client);
  }
  console.log('[Persistencia] Operando con MemoryOrderRepository (Local / Tests)');
  return new MemoryOrderRepository();
}

export function createAlbumRepository(): IAlbumRepository {
  const client = getSupabaseClient();
  if (client) {
    console.log('[Persistencia] Conectado a Supabase PostgreSQL para Álbumes');
    return new SupabaseAlbumRepository(client);
  }
  console.log('[Persistencia] Operando con MemoryAlbumRepository (Local / Tests)');
  return new MemoryAlbumRepository();
}

export function createPhotographerRepository(): IPhotographerRepository {
  const client = getSupabaseClient();
  if (client) {
    console.log('[Persistencia] Conectado a Supabase PostgreSQL para Fotógrafos');
    return new SupabasePhotographerRepository(client);
  }
  console.log('[Persistencia] Operando con MemoryPhotographerRepository (Local / Tests)');
  return new MemoryPhotographerRepository();
}

export function createPromotionRepository(): IPromotionRepository {
  const client = getSupabaseClient();
  if (client) {
    console.log('[Persistencia] Conectado a Supabase PostgreSQL para Promociones');
    return new SupabasePromotionRepository(client);
  }
  console.log('[Persistencia] Operando con MemoryPromotionRepository (Local / Tests)');
  return new MemoryPromotionRepository();
}

export function createCategoryRepository(): ICategoryRepository {
  const client = getSupabaseClient();
  if (client) {
    console.log('[Persistencia] Conectado a Supabase PostgreSQL para Categorías');
    return new SupabaseCategoryRepository(client);
  }
  console.log('[Persistencia] Operando con MemoryCategoryRepository (Local / Tests)');
  return new MemoryCategoryRepository();
}


