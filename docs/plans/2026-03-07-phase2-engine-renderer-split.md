# Phase 2: Engine/Renderer Split — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract all canvas drawing and browser loop management out of `GameEngine.js` so it becomes pure computation runnable in Node.js.

**Architecture:** Three new files — `GameLoop.js` (rAF loop), `Renderer.js` (all canvas drawing), both in `src/ui/`. `GameEngine.js` keeps only `update(dt)` and game logic. `GameCanvas.jsx` wires the four pieces together and creates `InputHandler` (which also moves out of `GameEngine.init()`).

**Tech Stack:** Vanilla JS ES6 classes, Vitest, React. No new dependencies.

---

## Current state audit

`GameEngine.test.js` has these test blocks that need to move:
- `describe('GameEngine — start / stop')` → move to `GameLoop.test.js`
- `describe('GameEngine — render')` → move to `Renderer.test.js`
- `describe('GameEngine — deck HUD (_drawDeck)')` → move to `Renderer.test.js`

`GameEngineSpells.test.js` has these test blocks at lines 662–758 that need to move:
- `describe('GameEngine — _drawAoEZone rendering')` → `Renderer.test.js`
- `describe('GameEngine — _drawMeteorWarning rendering')` → `Renderer.test.js`
- `describe('GameEngine — _drawArcaneBeam rendering')` → `Renderer.test.js`
- `describe('GameEngine — _drawDeck Spell Echo indicator')` → `Renderer.test.js`
- `describe('GameEngine — _drawPlayer buff visuals')` → `Renderer.test.js`

---

## Task 1: Create `GameLoop.js` with tests

**Files:**
- Create: `src/tests/GameLoop.test.js`
- Create: `src/ui/GameLoop.js`

### Step 1: Write the failing test

Create `src/tests/GameLoop.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { GameLoop } from '../ui/GameLoop.js'

function makeLoop() {
  const engine   = { update: vi.fn() }
  const renderer = { render: vi.fn() }
  const ctx      = {}
  return { loop: new GameLoop(engine, renderer, ctx), engine, renderer, ctx }
}

describe('GameLoop — start', () => {
  it('sets running to true on start()', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    expect(loop.running).toBe(true)
    loop.stop()
    vi.unstubAllGlobals()
  })

  it('calls requestAnimationFrame on start()', () => {
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    expect(rafMock).toHaveBeenCalledTimes(1)
    loop.stop()
    vi.unstubAllGlobals()
  })

  it('does not double-start if already running', () => {
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    loop.start()
    expect(rafMock).toHaveBeenCalledTimes(1)
    loop.stop()
    vi.unstubAllGlobals()
  })
})

describe('GameLoop — stop', () => {
  it('sets running to false on stop()', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    loop.stop()
    expect(loop.running).toBe(false)
    vi.unstubAllGlobals()
  })

  it('calls cancelAnimationFrame with the scheduled rAF id', () => {
    const cafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42))
    vi.stubGlobal('cancelAnimationFrame', cafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    loop.stop()
    expect(cafMock).toHaveBeenCalledWith(42)
    vi.unstubAllGlobals()
  })
})

describe('GameLoop — _loop tick', () => {
  it('calls engine.update and renderer.render on first tick', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop, engine, renderer, ctx } = makeLoop()
    loop.start()  // calls _loop(0) immediately, then schedules next via rAF
    expect(engine.update).toHaveBeenCalled()
    expect(renderer.render).toHaveBeenCalledWith(ctx, engine)
    loop.stop()
    vi.unstubAllGlobals()
  })

  it('caps dt at 0.05s on huge timestamp gaps', () => {
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop, engine } = makeLoop()
    loop.start()  // _loop(0) runs, schedules next rAF
    engine.update.mockClear()
    // Invoke the rAF callback with a huge gap
    const nextLoopFn = rafMock.mock.calls[0][0]
    nextLoopFn(10000)  // 10-second gap
    expect(engine.update).toHaveBeenCalledWith(0.05)
    loop.stop()
    vi.unstubAllGlobals()
  })

  it('passes correct dt for normal 16ms frame', () => {
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop, engine } = makeLoop()
    loop.start()  // _loop(0), dt=0
    engine.update.mockClear()
    const nextLoopFn = rafMock.mock.calls[0][0]
    nextLoopFn(16)  // 16ms later
    expect(engine.update).toHaveBeenCalledWith(expect.closeTo(0.016, 5))
    loop.stop()
    vi.unstubAllGlobals()
  })
})
```

