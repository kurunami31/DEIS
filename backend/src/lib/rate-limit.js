import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const LIMIT = config.isTest ? 10000 : 8;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again in a few minutes.' },
    }),
});

// Verification and activation endpoints expose the 6-digit activation code
// flow; they get their own independent budget so probing one route cannot
// starve another.
export const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many verification attempts. Please try again in a few minutes.' },
    }),
});

export const activateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many activation attempts. Please try again in a few minutes.' },
    }),
});