import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import env from './config/env.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';
import notFoundMiddleware from './middlewares/notFound.middleware.js';
import errorMiddleware from './middlewares/error.middleware.js';

function createMorganStream() {
  return {
    write(message) {
      const trimmedMessage = message.trim();
      logger.http?.(trimmedMessage) || logger.info(trimmedMessage);
    },
  };
}

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: true, limit: '16kb' }));

  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: createMorganStream() }));

  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message: 'Too many requests, please try again later' },
  });
  app.use('/api', limiter);

  app.get('/', (req, res) => {
    res.json({ success: true, message: 'skribbl-clone backend is running', docs: '/api/v1/health' });
  });
  app.use('/api/v1', routes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

export default createApp();
export { createApp };
