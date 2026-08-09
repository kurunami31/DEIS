import { Router } from 'express';
import { authLimiter } from '../../lib/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { verifyStudentSchema, activateSchema, loginSchema, changePasswordSchema } from './auth.schema.js';
import * as authService from './auth.service.js';

const router = Router();

router.post(
  '/verify-student',
  authLimiter,
  validate(verifyStudentSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.verifyStudent(req.body.studentNo);
    return ok(res, result);
  }),
);

router.post(
  '/activate',
  authLimiter,
  validate(activateSchema),
  asyncHandler(async (req, res) => {
    const { studentNo, activationCode, password } = req.body;
    const session = await authService.activate(studentNo, activationCode, password);
    return created(res, session);
  }),
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const session = await authService.login(identifier, password);
    return ok(res, session);
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
    return ok(res, result);
  }),
);

export default router;