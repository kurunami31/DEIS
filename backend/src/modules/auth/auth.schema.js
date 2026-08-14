import { z } from 'zod';

// DOrSU student number format: YYYY-NNNN (year enrolled - 4-digit suffix)
const studentNoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{4}-\d{4}$/, 'Student number must be in the format YYYY-NNNN (e.g. 2025-1234)');

export const verifyStudentSchema = z.object({
  studentNo: studentNoSchema,
});

export const activateSchema = z.object({
  studentNo: studentNoSchema,
  activationCode: z.string().trim().length(6, 'Activation code must be 6 characters'),
  dpaVersion: z.number().int().min(1, 'Data privacy consent is required'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(64),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const setInitialPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const dpaConsentSchema = z.object({
  version: z.number().int().min(1),
});

export const totpLoginSchema = z.object({
  challengeToken: z.string().min(1, 'Login session is missing'),
  code: z.string().trim().min(1, 'Verification code is required'),
});

export const totpCodeSchema = z.object({
  code: z.string().trim().min(1, 'Verification code is required'),
});

export const securityQuestionsSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.string().min(2).max(200),
      }),
    )
    .min(1)
    .max(5),
});

export const beginResetSchema = z.object({
  identifier: z.string().trim().min(3).max(64),
});

export const finishResetSchema = z.object({
  resetToken: z.string().min(1),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.string().min(1).max(200),
      }),
    )
    .min(1),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});