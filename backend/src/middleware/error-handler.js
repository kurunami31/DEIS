import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/http.js';
import { config } from '../config.js';

const PRISMA_TO_HTTP = {
  P2000: { status: 400, message: 'Value too long for the column' },
  P2002: { status: 409, message: 'A record with this unique value already exists' },
  P2003: { status: 409, message: 'Referenced record does not exist' },
  P2025: { status: 404, message: 'Record not found' },
  P2005: { status: 400, message: 'Invalid value supplied' },
};

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} does not exist` },
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: {
        code: err.name === 'HttpError' ? 'REQUEST_FAILED' : err.name,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_TO_HTTP_STATUS[err.code];
    if (mapped) {
      const field =
        Array.isArray(err.meta?.target) && typeof err.meta.target[0] === 'string'
          ? err.meta.target[0]
          : undefined;
      return res.status(mapped.status).json({
        error: {
          code: 'PRISMA_ERROR',
          message: field ? `${mapped.message}: ${formatField(field)}` : mapped.message,
          ...(field ? { details: [{ field, message: mapped.message }] } : {}),
        },
      });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Invalid request payload' } });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
  }

  if (err?.type === 'request.aborted') {
    return res.status(499).json({ error: { code: 'CLIENT_CLOSED', message: 'Request aborted by client' } });
  }

  console.error('[deis-api] unhandled error', err);
  const message = config.isProduction ? 'Internal server error' : err.message || 'Internal server error';
  res.status(500).json({ error: { code: 'INTERNAL', message } });
}

function formatField(field) {
  return field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}