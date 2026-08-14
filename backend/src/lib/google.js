import { config } from '../config.js';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

export class GoogleOAuthError extends Error {
  constructor(message, code = 'GOOGLE_OAUTH_ERROR') {
    super(message);
    this.code = code;
  }
}

/** Authorization redirect target for the browser (Step 1 of the OAuth flow). */
export function buildAuthorizationUrl({ state, redirectUri }) {
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/** Exchanges the one-time authorization code for an ID token (Step 2). */
export async function exchangeCodeForIdToken({ code, redirectUri, fetchImpl = fetch }) {
  const body = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) {
    throw new GoogleOAuthError('Google rejected the authorization code.', 'GOOGLE_TOKEN_EXCHANGE_FAILED');
  }
  return data.id_token;
}

/**
 * Validates the ID token with Google's tokeninfo endpoint and returns the
 * verified profile. The tokeninfo response is served over Google's signed
 * connection; the `aud` (client id) and `email_verified` claims are what
 * make the token trustworthy for this client.
 */
export async function verifyGoogleIdToken(idToken, fetchImpl = fetch) {
  const res = await fetchImpl(`${TOKENINFO_URL}?${new URLSearchParams({ id_token: idToken }).toString()}`);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.aud !== config.googleClientId) {
    throw new GoogleOAuthError('Google ID token validation failed.', 'GOOGLE_TOKEN_INVALID');
  }
  // tokeninfo returns email_verified as the string "true"/"false", not a boolean.
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!payload.email || !emailVerified) {
    throw new GoogleOAuthError('Google account email is not verified.', 'GOOGLE_EMAIL_UNVERIFIED');
  }
  return payload;
}
