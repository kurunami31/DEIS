import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { csrfGuard } from './middleware/auth.js';
import { routes } from './routes/index.js';

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
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(csrfGuard);

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

  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false }));

  app.get('/api/health', (req, res) => {
    res.json({ data: { status: 'ok', name: 'deis-api', time: new Date().toISOString() } });
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}