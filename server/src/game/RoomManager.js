import { v4 as uuidv4 } from 'uuid';
import Room from './Room.js';
import generateRoomCode from '../utils/generateRoomCode.js';
import roomLogService from '../services/roomLog.service.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';


class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
  }

  _generateUniqueRoomCode() {
    let code;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom({ isPrivate, settings, io }) {
    const id = this._generateUniqueRoomCode();
    const hostToken = uuidv4();
    const room = new Room({ id, hostToken, isPrivate, settings, io });
    this.rooms.set(id, room);
    logger.info(`Room created: ${id} (private=${isPrivate})`);

    // Fire-and-forget persistence - no-ops automatically if MongoDB isn't connected
    roomLogService.logCreated(room);
    if (settings.customWords?.length) {
      // fire-and-forget dynamic import to avoid startup cycles and keep this sync
      (async () => {
        const { default: wordService } = await import('../services/word.service.js');
        wordService.saveCustomWords(room.id, settings.customWords);
      })();
    }

    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room?.game) room.game.clearAllTimers();
    this.rooms.delete(roomId);
    logger.info(`Room deleted: ${roomId}`);
  }

  listPublicRooms() {
    return [...this.rooms.values()]
      .filter((r) => !r.isPrivate)
      .map((r) => r.toPublicSummary());
  }

 
  scheduleEmptyRoomCleanup(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return;

    clearTimeout(room.deletionTimer);
    room.deletionTimer = setTimeout(() => {
      const current = this.getRoom(roomId);
      if (current && !current.hasConnectedPlayers()) {
        this.deleteRoom(roomId);
      }
    }, env.EMPTY_ROOM_TTL_MS);
  }

  cancelEmptyRoomCleanup(roomId) {
    const room = this.getRoom(roomId);
    if (room?.deletionTimer) clearTimeout(room.deletionTimer);
  }
}

// Singleton instance - shared across the entire app (REST controllers + socket handlers)
export default new RoomManager();
