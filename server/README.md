# Skribbl Clone — Backend

Real-time multiplayer drawing & guessing game backend, built with **Node.js**, **Express**, and **Socket.IO**.

> Live URL:https://doodledown.onrender.com
---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| HTTP API | Express 4 |
| Real-time | Socket.IO 4 (WebSocket transport) |
| Validation | Zod |
| Logging | Winston + Morgan |
| Live game state | In-memory (rooms are ephemeral, like skribbl.io itself) |
| Persistence (optional) | MongoDB + Mongoose — word lists, game history, player stats, room audit log |

No database is *required* to run this — leave `MONGODB_URI` blank in `.env` and the app runs entirely in-memory, exactly as before. Set `MONGODB_URI` and it automatically layers in persistence with zero code changes needed on your part. If MongoDB is unreachable at any point (startup or mid-game), the app logs a warning and keeps running normally — it never crashes or blocks gameplay waiting on the database.

---

## 2. Project Structure

```
src/
├── server.js                 # entry point: HTTP server + Socket.IO bootstrap
├── app.js                    # Express app: middleware, routes, error handling
├── config/
│   ├── env.js                 # centralized env var access
│   ├── constants.js           # room limits, socket event names, scoring rules
│   └── db.js                  # MongoDB connection (optional, graceful fallback)
├── data/
│   └── words.json             # categorized word bank (also used to seed MongoDB)
├── models/                    # Mongoose schemas (only used when MONGODB_URI is set)
│   ├── Word.model.js            # persisted word lists (+ custom words per room)
│   ├── GameHistory.model.js     # persisted completed-game scores
│   ├── PlayerStat.model.js      # persisted cross-session leaderboard ("users")
│   └── RoomLog.model.js         # persisted room audit trail ("rooms")
├── services/                  # DB-aware logic, each with automatic in-memory fallback
│   ├── word.service.js          # word selection: custom words > DB > local JSON
│   ├── gameHistory.service.js   # persists finished games + updates player stats
│   └── roomLog.service.js       # persists room lifecycle events
├── utils/
│   ├── ApiError.js             # standardized error class
│   ├── ApiResponse.js          # standardized success response class
│   ├── asyncHandler.js         # wraps REST controllers (no try/catch boilerplate)
│   ├── logger.js               # winston logger
│   ├── generateRoomCode.js     # short shareable room codes
│   └── wordBank.js             # word selection + guess matching/normalization
├── middlewares/
│   ├── error.middleware.js     # global error handler (last middleware)
│   ├── notFound.middleware.js  # 404 handler
│   └── validate.middleware.js  # zod-based request validation
├── validators/
│   └── room.validator.js       # room creation/settings schema
├── game/                      # OOP game engine (bonus requirement)
│   ├── Player.js                # per-player state
│   ├── Room.js                  # lobby/players/settings container
│   ├── Game.js                  # rounds, turns, timers, scoring
│   └── RoomManager.js           # singleton owning all active rooms
├── controllers/
│   ├── room.controller.js       # REST: create/get/list rooms
│   ├── words.controller.js      # REST: word categories
│   ├── history.controller.js    # REST: past game records (needs MongoDB)
│   ├── leaderboard.controller.js # REST: cross-session leaderboard (needs MongoDB)
│   └── health.controller.js     # REST: health check (reports DB connection status)
├── routes/
│   ├── index.js
│   ├── room.routes.js
│   ├── words.routes.js
│   ├── history.routes.js
│   ├── leaderboard.routes.js
│   └── health.routes.js
└── sockets/
    ├── index.js                 # Socket.IO server init + connection wiring
    ├── socketAsyncHandler.js    # wraps socket handlers (mirrors asyncHandler)
    └── handlers/
        ├── room.handler.js      # join_room, start_game, leave_room, disconnect
        ├── game.handler.js      # word_chosen
        ├── draw.handler.js      # draw_start/move/end, canvas_clear, draw_undo
        └── chat.handler.js      # guess, chat
```

