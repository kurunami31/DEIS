// Dependency-free TOTP (RFC 6238) implementation using node:crypto. Recovery
// codes are stored as slow bcrypt hashes so a leaked database cannot be
// brute-forced offline (the old format was unsalted sha256).
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += alphabet[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = value.toUpperCase().replace(/\s+/g, '').replace(/=+$/, '');
  let bits = '';
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 secret');
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20)); // 32 chars, SHA-1 compatible
}

export function otpauthUrl(secret, email, issuer = 'DOrSU DEIS') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

function hotp(secret, counter) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Compute the current 6-digit code for a secret (used by callers that need
 *  the literal code, e.g. tests or emergency support flows). */
export function currentTotp(secret, at = Date.now()) {
  return hotp(secret, Math.floor(at / 1000 / STEP_SECONDS));
}

/** Verify a 6-digit code allowing ±1 step clock skew. Timing-safe. */
export function verifyTotp(secret, code, at = Date.now()) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(at / 1000 / STEP_SECONDS);
  for (let offset = -1; offset <= 1; offset += 1) {
    const expected = hotp(secret, counter + offset);
    const a = Buffer.from(expected);
    const b = Buffer.from(code);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    codes.push(
      `${crypto.randomInt(0, 10000).toString().padStart(4, '0')}-${crypto
        .randomInt(0, 10000)
        .toString()
        .padStart(4, '0')}`,
    );
  }
  return codes;
}

const RECOVERY_BCRYPT_ROUNDS = 10;

function legacyRecoveryHash(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function isBcryptHash(value) {
  return typeof value === 'string' && value.startsWith('$2');
}

export function hashRecoveryCode(code) {
  return bcrypt.hashSync(code.trim(), RECOVERY_BCRYPT_ROUNDS);
}

export function verifyRecoveryCode(hashedCodes, code) {
  if (!Array.isArray(hashedCodes) || typeof code !== 'string') return false;
  const probe = code.trim();
  const legacy = legacyRecoveryHash(probe);
  for (const stored of hashedCodes) {
    if (isBcryptHash(stored)) {
      if (bcrypt.compareSync(probe, stored)) return true;
    } else if (stored === legacy) {
      return true; // legacy unsalted sha256 rows
    }
  }
  return false;
}

export function stripRecoveryCode(hashedCodes, code) {
  const probe = code.trim();
  const legacy = legacyRecoveryHash(probe);
  return hashedCodes.filter((stored) => {
    if (isBcryptHash(stored)) return !bcrypt.compareSync(probe, stored);
    return stored !== legacy;
  });
}