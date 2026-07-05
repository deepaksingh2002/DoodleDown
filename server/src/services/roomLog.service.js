import RoomLog from '../models/RoomLog.model.js';
import { isDBConnected } from '../config/db.js';
import logger from '../utils/logger.js';
import { ROOM_STATE } from '../config/constants.js';


class RoomLogService {
  async logCreated(room) {
    if (!isDBConnected()) return;
    try {
      await RoomLog.create({
        roomId: room.id,
        isPrivate: room.isPrivate,
        settings: room.settings,
        state: room.state,
        peakPlayerCount: room.playerCount,
      });
    } catch (err) {
      logger.error(`Failed to log room creation for ${room.id}: ${err.message}`);
    }
  }

  async logStateChange(room) {
    if (!isDBConnected()) return;
    try {
      const update = { $max: { peakPlayerCount: room.playerCount }, $set: { state: room.state } };
      if (room.state === ROOM_STATE.PLAYING) update.$set.startedAt = new Date();
      if (room.state === ROOM_STATE.ENDED) update.$set.endedAt = new Date();
      await RoomLog.findOneAndUpdate({ roomId: room.id }, update);
    } catch (err) {
      logger.error(`Failed to log room state change for ${room.id}: ${err.message}`);
    }
  }
}

export default new RoomLogService();
