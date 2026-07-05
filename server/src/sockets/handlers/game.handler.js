import ApiError from '../../utils/ApiError.js';
import roomManager from '../../game/RoomManager.js';
import socketAsyncHandler from '../socketAsyncHandler.js';
import { SOCKET_EVENTS, GAME_PHASE } from '../../config/constants.js';


function registerGameHandlers(io, socket) {
  socket.on(
    SOCKET_EVENTS.WORD_CHOSEN,
    socketAsyncHandler(socket, async ({ word } = {}, callback) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room?.game) throw ApiError.notFound('No active game in this room');

      const { game } = room;
      if (game.currentDrawerId !== socket.data.playerId) {
        throw ApiError.forbidden('Only the current drawer can choose a word');
      }
      if (game.phase !== GAME_PHASE.CHOOSING_WORD) {
        throw ApiError.conflict('Word has already been chosen for this round');
      }
      if (!word || !game.wordOptions.includes(word)) {
        throw ApiError.badRequest('Invalid word selection');
      }

      game.chooseWord(word);

      if (typeof callback === 'function') callback({ success: true });
    })
  );
}

export default registerGameHandlers;
