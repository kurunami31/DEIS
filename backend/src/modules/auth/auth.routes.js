import { Router } from 'express';
import { authLimiter, loginIpLimiter, verifyLimiter, activateLimiter, consentLimiter, totpLimiter } from '../../lib/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
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

export default router;
