import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import gameHistoryService from '../services/gameHistory.service.js';
import { isDBConnected } from '../config/db.js';

/**
 * GET /api/v1/history
 * Recent completed games. Returns an empty list (not an error) if MongoDB
 * isn't configured, since history is an additive feature on top of the
 * always-available in-memory game engine.
 */
const getRecentGames = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const games = await gameHistoryService.getRecentGames(limit);

  return new ApiResponse(200, {
    games,
    persistenceEnabled: isDBConnected(),
  }).send(res);
});

/**
 * GET /api/v1/history/:roomId
 */
const getGameByRoomId = asyncHandler(async (req, res) => {
  if (!isDBConnected()) {
    throw ApiError.notFound('Game history is not available (MongoDB not connected)');
  }
  const game = await gameHistoryService.getGameByRoomId(req.params.roomId.toUpperCase());
  if (!game) {
    throw ApiError.notFound(`No game history found for room "${req.params.roomId}"`);
  }
  return new ApiResponse(200, game).send(res);
});

export { getRecentGames, getGameByRoomId };
