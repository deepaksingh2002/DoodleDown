import http from 'http';
import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { initSocket } from './sockets/index.js';
import { connectDB, disconnectDB } from './config/db.js';

const httpServer = http.createServer(app);

// Attach Socket.IO to the SAME http server instance so REST + WebSockets
// share one port - required for single-service deployment on Render/Railway.
initSocket(httpServer);

async function bootstrap() {
  // connectDB() never throws - it logs and continues in in-memory-only mode
  // if MONGODB_URI is unset or unreachable, so this never blocks startup.
  await connectDB();

  httpServer.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
}

bootstrap();

// --- Process-level safety nets ---
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  // Let it crash intentionally in production so the process manager restarts it cleanly
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  httpServer.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  httpServer.close(async () => {
    await disconnectDB();
    logger.info('Process terminated');
  });
});