### Step 2: Run to verify it fails

Run: `yarn test src/tests/GameLoop.test.js`
Expected: FAIL — `Cannot find module '../ui/GameLoop.js'`

### Step 3: Implement `src/ui/GameLoop.js`

```js
export class GameLoop {
  constructor(engine, renderer, ctx) {
    this.engine   = engine
    this.renderer = renderer
    this.ctx      = ctx
    this.running  = false
    this._rafId   = null
    this._lastTime = 0
  }

  start() {
    if (this.running) return
    this.running = true
    this._lastTime = performance.now()
    this._loop(this._lastTime)
  }

  stop() {
    this.running = false
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  _loop(timestamp) {
    if (!this.running) return
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05)
    this._lastTime = timestamp
    this.engine.update(dt)
    this.renderer.render(this.ctx, this.engine)
    this._rafId = requestAnimationFrame((ts) => this._loop(ts))
  }
}
```

### Step 4: Run to verify it passes

Run: `yarn test src/tests/GameLoop.test.js`
Expected: all tests PASS

### Step 5: Commit

```bash
git add src/ui/GameLoop.js src/tests/GameLoop.test.js
git commit -m "feat: extract GameLoop from GameEngine (Phase 2)"
```

---

## Task 2: Create `Renderer.js` with tests

**Files:**
- Create: `src/tests/Renderer.test.js`
- Create: `src/ui/Renderer.js`

### Step 1: Write the failing tests

Create `src/tests/Renderer.test.js`. This file moves all rendering tests that currently live in `GameEngine.test.js` and `GameEngineSpells.test.js`, updating calls from `engine.render(ctx)` to `renderer.render(ctx, engine)`.

After the split, `GameEngine` takes no constructor arguments, so `makeEngine()` uses `new GameEngine()`.

