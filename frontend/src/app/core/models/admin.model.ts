export interface AdminStats {
  photosSold: number;
  albumsSold: number;
  revenueARS: number;
  storageUsedGB: number;
  storageLimitGB: number;
  activeAlbumsCount: number;
  lastUpdated: string;
}

export interface DriveImportRequest {
  albumId: string;
  driveUrl: string;
  watermarkText?: string;
  concurrencyLimit?: number;
  markHdFirstN?: number;
}

export interface ProcessedPhotoSummary {
  id: string;
  originalName: string;
  storagePath: string;
  previewUrl: string;
  width: number;
  height: number;
  format: 'webp';
  isHD: boolean;
}

export interface DriveImportResponse {
  success: boolean;
  albumId: string;
  folderId: string;
  summary: {
    totalFound: number;
    totalEligible: number;
    totalSkipped: number;
    successful: number;
    failed: number;
    durationMs: number;
  };
  photos: ProcessedPhotoSummary[];
  errors: Array<{ fileName: string; error: string }>;
}

export interface BulkUploadResponse {
  success: boolean;
  albumId: string;
  summary: {
    totalReceived: number;
    successful: number;
    failed: number;
    durationMs: number;
  };
  photos: ProcessedPhotoSummary[];
  errors: Array<{ fileName: string; error: string }>;
}

export interface RegisterPhotographerRequest {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'photographer';
}

export interface RegisterPhotographerResponse {
  success: boolean;
  photographer: {
    id: string;
    email: string;
    name: string;
    role: string;
    photographerId: string;
    createdAt: string;
  };
}

import { Album, AlbumCategory } from './album.model';

export interface CreateAlbumRequest {
  title: string;
  category: AlbumCategory;
  subtitle?: string;
  date?: string;
  location?: string;
  unitPrice: number;
  fullAlbumPrice: number;
  badge?: string;
  coverUrl?: string;
  isPublished?: boolean;
  customSlug?: string;
}

export interface CreateAlbumResponse {
  success: boolean;
  album: Album;
  message: string;
}

export interface UpdateAlbumRequest {
  unitPrice?: number;
  fullAlbumPrice?: number;
  title?: string;
  subtitle?: string;
  date?: string;
  location?: string;
  category?: AlbumCategory;
  badge?: string;
  coverUrl?: string;
  isPublished?: boolean;
}

export interface UpdateAlbumResponse {
  success: boolean;
  album: Album;
  message: string;
}

export interface AdminListAlbumsResponse {
  success: boolean;
  total: number;
  albums: Album[];
}
