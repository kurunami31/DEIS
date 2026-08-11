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

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { issuer: ISSUER, audience: AUDIENCE });
}