```js
import { describe, it, expect, vi } from 'vitest'
import { Renderer } from '../ui/Renderer.js'
import { GameEngine } from '../game/GameEngine.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'
import { FIREBALL } from '../game/spells/SpellDefinitions.js'

function makeMockCtx() {
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '',
    fillRect:   vi.fn(),
    strokeRect: vi.fn(),
    fillText:   vi.fn(),
    save:       vi.fn(),
    restore:    vi.fn(),
    translate:  vi.fn(),
    rotate:     vi.fn(),
  }
}

function makeEngine() {
  const engine = new GameEngine()
  engine.init()
  return engine
}

// ─── Basic render ─────────────────────────────────────────────────────────────

describe('Renderer — render', () => {
  it('calls fillRect at least once (arena background)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    renderer.render(ctx, engine)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('calls strokeRect for arena border', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    renderer.render(ctx, engine)
    expect(ctx.strokeRect).toHaveBeenCalled()
  })

  it('renders without throwing when a player is dead', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.takeDamage(999)
    expect(() => renderer.render(ctx, engine)).not.toThrow()
  })

  it('renders active projectiles (extra fillRect calls)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.input.attack = true
    engine.update(0.016)  // spawns a basic attack projectile
    const callsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})

// ─── Deck HUD ─────────────────────────────────────────────────────────────────

describe('Renderer — deck HUD (_drawDeck)', () => {
  it('renders without throwing with an empty deck', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.deck = []
    expect(() => renderer.render(ctx, engine)).not.toThrow()
  })

  it('does not call fillText for slot numbers (rendered as React overlay)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    renderer.render(ctx, engine)
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('draws extra fillRect calls when a spell is in the deck', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.deck = []
    renderer.render(ctx, engine)
    const emptyDeckCalls = ctx.fillRect.mock.calls.length

    ctx.fillRect.mockClear()
    engine.player.deck[0] = new SpellInstance(FIREBALL)
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(emptyDeckCalls)
  })

  it('draws a strokeRect for the slot being cast (pendingCast)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    const spell = engine.player.deck[0]
    engine.player.pendingCast = { spell, direction: { x: 1, y: 0 }, timeRemaining: 0.2 }
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })

  it('draws cooldown overlay when spell is on cooldown', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    const cooldownDef = { ...FIREBALL, id: 'testcd', cooldown: 2 }
    const spell = new SpellInstance(cooldownDef)
    engine.player.deck[0] = spell
    engine.player.cooldowns['testcd'] = 1
    renderer.render(ctx, engine)
    expect(ctx.fillRect).toHaveBeenCalled()
  })
})

// ─── AoEZone rendering ────────────────────────────────────────────────────────

describe('Renderer — _drawAoEZone', () => {
  it('calls fillRect when an AoEZone is active', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.aoeZones.push({ position: { x: 160, y: 90 }, radius: 20, color: '#ff0000', active: true })
    const fillsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })
})

// ─── Meteor warning rendering ─────────────────────────────────────────────────

describe('Renderer — _drawMeteorWarning', () => {
  it('calls strokeRect when a pending meteor exists', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.pendingMeteors.push({ x: 160, y: 90, delay: 0.5, totalDelay: 1.5, radius: 40, color: '#ff4400' })
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })

  it('draws inner flash fillRect when progress > 0.75', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.pendingMeteors.push({ x: 160, y: 90, delay: 0.1, totalDelay: 1.5, radius: 40, color: '#ff4400' })
    const fillsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })

  it('skips rendering when progress is 0 (r < 1)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.pendingMeteors.push({ x: 160, y: 90, delay: 1.5, totalDelay: 1.5, radius: 40, color: '#ff4400' })
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    // arena border adds 1 strokeRect; meteor at r=0 adds nothing extra
    expect(ctx.strokeRect.mock.calls.length).toBe(strokesBefore + 1)
  })
})

// ─── Arcane Beam rendering ────────────────────────────────────────────────────

describe('Renderer — _drawArcaneBeam', () => {
  it('calls fillRect for beam when arcaneBeamActive is true', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.arcaneBeamActive = true
    engine.arcaneBeamDir = { x: 1, y: 0 }
    const fillsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })

  it('does not throw when arcaneBeamActive is false', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.arcaneBeamActive = false
    expect(() => renderer.render(ctx, engine)).not.toThrow()
  })
})

// ─── Spell Echo indicator ─────────────────────────────────────────────────────

describe('Renderer — _drawDeck Spell Echo indicator', () => {
  it('draws extra strokeRect borders on deck when spellEchoActive', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.spellEchoActive = true
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })
})

// ─── Player buff visuals ──────────────────────────────────────────────────────

describe('Renderer — _drawPlayer buff visuals', () => {
  it('calls extra fillRect for Phase Walk tint overlay', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.phaseWalkTimer = 3
    const fillsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })

  it('calls extra strokeRect for Arcane Overload glow', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.arcaneOverloadTimer = 5
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })
})
```

### Step 2: Run to verify it fails

Run: `yarn test src/tests/Renderer.test.js`
Expected: FAIL — `Cannot find module '../ui/Renderer.js'`

### Step 3: Implement `src/ui/Renderer.js`

Move all `_draw*` methods from `GameEngine.js` verbatim. Change any `this.player` / `this.arcaneBeamActive` etc. reads to read from the `engine` argument:

