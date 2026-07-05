import dotenv from 'dotenv';
dotenv.config();

/**
 * Centralized environment configuration.
 * Never read process.env directly anywhere else in the app - import this instead.
 */
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // MongoDB - optional. If unset, the app runs fully in-memory (no persistence).
  MONGODB_URI: process.env.MONGODB_URI || '',
  DB_CONNECT_TIMEOUT_MS: parseInt(process.env.DB_CONNECT_TIMEOUT_MS, 10) || 5000,

  // Game timing (all in milliseconds)
  WORD_CHOICE_TIME_MS: parseInt(process.env.WORD_CHOICE_TIME_MS, 10) || 15000,
  ROUND_INTERMISSION_MS: parseInt(process.env.ROUND_INTERMISSION_MS, 10) || 5000,
  GAME_OVER_LINGER_MS: parseInt(process.env.GAME_OVER_LINGER_MS, 10) || 10000,
  EMPTY_ROOM_TTL_MS: parseInt(process.env.EMPTY_ROOM_TTL_MS, 10) || 60000,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
};

export default env;
