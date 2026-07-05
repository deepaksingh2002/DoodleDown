import ApiError from '../../utils/ApiError.js';
import roomManager from '../../game/RoomManager.js';
import socketAsyncHandler from '../socketAsyncHandler.js';
import { SOCKET_EVENTS, GAME_PHASE } from '../../config/constants.js';


function registerDrawHandlers(io, socket) {
  const assertIsDrawer = () => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room?.game) throw ApiError.notFound('No active game in this room');
    if (room.game.currentDrawerId !== socket.data.playerId) {
      throw ApiError.forbidden('Only the current drawer can draw');
    }
    if (room.game.phase !== GAME_PHASE.DRAWING) {
      throw ApiError.conflict('Drawing phase has not started yet');
    }
    return room;
  };

  socket.on(
    SOCKET_EVENTS.DRAW_START,
    socketAsyncHandler(socket, async (payload = {}) => {
      const room = assertIsDrawer();
      const stroke = { type: 'start', ...payload, ts: Date.now() };
      room.game.recordStroke(stroke);
      // Broadcast to ALL clients including the drawer, per spec, for consistency
      io.to(room.id).emit(SOCKET_EVENTS.DRAW_DATA, stroke);
    })
  );

  socket.on(
    SOCKET_EVENTS.DRAW_MOVE,
    socketAsyncHandler(socket, async (payload = {}) => {
      const room = assertIsDrawer();
      const stroke = { type: 'move', ...payload, ts: Date.now() };
      room.game.recordStroke(stroke);
      io.to(room.id).emit(SOCKET_EVENTS.DRAW_DATA, stroke);
    })
  );

  socket.on(
    SOCKET_EVENTS.DRAW_END,
    socketAsyncHandler(socket, async () => {
      const room = assertIsDrawer();
      const stroke = { type: 'end', ts: Date.now() };
      room.game.recordStroke(stroke);
      io.to(room.id).emit(SOCKET_EVENTS.DRAW_DATA, stroke);
    })
  );

  socket.on(
    SOCKET_EVENTS.CANVAS_CLEAR,
    socketAsyncHandler(socket, async () => {
      const room = assertIsDrawer();
      room.game.clearStrokes();
      io.to(room.id).emit(SOCKET_EVENTS.CANVAS_CLEAR, {});
    })
  );

  socket.on(
    SOCKET_EVENTS.DRAW_UNDO,
    socketAsyncHandler(socket, async () => {
      const room = assertIsDrawer();
      room.game.undoLastStroke();
      io.to(room.id).emit(SOCKET_EVENTS.DRAW_UNDO, {});
    })
  );
}

export default registerDrawHandlers;
