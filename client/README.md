# Doodle Down – a skribbl.io-style frontend clone

A fully playable **frontend** for a real-time drawing & guessing game, built to match the
assignment spec (rooms, lobby, turn-based drawing, canvas sync, word system, hints,
scoring, chat/guessing, and configurable room settings).

This repo is the **client only**. The app still ships with a client-side `GameEngine`
for offline/demo play, but it now also knows how to point at a real Socket.IO backend via
`VITE_SOCKET_URL`. See [Wiring up a real backend](#wiring-up-a-real-backend-socketio)
for the full Socket.IO handoff.

Styling is Tailwind CSS v4 (via `@tailwindcss/vite`) using a bright, white/card-based
light theme (not dark) to match skribbl.io's actual look — soft shadows, pill-shaped
buttons and inputs, and marker-bright accent colors. Design tokens live in `src/index.css`
under `@theme`, and a couple of cross-cutting patterns (`.btn`, `.btn-primary/secondary/ghost`,
`.modal-overlay`, `.modal-card`, `.icon-btn`) are defined once via `@layer components`
since they're reused across many screens — everything else is inline Tailwind utility
classes in each component. All icons (settings rows, toolbar, chat send, player menu,
crowns/pencils/trophies, etc.) come from `react-icons/fa` rather than emoji.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build       # production build to dist/
npm run preview     # preview the production build locally
```

Create a `client/.env` file if you want the frontend to open a live backend connection:

```bash
VITE_SOCKET_URL=http://localhost:5000
```

## What's implemented

- **Rooms & lobby** — create a room with configurable settings, join by code or invite
  link, see the player list, host-only start button, add-bot button for testing solo.
- **Turn-based rounds** — one drawer at a time, rotates through every player, for N rounds.
- **Word selection** — drawer picks 1 of N words drawn from categorized word lists
  (animals, objects, actions, food, places).
- **Real-time drawing surface** — HTML5 Canvas, pointer events (mouse + touch), stroke
  color/size/eraser/undo/clear, strokes rendered in a fixed logical coordinate space so
  drawings look identical at any screen size.
- **Hints** — configurable number of letters revealed over the course of the round.
- **Guessing & chat** — typed guesses are checked (case/whitespace-insensitive) against
  the word, correct guesses are scored and announced, "close!" feedback for near-misses,
  general chat before/after a player has guessed.
- **Scoring & leaderboard** — points scale with time remaining and guess order; the
  drawer also earns points per correct guesser; round-end and game-over summaries.
- **Room settings** — max players (2–20), rounds (2–10), draw time (15–240s), word count
  (1–5), hints (0–5), word mode (normal/hidden/combination), private-room flag.

## Architecture overview

```
src/
  engine/
    GameEngine.ts   – owns all game/room state, runs the round loop, timers,
                       hint reveals, scoring, and bot behavior. Emits events
                       (state, chat_message, guess_result, round_end, game_over).
    Player.ts       – small Player class (id, name, color, score, flags).
    botNames.ts     – bot display names.
  lib/
    emitter.ts      – tiny typed pub/sub used by GameEngine.
    wordbank.ts     – categorized word lists + random word picker.
    socket.ts       – placeholder for a real Socket.IO connection (see below).
  context/
    GameProvider.tsx – React context that holds the current GameEngine instance
                        and re-renders the app on every state change.
  pages/
    Home.tsx, Lobby.tsx, Game.tsx, RoomRouter.tsx
  components/
    DrawingCanvas.tsx, Toolbar.tsx, WordBanner.tsx, Timer.tsx, ChatPanel.tsx,
    PlayerBadge.tsx, RoomSettingsForm.tsx, WordChoiceModal.tsx,
    RoundEndModal.tsx, GameOverModal.tsx, DoodleSignature.tsx
```

**How drawing strokes are captured, sent, and rendered:** `DrawingCanvas` listens for
pointer events only when the local player is the drawer. On pointer-down it starts a new
`Stroke` (id, color, size, points) and hands it to `engine.addStroke()`; on pointer-move
it calls `engine.appendPoint()`. The engine appends to its `strokes` array and re-publishes
state, which every connected client's canvas re-renders from — the drawer's own canvas
included, for a single source of truth. Coordinates are stored in a fixed 1000×600
logical space and scaled to each canvas's actual pixel size on render, so everyone sees
the same drawing regardless of window size.

**How game state (rounds, turn order, scoring) is managed:** `GameEngine` keeps a
`drawOrder` array built from the player list at game start and an index into it. Each
call to `advanceTurn()` moves to the next drawer, wrapping to a new round when the index
overflows, and ending the game once the configured round count is exceeded. Scoring is
computed in `registerCorrectGuess()`: guessers earn points scaled by time remaining and
how many players already guessed before them; the drawer earns a flat bonus per correct
guess.

**How WebSockets are used for real-time sync:** in this client-only build, `GameEngine`
mimics the wire protocol with an in-memory `Emitter` (see `lib/emitter.ts`) instead of a
socket — the shape of events (`round_start`, `draw_data`, `guess_result`, `chat_message`,
`round_end`, `game_over`, …) mirrors the Socket.IO event table in the assignment spec on
purpose, so plugging in a real socket is additive, not a rewrite.

**Word-matching logic:** guesses are lowercased, trimmed, and have internal whitespace
collapsed before comparison (`GameEngine.submitGuess`). A guess of matching length that
differs by at most 2 characters is flagged "close!" as a hint without giving away the
answer.

## Wiring up a real backend (Socket.IO)

1. Build a Node server implementing the event contract in the assignment (create_room,
   join_room, start_game, round_start, word_chosen, draw_data, guess, guess_result,
   round_end, game_over, chat, chat_message, canvas_clear, draw_undo).
2. In `src/lib/socket.ts`, use `createSocket(SOCKET_URL)` to open a real connection.
3. Replace `GameEngine`'s internals so its public methods (`chooseWord`, `addStroke`,
   `appendPoint`, `undoLastStroke`, `clearCanvas`, `submitGuess`, `sendChat`,
   `startGame`, `updateSettings`) emit to the socket instead of mutating local state,
   and have the socket's `on(...)` handlers call the same `publish()` you already have,
   feeding the identical `GameState` shape `snapshot()` produces today.
4. Because every page/component reads state exclusively through `useGame()`, none of the
   UI needs to change — only what's inside `GameEngine`.
5. Set `VITE_SOCKET_URL` in a `.env` file to your backend's URL.

## Deployment

This is a static Vite build (`npm run build` → `dist/`), so it deploys anywhere that
serves static files — Vercel, Netlify, Render, or Railway's static site option all work.
Once a real Socket.IO backend exists, deploy it separately (Render/Railway, since they
support long-lived WebSocket connections) and point `VITE_SOCKET_URL` at it.

## Notes on the current (backend-less) demo

- Bots are added manually from the lobby ("+ Add a bot player") so you can test solo —
  they pick words, "draw" simple randomized doodles on their turn, and guess correctly
  with randomized timing when it's your turn to draw.
- Joining a room via a shared link/code doesn't look up a real room (there's no server to
  ask), so it spins up a fresh local room under that code and seeds one bot into it — the
  joining player is kept as host so the lobby is always startable in this single-browser
  demo. A real backend would look up the actual room and assign host status correctly.
