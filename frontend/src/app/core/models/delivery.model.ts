export interface PhotoDownloadItem {
  id: string;
  filename: string;
  previewUrl: string;
  downloadUrl: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export interface OrderDeliveryInfo {
  orderId: string;
  albumId: string;
  albumTitle: string;
  albumDate?: string;
  customerEmail: string;
  customerName?: string;
  isFullAlbum: boolean;
  totalPhotos: number;
  photos: PhotoDownloadItem[];
  zipDownloadUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
  isExpired: boolean;
  whatsappSupportUrl: string;
}

export interface DeliveryStatusResponse {
  orderId: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FRAUD_ALERT_PRICE_MISMATCH' | 'REJECTED' | 'CANCELLED';
  downloadToken?: string;
  deliveryInfoUrl?: string;
}
