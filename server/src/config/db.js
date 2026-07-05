import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

let connected = false;

/**
 * Connects to MongoDB if MONGODB_URI is configured.
 * Designed to NEVER crash the app: if the URI is missing or the connection
 * fails, the server continues running in in-memory-only mode (word bank falls
 * back to the local JSON file, and game history / player stats simply aren't
 * persisted). This matches the assignment's "DB optional for MVP" guidance
 * while still giving full persistence when a URI is provided.
 */
async function connectDB() {
  if (!env.MONGODB_URI) {
    logger.warn(
      'MONGODB_URI not set - running WITHOUT persistence (in-memory word bank + no history/stats)'
    );
    return;
  }

  mongoose.connection.on('connected', () => {
    connected = true;
    logger.info('MongoDB connected');
  });
  mongoose.connection.on('disconnected', () => {
    connected = false;
    logger.warn('MongoDB disconnected - falling back to in-memory word bank');
  });
  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: env.DB_CONNECT_TIMEOUT_MS,
    });
  } catch (err) {
    logger.error(
      `Initial MongoDB connection failed (${err.message}). Continuing without persistence.`
    );
  }
}

async function disconnectDB() {
  if (connected) {
    await mongoose.connection.close();
  }
}

/** Every service checks this before attempting a query, so a mid-game DB drop never crashes gameplay */
function isDBConnected() {
  return connected && mongoose.connection.readyState === 1;
}

export { connectDB, disconnectDB, isDBConnected };
