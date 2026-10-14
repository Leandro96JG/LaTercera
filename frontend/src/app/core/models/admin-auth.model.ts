export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'photographer';
  photographerId: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  user?: AdminUser;
  error?: string;
}
