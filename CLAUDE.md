# CLAUDE.md

Notes for Claude Code working in this repo. The user-facing description of the game lives in `README.md` — this file documents the things that are not obvious from reading the code.

## What this project is

A Tron-like multiplayer browser game. Single Node process serves both the static client (HTML / CSS / images / sounds + compiled JS) **and** the Socket.IO game server from `js/server.js`.

## How the build is wired (non-obvious)

- **No bundler, no modules.** `tsconfig.json` sets `module: "commonjs"` but the code is written with global classes/functions. `tsc` compiles every file in `ts/**` to a matching file under `js/**`. The client then loads each compiled `.js` file individually via `<script>` tags in `index.html` (see the explicit list at the bottom of `index.html`).
- **Consequence:** classes and top-level declarations share a single global namespace per side (server / client).
- **Same files compiled, two runtimes:**
  - The Node process executes `js/server.js`.
  - The browser loads many of the same compiled files (`client.js`, `clientRender.js`, `userInput.js`, `interface.js`, `audio.js`, `teamData.js`, `displayStatus.js`, `geometry/*.js`, `pages/*.js`) via `<script>` tags.
  - `server.ts` is server-only; `client.ts` is browser-only. The geometry primitives are duplicated (see next point).
- **`_S` suffix on server classes is deliberate.** Server-side geometry classes inside `server.ts` are named `Point2_S`, `Segment_S`, `Box_S`, `Disc_S`, `LiteRay_S`. The browser-side equivalents in `ts/geometry/` are `Point2`, `Segment`, `Box`, `Disc`, `LiteRay`. The duplication exists because both sides share the same global namespace model and the server must not depend on browser-only types. Do **not** "deduplicate" them without rethinking the loading model.
- **Adding a new client-side file requires two edits:** create the `.ts` under `ts/`, and add a matching `<script src="js/...">` to `index.html`. There is no auto-discovery.

## Server architecture

- Single file `ts/server.ts` (~2900 lines). It has a `// TODO: refactor in separate files` near the top — that refactor has not been done. Treat it as one big file; if you add to it, follow the existing section banners (`//////////// GEOMETRY ENGINE ////////////`, etc.).
- The server is fully **authoritative**: physics, collisions, item spawning/effects, and scoring all run server-side. The client only sends user commands and renders state pushed by the server.
- Game state is keyed by `room` (a Socket.IO room name). `games: Map<string, Game>` holds per-room state. The main per-tick loops are scoped to a room.

## Socket.IO contract

Client → server events: `createNewRoom`, `joinRoom`, `setRoomParams`, `setPlayerParams`, `play`, `kickPlayer`, `userCommands`.

Server → client events: `gamesParams`, `stadium`, `obstacles`, `items`, `updatePlayersList`, `updateRoomParams`, `updatePlayersParams`, `kickFromRoom`, `prepareGame`, `createPlayers`, `initPlayersPositions`, `updatePlayersPositions`, `startRound`, `displayScores`, `displaySetup`, `gameOverPlayers`, `gameOverTeams`, `collision`.

The payload shape for each event is inlined at the call site — search for the event name to find both sides. There is no shared types file.

## Pinned versions — handle with care

- **Node 24.14.1** is the runtime. Pinned in three places that must stay in sync: `Dockerfile` (`FROM node:24.14.1`), `.nvmrc`, and the `engines.node` field of `package.json` (`>=20`). When bumping Node, update all three.
- **Socket.IO 4.x** — declared as `^4.7.5` in `package.json` (currently resolves to `4.8.3`). Server side **and** client side must match: the CDN URL in `index.html` is `cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js`. Minor mismatches within 4.x are tolerated (wire protocol = Engine.IO 4), but 4.x clients cannot talk to 2.x servers and vice versa. When bumping either side, update both.
- **Engine.IO protocol is v4.** Smoke-test the handshake with `GET /socket.io/?EIO=4&transport=polling` — it should return HTTP 200 with a JSON-ish body. If it returns 400 / 404 / `Bad handshake method`, the client and server are on incompatible protocol versions.
- **Since socket.io 3+, CORS is disabled by default.** The dev-mode branch (`DEPLOY=false`) in `ts/server.ts` explicitly sets `{ cors: { origin: "*" } }` to allow a client served from a different origin. Don't drop that option.
- **`@types/socket.io` is NOT a dependency.** Since socket.io 3.x the package ships its own types; the standalone `@types/socket.io` is obsolete and conflicts with the built-in types. Do not re-add it.
- **`@types/node` is at `^20.11.0`** (compile-time only — runtime is still Node 14). The bump is required because `@types/ws` (transitive type dep of socket.io 4) uses generic `http.Server<...>` introduced in newer `@types/node`; an older `@types/node` causes `TS2315: Type 'Server' is not generic` during build. Don't downgrade.
- **TypeScript** is installed globally (see `Dockerfile`) and as a dev tool, not as a project dependency.

## Server-side socket.io call style

The server uses the legacy factory call form, which still works in v4 thanks to a backward-compatibility wrapper:

```ts
io = require('socket.io')(http);                              // DEPLOY=true (attach to existing http server)
io = require('socket.io')(PORT, { cors: { origin: "*" } });   // DEPLOY=false (standalone, listens on PORT)
```

