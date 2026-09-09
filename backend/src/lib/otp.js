import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const BCRYPT_ROUNDS = 10;

export function generateOtp() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return crypto.randomInt(min, max + 1).toString();
}

export async function hashOtp(code) {
  return bcrypt.hash(code, BCRYPT_ROUNDS);
}

export async function verifyOtp(hashedCode, plainCode) {
  return bcrypt.compare(plainCode, hashedCode);
}

export function otpExpiresAt() {
  return new Date(Date.now() + OTP_TTL_MS);
}

export function isOtpExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}
