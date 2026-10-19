declare global {
  interface Window {
    __ENV__?: {
      API_URL?: string;
    };
  }
}

export function resolveApiUrl(customUrl?: string, fallback: string = 'http://localhost:4000/api'): string {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim().length > 0) {
    return customUrl.trim().replace(/\/+$/, '');
  }
  return fallback;
}

export const environment = {
  production: false,
  get apiUrl(): string {
    const runtimeUrl = typeof window !== 'undefined' ? window.__ENV__?.API_URL : undefined;
    return resolveApiUrl(runtimeUrl, 'http://localhost:4000/api');
  }
};
