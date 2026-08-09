import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../lib/http.js';
import { config } from '../config.js';

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(new UnauthorizedError('No access token provided'));

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { issuer: 'deis-api' });
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Session expired, please login again' : 'Invalid access token';
    return next(new UnauthorizedError(message));
  }

  if (typeof payload.sub !== 'string') return next(new UnauthorizedError('Malformed token'));

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { student: true },
  });

  if (!user || !user.isActive) return next(new UnauthorizedError('Account no longer active'));
  if (user.mustChangePassword) {
    return next(new ForbiddenError('You must set a new password before continuing', { code: 'MUST_CHANGE_PASSWORD' }));
  }

  req.user = user;
  req.tokenPayload = payload;
  next();
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ForbiddenError('Your account role does not grant access to this resource'));
  }
  next();
};

export function requireStudent(req, res, next) {
  if (!req.user.student) return next(new ForbiddenError('Student profile is required'));
  next();
}