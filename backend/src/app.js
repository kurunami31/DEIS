import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { csrfGuard, isSameOrigin } from './middleware/auth.js';
import { ForbiddenError } from './lib/http.js';
import { readCache, writeCache, bustCache } from './lib/cache.js';
import { verifyToken } from './lib/tokens.js';
import { routes } from './routes/index.js';
import { SESSION_COOKIE } from './lib/session.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.set('corsOrigins', config.corsOrigins);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", ...config.corsOrigins],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use((req, res, next) => {
    cors({
      origin(origin, cb) {
        // Requests without an Origin header (curl, servers) are always allowed.
        if (!origin || config.corsOrigins.includes(origin) || isSameOrigin(req, origin)) {
          return cb(null, true);
        }
        // Cross-site origins are rejected with 403, not a bare Error (which the
        // error handler would otherwise surface as an opaque 500).
        return cb(new ForbiddenError(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    })(req, res, next);
  });
  app.use(cookieParser());
  app.use(csrfGuard);

  if (config.isProduction) {
    app.use((req, res, next) => {
      // Cache key is scoped to the authenticated user so one user's cached
      // response can never leak to another. JWT verify is cheap (no DB call).
      let identity = 'anon';
      const token = req.cookies?.[SESSION_COOKIE] ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : null);
      if (token) {
        try {
          identity = verifyToken(token).sub;
        } catch {
          identity = 'anon';
        }
      }
      const key = `${identity}|${req.originalUrl}`;

      if (req.method === 'GET' || req.method === 'HEAD') {
        const hit = readCache(key);
        if (hit) {
          res.set('x-deis-cache', 'HIT');
          return res.status(hit.status).json(hit.body);
        }
        const originalJson = res.json.bind(res);
        res.json = (body) => {
          if (res.statusCode >= 200 && res.statusCode < 400) writeCache(key, res.statusCode, body);
          return originalJson(body);
        };
      } else {
        // Any state change invalidates cached reads.
        res.on('finish', bustCache);
      }
      next();
    });
  }

  if (!config.isTest) {
    app.use((req, res, next) => {
      const start = process.hrtime.bigint();
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
      });
      next();
    });
  }

  // 2 MB so the SPF 2x2 photo (base64, up to 1 MB raw) fits; 256 KB silently
  // rejected every photo over ~190 KB with a confusing BAD_JSON error.
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.get('/api/health', (req, res) => {
    if (config.maintenanceMode) {
      return res.json({ data: { status: 'maintenance', message: config.maintenanceMessage } });
    }
    res.json({ data: { status: 'ok', name: 'deis-api', time: new Date().toISOString() } });
  });

  // Maintenance mode: the health check stays public so the frontend can detect
  // the flag, but every other API route is short-circuited with a 503.
  if (config.maintenanceMode) {
    app.use('/api', (req, res) => {
      res.status(503).json({ error: { code: 'MAINTENANCE', message: config.maintenanceMessage } });
    });
  }

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}