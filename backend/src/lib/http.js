export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(details) {
    super(400, 'Validation failed', details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message, details) {
    super(409, message, details);
  }
}

export class UnprocessableError extends HttpError {
  constructor(message, details) {
    super(422, message, details);
  }
}

/** Wraps an async route handler so rejects flow to the error middleware. */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Consistent API envelope: on success { data }, on failure { error: { code, message, details } }. */
export function ok(res, data, status = 200) {
  return res.status(status).json({ data });
}

export function created(res, data) {
  return ok(res, data, 201);
}

export function noContent(res) {
  return res.status(204).end();
}