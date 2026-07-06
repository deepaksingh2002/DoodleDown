import http from 'node:http';
import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { initSocket } from './sockets/index.js';
import { connectDB, disconnectDB } from './config/db.js';

const httpServer = http.createServer(app);
initSocket(httpServer);

async function closeDatabaseConnection() {
  await disconnectDB();
}

async function shutdown(signal, error) {
  if (error) {
    logger.error(`${signal}: ${error.message || error}`);
  } else {
    logger.info(`${signal} received. Shutting down gracefully...`);
  }

  httpServer.close(async () => {
    try {
      await closeDatabaseConnection();
      logger.info('Process terminated');
      process.exit(error ? 1 : 0);
    } catch (shutdownError) {
      logger.error(`Shutdown failed: ${shutdownError.message}`);
      process.exit(1);
    }
  });
}

async function bootstrap() {
  await connectDB();

  httpServer.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
}

bootstrap();
process.on('unhandledRejection', (reason) => shutdown('Unhandled Rejection', reason));
process.on('uncaughtException', (err) => shutdown('Uncaught Exception', err));
process.on('SIGTERM', () => shutdown('SIGTERM'));
