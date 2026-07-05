// Room settings validation bounds (per assignment spec: Room Settings table)

const ROOM_LIMITS = Object.freeze({
  MAX_PLAYERS_MIN: 2,
  MAX_PLAYERS_MAX: 20,
  ROUNDS_MIN: 2,
  ROUNDS_MAX: 10,
  DRAW_TIME_MIN: 15,
  DRAW_TIME_MAX: 240,
  WORD_COUNT_MIN: 1,
  WORD_COUNT_MAX: 5,
  HINTS_MIN: 0,
  HINTS_MAX: 5,
});

const WORD_MODES = Object.freeze({
  NORMAL: 'normal',
  HIDDEN: 'hidden',
  COMBINATION: 'combination',
});

const ROOM_STATE = Object.freeze({
  WAITING: 'waiting',
  PLAYING: 'playing',
  ENDED: 'ended',
});

const GAME_PHASE = Object.freeze({
  CHOOSING_WORD: 'choosing_word',
  DRAWING: 'drawing',
  ROUND_END: 'round_end',
  GAME_END: 'game_end',
});


const SOCKET_EVENTS = Object.freeze({
  // connection lifecycle
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Room & Lobby
  JOIN_ROOM: 'join_room',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  START_GAME: 'start_game',
  LEAVE_ROOM: 'leave_room',

  // Game state
  GAME_STATE: 'game_state',
  ROUND_START: 'round_start',
  WORD_CHOSEN: 'word_chosen',
  ROUND_END: 'round_end',
  GAME_OVER: 'game_over',

  // Drawing
  DRAW_START: 'draw_start',
  DRAW_MOVE: 'draw_move',
  DRAW_END: 'draw_end',
  DRAW_DATA: 'draw_data',
  CANVAS_CLEAR: 'canvas_clear',
  DRAW_UNDO: 'draw_undo',
  CANVAS_STATE: 'canvas_state', // sent to late joiners / spectators to sync current canvas

  // Chat & guessing
  GUESS: 'guess',
  GUESS_RESULT: 'guess_result',
  CHAT: 'chat',
  CHAT_MESSAGE: 'chat_message',
});

// Scoring constants. Points scale with how quickly a player guesses.

const SCORING = Object.freeze({
  BASE_POINTS: 100,
  MIN_POINTS: 10,
  DRAWER_POINTS_PER_CORRECT_GUESSER: 25,
  HOST_MIGRATION_GRACE_MS: 3000,
});

export { ROOM_LIMITS, WORD_MODES, ROOM_STATE, GAME_PHASE, SOCKET_EVENTS, SCORING };
