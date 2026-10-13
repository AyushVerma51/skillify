export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

export const BACKEND_STATUS_EVENT = 'skillify:backend-status';

export type BackendConnectionStatus = 'checking' | 'ready' | 'unavailable';

const READY_CACHE_MS = 10 * 60 * 1000;
const HEALTH_TIMEOUT_MS = 12 * 1000;
const WAKE_RETRY_DELAYS_MS = [0, 3_000, 5_000, 8_000, 12_000, 15_000];
const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);

let backendReadyUntil = 0;
let wakeRequest: Promise<void> | null = null;

function emitBackendStatus(status: BackendConnectionStatus) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<BackendConnectionStatus>(BACKEND_STATUS_EVENT, {
      detail: status,
    }),
  );
}

function isLocalBackend() {
  try {
    const hostname = new URL(API_BASE_URL).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function checkBackendHealth() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Backend health check returned ${response.status}.`);
      Object.assign(error, { status: response.status });
      throw error;
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

async function wakeBackend() {
  emitBackendStatus('checking');

  for (let attempt = 0; attempt < WAKE_RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = WAKE_RETRY_DELAYS_MS[attempt];
    if (delay) await wait(delay);

    try {
      await checkBackendHealth();
      backendReadyUntil = Date.now() + READY_CACHE_MS;
      emitBackendStatus('ready');
      return;
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      const isLastAttempt = attempt === WAKE_RETRY_DELAYS_MS.length - 1;
      if (status && !TRANSIENT_STATUS_CODES.has(status)) break;
      if (isLastAttempt) break;
    }
  }

  emitBackendStatus('unavailable');
  throw new Error(
    'The service is taking longer than expected to start. Please try again.',
  );
}

async function ensureBackendReady(force = false) {
  if (isLocalBackend()) return;
  if (!force && Date.now() < backendReadyUntil) return;

  if (!wakeRequest) {
    wakeRequest = wakeBackend().finally(() => {
      wakeRequest = null;
    });
  }

  await wakeRequest;
}

export async function retryBackendConnection() {
  backendReadyUntil = 0;
  await ensureBackendReady(true);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers);

  if (!path.startsWith('/api/health')) {
    await ensureBackendReady();
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }
  return data as T;
}
