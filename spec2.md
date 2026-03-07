# Spellforge Arena — V2 Specification

## 1. Project Overview

**V2 Headline Feature:** Real-time online multiplayer (1v1 and deathmatch up to 6 players)
**V1 Preserved:** Practice vs Bot mode remains fully playable offline
**New:** Home screen, Deck Preview flow, visual polish, sprite infrastructure

---

## 2. Tech Stack Changes

| Layer | V1 | V2 |
|---|---|---|
| UI Shell | React | React (unchanged) |
| Game Rendering | Canvas 2D (in GameEngine) | Canvas 2D (in Renderer.js — extracted) |
| Engine Logic | Vanilla JS ES6 Classes | Same — now runs in Node.js too |
| Networking | None | Node.js + `ws` (raw WebSockets) |
| Server | None | Node.js (authoritative game server) |
| Package Manager | Yarn | Yarn (unchanged) |

---

## 3. Navigation & Screen Flow

### V1 Routing
```
'forge' | 'game'
```

### V2 Routing
```
'home' | 'forge' | 'deck-preview' | 'lobby' | 'game'
+ mode: 'bot' | 'online'
```

### Screen Map
```
Home
├── Play vs Bot  ──→ Deck Preview
│                     ├── Continue → Game (mode: 'bot')
│                     └── Edit    → Deck Forge → Deck Preview
│
├── Play Online  ──→ Deck Preview
│                     ├── Continue → Lobby → Game (mode: 'online')
│                     └── Edit    → Deck Forge → Deck Preview
│
├── Deck Forge   ──→ (edit freely, Save → Home)
├── Settings     ──→ (keybinding rebind, Back → Home)
└── Game         ──→ End Screen overlay
                       ├── Restart → remounts game fresh (same deck/mode)
                       └── ← Home  → Home screen
```

### Home Screen Layout
```
┌────────────────────────────────┐
│                                │
│      ✦ SPELLFORGE ARENA ✦      │
│                                │
│       [ PLAY VS BOT     ]      │  ← primary button, highlighted
│       [ PLAY ONLINE     ]      │
│       [ DECK FORGE      ]      │
│       [ SETTINGS        ]      │
│                                │
└────────────────────────────────┘
```

### Deck Preview Screen
- Read-only view of all 8 deck slots (spell name, color swatch, attached modifiers)
- Three buttons: `Continue →` (primary), `Edit Deck`, `← Home`
- `Edit Deck` navigates to Deck Forge; Deck Forge shows `Save & Continue →` (returns to Deck Preview) when entered from this flow vs `Save` (returns to Home) when entered standalone
- Deck Forge also shows a `← Back` button when entered from Deck Preview (returns to Deck Preview without saving)
- `mode` context is preserved through Deck Forge and back

---

## 4. Engine / Renderer Split

### Motivation
`GameEngine.js` must run in Node.js (server-side simulation). All browser/canvas globals must be removed from it.

### Split
```
Before: GameEngine.js (simulation + drawing mixed)

After:
  src/game/GameEngine.js  — pure computation only; no canvas, no ctx, no browser APIs
  src/ui/Renderer.js      — all canvas drawing extracted here; browser only
```

### Renderer.js Responsibilities
- All `ctx.fillRect`, `ctx.arc`, `ctx.drawImage` calls
- Sprite loading and sprite-or-fallback drawing pattern
- Screen shake transform application
- Particle system rendering
- Spell trail rendering
- HUD drawing (HP bars, mana bars, cooldown slots)

### Sprite-or-Fallback Pattern
```js
drawPlayer(ctx, player) {
  const sprite = this.sprites.player?.[player.facing]?.[player.state];
  if (sprite) {
    ctx.drawImage(sprite, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }
}
```

Assets are loaded from `src/assets/sprites/` when present. If a sprite file is missing, the colored rect/circle fallback renders instead. Sprites can be dropped in incrementally without code changes.

### Sprite Asset Slots (infrastructure defined now, assets sourced later)
```
src/assets/sprites/
├── players/
│   └── {facing}_{state}.png   // e.g. right_idle.png, up_cast.png
├── projectiles/
│   └── {spellId}.png          // e.g. fireball.png, ice_shard.png
├── effects/
│   └── {effectName}.png       // e.g. ground_flame.png, meteor_crater.png
└── arena/
    └── floor.png
```

---

## 5. Multiplayer Architecture

### Model
**Authoritative server with simple state sync.**

The server owns and runs the game simulation. Clients send inputs; server processes them, runs `GameEngine.update(dt)`, and broadcasts the full game state to all clients at 20 ticks/second. Clients render the received state with interpolation.

