import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import gameHistoryService from '../services/gameHistory.service.js';
import { isDBConnected } from '../config/db.js';

/**
 * GET /api/v1/leaderboard
 * Cross-session leaderboard aggregated from PlayerStat ("users" persistence).
 * Returns an empty list gracefully if MongoDB isn't connected.
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const leaderboard = await gameHistoryService.getLeaderboard(limit);

  return new ApiResponse(200, {
    leaderboard,
    persistenceEnabled: isDBConnected(),
  }).send(res);
});

export { getLeaderboard };
