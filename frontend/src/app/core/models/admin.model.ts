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
  album: Album;
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
  isFreeDownload?: boolean;
  isPrivate?: boolean;
  accessCode?: string | null;
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

export interface TrashAlbum extends Album {
  daysRemaining: number;
}

export interface AdminTrashListResponse {
  success: boolean;
  total: number;
  trashAlbums: TrashAlbum[];
}

export interface TrashActionResponse {
  success: boolean;
  albumId: string;
  message: string;
}

export interface VerifyAlbumAccessResponse {
  success: boolean;
  valid: boolean;
  albumId: string;
  accessToken?: string;
  message?: string;
}

export interface AdminOrderCustomer {
  email: string;
  name?: string;
  phone?: string;
}

export type AdminOrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FRAUD_ALERT_PRICE_MISMATCH'
  | 'REJECTED'
  | 'CANCELLED';

export interface AdminOrder {
  id: string;
  albumId: string;
  albumTitle?: string;
  photoIds: string[];
  isFullAlbum: boolean;
  photoCount: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  discountPercentage: number;
  totalAmount: number;
  currency: string;
  customer: AdminOrderCustomer;
  couponApplied?: string;
  status: AdminOrderStatus;
  preferenceId?: string;
  paymentId?: string;
  downloadToken?: string;
  downloadUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrdersResponse {
  success: boolean;
  total: number;
  orders: AdminOrder[];
}

export interface RegenerateTokenResponse {
  success: boolean;
  orderId: string;
  downloadToken: string;
  downloadUrl: string;
  expiresInHours: number;
  message?: string;
  order?: AdminOrder;
}

export interface AdminAlbumPhoto {
  id: string;
  albumId: string;
  filename: string;
  originalPath: string;
  previewUrl: string;
  isSampleHd: boolean;
  width?: number;
  height?: number;
  sizeBytes?: number;
  createdAt?: string;
}

export interface AdminAlbumPhotosResponse {
  success: boolean;
  albumId: string;
  total: number;
  photos: AdminAlbumPhoto[];
}

export interface UpdateAlbumPhotoRequest {
  isSampleHD?: boolean;
  isSampleHd?: boolean;
  setAsCover?: boolean;
}

export interface UpdateAlbumPhotoResponse {
  success: boolean;
  photo: AdminAlbumPhoto;
  coverUrl?: string;
  message?: string;
}

export interface DeleteAlbumPhotoResponse {
  success: boolean;
  photoId: string;
  message: string;
}

export interface PricingTierConfig {
  enableTierDiscounts: boolean;
  tier3DiscountPercent: number;
  tier5DiscountPercent: number;
  capAtFullAlbumPrice: boolean;
}

export interface CouponDTO {
  code: string;
  discountPercent: number;
  isActive: boolean;
  albumId?: string | null;
  maxUses?: number | null;
  usedCount: number;
  maxPhotos?: number | null;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface AdminPromotionsResponse {
  success: boolean;
  config: PricingTierConfig;
  coupons: CouponDTO[];
}

export interface ValidateCouponResponse {
  valid: boolean;
  code?: string;
  discountPercentage?: number;
  message: string;
}

export interface CreateCouponRequest {
  code: string;
  discountPercent: number;
  isActive?: boolean;
  albumId?: string | null;
  maxUses?: number | null;
  maxPhotos?: number | null;
  expiresAt?: string | null;
}

export interface UpdateCouponRequest {
  discountPercent?: number;
  isActive?: boolean;
  maxUses?: number | null;
  maxPhotos?: number | null;
  expiresAt?: string | null;
}