**Why this structure?** Every concern is isolated and independently testable:
- `game/` has **zero** dependency on Socket.IO or Express — it's pure game logic (OOP: `Room`, `Game`, `Player`, `RoomManager`), matching the bonus requirement.
- `sockets/handlers/` are thin — they validate the request, call into `game/`, and decide what to emit. All actual rules (scoring, turn order, timers) live in `Game`.
- `controllers/` + `utils/ApiError` + `utils/ApiResponse` + `asyncHandler` give REST endpoints a Express best-practice error/response shape.
- `socketAsyncHandler` mirrors `asyncHandler` for the WebSocket side, so no event handler needs a manual `try/catch`.
- `services/` is the ONLY layer that talks to MongoDB. `Game`, `Room`, and `RoomManager` never import Mongoose models directly — they call a service method, which internally checks `isDBConnected()` and either queries the DB or silently falls back. This means the live game engine is never coupled to whether persistence is turned on.

---

## 3. Setup & Run Locally

```bash
git clone https://github.com/deepaksingh2002/DoodleDown
cd skribbl-backend
npm install
cp .env.example .env       # adjust CORS_ORIGIN to match your frontend's URL
npm run dev                 # nodemon, auto-restarts on file changes
# or
npm start                   # plain node
```

Server starts on `http://localhost:5000` (or your configured `PORT`). REST and WebSocket traffic share the same port/HTTP server.

### Quick smoke test
```bash
curl http://localhost:5000/api/v1/health
```

---

## 3.5 MongoDB Setup (Optional)

The PDF lists a database as **optional for MVP**. This project runs fully in-memory with it left unset, but MongoDB adds persistence for exactly the four things the assignment names — **rooms, users, word lists, scores**:

| PDF's phrase | What we persist | Model |
|---|---|---|
| Rooms | Room creation + state transitions (audit trail — the *live* game is still in-memory for speed) | `RoomLog` |
| Users | Cross-session player stats, keyed by display name (no auth in scope) | `PlayerStat` |
| Word lists | The word bank, seeded from `words.json`; plus any custom words a host submits | `Word` |
| Scores | One record per completed game: final leaderboard + winner | `GameHistory` |

### Setup steps

1. **Get a MongoDB instance** — either:
   - Local: `mongodb://localhost:27017/skribbl-clone` (install MongoDB Community Server), or
   - Free cloud cluster: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → create a free M0 cluster → copy the connection string.
