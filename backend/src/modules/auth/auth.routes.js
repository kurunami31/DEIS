import { Router } from 'express';
import { authLimiter, verifyLimiter, activateLimiter } from '../../lib/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { verifyStudentSchema, activateSchema, loginSchema, changePasswordSchema } from './auth.schema.js';
import * as authService from './auth.service.js';

const SESSION_COOKIE = 'deis_session';

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

const router = Router();

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
    const { studentNo, activationCode, password } = req.body;
    const session = await authService.activate(studentNo, activationCode, password, { ip: req.ip });
    setSessionCookie(res, session.token);
    return created(res, session);
  }),
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const session = await authService.login(identifier, password, { ip: req.ip });
    setSessionCookie(res, session.token);
    return ok(res, session);
  }),
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'strict', path: '/' });
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

export default router;