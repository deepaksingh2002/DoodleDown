import express from 'express';
import { createRoom, getRoomInfo, listPublicRooms } from '../controllers/room.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createRoomSchema } from '../validators/room.validator.js';

const router = express.Router();

router.post('/', validate(createRoomSchema), createRoom);
router.get('/', listPublicRooms);
router.get('/:roomId', getRoomInfo);

export default router;
