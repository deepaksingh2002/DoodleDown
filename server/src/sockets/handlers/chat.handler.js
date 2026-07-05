import ApiError from '../../utils/ApiError.js';
import roomManager from '../../game/RoomManager.js';
import socketAsyncHandler from '../socketAsyncHandler.js';
import { SOCKET_EVENTS } from '../../config/constants.js';


function registerChatHandlers(io, socket) {
  socket.on(
    SOCKET_EVENTS.GUESS,
    socketAsyncHandler(socket, async ({ text } = {}, callback) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room?.game) throw ApiError.notFound('No active game in this room');
      if (!text || !text.trim()) throw ApiError.badRequest('Guess text is required');

      const player = room.getPlayer(socket.data.playerId);
      const result = room.game.checkGuess(socket.data.playerId, text);

      if (result.ignored) {
        // e.g. drawer guessing, or already guessed correctly - silently no-op
        if (typeof callback === 'function') callback({ success: true, ignored: true });
        return;
      }

      if (result.correct) {
        // Everyone gets the correct-guess notification (without revealing the word to others)
        io.to(room.id).emit(SOCKET_EVENTS.GUESS_RESULT, {
          correct: true,
          playerId: player.id,
          playerName: player.name,
          points: result.points,
        });
      } else {
        // Wrong guesses are shown as normal chat messages to everyone (skribbl.io behavior),
        // optionally flagged as "close" to nudge the guesser.
        io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
          playerId: player.id,
          playerName: player.name,
          text,
          isGuess: true,
          close: result.close,
        });
      }

      if (typeof callback === 'function') callback({ success: true, correct: result.correct });
    })
  );

  socket.on(
    SOCKET_EVENTS.CHAT,
    socketAsyncHandler(socket, async ({ text } = {}) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room) throw ApiError.notFound('Room not found');
      if (!text || !text.trim()) return;

      const player = room.getPlayer(socket.data.playerId);
      if (!player) return;

      io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
        playerId: player.id,
        playerName: player.name,
        text: text.trim().slice(0, 200),
        isGuess: false,
      });
    })
  );
}

export default registerChatHandlers;
