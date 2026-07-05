import express from 'express';
import { createRoom, getRoomInfo, listPublicRooms } from '../controllers/room.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createRoomSchema } from '../validators/room.validator.js';

const router = express.Router();

router.post('/', validate(createRoomSchema), roomController.createRoom);
router.get('/', roomController.listPublicRooms);
router.get('/:roomId', roomController.getRoomInfo);

export default router;