2. Set it in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/skribbl-clone
   ```
3. Seed the word bank (one-time, idempotent — safe to re-run):
   ```bash
   npm run seed
   ```
4. Start the server as usual (`npm run dev`). Check `/api/v1/health` — `database` will read `"connected"`.

### Resilience by design

- If `MONGODB_URI` is blank → the app never attempts a connection, logs one warning, and behaves exactly as the in-memory-only version did.
- If `MONGODB_URI` is set but unreachable → the app logs the error and **keeps running** — the word bank silently falls back to the local `words.json`, and game history/leaderboard endpoints return empty arrays rather than erroring.
- If MongoDB drops mid-game → in-flight rounds are unaffected (word selection already happened); only the next round's word fetch and the eventual `game_over` persistence are affected, and both handle the failure gracefully.
- **Nothing in the real-time hot path (`draw_data`, `guess`, `chat`) ever touches MongoDB** — those stay in-memory-only for latency, by design.

---

## 4. REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Server status, uptime, active room count, MongoDB connection status |
| POST | `/api/v1/rooms` | Create a room. Body: `{ hostName, isPrivate, settings }`. Returns `{ roomId, hostToken, settings }` |
| GET | `/api/v1/rooms` | List joinable public rooms |
| GET | `/api/v1/rooms/:roomId` | Public room summary (validate before joining) |
| GET | `/api/v1/words/categories` | List word categories and counts (DB-backed, falls back to local JSON) |
| GET | `/api/v1/history` | Recent completed games (requires MongoDB; returns `[]` otherwise) |
| GET | `/api/v1/history/:roomId` | Full result of one past game (requires MongoDB) |
| GET | `/api/v1/leaderboard` | Cross-session player leaderboard (requires MongoDB; returns `[]` otherwise) |

`settings` object (all optional, bounds enforced server-side via Zod):
```json
{
  "maxPlayers": 8,
  "rounds": 3,
  "drawTime": 80,
  "wordCount": 3,
  "hints": 2,
  "wordMode": "normal",
  "categories": [],
  "customWords": []
}
```

- `wordMode`: `"normal"` (hints shown per settings), `"hidden"` (no hints, ever), or `"combination"` (each round randomly behaves like Normal or Hidden — matches the real skribbl.io's Combination mode).
- `customWords`: optional array of up to 50 host-supplied words/phrases. If provided, the drawer's word choices are drawn from this list first (topped up from categories/local bank only if you supply fewer words than `wordCount`). When MongoDB is connected, custom words are also persisted per-room for reuse.

The client uses the returned `hostToken` when it subsequently connects via Socket.IO and emits `join_room` — this is how the server recognizes the room creator as host without needing auth/sessions.

---

## 5. WebSocket Events

All events match the assignment's suggested contract.

**Room & Lobby**
| Event | Direction | Payload |
|---|---|---|
| `join_room` | Client→Server | `{ roomId, playerName, hostToken? }` |
| `player_joined` | Server→Clients | `{ player, players }` |
| `player_left` | Server→Clients | `{ playerId, players, newHostId }` |
| `start_game` | Client→Server | `{}` (host only) |
| `leave_room` | Client→Server | `{}` |

**Game State**
| Event | Direction | Payload |
|---|---|---|
| `game_state` | Server→Clients | `{ phase, round, totalRounds, drawerId, wordLength, hint, timeRemainingMs }` |
| `round_start` | Server→Clients | `{ round, totalRounds, drawerId, drawTime }` |
| `word_options` | Server→Drawer only | `{ words }` |
| `word_chosen` | Client→Server | `{ word }` |
| `round_end` | Server→Clients | `{ reason, word, scores, nextDrawer }` |
| `game_over` | Server→Clients | `{ winner, leaderboard }` |

**Drawing**
| Event | Direction | Payload |
|---|---|---|
| `draw_start` / `draw_move` | Client→Server | `{ x, y, color, size }` |
| `draw_end` | Client→Server | `{}` |
| `draw_data` | Server→Clients | stroke payload (broadcast to everyone, including the drawer, for consistency) |
| `canvas_clear` | Client→Server → Server→Clients | `{}` |
| `draw_undo` | Client→Server → Server→Clients | `{}` |

**Chat & Guessing**
| Event | Direction | Payload |
|---|---|---|
| `guess` | Client→Server | `{ text }` |
| `guess_result` | Server→Clients | `{ correct, playerId, playerName, points }` |
| `chat` | Client→Server | `{ text }` |
| `chat_message` | Server→Clients | `{ playerId, playerName, text, isGuess, close }` |
| `error` | Server→Client | `{ statusCode, message }` (emitted by `socketAsyncHandler` on any failure) |

---

## 6. Architecture Overview

### Drawing sync
The drawer's canvas emits `draw_start` → `draw_move` (many) → `draw_end`. Each is validated server-side (`draw.handler.js` checks the sender is the current drawer and the round is in the `drawing` phase) then rebroadcast as `draw_data` to the whole room, **including the drawer**, so every client renders from a single authoritative stream rather than trusting local state. Strokes are also recorded in `Game.strokes` so a canvas snapshot could be replayed to late joiners or used for the "replay last round" bonus feature.

### Game state / turn order / scoring
`Game` (in `game/Game.js`) owns a `turnOrder` array built once per game from the player list. `startNextTurn()` advances a pointer through that array; when it wraps around, the round counter increments. All timers (word-choice countdown, draw countdown, staggered hint reveals, inter-round pause) are plain `setTimeout` handles owned by the `Game` instance and cleared on every transition to avoid leaks or double-fires. Scoring in `checkGuess()` rewards both speed (elapsed time ratio) and order (first correct guessers score more than later ones); the drawer also earns points per correct guesser.

### WebSockets
A single Socket.IO server is attached to the same HTTP server Express uses (`server.js`), so REST and realtime traffic share one port — important for single-service platforms like Render/Railway. Each connected socket registers four handler modules (`room`, `game`, `draw`, `chat`); every handler is wrapped in `socketAsyncHandler`, which catches thrown `ApiError`s and emits a structured `error` event instead of crashing the connection.

### Word-matching logic
Centralized in `utils/wordBank.js`:
- **Normalization**: trims whitespace, lowercases, collapses repeated internal spaces.
- **Exact match**: normalized guess === normalized target word.
- **Partial/"close" detection**: Levenshtein edit distance ≤ 20% of the word's length flags a guess as "close" (mirrors skribbl.io's colored "close guess" hint) without revealing the answer.
- Hints reveal random letter **indices** over time (spaces are never masked), evenly spaced across the draw-time duration, count configurable per room (0–5).

### Deployment constraints
Socket.IO needs a platform that supports **persistent WebSocket connections** — Render and Railway both work well for this (see below). Vercel/Netlify serverless functions do **not** support long-lived WebSocket connections, so if you deploy the frontend there, the backend (this repo) must be deployed separately on Render/Railway and the frontend configured to connect to that backend's URL.

---

## 7. Deployment (Render example)

1. Push this repo to GitHub.
2. On [Render](https://render.com): New → Web Service → connect the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables from `.env.example` (set `CORS_ORIGIN` to your deployed frontend URL, and `NODE_ENV=production`).
6. Render provides WebSocket support out of the box — no extra config needed.
7. Copy the resulting URL (e.g. `https://your-skribbl-clone.onrender.com`) into your frontend's socket connection config and into this README's top line.

