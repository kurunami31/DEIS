import { Router } from 'express';
import crypto from 'node:crypto';
import { authLimiter, loginIpLimiter, verifyLimiter, activateLimiter, consentLimiter, totpLimiter } from '../../lib/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler, ok, created, HttpError } from '../../lib/http.js';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config.js';
import { buildAuthorizationUrl, exchangeCodeForIdToken, verifyGoogleIdToken } from '../../lib/google.js';
import {
  verifyStudentSchema,
  activateSchema,
  loginSchema,
  changePasswordSchema,
  setInitialPasswordSchema,
  dpaConsentSchema,
  totpLoginSchema,
  totpCodeSchema,
  securityQuestionsSchema,
  beginResetSchema,
  finishResetSchema,
} from './auth.schema.js';
import * as authService from './auth.service.js';
import { SESSION_COOKIE, sessionCookieOptions, clearSessionCookieOptions } from '../../lib/session.js';

const router = Router();

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

router.post(
  '/verify-student',
  verifyLimiter,
  validate(verifyStudentSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.verifyStudent(req.body.studentNo);
    // Never hand out the activation code to anyone who merely knows a student
    // number outside the demo. In production the code is delivered privately
    // (registrar / email / SMS); here it would enable account takeover.
    if (!config.exposeActivationCodes) delete result.activationCode;
    return ok(res, result);
  }),
);

router.post(
  '/activate',
  activateLimiter,
  validate(activateSchema),
  asyncHandler(async (req, res) => {
    const { studentNo, activationCode, password, dpaVersion } = req.body;
    const session = await authService.activate(studentNo, activationCode, password, {
      ip: req.ip,
      dpaVersion,
    });
    setSessionCookie(res, session.token);
    return created(res, session);
  }),
);

router.post(
  '/login',
  loginIpLimiter,
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const session = await authService.login(identifier, password, { ip: req.ip });
    if (session.totpRequired) {
      return ok(res, session, 202);
    }
    setSessionCookie(res, session.token);
    return ok(res, session);
  }),
);

router.post(
  '/login/totp',
  totpLimiter,
  validate(totpLoginSchema),
  asyncHandler(async (req, res) => {
    const { challengeToken, code } = req.body;
    const session = await authService.verifyTotpLogin(challengeToken, code, { ip: req.ip });
    setSessionCookie(res, session.token);
    return ok(res, session);
  }),
);

router.post(
  '/totp/enroll',
  authenticate,
  asyncHandler(async (req, res) => {
    return ok(res, await authService.enrollTotp(req.user.id));
  }),
);

router.post(
  '/totp/confirm',
  authenticate,
  validate(totpCodeSchema),
  asyncHandler(async (req, res) => {
    return ok(res, await authService.confirmTotp(req.user.id, req.body.code));
  }),
);

router.post(
  '/totp/disable',
  authenticate,
  validate(totpCodeSchema),
  asyncHandler(async (req, res) => {
    return ok(res, await authService.disableTotp(req.user.id, req.body.code));
  }),
);

router.put(
  '/security-questions',
  authenticate,
  validate(securityQuestionsSchema),
  asyncHandler(async (req, res) => {
    return ok(res, await authService.setSecurityQuestions(req.user.id, req.body.answers));
  }),
);

router.get(
  '/security-questions',
  authenticate,
  asyncHandler(async (req, res) => {
    const stored = JSON.parse(req.user.passwordQuestions ?? '[]').map((q) => ({
      questionId: q.questionId,
      questionLabel: q.questionLabel,
    }));
    return ok(res, { questions: stored });
  }),
);

router.post(
  '/forgot-password',
  verifyLimiter,
  validate(beginResetSchema),
  asyncHandler(async (req, res) => {
    return ok(res, await authService.beginPasswordReset(req.body.identifier));
  }),
);

router.post(
  '/reset-password',
  verifyLimiter,
  validate(finishResetSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.finishPasswordReset(
      req.body.resetToken,
      req.body.answers,
      req.body.newPassword,
    );
    if (result.token) setSessionCookie(res, result.token);
    return ok(res, { ok: true });
  }),
);