```js
import { RESOLUTION_W, RESOLUTION_H, COLORS, ARENA } from '../config/constants.js'

export class Renderer {
  render(ctx, engine) {
    this._drawArena(ctx)
    for (const zone of engine.aoeZones)     this._drawAoEZone(ctx, zone)
    for (const m   of engine.pendingMeteors) this._drawMeteorWarning(ctx, m)
    this._drawPlayer(ctx, engine.player)
    this._drawPlayer(ctx, engine.bot)
    for (const proj of engine.projectiles) this._drawProjectile(ctx, proj)
    this._drawArcaneBeam(ctx, engine)
    this._drawHUD(ctx, engine)
    this._drawDeck(ctx, engine)
  }

  _drawArena(ctx) {
    ctx.fillStyle = COLORS.ARENA_BG
    ctx.fillRect(0, 0, RESOLUTION_W, RESOLUTION_H)
    ctx.strokeStyle = COLORS.ARENA_BORDER
    ctx.lineWidth = 1
    ctx.strokeRect(ARENA.LEFT, ARENA.TOP, ARENA.RIGHT - ARENA.LEFT, ARENA.BOTTOM - ARENA.TOP)
  }

  _drawPlayer(ctx, player) {
    const half = player.size / 2
    const x = Math.round(player.position.x - half)
    const y = Math.round(player.position.y - half)
    ctx.fillStyle = player.isDead ? '#555' : player.color
    ctx.fillRect(x, y, player.size, player.size)
    if (player.phaseWalkTimer > 0) {
      ctx.fillStyle = '#66ffff'
      ctx.fillRect(x - 1, y - 1, player.size + 2, player.size + 2)
    }
    if (player.arcaneOverloadActive) {
      ctx.strokeStyle = '#ff44ff'
      ctx.lineWidth = 1
      ctx.strokeRect(x - 1, y - 1, player.size + 2, player.size + 2)
    }
  }

  _drawHUD(ctx, engine) {
    this._drawBar(ctx, 2,   2, 60, 4, engine.player.hp   / engine.player.maxHp,   COLORS.HP_BAR,   COLORS.HP_BG)
    this._drawBar(ctx, 2,   8, 60, 4, engine.player.mana / engine.player.maxMana, COLORS.MANA_BAR, COLORS.MANA_BG)
    this._drawBar(ctx, 258, 2, 60, 4, engine.bot.hp      / engine.bot.maxHp,      COLORS.HP_BAR,   COLORS.HP_BG)
    this._drawBar(ctx, 258, 8, 60, 4, engine.bot.mana    / engine.bot.maxMana,    COLORS.MANA_BAR, COLORS.MANA_BG)
  }

  _drawProjectile(ctx, proj) {
    ctx.fillStyle = proj.color
    const x = Math.round(proj.position.x - proj.size.w / 2)
    const y = Math.round(proj.position.y - proj.size.h / 2)
    ctx.fillRect(x, y, proj.size.w, proj.size.h)
  }

  _drawAoEZone(ctx, zone) {
    ctx.fillStyle = zone.color
    const r = zone.radius
    ctx.fillRect(Math.round(zone.position.x - r), Math.round(zone.position.y - r), r * 2, r * 2)
  }

  _drawMeteorWarning(ctx, m) {
    const progress = 1 - (m.delay / m.totalDelay)
    const r = Math.round(m.radius * progress)
    if (r < 1) return
    ctx.strokeStyle = m.color
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(m.x - r), Math.round(m.y - r), r * 2, r * 2)
    if (progress > 0.75) {
      ctx.fillStyle = `rgba(255,68,0,${(progress - 0.75) * 2})`
      ctx.fillRect(Math.round(m.x - r), Math.round(m.y - r), r * 2, r * 2)
    }
  }

  _drawArcaneBeam(ctx, engine) {
    if (!engine.arcaneBeamActive || !engine.arcaneBeamDir) return
    const range = 150
    const x1 = engine.player.position.x
    const y1 = engine.player.position.y
    const angle = Math.atan2(engine.arcaneBeamDir.y, engine.arcaneBeamDir.x)
    ctx.save()
    ctx.translate(Math.round(x1), Math.round(y1))
    ctx.rotate(angle)
    ctx.fillStyle = '#aa44ff'
    ctx.fillRect(0, -1, range, 2)
    ctx.restore()
  }

  _drawDeck(ctx, engine) {
    const SLOT  = 14
    const GAP   = 2
    const SLOTS = 8
    const totalW = SLOTS * SLOT + (SLOTS - 1) * GAP
    const startX = Math.floor((RESOLUTION_W - totalW) / 2)
    const y = RESOLUTION_H - SLOT - 2

    for (let i = 0; i < SLOTS; i++) {
      const x     = startX + i * (SLOT + GAP)
      const spell = engine.player.deck[i]

      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(x, y, SLOT, SLOT)

      if (spell) {
        ctx.fillStyle = spell.definition.color
        ctx.fillRect(x + 1, y + 1, SLOT - 2, SLOT - 2)

        const cd    = engine.player.cooldowns[spell.definition.id] ?? 0
        const total = spell.computedCooldown
        if (cd > 0 && total > 0) {
          const ratio = cd / total
          ctx.fillStyle = 'rgba(0,0,0,0.75)'
          ctx.fillRect(x + 1, y + 1, SLOT - 2, Math.round((SLOT - 2) * ratio))
        }

        if (engine.player.pendingCast?.spell === spell) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1)
        }

        if (engine.player.spellEchoActive) {
          ctx.strokeStyle = '#ff88ff'
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1)
        }
      }
    }
  }

  _drawBar(ctx, x, y, w, h, ratio, fill, bg) {
    ctx.fillStyle = bg
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = fill
    ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, ratio))), h)
  }
}
```

