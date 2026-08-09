import { z } from 'zod';

export const verifyStudentSchema = z.object({
  studentNo: z.string().trim().toUpperCase().min(3).max(32),
});

export const activateSchema = z.object({
  studentNo: z.string().trim().toUpperCase().min(3).max(32),
  activationCode: z.string().trim().length(6, 'Activation code must be 6 characters'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(64),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});