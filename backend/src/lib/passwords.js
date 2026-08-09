import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// DOrSU student number format: D-YYYY-NNNN
export function normalizeStudentNo(value) {
  return value.trim().toUpperCase();
}