### Step 4: Run to verify it passes

Run: `yarn test src/tests/Renderer.test.js`
Expected: all tests PASS

### Step 5: Commit

```bash
git add src/ui/Renderer.js src/tests/Renderer.test.js
git commit -m "feat: extract Renderer from GameEngine (Phase 2)"
```

---

## Task 3: Strip `GameEngine.js` and update its tests

**Files:**
- Modify: `src/game/GameEngine.js`
- Modify: `src/tests/GameEngine.test.js`
- Modify: `src/tests/GameEngineSpells.test.js`

All three files change together in one commit.

### Step 1: Update `src/game/GameEngine.js`

**a) Change the constructor** — remove canvas, ctx, and canvas dimension setup:

Find:
```js
constructor(canvas) {
  this.canvas = canvas
  this.ctx = canvas.getContext('2d')

  canvas.width = RESOLUTION_W
  canvas.height = RESOLUTION_H

  this.running = false
  this._lastTime = 0
  this._rafId = null
  ...
```

Replace with:
```js
constructor() {
  this.running = false

  this.player = null
  this.bot = null
  this.botAI = null
  this.inputHandler = null
  this.projectiles = []
  this.aoeZones = []
  this.pendingMeteors = []

  this.arcaneBeamActive = false
  this.arcaneBeamDir = null

  this.match = null
  this.onMatchOver = null
}
```

Note: `this.running`, `this._lastTime`, `this._rafId` are no longer needed in GameEngine — they live in GameLoop now. But keep `this.running` because `update()` currently checks `this.match.matchOver` and calls `this.stop()`. After the split, we need to handle match-over differently.

Actually, looking at `update()`:
```js
if (this.match.matchOver) {
  this.onMatchOver?.(this.match.winner, this.match.matchTimer)
  this.arcaneBeamActive = false
  this.stop()   // ← this needs to go away
  return
}
```

Remove the `this.stop()` call — the loop will stop itself via the `onMatchOver` callback flowing through to GameCanvas, which calls `loop.stop()`. Replace `this.stop()` with nothing (just remove that line).

**b) Remove `start()`, `stop()`, `_loop()`** — delete these three methods entirely (lines ~63–91 in current file).

**c) Remove `InputHandler` creation from `init()`**

Find:
```js
this.inputHandler = new InputHandler(this.canvas, this.player, keybindings ?? undefined)
```
Delete that line. Also remove the `InputHandler` import at the top.

