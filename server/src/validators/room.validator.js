import { z } from 'zod';
import { ROOM_LIMITS, WORD_MODES } from '../config/constants.js';

const settingsSchema = z.object({
  maxPlayers: z
    .number()
    .int()
    .min(ROOM_LIMITS.MAX_PLAYERS_MIN)
    .max(ROOM_LIMITS.MAX_PLAYERS_MAX)
    .default(8),
  rounds: z
    .number()
    .int()
    .min(ROOM_LIMITS.ROUNDS_MIN)
    .max(ROOM_LIMITS.ROUNDS_MAX)
    .default(3),
  drawTime: z
    .number()
    .int()
    .min(ROOM_LIMITS.DRAW_TIME_MIN)
    .max(ROOM_LIMITS.DRAW_TIME_MAX)
    .default(80),
  wordCount: z
    .number()
    .int()
    .min(ROOM_LIMITS.WORD_COUNT_MIN)
    .max(ROOM_LIMITS.WORD_COUNT_MAX)
    .default(3),
  hints: z
    .number()
    .int()
    .min(ROOM_LIMITS.HINTS_MIN)
    .max(ROOM_LIMITS.HINTS_MAX)
    .default(2),
  wordMode: z
    .enum([WORD_MODES.NORMAL, WORD_MODES.HIDDEN, WORD_MODES.COMBINATION])
    .default(WORD_MODES.NORMAL),
  categories: z.array(z.string()).optional().default([]),
  customWords: z
    .array(z.string().trim().min(2).max(30))
    .max(50, 'Custom word list cannot exceed 50 words')
    .optional()
    .default([]),
});

const createRoomSchema = z.object({
  hostName: z.string().trim().min(1, 'hostName is required').max(20),
  isPrivate: z.boolean().default(false),
  settings: settingsSchema.default({}),
});

export { createRoomSchema, settingsSchema };
