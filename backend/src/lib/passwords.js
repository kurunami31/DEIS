import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const BCRYPT_ROUNDS = 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// DOrSU student number format: YYYY-NNNN
export function normalizeStudentNo(value) {
  return value.trim().toUpperCase();
}

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*+-?';

function secureRandomChar(charset) {
  const buf = crypto.randomBytes(4);
  return charset[buf.readUInt32LE(0) % charset.length];
}

/**
 * Cryptographically random password guaranteed to satisfy the portal policy:
 * >= 12 chars with upper, lower, digit, and special characters.
 */
export function generateRandomPassword(length = 16) {
  const size = Math.max(12, length);
  const pool = [
    ...Array.from({ length: 2 }, () => secureRandomChar(UPPER)),
    ...Array.from({ length: 2 }, () => secureRandomChar(LOWER)),
    ...Array.from({ length: 2 }, () => secureRandomChar(DIGITS)),
    ...Array.from({ length: 2 }, () => secureRandomChar(SPECIAL)),
    ...Array.from({ length: size - 8 }, () => secureRandomChar(UPPER + LOWER + DIGITS + SPECIAL)),
  ];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(crypto.randomBytes(2).readUInt16LE(0) / 65536 * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.join('');
}

/**
 * Deterministic per-account demo password for seeded accounts (staff).
 * Unique per email, reproducible across `db:reset`, and policy-compliant.
 */
export function demoPassword(identifier) {
  const digest = crypto.createHash('sha256').update(identifier.toLowerCase()).digest('hex');
  return `DOr-${digest.slice(0, 8)}3-${digest.slice(8, 12)}!`;
}