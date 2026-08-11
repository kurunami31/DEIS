const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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

  const res = await fetch(`${API_URL}${path}`, {
    method: method.toUpperCase(),
    credentials: 'include',
    headers: data ? { 'Content-Type': 'application/json' } : {},
    ...(data ? { body: JSON.stringify(data) } : {}),
  });

  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    window.location.href = '/login';
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

  return body?.data ?? body;
}