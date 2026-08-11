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