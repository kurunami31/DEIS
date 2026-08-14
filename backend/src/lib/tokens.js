import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const ISSUER = 'deis-api';
const AUDIENCE = 'deis-portal';

export function signToken(user) {
  return jwt.sign(
    { role: user.role, ver: user.tokenVersion ?? 0 },
    config.jwtSecret,
    {
      subject: user.id,
      expiresIn: config.jwtExpiresIn,
      issuer: ISSUER,
      audience: AUDIENCE,
    },
  );
}

/** Short-lived token proving the password step succeeded, used for TOTP step 2. */
export function signChallengeToken(userId) {
  return jwt.sign({ purpose: 'totp' }, config.jwtSecret, {
    subject: userId,
    expiresIn: '5m',
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyChallengeToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, { issuer: ISSUER, audience: AUDIENCE });
  if (payload.purpose !== 'totp') throw new Error('Unexpected token purpose');
  return payload;
}

/** Short-lived token for the password-reset flow (security questions).
 * Carries a nonce so the backend can make it single-use. */
export function signResetToken(userId, nonce) {
  return jwt.sign({ purpose: 'reset', nce: nonce }, config.jwtSecret, {
    subject: userId,
    expiresIn: '10m',
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyResetToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, { issuer: ISSUER, audience: AUDIENCE });
  if (payload.purpose !== 'reset') throw new Error('Unexpected token purpose');
  return payload;
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { issuer: ISSUER, audience: AUDIENCE });
}