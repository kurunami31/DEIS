import { z } from 'zod';
import { ValidationError } from '../lib/http.js';

/**
 * Validates a request payload against a Zod schema.
 * Coerces common input shapes (JSON body, query strings, params) before validating.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const input = source === 'params' ? req.params : source === 'query' ? req.query : req.body;
    const result = schema.safeParse(input);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
      }));
      return next(new ValidationError(details));
    }
    // Express 5 exposes req.query/req.params as getter-only properties, so
    // validated values are stored on a dedicated property instead of replaced.
    if (source === 'query' || source === 'params') {
      req.validated = { ...(req.validated ?? {}), [source]: result.data };
    } else {
      req.body = result.data;
    }
    next();
  };
}

export const idParamSchema = z.object({ id: z.string().uuid('Invalid resource id') });