router.post(
  '/consent',
  consentLimiter,
  authenticate,
  validate(dpaConsentSchema),
asyncHandler(async (req, res) => {
    const consent = await authService.recordConsent(req.user.id, req.body.version);
    return ok(res, consent);
  }),
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    // Bump tokenVersion so the session token is dead even if it was stolen
    // (clearing the cookie alone leaves a bearer token valid until expiry).
    // Side effect: single-session semantics — logging out on one device signs
    // out everywhere, which suits a shared campus portal.
    await prisma.user.update({
      where: { id: req.user.id },
      data: { tokenVersion: { increment: 1 } },
    });
    await audit({ actorId: req.user.id, action: 'USER_LOGOUT', entityType: 'user', entityId: req.user.id });
    res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions());
    return ok(res, { ok: true });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    return ok(res, authService.serializeUser(req.user));
  }),
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    if (result.token) setSessionCookie(res, result.token);
    return ok(res, { ok: true });
  }),
);

router.post(
  '/set-initial-password',
  authenticate,
  validate(setInitialPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.setInitialPassword(req.user.id, req.body.newPassword);
    setSessionCookie(res, result.token);
    return ok(res, { ok: true });
  }),
);

// --- Google OAuth (Sign in with Google) ---

const OAUTH_STATE_COOKIE = '__Host-deis_oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: OAUTH_STATE_TTL_MS,
  };
}

function frontendOrigin() {
  return config.corsOrigins[0] ?? 'http://localhost:5173';
}

function oauthRedirectUri(req) {
  if (config.googleRedirectUri) return config.googleRedirectUri;
  const proto = ['https', 'http'].includes(req.get('x-forwarded-proto')) ? req.get('x-forwarded-proto') : req.protocol;
  return `${proto}://${req.get('host')}/api/auth/google/callback`;
}

function googleConfigured() {
  return Boolean(config.googleClientId && config.googleClientSecret);
}

function oauthFail(res, reason) {
  return res.redirect(302, `${frontendOrigin()}/login?oauth=error&reason=${encodeURIComponent(reason)}`);
}

router.get(
  '/google',
  loginIpLimiter,
  asyncHandler(async (req, res) => {
    if (!googleConfigured()) throw new HttpError(503, 'GOOGLE_OAUTH_NOT_CONFIGURED', 'Google sign-in is not configured on this server.');
    const state = crypto.randomBytes(24).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
    const url = buildAuthorizationUrl({ state, redirectUri: oauthRedirectUri(req) });
    return res.redirect(302, url);
  }),
);

router.get(
  '/google/callback',
  loginIpLimiter,
  asyncHandler(async (req, res) => {
    const stateCookie = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
    const fail = (reason, meta = {}) => {
      audit({ action: 'GOOGLE_OAUTH_FAILED', entityType: 'user', entityId: null, meta: { reason, ip: req.ip, ...meta } });
      return oauthFail(res, reason);
    };
    if (!googleConfigured()) return fail('not_configured');
    if (!stateCookie || stateCookie !== req.query.state) return fail('invalid_state');
    const { code } = req.query;
    if (typeof code !== 'string' || !code) return fail('missing_code');
    let idToken;
    try {
      idToken = await exchangeCodeForIdToken({ code, redirectUri: oauthRedirectUri(req) });
    } catch (err) {
      return fail('token_exchange', { error: err.message });
    }
    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (err) {
      return fail('token_invalid', { error: err.message });
    }
    const user = await prisma.user.findFirst({
      where: { email: payload.email.toLowerCase() },
      include: { student: true },
    });
    if (!user) return fail('not_registered', { email: payload.email });
    const session = await authService.oauthSession(user, { ip: req.ip });
    setSessionCookie(res, session.token);
    return res.redirect(302, `${frontendOrigin()}/oauth/callback`);
  }),
);

export default router;
