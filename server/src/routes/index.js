import express from 'express';
import roomRoutes from './room.routes.js';
import healthRoutes from './health.routes.js';
import wordsRoutes from './words.routes.js';
import historyRoutes from './history.routes.js';
import leaderboardRoutes from './leaderboard.routes.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/rooms', roomRoutes);
router.use('/words', wordsRoutes);
router.use('/history', historyRoutes);
router.use('/leaderboard', leaderboardRoutes);

export default router;
