// Session cookie configuration. The `__Host-` prefix is the strongest cookie
// prefix browsers support: it forces the Secure flag, Path=/ and forbids a
// Domain attribute, making the cookie impossible to hijack via subdomain
// attacks or plain-HTTP transit.
export const SESSION_COOKIE = '__Host-deis_session';

export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // `__Host-` cookies are rejected by browsers unless Secure is set.
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
    priority: 'high',
  };
}

export function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  };
}
