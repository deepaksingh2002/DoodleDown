import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import roomManager from '../game/RoomManager.js';
import { isDBConnected } from '../config/db.js';

const getHealth = asyncHandler(async (req, res) => {
  return new ApiResponse(200, {
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    activeRooms: roomManager.rooms.size,
    database: isDBConnected() ? 'connected' : 'disconnected (running in-memory only)',
    timestamp: new Date().toISOString(),
  }).send(res);
});

export { getHealth };
