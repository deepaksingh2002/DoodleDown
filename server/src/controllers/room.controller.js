import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import roomManager from '../game/RoomManager.js';
import { getIO } from '../sockets/index.js';

/**
 * POST /api/v1/rooms
 * Creates a new room resource. The actual player socket connection happens
 * afterwards via the `join_room` socket event, using the returned hostToken
 * to claim host privileges.
 */
const createRoom = asyncHandler(async (req, res) => {
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

/**
 * GET /api/v1/rooms/:roomId
 * Public info used by the client to validate a room before attempting to join
 * (e.g. showing "Room full" or "Room not found" before opening a socket).
 */
const getRoomInfo = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const room = roomManager.getRoom(roomId.toUpperCase());

  if (!room) {
    throw ApiError.notFound(`Room "${roomId}" does not exist`);
  }

  return new ApiResponse(200, room.toPublicSummary(), 'Room found').send(res);
});

/**
 * GET /api/v1/rooms
 * Lists joinable public rooms (skip full/started ones by default).
 */
const listPublicRooms = asyncHandler(async (req, res) => {
  const rooms = roomManager.listPublicRooms();
  return new ApiResponse(200, { rooms, count: rooms.length }).send(res);
});

export { createRoom, getRoomInfo, listPublicRooms };
