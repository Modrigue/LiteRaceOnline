# Improvements & technical backlog

Concrete items observed while working on the codebase. Each is anchored to a real file/line and tagged by priority:

- **H** — security, correctness, or blocks scaling.
- **M** — meaningful refactor or DX win.
- **L** — nice-to-have / cosmetic.

Items are numbered (`#1`..`#25`) for easy reference. Not every item needs doing; this is a menu, not a roadmap.

---

## Security

### #1 [H] No rate limiting on `userCommands`

[ts/server.ts:1008](ts/server.ts#L1008) — a hostile client can spam `userCommands` and drive the server tick handling. With ~99 concurrent players per room theoretical max, this is exposed.

**Fix:** drop commands faster than ~60 Hz per socket, or coalesce in the tick loop.

### #2 [M] No abuse protection on room creation

Anyone can create unlimited rooms; nothing reaps abandoned rooms aggressively. A few lines of "max rooms per IP" + idle-room sweep would harden it.

---

## Architecture

### #3 [H] `ts/server.ts` is a 2900-line monolith

[ts/server.ts:23](ts/server.ts#L23) — `// TODO: refactor in separate files`. The TODO is there since at least the start of the conversation history. The file currently mixes: geometry primitives, `Game`/`Player_S` models, item system, scoring, socket handlers, room lifecycle.

**Fix:** split into modules with proper `import`/`export`. Suggested cut:

```
ts/server/
  geometry.ts       (Point2_S, Segment_S, Box_S, Disc_S, LiteRay_S)
  player.ts         (Player_S, team handling)
  game.ts           (Game class, status, rounds)
  items.ts          (ItemType, ItemScope, spawn/apply logic)
  scoring.ts        (per-mode scoring)
  network.ts        (socket handlers + event payload types)
  index.ts          (entry point: express + io setup)
```

Requires moving away from the "everything in global scope" model — see #4.

### #4 [H] Geometry classes duplicated client/server (`_S` suffix)

[CLAUDE.md](CLAUDE.md) documents this. `Point2_S` (server) ↔ `Point2` (client) etc. The duplication exists only because the project has no module system: classes share one global namespace per side.

**Fix:** introduce real modules (`tsconfig` already has `module: "commonjs"` — switch to `esnext` or keep CJS, in either case add `import`/`export` statements). Use a bundler for the client (esbuild is the smallest jump from where we are — single binary, sub-second builds, no config needed) or keep `<script>` tags but switch them to a single bundled file. Then the geometry primitives live in one place and both sides import them.

### #5 [M] No bundler — client loads ~15 individual `<script>` tags

[index.html:94-108](index.html#L94-L108). Adding a file requires editing the HTML. Order matters (no module resolution). HTTP/1.1 hits cost dozens of round trips on cold load.

**Fix:** same fix as #4 — esbuild produces one `client.bundle.js`. Cuts cold-load latency and removes the "don't forget to add the script tag" footgun.

### #6 [M] No shared event-payload types between client and server

Each `socket.on(...)` re-declares the shape inline (e.g. `(params: { stadiumW: number, stadiumH: number, fastTestMode: boolean }) => …`). The same event is typed twice in two files, and drift is silent.

**Fix:** once modules exist (#3/#4), add `ts/shared/events.ts` with a single source of truth. Socket.IO 4.x supports typed `Server<ClientToServer, ServerToClient>` generics — use them.

---

## Type safety

### #7 [M] 27 occurrences of `: any` / `<any>` across 7 files

Distribution: `server.ts` 11, `pageSetup.ts` 4, `client.ts` 4, `interface.ts` 3, `userInput.ts` 2, `pageWelcome.ts` 2, `pageGame.ts` 1.

Hotspots worth typing first:

- `let io: any` ([ts/server.ts:561](ts/server.ts#L561)) → `Server` from `socket.io`.
- `(req: any, res: any)` → `Request, Response` from `@types/express` (would need to add `@types/express` to devDeps).
- Socket handler `params: any` / `response: any` → typed payloads (see #6).

`tsconfig` is `strict: true`, so newly written code is forced to be typed; this is just paying down legacy `any`.

### #8 [L] `let io: any` everywhere downstream

Once `io` is properly typed as `Server`, `io.to(room).emit(...)` becomes type-checked. Cascade: typos in event names become compile errors instead of silent runtime no-ops.

---

## Build / DX

### #9 [M] `js/` build output is committed to git

The whole `js/` tree is in the repo, including `.js.map` files. Every TS change produces a noisy double-diff (source + emitted) — visible in the last two commits where 22 files changed mostly because `tsc` re-emitted maps.

**Fix:** add `js/` to `.gitignore`, commit the deletion once, then rely on `npm run build` (or a `prebuild` / CI step). Docker image already does `RUN npm run build` so production is unaffected.

### #10 [M] `DEPLOY` is a code-baked boolean

[ts/server.ts:11](ts/server.ts#L11) and [ts/client.ts:4](ts/client.ts#L4). Changing between dev and prod requires editing two files and rebuilding. Plus `process.env.PORT` is silently ignored in the `DEPLOY=false` branch.

**Fix:** derive from `process.env.NODE_ENV` server-side and from a build-time `define` (or simply infer from `window.location.host`) client-side. Always honor `process.env.PORT` with a fallback.

### #11 [M] `FAST_TEST_ON` is also a code-baked boolean

[ts/server.ts:17-21](ts/server.ts#L17-L21). The CLAUDE.md note "Don't commit changes with `FAST_TEST_ON = true`" is exactly the kind of footgun a flag should not have.

**Fix:** read from env: `const FAST_TEST_ON = process.env.FAST_TEST === "1";`. Can't be accidentally committed.

### #12 [M] No linter / formatter

Style drifts silently (mix of `let`/`const`, inconsistent brace style, casing). Adding ESLint + Prettier (or just Biome — single tool, faster, less config) gives format-on-save and catches dead code / unused vars.

### #13 [L] TypeScript is a global install, not a project dep

[Dockerfile:9](Dockerfile#L9) — `npm install -g typescript`. Means a fresh checkout requires a separate global install before `npm run build` works.

**Fix:** move `typescript` into `devDependencies` and call it via `npx tsc` (or via the `scripts` field, which resolves local binaries automatically). Removes the global install step.

### #14 [L] `npm audit` reports 12 vulnerabilities

3 low / 2 moderate / 7 high. Mostly transitive via Express 4 / older lockfile metadata. Worth a quick triage — but **don't** run `npm audit fix --force`, it may bump Express to v5 with breaking changes.

---

## Robustness

### #15 [M] No graceful shutdown

The server has no SIGTERM/SIGINT handler. In Docker, `docker stop` sends SIGTERM and waits 10 s before SIGKILL — currently all in-flight rooms are dropped abruptly with no notice to clients.

**Fix:** on SIGTERM, `io.emit('serverShutdown')`, close http server, exit. Bonus: a 2-second drain.

### #16 [M] Server state is in-memory only

`games: Map<string, Game>` lives in the Node heap. A restart wipes every active room.

**Fix:** depending on goals: (a) accept the limitation and document, (b) snapshot to disk on shutdown / interval, (c) move state to Redis (which also unlocks horizontal scaling — see #19).

### #17 [L] No error boundaries around `io.to(room).emit(...)`

If a socket disconnects between two server emits, the emit silently no-ops — fine. But if `JSON.stringify` chokes on a payload (e.g. circular reference introduced by a future change), the entire tick loop dies. A try/catch around the per-room tick would isolate failures.

### #18 [L] No structured logging

`console.log` everywhere. Fine for now; consider `pino` if you ever need to ship logs.

---

## Scalability / performance

### #19 [M] Single Node process; no socket.io adapter

socket.io 4.x can scale across processes via `@socket.io/redis-adapter`. Currently the project is one-process, one-host. If multiplayer ever takes off, this is the bottleneck.

**Fix (when needed):** add the redis-adapter, deploy multiple Node instances behind a sticky-session load balancer. Requires the Redis state migration from #16.

### #20 [L] Compression not enabled on the socket

By default socket.io 4 uses `permessage-deflate` for WebSocket but it can be tuned. For this game most messages are small position updates; compression may add latency more than it saves bytes. Worth a measurement before changing.

### #21 [L] CDN dependency for the client socket.io script

[index.html:91](index.html#L91) — the client pulls `socket.io.min.js` from cdnjs. If cdnjs is down, the game is down. The `socket.io` server module already ships a matching client at `/socket.io/socket.io.js` — switch to that and the dependency disappears.

---

## Bugs & code-quality nits

### #22 [L] `STADIUM_W` / `STADIUM_H` are server-wide constants

[ts/server.ts:1-2](ts/server.ts#L1-L2). Every game uses the same arena dimensions. If you ever want a "small / medium / large arena" room option, these should move onto the `Game` class.

### #23 [L] Item icon path built from lowercased enum name

[ts/client.ts:101](ts/client.ts#L101) — `imgType.src = \`./img/items/types/item_type_${data.type}.png\`;`. Implicit convention between enum names and on-disk filenames. A central registry would be safer (and let icons live somewhere else if ever needed).

### #24 [L] `// TODO: handle ex-aequo`

[ts/server.ts:2077](ts/server.ts#L2077) — game-over with tied scores isn't explicitly handled. Probably fine for the gameplay, worth confirming the current behavior is intentional.

### #25 [L] `// TODO: use Bresenham's algorithm or SAT?`

[ts/server.ts:404](ts/server.ts#L404) — collision detection is currently per-frame floating-point segment intersection. Probably fine at the current scale; revisit only if perf becomes an issue.

---

## Suggested order

If you want to tackle some of these, I'd go:

1. **#9 + #13** `js/` out of git and TypeScript local (~1 h, big DX win for diff readability).
2. **#3 + #4** Modularize `server.ts` and dedupe geometry (1-2 days, unblocks everything below).
3. **#6 + #7** Shared event-payload types and replace `any` in handlers (builds on #3/#4).
4. **#10 + #11** `DEPLOY` / `FAST_TEST_ON` → env vars (~1 h once modules land).
5. Everything else opportunistically.
