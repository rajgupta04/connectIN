// Centralized environment-based configuration (Vite)

function normalizeApiBaseUrl(value) {
  if (!value) return value;
  const trimmed = String(value).replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Prefer an explicit socket URL; otherwise derive from API base by stripping trailing /api.
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (API_BASE_URL ? API_BASE_URL.replace(/\/api$/, '') : undefined);

if (!import.meta.env.VITE_API_BASE_URL) {
  // Avoid crashing the app; log a clear message for developers.
  // Configure via client/.env.local (dev) and hosting provider env vars (prod).
  // eslint-disable-next-line no-console
  console.warn('[connectIN] Missing VITE_API_BASE_URL; API calls may fail.');
} else if (import.meta.env.VITE_API_BASE_URL && !String(import.meta.env.VITE_API_BASE_URL).includes('/api')) {
  // eslint-disable-next-line no-console
  console.warn('[connectIN] VITE_API_BASE_URL did not include /api; normalized automatically.');
}
