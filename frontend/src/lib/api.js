const API_URL = import.meta.env.VITE_API_URL || '/api';

// Short-lived response cache for GET requests so navigating back and forth
// between pages feels instant. Cleared whenever any write succeeds.
const getCache = new Map();
const GET_CACHE_TTL_MS = 30_000;

export function extractError(err) {
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

export async function request({ method = 'get', url = '', data, params }) {
  let path = url;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) path += `${path.includes('?') ? '&' : '?'}${qs}`;
  }

  const verb = method.toUpperCase();
  const cacheKey = `${verb} ${path}`;

  if (verb === 'GET') {
    const hit = getCache.get(cacheKey);
    if (hit && Date.now() - hit.at < GET_CACHE_TTL_MS) return hit.value;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: verb,
    credentials: 'include',
    headers: data ? { 'Content-Type': 'application/json' } : {},
    ...(data ? { body: JSON.stringify(data) } : {}),
  });

  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    // Only redirect when we're not already on a public/auth page — otherwise
    // the redirect reloads the current URL and loops forever.
    const pathname = window.location.pathname;
    if (!['/login', '/verify', '/activate'].some((p) => pathname.startsWith(p))) {
      window.location.href = '/login';
    }
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!res.ok) {
    const msg = body?.error?.message || (body?.error?.details?.length ? body.error.details[0].message : `Request failed (${res.status})`);
    const error = new Error(msg);
    error.status = res.status;
    error.details = body?.error?.details;
    error.body = body;
    throw error;
  }

  const result = body?.data ?? body;
  if (verb === 'GET') {
    getCache.set(cacheKey, { at: Date.now(), value: result });
  } else {
    // Any state change invalidates cached reads.
    getCache.clear();
  }
  return result;
}
