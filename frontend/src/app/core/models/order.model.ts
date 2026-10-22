export interface CustomerInfo {
  readonly email: string;
  readonly name?: string;
  readonly phone?: string;
}

export interface CreatePreferenceRequest {
  readonly albumId: string;
  readonly photoIds: readonly string[];
  readonly isFullAlbum: boolean;
  readonly couponCode?: string;
  readonly customer: CustomerInfo;
  readonly accessToken?: string;
}

export interface CreatePreferenceResponse {
  readonly success: boolean;
  readonly orderId: string;
  readonly preferenceId?: string;
  readonly initPoint?: string;
  readonly sandboxInitPoint?: string;
  readonly totalAmount: number;
  readonly currency?: 'ARS';
  readonly photoCount: number;
  readonly isFullAlbum: boolean;
  readonly discount: number;
  readonly isFreeRedemption?: boolean;
  readonly downloadToken?: string;
  readonly redirectUrl?: string;
}

export type OrderPaymentStatus = 'PENDING' | 'PAID' | 'REJECTED' | 'FRAUD_ALERT_PRICE_MISMATCH';

export interface OrderStatusResponse {
  readonly id: string;
  readonly albumId: string;
  readonly status: OrderPaymentStatus;
  readonly totalAmount: number;
  readonly photoCount: number;
  readonly isFullAlbum: boolean;
  readonly hasDownloadToken: boolean;
  readonly downloadToken?: string;
  readonly createdAt: string;
}

export interface RecoveredOrder {
  readonly orderId: string;
  readonly albumTitle: string;
  readonly photoCount: number;
  readonly isFullAlbum: boolean;
  readonly createdAt: string;
  readonly downloadToken: string;
  readonly redirectUrl: string;
}

export interface RecoverOrdersResponse {
  readonly success: boolean;
  readonly orders?: readonly RecoveredOrder[];
  readonly message?: string;
}