The "modern" v4 form would be `const { Server } = require('socket.io'); io = new Server(http);` — equivalent. No need to migrate unless you also tighten the typing of `io` (currently `let io: any`).

## Two `DEPLOY` flags — keep them in sync

- `DEPLOY` (top of `ts/server.ts`) — controls the server port (`process.env.PORT || 13000` when true, `5500` otherwise).
- `DEPLOY_CLIENT` (top of `ts/client.ts`) — controls how the client connects: `io.connect()` (relative) when true, `io.connect("http://localhost:${PORT}")` otherwise.

Both default to `true`. The "false" path is for local dev when the static client is served separately (e.g. Live Server on 5500) from the game server. If you change one, change the other.

## Fast-test shortcut

Constants near the top of `ts/server.ts`: `FAST_TEST_ON`, `FAST_TEST_MODE`, `FAST_TEST_NB_PLAYERS`, `FAST_TEST_NB_TEAMS`, `FAST_TEST_NB_ROUNDS`. When `FAST_TEST_ON` is true, the server skips room/setup flow and drops into a game immediately with these parameters — useful for iterating on round logic without clicking through pages. The client side has a matching `joinTestRoom()` in `client.ts` that auto-joins a `"TEST"` room. Don't commit changes with `FAST_TEST_ON = true`.

## Items system

Items have a `type` (effect) and a `scope` (who is affected). Not every combination is valid — see `getItemScopesGivenType()` in `ts/server.ts` for the allowed scopes per type. `ItemType.UNKNOWN` is resolved to a real type lazily at pickup time. When adding a new item type:

1. Add the enum value to `ItemType` in `server.ts`.
2. Add an icon at `img/items/types/item_type_<lowercase_name>.png` — the client builds the image path from the lowercased enum name (`client.ts` around line 101).
3. Add a `case` in `applyItemTakenToPlayer()` for the effect.
4. Add the type to the spawn pool in the items spawner (search for `ItemType.SPEED_INCREASE, ItemType.SPEED_DECREASE` to find the array).
5. Add a `case` in `getItemScopesGivenType()` if scopes other than the default `[PLAYER, ALL, ENEMIES]` are needed.

## Conventions / quirks worth knowing

- **No tests.** `npm test` is a stub.
- **`strict: true`** with `noImplicitThis: false`. Adding `any` is tolerated in places (e.g. socket handler `params: any`) but new code should be properly typed.
- **`noEmitOnError: true`** — a TS error means no `.js` is regenerated; the server may keep running with stale code. If a code change doesn't seem to take effect, check the `tsc` output.
- **Server class naming**: `_S` suffix for server-internal classes that duplicate a client class (see above). Plain names (`Player_S`, `Game`) for server-only types.
- **`Game.players` is a `Map<socketId, Player_S>`.** The socket id is the player's primary key everywhere.
- **Coordinates are rounded to integers** in the geometry constructors (`Math.round` in `Point2_S`/`Segment_S`/`Box_S` ctors). Don't rely on sub-pixel positions on the server.
- **Stadium dimensions are server-driven.** Server sends `STADIUM_W`/`STADIUM_H` via the `gamesParams` event; client overwrites its `STADIUM_W_CLIENT`/`STADIUM_H_CLIENT`. Don't hardcode arena size in new client code — read from the synced values.

## Common commands

| Goal | Command |
|---|---|
| Compile once | `npm run build` (`tsc`) |
| Run | `npm start` (`node js/server.js`) |
| Watch + auto-restart | `npm run dev` (`tsc -w` + `nodemon` via `concurrently`) |
| Docker image | `docker build -t literace-online .` then `docker run -p 13000:13000 literace-online` |

`npm install -g typescript` is required before the first build — `tsc` is not a project dependency.

## Common pitfalls

- **`EADDRINUSE :::5500` on `npm start`.** Happens when `DEPLOY=false` and a previous `node js/server.js` is still running. The port `5500` is hard-coded in the `DEPLOY=false` branch — `process.env.PORT` is **not** honored in that branch. Find the zombie with `Get-NetTCPConnection -LocalPort 5500` (PowerShell), then `Stop-Process -Id <pid> -Force`. Alternative: set `DEPLOY=true` in `ts/server.ts` and rebuild — the server then listens on `13000` and serves the static client itself (no Live Server needed).
- **Build succeeded but behavior unchanged.** Check the `tsc` output — `noEmitOnError: true` means a single TS error leaves stale `js/*.js` in place. The server will happily run the old code.
- **`npm install` warns about old lockfile.** The committed `package-lock.json` was generated with an old npm. The first install on a fresh checkout will rewrite it ("one-time fix-up"). That rewrite is expected; commit it only if dependency intent actually changed.
- **`npm audit` reports many vulnerabilities (~12).** Mostly transitive (Express 4 / older lockfile). Don't run `npm audit fix --force` casually — it can bump major versions of express and break the server. Address individually if needed.

## Files you usually don't need to touch

- `package-lock.json` — committed; don't regenerate unless you've actually changed deps.
- `js/**` — build output. Not gitignored but should not be hand-edited.
- `sounds/`, `img/` — assets. Item icons follow strict naming (see Items section).