**d) Remove the `// ─── Rendering ───` section** — delete `render()` and all `_draw*` methods (lines ~490–647).

**e) Remove unused imports** at top of file:
- Remove: `import { RESOLUTION_W, RESOLUTION_H, ... }` — keep only `COLORS` and `ARENA` if still needed in game logic. Check: `ARENA` is used in `_executeDash`. `COLORS` is no longer used (was only in render). `RESOLUTION_W`/`RESOLUTION_H` no longer used. Update imports to only what's still needed.

After checking the remaining logic: `_executeDash` uses `ARENA`. The import line becomes:
```js
import { ARENA } from '../config/constants.js'
```

### Step 2: Update `src/tests/GameEngine.test.js`

**a) Remove the `makeMockCanvas` helper** — it's no longer needed.

**b) Update all `new GameEngine(canvas)` calls** — change to `new GameEngine()`. Search for `new GameEngine(canvas)` and replace with `new GameEngine()`. There are ~15 occurrences in this file.

**c) Remove the test that checks canvas dimensions** — delete this test from `describe('GameEngine — init')`:
```js
it('sets canvas dimensions to internal resolution', () => { ... })
```
This behavior now lives in GameCanvas (UI — not tested at unit level).

**d) Remove `describe('GameEngine — start / stop')` entirely** — the 3 tests in this block are now covered by `GameLoop.test.js`.

**e) Remove `describe('GameEngine — render')` entirely** (lines ~255–291) — covered by `Renderer.test.js`.

**f) Remove `describe('GameEngine — deck HUD (_drawDeck)')` entirely** (lines ~293–349) — covered by `Renderer.test.js`.

**g) Remove the `RESOLUTION_W, RESOLUTION_H` import** from the top of the file (no longer needed).

### Step 3: Update `src/tests/GameEngineSpells.test.js`

**a) Remove `makeMockCanvas`** helper function (lines ~32–43).

**b) Update `makeEngine()`** — no longer needs canvas:

Find:
```js
function makeEngine() {
  const { canvas, ctx } = makeMockCanvas()
  const engine = new GameEngine(canvas)
  engine.init()
  return { engine, ctx }
}
```

Replace with:
```js
function makeEngine() {
  const engine = new GameEngine()
  engine.init()
  return { engine }
}
```

Note: Any test that uses `const { engine, ctx } = makeEngine()` and then uses `ctx` must be a rendering test — those are being deleted. All non-rendering tests only use `engine`.

**c) Remove all rendering test describes** (lines ~662–758 — the section starting with `// ─── Rendering helpers ───`). Delete:
- `describe('GameEngine — _drawAoEZone rendering', ...)`
- `describe('GameEngine — _drawMeteorWarning rendering', ...)`
- `describe('GameEngine — _drawArcaneBeam rendering', ...)`
- The comment `// Tooltip is now a React HTML overlay...`
- `describe('GameEngine — _drawDeck Spell Echo indicator', ...)`
- `describe('GameEngine — _drawPlayer buff visuals', ...)`

**d) Remove `makeMockCtx`** from top of file (no longer used).

### Step 4: Run the full test suite

Run: `yarn test`
Expected: all tests PASS. Total count will be similar to before (some tests moved files but not deleted).

### Step 5: Run coverage

Run: `yarn test:coverage`
Expected: all thresholds ≥ 90%

### Step 6: Commit

```bash
git add src/game/GameEngine.js src/tests/GameEngine.test.js src/tests/GameEngineSpells.test.js
git commit -m "refactor: strip browser APIs from GameEngine (Phase 2)"
```

---

## Task 4: Update `GameCanvas.jsx`

**Files:**
- Modify: `src/ui/GameCanvas.jsx`

### Step 1: Update imports

Find the current imports at the top of `GameCanvas.jsx`:
```js
import { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../game/GameEngine.js'
import { deckToSpellInstances } from '../config/playerDeck.js'
import { MATCH_DURATION } from '../config/constants.js'
```

