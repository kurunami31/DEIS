import { z } from 'zod';

export const submitSchema = z.object({
  sections: z.array(z.string().uuid(), 'Sections must be an array of section ids').min(1, 'Select at least one section').max(12),
  studentNote: z.string().max(500).optional(),
});

export const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().max(500).optional(),
});

// Payment stub: the reference and amount are what the cashier verifies, so
// both are required — a student cannot mark a request paid with nothing.
export const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  reference: z.string().trim().min(3, 'Payment reference is required').max(64),
});

export const policySchema = z.object({
  key: z.string().trim().min(1).max(64),
  value: z.string().trim().min(1).max(128),
});