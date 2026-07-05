import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import env from '../config/env.js';
import { SOCKET_EVENTS } from '../config/constants.js';

import registerRoomHandlers from './handlers/room.handler.js';
import registerGameHandlers from './handlers/game.handler.js';
import registerDrawHandlers from './handlers/draw.handler.js';
import registerChatHandlers from './handlers/chat.handler.js';

let io = null;


function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.data = { roomId: null, playerId: null };

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerDrawHandlers(io, socket);
    registerChatHandlers(io, socket);
  });

  return io;
}

/** Accessor used by REST controllers that need to emit via the same io instance */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet. Call initSocket(server) first.');
  }
  return io;
}

export { initSocket, getIO };
