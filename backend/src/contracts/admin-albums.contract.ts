/**
 * Contratos de API para Administración de Álbumes e Importación Masiva
 * Plataforma 'LA TERCERA' - Jenifer "Yuyo" Espeche
 */

import type { AlbumDTO } from '../repositories/album.repository';

// ==========================================
// 1. POST /api/admin/albums/import-drive
// ==========================================

export interface AdminDriveImportRequest {
  /** ID del álbum al cual se asociarán las fotos importadas */
  albumId: string;
  /** URL de Google Drive compartida o Folder ID directo */
  driveUrl: string;
  /** Texto personalizado para la marca de agua diagonal estampada (por defecto: 'LA TERCERA • MUESTRA') */
  watermarkText?: string;
  /** Límite de procesamiento concurrente con Sharp (por defecto: 3, recomendado: 2 a 5 para evitar OOM) */
  concurrencyLimit?: number;
  /** Cantidad de fotos iniciales que se marcarán como muestra HD Master (por defecto: 2) */
  markHdFirstN?: number;
  /** API Key opcional de Google Drive si no está configurada en variables de entorno del servidor */
  apiKey?: string;
}

export interface AdminProcessedPhotoDTO {
  id: string;
  driveFileId?: string;
  originalName: string;
  storagePath: string;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
  previewSize: number;
  format: 'webp';
  isHD: boolean;
}

export interface AdminImportSummaryDTO {
  totalFound: number;
  totalEligible: number;
  totalSkipped: number;
  successful: number;
  failed: number;
  totalOriginalBytes: number;
  totalPreviewBytes: number;
  durationMs: number;
  peakConcurrency: number;
}

export interface AdminSkippedFileDTO {
  id: string;
  name: string;
  mimeType: string;
  reason: string;
}

export interface AdminFileErrorDTO {
  fileId?: string;
  fileName: string;
  error: string;
}

export interface AdminDriveImportResponse {
  success: boolean;
  albumId: string;
  folderId: string;
  summary: AdminImportSummaryDTO;
  photos: AdminProcessedPhotoDTO[];
  errors: AdminFileErrorDTO[];
  skippedFiles: AdminSkippedFileDTO[];
}

// ==========================================
// 2. POST /api/admin/albums/bulk-upload
// ==========================================

export interface AdminBulkUploadSummaryDTO {
  totalReceived: number;
  successful: number;
  failed: number;
  totalOriginalBytes: number;
  totalPreviewBytes: number;
  durationMs: number;
  peakConcurrency: number;
}

export interface AdminBulkUploadResponse {
  success: boolean;
  albumId: string;
  summary: AdminBulkUploadSummaryDTO;
  photos: AdminProcessedPhotoDTO[];
  errors: Array<{ fileName: string; error: string }>;
}

// ==========================================
// 3. GESTIÓN DE ÁLBUMES & PRECIOS (CRUD)
// ==========================================

export type AlbumCategory = 'futbol' | 'hockey' | 'basquet' | 'sociales' | 'otros' | string;

export interface CreateAlbumRequest {
  title: string;
  category: AlbumCategory;
  subtitle?: string;
  date?: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  unitPrice: number;
  fullAlbumPrice: number;
  badge?: string;
  coverUrl?: string;
  isPublished?: boolean;
  customSlug?: string;
  isFreeDownload?: boolean;
  isPrivate?: boolean;
  accessCode?: string | null;
}

export interface CreateAlbumResponse {
  success: boolean;
  album: import('../repositories/album.repository').AlbumDTO;
  message: string;
}

export interface UpdateAlbumRequest {
  unitPrice?: number;
  fullAlbumPrice?: number;
  title?: string;
  subtitle?: string;
  date?: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  category?: AlbumCategory;
  badge?: string;
  coverUrl?: string;
  isPublished?: boolean;
  deletedAt?: string | null;
  isFreeDownload?: boolean;
  isPrivate?: boolean;
  accessCode?: string | null;
}

export interface UpdateAlbumPricesRequest {
  unitPrice: number;
  fullAlbumPrice: number;
}

export interface UpdateAlbumResponse {
  success: boolean;
  album: import('../repositories/album.repository').AlbumDTO;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AlbumPaginationOptions {
  page?: number;
  limit?: number;
  category?: string;
  date?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface PaginatedAlbumsResult {
  albums: import('../repositories/album.repository').AlbumDTO[];
  pagination: PaginationMeta;
}

export interface AdminListAlbumsResponse {
  success: boolean;
  total: number;
  albums: import('../repositories/album.repository').AlbumDTO[];
  pagination?: PaginationMeta;
}

// ==========================================
// 4. PAPELERA, CORTESÍA Y PRIVACIDAD
// ==========================================

export interface TrashAlbumItemDTO extends AlbumDTO {
  daysRemaining: number;
}

export interface AdminTrashListResponse {
  success: boolean;
  total: number;
  trashAlbums: TrashAlbumItemDTO[];
}

export interface TrashActionResponse {
  success: boolean;
  albumId: string;
  message: string;
}

export interface VerifyAlbumAccessRequest {
  accessCode: string;
}

export interface VerifyAlbumAccessResponse {
  success: boolean;
  valid: boolean;
  albumId: string;
  accessToken?: string;
  message?: string;
}

