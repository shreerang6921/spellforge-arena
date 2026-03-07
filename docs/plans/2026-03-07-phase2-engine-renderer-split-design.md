# Phase 2: Engine/Renderer Split — Design

## Goal

Make `GameEngine.js` pure computation with no browser APIs so it can run in Node.js (server-side). Extract all canvas drawing to `Renderer.js`. Move the rAF loop to a new `GameLoop.js` client-side wrapper.

## Components After Split

| File | Role | Browser APIs |
|---|---|---|
| `src/game/GameEngine.js` | Pure simulation: `update(dt)`, all game/spell logic | None |
| `src/ui/Renderer.js` | All canvas drawing | Yes (`ctx.*`) |
| `src/ui/GameLoop.js` | rAF loop: drives `engine.update` + `renderer.render` | Yes (`requestAnimationFrame`, `performance.now`) |
| `src/ui/GameCanvas.jsx` | Wires all four pieces together, manages lifecycle | Yes (canvas ref) |

## GameEngine.js Changes

**Remove:**
- `constructor(canvas)` → `constructor()` — no canvas, no ctx
- `start()`, `stop()`, `_loop()` → move to `GameLoop.js`
- `render()`, all `_draw*()` methods → move to `Renderer.js`
- `this.canvas`, `this.ctx` fields
- `canvas.width = RESOLUTION_W` setup
- `new InputHandler(...)` call inside `init()` — moved to `GameCanvas.jsx`

**Keep unchanged:**
- `init()` (minus InputHandler creation)
- `update(dt)` — entire method untouched
- All spell execution methods: `_processCompletedCast`, `_spawnSpellProjectile`, `_spawnAoEZone`, `_executeDash`, `_executeBuff`, `_executeInstant`, `_applyOverloadBonus`
- `_tickPendingMeteors`, `_tickActiveBurns`, `_handleArcaneBeam`
- All state fields: `player`, `bot`, `projectiles`, `aoeZones`, `pendingMeteors`, `arcaneBeamActive`, `arcaneBeamDir`, `match`, `onMatchOver`, `inputHandler`

`inputHandler` remains as an optional field (default `null`). GameCanvas assigns it after init:
```js
engine.inputHandler = new InputHandler(canvas, engine.player, keybindings)
```
On the server, `inputHandler` stays `null` — all reads are already guarded by `if (this.inputHandler)`.

## Renderer.js

Plain JS class in `src/ui/`. All `_draw*` methods moved verbatim from GameEngine. Methods that previously read `this.player` / `this.arcaneBeamActive` etc. now read from a passed `engine` argument.

```js
export class Renderer {
  render(ctx, engine) {
    this._drawArena(ctx)
    for (const zone of engine.aoeZones) this._drawAoEZone(ctx, zone)
    for (const m of engine.pendingMeteors) this._drawMeteorWarning(ctx, m)
    this._drawPlayer(ctx, engine.player)
    this._drawPlayer(ctx, engine.bot)
    for (const proj of engine.projectiles) this._drawProjectile(ctx, proj)
    this._drawArcaneBeam(ctx, engine)
    this._drawHUD(ctx, engine)
    this._drawDeck(ctx, engine)
  }
  // all _draw* methods from GameEngine, reading engine.* instead of this.*
}
```

## GameLoop.js (`src/ui/GameLoop.js`)

Thin wrapper lifting `start()`, `stop()`, `_loop()` out of GameEngine:

```js
export class GameLoop {
  constructor(engine, renderer, ctx) { ... }
  start()  // performance.now() + requestAnimationFrame
  stop()   // cancelAnimationFrame
  _loop(timestamp) // dt calc, engine.update(dt), renderer.render(ctx, engine), next rAF
}
```

## GameCanvas.jsx Changes

```js
// inside useEffect
const engine = new GameEngine()
engine.init(deck, keybindings)

const ctx = canvas.getContext('2d')
canvas.width = RESOLUTION_W
canvas.height = RESOLUTION_H

const handler = new InputHandler(canvas, engine.player, keybindings)
engine.inputHandler = handler

const renderer = new Renderer()
const loop = new GameLoop(engine, renderer, ctx)

engine.onMatchOver = (winner, timer) => { ... }
loop.start()

return () => { loop.stop(); handler.destroy() }
```

Everything else in GameCanvas (end screen overlay, deck HUD key numbers, spell tooltips) stays untouched.

## Testing Strategy

- **Phase 2 gate:** All 580+ existing tests must continue passing
- Audit existing tests for any calls to `engine.render()` or `engine._draw*()` — update to use `renderer.render(ctx, engine)` instead
- Tests that call `new GameEngine(canvas)` → update to `new GameEngine()` (no canvas arg)
- New `Renderer.js` tests: mock ctx, verify `_draw*` methods called correctly
- New `GameLoop.js` tests: mock `requestAnimationFrame`, verify `engine.update` and `renderer.render` called each tick
- Coverage threshold: 90% on all metrics across `src/game/**` and `src/config/**`
