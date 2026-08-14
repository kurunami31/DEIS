import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const LIMIT = config.isTest ? 10000 : 8;
const IP_LIMIT = config.isTest ? 10000 : 30;

function clientIp(req) {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

// Campus deployments share a handful of public IPs (NAT/CGNAT), so rate
// limiting purely by IP lets one account's brute-force lock the entire
// school out. Login is therefore throttled per (IP, identifier) — a typo
// spree only blocks that account, while a per-IP backstop still catches
// mass probing from a single source.
function loginKey(req) {
  let identifier = '';
  try {
    identifier = String(req.body?.identifier ?? '').trim().toLowerCase().slice(0, 128);
  } catch {
    identifier = '';
  }
  return `${clientIp(req)}:${identifier || 'anon'}`;
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMIT,
  keyGenerator: loginKey,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts for this account. Please try again in a few minutes.' },
    }),
});

export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: IP_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts from this network. Please try again in a few minutes.' },
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

export const consentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again in a few minutes.' },
    }),
});

export const totpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many verification attempts. Please try again in a few minutes.' },
    }),
});