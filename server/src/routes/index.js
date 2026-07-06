import express from 'express';
import { createRoom, getRoomInfo, listPublicRooms, getHealth, getRecentGames, getGameByRoomId, getLeaderboard, getCategories } from '../controllers/index.js';
import validate from '../middlewares/validate.middleware.js';
import { createRoomSchema } from '../validators/room.validator.js';

const router = express.Router();

router.get('/health', getHealth);

router.post('/rooms', validate(createRoomSchema), createRoom);
router.get('/rooms', listPublicRooms);
router.get('/rooms/:roomId', getRoomInfo);

router.get('/words/categories', getCategories);

router.get('/history', getRecentGames);
router.get('/history/:roomId', getGameByRoomId);

router.get('/leaderboard', getLeaderboard);

export default router;