```
Client A                    Server (Node.js)                 Client B
   |                               |                              |
   |── { input: {...} } ─────────→ |                              |
   |                        [engine.update(dt)]                   |
   |←── { type:'state', ... } ────────────────────────────────→  |
   |                               |                              |
```

### Client Modes
- **Bot mode:** Client runs `GameEngine` locally (V1 behavior, unchanged)
- **Online mode:** Client sends inputs to server; receives + renders state only (no local simulation)

### State Broadcast Format (server → all clients, 20hz)
```js
{
  type: 'state',
  myId: string,                   // which player is this client
  players: [
    {
      id: string,
      x: number, y: number,
      hp: number, mana: number,
      state: string,              // 'idle' | 'move' | 'cast' | 'dash' | 'dead'
      facing: string,             // 'up' | 'down' | 'left' | 'right'
      cooldowns: number[],        // 8 values, one per slot
      spellEchoActive: boolean
    }
  ],
  projectiles: [
    { id: string, x: number, y: number, w: number, h: number, color: string }
  ],
  aoeZones: [
    { id: string, x: number, y: number, radius: number, color: string, remaining: number }
  ],
  matchTimer: number,
  winner: null | string           // null or winning player id
}
```

### Client → Server Messages
```js
// Sent every frame
{ type: 'input', keys: { up, down, left, right }, mouseX, mouseY, spellSlot: null | 0-7 }
```

### Interpolation
Client maintains a buffer of the last 2 received state snapshots. Remote entities (all players in online mode, opponents in bot mode) are rendered by interpolating between the two most recent snapshots, keeping rendering smooth between 20hz updates.

---

## 6. Room System

### Lobby Screen Layout
```
┌────────────────────────────────────┐
│         PLAY ONLINE                │
│                                    │
│   [ Create Room ]                  │
│                                    │
│   Join Room:  [______] [ Join ]    │
│                                    │
└────────────────────────────────────┘

After creating:
┌────────────────────────────────────┐
│   Room Code:  FLAME7               │
│   Share this code with your friend │
│                                    │
│   ● You          ○ Waiting...      │
│                                    │
│   [ Ready ]   (disabled until 2)   │
└────────────────────────────────────┘

After opponent joins:
│   ● Player A     ● Player B        │
│   [ Ready ✓ ]                      │
```

### Room Lifecycle
```
create_room → code generated → waiting for players
player_joined → all slots filled → players can ready up
all ready → match_start broadcast → game begins
match ends → room status = 'finished' → clients return to Home
disconnect mid-match → opponent wins → room cleaned up
```

### Server Room State
```js
{
  code: string,                     // 6-character alphanumeric e.g. 'FLAME7'
  players: [
    { id: string, ws: WebSocket, deck: DeckState, ready: boolean }
  ],
  maxPlayers: number,               // 2 for 1v1; 2-6 for deathmatch (Phase 6)
  status: 'waiting' | 'in_progress' | 'finished',
  engine: GameEngine | null         // instantiated on match start
}
```

### WebSocket Message Protocol

**Client → Server:**
```
create_room   { deck }
join_room     { code, deck }
ready         {}
input         { keys, mouseX, mouseY, spellSlot }
leave_room    {}
```

**Server → Client:**
```
room_created  { code }
room_joined   { code, players: [{ id }] }
player_joined { id }
player_left   { id }
match_start   { myId, playerIds }
state         { ...state broadcast format }
match_end     { winner: id | null }
error         { message }
```

### Deck Transmission
Player sends their deck in `create_room` / `join_room` as the existing `localStorage` format:
```js
[{ spellId: string, modifierIds: string[] }, ...]   // 8 entries
```
Server converts via `deckToSpellInstances()` from the shared `playerDeck.js` module.

### Disconnect Handling
- Player disconnects during lobby → room stays open, slot reopens
- Player disconnects during match → opponent wins instantly, `match_end` broadcast, room cleaned up

---

## 7. Deathmatch Mode (Phase 6)

### Overview
Up to 6 players in one room, free-for-all. Last player standing wins.

### Changes from 1v1
- Room `maxPlayers` set by host (2–6) when creating
- Win condition: last player with `hp > 0`
- Timer tiebreak: player with highest HP when timer expires
- `match_start` sends all player IDs; each client identifies itself via `myId`

### No Rework Required
The player-array architecture from Phase 4 supports N players natively. Server broadcasts the same state format with more entries in the `players` array.

### Lobby UI for Deathmatch
Host selects player count (2–6) when creating room. Lobby shows slots for each player. Match starts when all joined players ready up.

---

## 8. Visual Polish

### Screen Shake (`ScreenShake.js`)
Applied as a canvas transform offset in `Renderer.js`. Never affects world positions.

