import ApiError from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import Player from '../../game/Player.js';
import roomManager from '../../game/RoomManager.js';
import socketAsyncHandler from '../socketAsyncHandler.js';
import { SOCKET_EVENTS, ROOM_STATE } from '../../config/constants.js';


function registerRoomHandlers(io, socket) {
  socket.on(
    SOCKET_EVENTS.JOIN_ROOM,
    socketAsyncHandler(socket, async ({ roomId, playerName, hostToken } = {}, callback) => {
      if (!roomId || !playerName) {
        throw ApiError.badRequest('roomId and playerName are required');
      }

      const room = roomManager.getRoom(String(roomId).toUpperCase());
      if (!room) {
        throw ApiError.notFound(`Room "${roomId}" not found`);
      }
      if (room.isFull()) {
        throw ApiError.conflict('Room is full');
      }
      if (room.state !== ROOM_STATE.WAITING) {
        throw ApiError.conflict('Game already in progress');
      }

      const isHost = Boolean(hostToken) && hostToken === room.hostToken;
      const player = new Player({ name: playerName.trim().slice(0, 20), socketId: socket.id, isHost });
      room.addPlayer(player);

      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerId = player.id;

      roomManager.cancelEmptyRoomCleanup(room.id);

      // Confirm to the joining client, including their own player id
      socket.emit(SOCKET_EVENTS.GAME_STATE, { room: room.toJSON(), you: player.toJSON() });

      // Notify everyone else already in the room
      socket.to(room.id).emit(SOCKET_EVENTS.PLAYER_JOINED, {
        player: player.toJSON(),
        players: room.listPlayers().map((p) => p.toJSON()),
      });

      logger.info(`Player ${player.name} (${player.id}) joined room ${room.id}`);

      if (typeof callback === 'function') {
        callback({ success: true, playerId: player.id, room: room.toJSON() });
      }
    })
  );

  socket.on(
    SOCKET_EVENTS.START_GAME,
    socketAsyncHandler(socket, async (_payload, callback) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room) throw ApiError.notFound('Room not found');

      const player = room.getPlayer(socket.data.playerId);
      if (!player?.isHost) throw ApiError.forbidden('Only the host can start the game');
      if (room.playerCount < 2) throw ApiError.badRequest('Need at least 2 players to start');
      if (room.state !== ROOM_STATE.WAITING) throw ApiError.conflict('Game already started');

      await room.startGame();
      logger.info(`Game started in room ${room.id}`);

      if (typeof callback === 'function') callback({ success: true });
    })
  );

  socket.on(
    SOCKET_EVENTS.LEAVE_ROOM,
    socketAsyncHandler(socket, async (_payload, callback) => {
      handlePlayerLeaving(io, socket);
      if (typeof callback === 'function') callback({ success: true });
    })
  );

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    handlePlayerLeaving(io, socket);
  });
}

/**
 * Shared cleanup logic for both explicit leave_room and socket disconnect.
 */
function handlePlayerLeaving(io, socket) {
  const { roomId, playerId } = socket.data;
  if (!roomId || !playerId) return;

  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const player = room.getPlayer(playerId);
  if (!player) return;

  // If the drawer disconnects mid-round, skip to the next turn immediately
  const wasDrawing = room.game && room.game.currentDrawerId === playerId;

  player.isConnected = false;
  room.removePlayer(playerId);
  socket.leave(roomId);

  const newHost = room.reassignHostIfNeeded();

  io.to(roomId).emit(SOCKET_EVENTS.PLAYER_LEFT, {
    playerId,
    players: room.listPlayers().map((p) => p.toJSON()),
    newHostId: newHost?.id || null,
  });

  logger.info(`Player ${player.name} (${playerId}) left room ${roomId}`);

  if (room.isEmpty()) {
    roomManager.scheduleEmptyRoomCleanup(roomId);
  } else if (wasDrawing && room.game) {
    room.game.endRound('drawer_left');
  }
}

export default registerRoomHandlers;
