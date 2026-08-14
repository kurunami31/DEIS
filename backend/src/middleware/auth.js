import { prisma } from '../lib/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../lib/http.js';
import { verifyToken } from '../lib/tokens.js';
import { SESSION_COOKIE } from '../lib/session.js';
import { dpaConsentRequired } from '../lib/dpa.js';

// State-changing gates (mustChangePassword / DPA consent) must never lock the
// user out of the routes that resolve them: those routes sit on an allowlist.
const GATE_BYPASS_PATHS = new Set([
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/consent',
  '/api/auth/set-initial-password',
  '/api/auth/change-password',
]);

function requestPath(req) {
  return `${req.baseUrl}${req.path}`;
}

function extractToken(req) {
  const fromCookie = req.cookies?.[SESSION_COOKIE];
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(new UnauthorizedError('No access token provided'));

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Session expired, please login again' : 'Invalid access token';
    return next(new UnauthorizedError(message));
  }

  if (typeof payload.sub !== 'string') return next(new UnauthorizedError('Malformed token'));

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { student: true },
  });

  if (!user || !user.isActive) return next(new UnauthorizedError('Account no longer active'));
  if (user.tokenVersion !== (payload.ver ?? 0)) {
    return next(new UnauthorizedError('Session revoked. Please login again'));
  }

  const bypass = GATE_BYPASS_PATHS.has(requestPath(req));
  if (user.mustChangePassword && !bypass) {
    return next(new ForbiddenError('You must set a new password before continuing', 'MUST_CHANGE_PASSWORD'));
  }
  if (dpaConsentRequired(user) && !bypass) {
    return next(new ForbiddenError('Data privacy consent is required before continuing', 'DPA_CONSENT_REQUIRED'));
  }

  req.user = user;
  req.tokenPayload = payload;
  next();
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ForbiddenError('Your account role does not grant access to this resource'));
  }
  next();
};

export function requireStudent(req, res, next) {
  if (!req.user.student) return next(new ForbiddenError('Student profile is required'));
  next();
}

/**
 * True when the request's Origin header belongs to the same host that served the
 * page. The SPA and API are deployed behind one host (e.g. deis-two.vercel.app),
 * so same-origin browser requests must always be accepted even when CORS_ORIGIN
 * is not configured for the production domain. Returns false for cross-site and
 * malformed origins.
 */
export function isSameOrigin(req, origin) {
  if (!origin || typeof origin !== 'string') return false;
  const host = req.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host.toLowerCase();
  } catch {
    return false;
  }
}

// CSRF guard for cookie-authenticated state changes. The browser's SameSite=Strict
// cookie already blocks cross-site sends; this is defense in depth for the case
// where a strict cookie is bypassed (older clients / non-compliant browsers).
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  const allowed = req.app.get('corsOrigins') ?? [];
  if (allowed.includes(origin) || isSameOrigin(req, origin)) return next();
  return next(new ForbiddenError('Cross-site request blocked'));
}