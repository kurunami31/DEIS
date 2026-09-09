import { z } from 'zod';

export const sendOtpSchema = z.object({
  identifier: z.string().min(1, 'Email or student number is required'),
  purpose: z.enum(['ACTIVATION', 'PASSWORD_RESET', 'EMAIL_CONFIRM']),
});

export const verifyOtpSchema = z.object({
  identifier: z.string().min(1, 'Email or student number is required'),
  code: z.string().length(6, 'OTP must be 6 digits'),
  purpose: z.enum(['ACTIVATION', 'PASSWORD_RESET', 'EMAIL_CONFIRM']),
});
