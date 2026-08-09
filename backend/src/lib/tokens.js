import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const ISSUER = 'deis-api';

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    issuer: ISSUER,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { issuer: ISSUER });
}