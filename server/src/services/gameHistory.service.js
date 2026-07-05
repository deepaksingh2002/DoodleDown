import GameHistory from '../models/GameHistory.model.js';
import PlayerStat from '../models/PlayerStat.model.js';
import { isDBConnected } from '../config/db.js';
import logger from '../utils/logger.js';


class GameHistoryService {
  async recordGameEnd({ room, leaderboard, winner, startedAt }) {
    if (!isDBConnected()) return;
    try {
      const endedAt = new Date();
      await GameHistory.create({
        roomId: room.id,
        settings: room.settings,
        players: leaderboard,
        winner,
        totalRounds: room.settings.rounds,
        startedAt,
        endedAt,
        durationMs: startedAt ? endedAt - startedAt : null,
      });

      await Promise.all(
        leaderboard.map((p) =>
          PlayerStat.findOneAndUpdate(
            { name: p.name.toLowerCase() },
            {
              $inc: {
                gamesPlayed: 1,
                gamesWon: winner && winner.id === p.id ? 1 : 0,
                totalScore: p.score,
              },
              $max: { highestScore: p.score },
              $set: { lastPlayedAt: new Date() },
            },
            { upsert: true }
          )
        )
      );

      logger.info(`Game history recorded for room ${room.id}`);
    } catch (err) {
      logger.error(`Failed to record game history for room ${room.id}: ${err.message}`);
    }
  }

  async getRecentGames(limit = 20) {
    if (!isDBConnected()) return [];
    return GameHistory.find().sort({ endedAt: -1 }).limit(limit).lean();
  }

  async getGameByRoomId(roomId) {
    if (!isDBConnected()) return null;
    return GameHistory.findOne({ roomId }).sort({ endedAt: -1 }).lean();
  }

  async getLeaderboard(limit = 20) {
    if (!isDBConnected()) return [];
    return PlayerStat.find().sort({ totalScore: -1 }).limit(limit).lean();
  }
}

export default new GameHistoryService();
