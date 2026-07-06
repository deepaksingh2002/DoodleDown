import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import roomManager from '../game/RoomManager.js';
import gameHistoryService from '../services/gameHistory.service.js';
import wordService from '../services/word.service.js';
import { getIO } from '../sockets/index.js';
import { isDBConnected } from '../config/db.js';



export const getHealth = asyncHandler(async (req, res) => {
  return new ApiResponse(200, {
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    activeRooms: roomManager.rooms.size,
    database: isDBConnected() ? 'connected' : 'disconnected (running in-memory only)',
    timestamp: new Date().toISOString(),
  }).send(res);
});




export const createRoom = asyncHandler(async (req, res) => {
  const { isPrivate, settings } = req.body;

  const room = roomManager.createRoom({ isPrivate, settings, io: getIO() });

  return new ApiResponse(
    201,
    {
      roomId: room.id,
      hostToken: room.hostToken,
      isPrivate: room.isPrivate,
      settings: room.settings,
    },
    'Room created successfully'
  ).send(res);
});




export const getRoomInfo = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const room = roomManager.getRoom(roomId.toUpperCase());

  if (!room) {
    throw ApiError.notFound(`Room "${roomId}" does not exist`);
  }

  return new ApiResponse(200, room.toPublicSummary(), 'Room found').send(res);
});

export const listPublicRooms = asyncHandler(async (req, res) => {
  const rooms = roomManager.listPublicRooms();
  return new ApiResponse(200, { rooms, count: rooms.length }).send(res);
});



export const getRecentGames = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const games = await gameHistoryService.getRecentGames(limit);

  return new ApiResponse(200, {
    games,
    persistenceEnabled: isDBConnected(),
  }).send(res);
});



export const getGameByRoomId = asyncHandler(async (req, res) => {
  if (!isDBConnected()) {
    throw ApiError.notFound('Game history is not available (MongoDB not connected)');
  }

  const game = await gameHistoryService.getGameByRoomId(req.params.roomId.toUpperCase());

  if (!game) {
    throw ApiError.notFound(`No game history found for room "${req.params.roomId}"`);
  }

  return new ApiResponse(200, game).send(res);
});



export const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const leaderboard = await gameHistoryService.getLeaderboard(limit);

  return new ApiResponse(200, {
    leaderboard,
    persistenceEnabled: isDBConnected(),
  }).send(res);
});



export const getCategories = asyncHandler(async (req, res) => {
  const categories = await wordService.getCategories();
  return new ApiResponse(200, { categories }).send(res);
});