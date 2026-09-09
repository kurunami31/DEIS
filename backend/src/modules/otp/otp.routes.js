import { Router } from 'express';
import { verifyLimiter } from '../../lib/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { sendOtpSchema, verifyOtpSchema } from './otp.schema.js';
import * as otpService from './otp.service.js';

const router = Router();

router.post(
  '/send',
  verifyLimiter,
  validate(sendOtpSchema),
  asyncHandler(async (req, res) => {
    const { identifier, purpose } = req.body;
    const result = await otpService.sendOtp(identifier, purpose, { ip: req.ip });
    return ok(res, result);
  }),
);

router.post(
  '/verify',
  verifyLimiter,
  validate(verifyOtpSchema),
  asyncHandler(async (req, res) => {
    const { identifier, code, purpose } = req.body;
    const result = await otpService.verifyOtpCode(identifier, code, purpose, { ip: req.ip });
    return ok(res, result);
  }),
);

export default router;
