declare global {
  interface Window {
    __ENV__?: {
      API_URL?: string;
    };
  }
}

export function resolveApiUrl(customUrl?: string, fallback: string = '/api'): string {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim().length > 0) {
    return customUrl.trim().replace(/\/+$/, '');
  }
  return fallback;
}

export const environment = {
  production: true,
  get apiUrl(): string {
    const runtimeUrl = typeof window !== 'undefined' ? window.__ENV__?.API_URL : undefined;
    return resolveApiUrl(runtimeUrl, '/api');
  }
};
