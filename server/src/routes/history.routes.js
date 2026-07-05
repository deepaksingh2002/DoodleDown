import express from 'express';
import { getRecentGames, getGameByRoomId } from '../controllers/history.controller.js';

const router = express.Router();

router.get('/', historyController.getRecentGames);
router.get('/:roomId', historyController.getGameByRoomId);

export default router;