Railway deployment is nearly identical: New Project → Deploy from GitHub → set the same env vars → Railway auto-detects `npm start`.

---

## 8. Notable Design Decisions / Best Practices Applied

- **Consistent error handling**: every thrown error (REST or socket) is an `ApiError` with a `statusCode`; a single global Express error middleware and a single `socketAsyncHandler` format all failures the same way.
- **Consistent success responses**: all REST success responses go through `ApiResponse` (`{ success, statusCode, data, message }`).
- **No try/catch boilerplate**: `asyncHandler` (REST) and `socketAsyncHandler` (sockets) centralize error propagation.
- **Validation at the edge**: Zod schemas + `validate.middleware.js` reject malformed room-creation requests before they reach controller logic.
- **OOP game engine**: `Player`, `Room`, `Game`, `RoomManager` fully encapsulate state and behavior, decoupled from transport (Socket.IO) — satisfies the bonus requirement and makes the engine unit-testable in isolation.
- **Single source of truth for event names**: `SOCKET_EVENTS` in `config/constants.js` prevents typo'd event strings from silently breaking features.
- **Security**: `helmet`, `cors` restricted to configured origin, `express-rate-limit` on REST routes, payload size limits.
- **Graceful degradation**: disconnected players are marked (not instantly deleted) so a brief network blip doesn't end their game; host is automatically reassigned if the host disconnects; empty rooms are cleaned up after a TTL rather than instantly, so instant refreshes don't destroy a room.
- **Optional persistence, zero coupling**: `services/` is the only layer aware of MongoDB. The game engine calls service methods and never checks `isDBConnected()` itself — that check, and the local-JSON fallback, live entirely inside the service. This is what lets the exact same `Game`/`Room` code run identically with or without a database configured.

---

## 9. Code Walkthrough Readiness Checklist

Be ready to explain, with the file open:
- Stroke lifecycle: `draw.handler.js` → `Game.recordStroke` → broadcast (`draw_data`)
- Turn/round progression: `Game.startNextTurn()` and `Game.endRound()`
- Word matching: `WordBank.compareGuess()` and `WordBank.levenshtein()`
- Error flow: throw `ApiError.xxx()` anywhere → caught by `asyncHandler`/`socketAsyncHandler` → formatted response/event