Replace with:
```js
import { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../game/GameEngine.js'
import { InputHandler } from '../game/InputHandler.js'
import { Renderer } from './Renderer.js'
import { GameLoop } from './GameLoop.js'
import { deckToSpellInstances } from '../config/playerDeck.js'
import { MATCH_DURATION, RESOLUTION_W, RESOLUTION_H } from '../config/constants.js'
```

Also remove the hardcoded `const RESOLUTION_W = 320` and `const RESOLUTION_H = 180` lines (lines 7–8) since they're now imported.

### Step 2: Update the `useEffect` body

Find the current `useEffect`:
```js
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return

  const engine = new GameEngine(canvas)
  engineRef.current = engine

  engine.onMatchOver = (winner, timeLeft) => {
    clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = null
    setMatchResult({ winner, timeLeft })
  }

  const instances = deckToSpellInstances(deck)
  engine.init(instances, keybindings ?? undefined)
  engine.start()

  timerIntervalRef.current = setInterval(() => {
    const t = engineRef.current?.match?.matchTimer ?? MATCH_DURATION
    setTimerDisplay(t)
  }, 500)

  return () => {
    engine.stop()
    clearInterval(timerIntervalRef.current)
  }
}, [])
```

Replace with:
```js
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  canvas.width  = RESOLUTION_W
  canvas.height = RESOLUTION_H

  const engine = new GameEngine()
  engineRef.current = engine

  engine.onMatchOver = (winner, timeLeft) => {
    clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = null
    setMatchResult({ winner, timeLeft })
    loop.stop()
  }

  const instances = deckToSpellInstances(deck)
  engine.init(instances, keybindings ?? undefined)

  const handler = new InputHandler(canvas, engine.player, keybindings ?? undefined)
  engine.inputHandler = handler

  const renderer = new Renderer()
  const loop = new GameLoop(engine, renderer, ctx)
  loop.start()

  timerIntervalRef.current = setInterval(() => {
    const t = engineRef.current?.match?.matchTimer ?? MATCH_DURATION
    setTimerDisplay(t)
  }, 500)

  return () => {
    loop.stop()
    handler.destroy()
    clearInterval(timerIntervalRef.current)
  }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

### Step 3: Run all tests

Run: `yarn test`
Expected: all tests PASS (GameCanvas is UI — not unit tested, but no test files should break)

### Step 4: Run coverage

Run: `yarn test:coverage`
Expected: all thresholds ≥ 90%

### Step 5: Manual smoke test

Run: `yarn dev`

Verify in browser:
- [ ] App loads on Home screen
- [ ] Play vs Bot → Deck Preview → Continue → game starts and renders
- [ ] Player can move and cast spells
- [ ] Match timer counts down
- [ ] Match ends and returns to home

### Step 6: Commit

```bash
git add src/ui/GameCanvas.jsx
git commit -m "refactor: wire GameLoop, Renderer, InputHandler in GameCanvas (Phase 2)"
```

---

## Summary of all file changes

| File | Action |
|---|---|
| `src/ui/GameLoop.js` | Create — rAF loop extracted from GameEngine |
| `src/ui/Renderer.js` | Create — all canvas drawing extracted from GameEngine |
| `src/tests/GameLoop.test.js` | Create — tests for GameLoop start/stop/tick |
| `src/tests/Renderer.test.js` | Create — render tests moved from GameEngine tests |
| `src/game/GameEngine.js` | Modify — remove constructor canvas, start/stop/_loop, render/_draw*, InputHandler creation |
| `src/tests/GameEngine.test.js` | Modify — remove canvas arg, remove start/stop + render describe blocks |
| `src/tests/GameEngineSpells.test.js` | Modify — update makeEngine(), remove rendering describe blocks |
| `src/ui/GameCanvas.jsx` | Modify — wire GameLoop, Renderer, InputHandler; move canvas setup here |

No game logic files touched (Player, Projectile, spells, etc.) — all 500+ non-render tests pass unchanged.