| Trigger | Intensity | Duration |
|---|---|---|
| Taking damage | Small | 0.15s |
| Meteor impact | Large | 0.3s |
| Blink Strike landing | Medium | 0.2s |
| Death | Medium | 0.2s |

Amplitude decays linearly to zero over the duration.

### Particle System (`ParticleSystem.js`)
Particles are visual only — managed in `Renderer.js`, never in `GameEngine.js`.

| Event | Particle count | Color | Lifetime |
|---|---|---|---|
| Projectile hit | 6–10 sparks | Spell color | 0.3s |
| Player death | 20–30 burst | Player color | 0.6s |
| Blink Strike landing | 12 radial | White | 0.4s |
| Meteor impact | 30 burst | Orange/red | 0.8s |

### Spell Trails
Projectiles maintain a ring buffer of 4 past positions. Each ghost position is rendered at decreasing opacity (50% → 10%). Implemented in `Renderer.js`.

### Player State Tints
Applied as `ctx.globalAlpha` or composite overlay on top of sprite/rect:

| State | Visual |
|---|---|
| CastState | Subtle white glow outline |
| DashState | Motion blur streak (3 ghost frames) |
| Phase Walk active | Semi-transparent (0.5 alpha) |
| Arcane Overload active | Pulsing yellow outline |

### Arena
- Vignette: dark radial gradient overlay at canvas edges
- Arena border: soft glow instead of hard line

### What Is NOT Built (wait for sprites)
- Canvas-drawn floor texture (replaced by floor.png when available)
- Player direction indicator triangle (replaced by directional sprite frames)

---

## 9. Server File Structure

```
server/
├── index.js            — ws server entry, port config
├── RoomManager.js      — create/join/leave/cleanup rooms
├── GameLoop.js         — setInterval at 20hz, drives engine.update(dt) per room
└── MessageHandler.js   — parse client messages, route to RoomManager/GameLoop
```

---

## 10. Updated File Structure

```
src/
├── game/
│   ├── GameEngine.js         // pure computation — no canvas
│   ├── Match.js
│   ├── Player.js
│   ├── StateMachine.js
│   ├── states/
│   ├── spells/
│   ├── Projectile.js
│   ├── AoEZone.js
│   ├── CollisionSystem.js
│   ├── BotAI.js
│   ├── InputHandler.js
│   ├── ParticleSystem.js     // NEW — visual only, renderer-driven
│   └── ScreenShake.js        // NEW — canvas transform only
├── ui/
│   ├── App.jsx               // updated routing
│   ├── Home.jsx              // NEW
│   ├── DeckPreview.jsx       // NEW
│   ├── Lobby.jsx             // NEW
│   ├── GameCanvas.jsx        // updated — online vs bot mode; end screen has Restart + ← Home buttons
│   ├── Renderer.js           // NEW — extracted from GameEngine
│   ├── DeckForge.jsx
│   └── Settings.jsx
├── assets/
│   └── sprites/              // NEW — populated incrementally
│       ├── players/
│       ├── projectiles/
│       ├── effects/
│       └── arena/
├── config/
│   ├── playerDeck.js         // shared with server
│   ├── botDeck.js
│   └── constants.js
└── index.jsx

server/
├── index.js
├── RoomManager.js
├── GameLoop.js
└── MessageHandler.js
```

---

## 11. Development Phases

Each phase must pass 90% test coverage before the next begins.

| Phase | Scope | Status |
|---|---|---|
| 1 | Home screen, Deck Preview, updated app routing | ✅ Complete (589 tests) |
| 2 | Engine/Renderer split — `GameEngine.js` pure, `Renderer.js` extracted; all existing tests pass | — |
| 3 | Server infrastructure — Node.js + ws, room lifecycle, WebSocket protocol | — |
| 4 | Online 1v1 — client inputs, server state sync at 20hz, client interpolation | — |
| 5 | Visual polish — screen shake, particles, spell trails, state tints, vignette, sprite infra | — |
| 6 | Deathmatch — up to 6 players, last-standing win condition, lobby player-count config | — |

---

## 12. Testing

- **Coverage threshold:** 90% minimum on lines, statements, branches, functions
- **Scope:** `src/game/**`, `src/config/**`, `server/**`
- **UI excluded** from automated coverage (same as V1)
- **Server tests:** room lifecycle, state broadcast format, disconnect handling, input processing
- **Phase 2 gate:** all 580+ existing V1 tests must continue passing after engine/renderer split

---

## 13. V2 Hard Limits (Do Not Build)

- Public matchmaking queue
- Spectator mode
- Accounts / login / server-side player persistence
- Rollback netcode / lag compensation
- New spells or modifiers
- Full sprite art (infrastructure only — assets sourced separately)
- Camera / viewport scrolling
- Sound / audio

**If it is not in this document, it does not get built.**
