# Spellforge Arena — V1 Complete Specification

## 1. Project Overview

**Genre:** Top-down 2D arena spell brawler
**Mode:** Local 1v1 — Player vs Bot (multiplayer deferred to V2)
**Match Length:** 5 minutes
**Win Condition:** Opponent HP reaches 0 (instant win) OR timer ends → higher HP wins

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| UI Shell | React |
| Game Rendering | Canvas 2D API |
| Engine Logic | Vanilla JS (ES6 Classes) |
| Package Manager | Yarn |
| Physics Engine | None |
| Networking | None (V1) |
| Frameworks | None |

---

## 3. Rendering Model

| Property | Value |
|---|---|
| Internal Resolution | 320 × 180 |
| Display Resolution | 960 × 540 (3× scale) |
| Scale Method | CSS `image-rendering: pixelated` |
| Position Rendering | Physics uses floats; positions rounded to integers at render time only |
| Art Style | Programmer art (colored rectangles/circles) |
| Sprites | Deferred to V2 |

---

## 4. Arena

| Property | Value |
|---|---|
| Left Bound | 20 |
| Right Bound | 300 |
| Top Bound | 20 |
| Bottom Bound | 160 |
| Internal Walls | None |
| Player collision | Clamp to boundary |
| Projectile collision | Destroy on boundary hit |

---

## 5. Constants

```
RESOLUTION_W        = 320
RESOLUTION_H        = 180
MATCH_DURATION      = 300         // seconds (5 min)
DECK_SIZE           = 8
ULTIMATE_LIMIT      = 1           // per deck
MAX_MODIFIERS       = 2           // per spell
DEFAULT_COOLDOWN    = 1.0         // seconds, used for no-cooldown spells with Heavy Impact
```

---

## 6. Input System

### Player Controls
| Action | Default Binding |
|---|---|
| Move Up | W |
| Move Down | S |
| Move Left | A |
| Move Right | D |
| Basic Attack | Left Click |
| Spell Slot 1–8 | Keys 1–8 |
| Aim | Mouse Position |

Keybindings stored in a config object. Rebindable via Settings in the React UI.

### Aim Assist
Soft aim assist only:
- If the cursor is within **20px** of the enemy's hitbox center, snap projectile direction to enemy center.
- Otherwise, fire toward cursor position.
- Applies to basic attack and all projectile spells.

### Player 2 / Bot
Bot has no input. Controlled entirely by Bot AI logic. No second keyboard/mouse needed.

---

## 7. Player Model

```js
{
  position: { x, y },
  velocity: { x, y },
  hp: 100,
  maxHp: 100,
  mana: 100,
  maxMana: 100,
  manaRegen: 5,           // per second
  speed: 80,              // px/sec base
  size: 8,               // hitbox + render rect (square, width = height)
  deck: [],               // 8 SpellInstances
  cooldowns: {},          // spellId → remaining seconds
  stateMachine: StateMachine,
  isBot: false
}
```

### Methods
```js
update(dt)
takeDamage(amount)
heal(amount)
castSpell(slotIndex)
```

---

## 8. State Machine

Each state implements:
```js
enter()
update(dt)
exit()
```

### States

| State | Movement Speed | Notes |
|---|---|---|
| IdleState | 100% | Default when no input |
| MoveState | 100% | WASD held |
| CastState | 60% | During any spell cast |
| DashState | N/A | Player is mid-dash, no input |
| DeadState | 0% | HP ≤ 0 |

**Rules:**
- States do not overlap
- Damage does NOT interrupt CastState
- No hard CC (no stun, freeze, silence)

---

## 9. Basic Attack

| Property | Value |
|---|---|
| Type | Projectile |
| Damage | 8 |
| Mana Cost | 0 |
| Cooldown | 0.6s |
| Projectile Speed | 200 px/s |
| Projectile Size | 3×3 |
| Modifiers Allowed | None |

---

## 10. Spell System

### SpellDefinition (static data)
```js
{
  id: string,
  name: string,
  baseDamage: number,
  manaCost: number,
  castTime: number,       // seconds (0 = instant)
  cooldown: number,       // seconds
  behaviorType: string,   // see Behavior Types
  isUltimate: boolean,
  tags: string[]          // e.g. ['projectile', 'damage']
}
```

### SpellInstance (runtime)
Created when a spell executes:
```js
{
  definition: SpellDefinition,
  modifiers: Modifier[],
  computedDamage: number,
  computedCost: number,
  computedCooldown: number,
  computedCastTime: number
}
```

### Behavior Types (V1 only — do not add more)
- `projectile`
- `aoe`
- `dash`
- `buff`
- `instant`

### Cast Rules
A spell can only be cast when:
1. `mana >= computedCost`
2. `cooldowns[spellId] === 0`
3. Player is not in `DeadState`

---

## 11. Normal Spell List

### Damage Spells

#### Fireball
| Property | Value |
|---|---|
| Type | projectile |
| Damage | 20 |
| Mana Cost | 15 |
| Cast Time | 0.3s |
| Cooldown | 0s |
| Projectile Speed | 150 px/s |
| Projectile Size | 5×5 |
| Color | Orange |

#### Ice Shard
| Property | Value |
|---|---|
| Type | projectile |
| Damage | 15 |
| Mana Cost | 12 |
| Cast Time | 0.2s |
| Cooldown | 0s |
| Projectile Speed | 220 px/s |
| Projectile Size | 4×4 |
| Color | Cyan |
| Special | Applies 15% slow for 1.5s |

*Slow reduces target move speed by 15% for 1.5s. No stacking.*

#### Arcane Beam
| Property | Value |
|---|---|
| Type | buff (channeled hitscan) |
| Damage | 12 per second (0.1s tick = 1.2 per tick) |
| Mana Cost | 8 per second |
| Cooldown | 0s |
| Max Range | 150 px |
| Cast | Hold key → beam active; release or mana empty → stop |
| Color | Purple |
| Special | Enters CastState while held (60% move speed) |

#### Arcane Burst
| Property | Value |
|---|---|
| Type | projectile |
| Damage | 12 per projectile (3 projectiles = 36 max) |
| Mana Cost | 20 |
| Cast Time | 0.2s |
| Cooldown | 2s |
| Projectile Speed | 200 px/s |
| Projectile Size | 3×3 |
| Spread | 3 projectiles in ~30° cone |
| Color | Yellow |

*All 3 projectiles fired simultaneously toward cursor. Cone spread: center + ±15°.*

#### Ground Flame
| Property | Value |
|---|---|
| Type | aoe |
| Damage | 5 per 0.5s tick |
| Total Damage | Up to 30 (over 3s) |
| Mana Cost | 25 |
| Cooldown | 3s |
| Duration | 3s |
| AoE Radius | 20px |
| Cast | Placed at cursor position |
| Color | Red |

#### Blood Lance
| Property | Value |
|---|---|
| Type | projectile |
| Damage | 40 |
| Mana Cost | 10 |
| HP Cost | 5% of maxHp (5 HP) |
| Cast Time | 0.4s |
| Cooldown | 2s |
| Projectile Speed | 180 px/s |
| Projectile Size | 3×7 (elongated) |
| Color | Dark Red |
| Special | Cannot be cast if HP ≤ 5% maxHp |

---

### Mobility Spells

#### Dash
| Property | Value |
|---|---|
| Type | dash |
| Damage | 0 |
| Mana Cost | 15 |
| Cooldown | 3s |
| Distance | 50px |
| Direction | Toward cursor |
| Duration | ~0.15s (instant movement) |
| State | Enters DashState |

#### Blink Strike
| Property | Value |
|---|---|
| Type | dash |
| Damage | 25 (AoE at landing) |
| Mana Cost | 30 |
| Cooldown | 4s |
| Max Teleport Range | 80px |
| AoE Radius | 20px at landing zone |
| Preview | Ghost circle shown at cursor position (capped to max range) |
| Color | White ghost circle |

*Player teleports to cursor position (clamped to max range). AoE damage triggers at landing.*

#### Phase Walk
| Property | Value |
|---|---|
| Type | buff |
| Damage | 0 |
| Mana Cost | 20 |
| Cooldown | 5s |
| Speed Boost | +50% move speed |
| Duration | 3s |
| Visual | Player color tint (semi-transparent) |

---

### Healing Spell

#### Healing Pulse
| Property | Value |
|---|---|
| Type | instant |
| Heal | 25 HP |
| Mana Cost | 30 |
| Cooldown | 4s |
| Cast Time | 0.3s |

---

### Utility Spells

#### Mana Surge
| Property | Value |
|---|---|
| Type | instant |
| Mana Restore | 40 |
| Mana Cost | 0 |
| Cooldown | 5s |
| Cast Time | 0.2s |

#### Spell Echo
| Property | Value |
|---|---|
| Type | buff |
| Mana Cost | 20 |
| Cooldown | 6s |
| Cast Time | 0.1s |
| Effect | Next spell fires twice: once at 100%, once at 50% power |
| Notes | The 50% echo does NOT carry modifiers. Buff consumed on next cast. Non-combat spells (Dash, Phase Walk, Mana Surge) consume the buff without echoing. |

---

## 12. Ultimate Spell List

All ultimates:
- Cooldown: 12–15s
- High mana cost
- 1 per deck maximum

#### Meteor
| Property | Value |
|---|---|
| Type | aoe |
| Damage | 60 |
| Mana Cost | 60 |
| Cooldown | 15s |
| AoE Radius | 40px |
| Delay | 1.5s (visual warning before impact) |
| Cast | Placed at cursor position |
| Visual | Expanding circle indicator during delay |

#### Arcane Overload
| Property | Value |
|---|---|
| Type | buff |
| Damage Bonus | +50% all spell damage |
| Mana Cost | 50 |
| Cooldown | 12s |
| Duration | 5s |
| Visual | Player glowing outline |

#### Temporal Reset
| Property | Value |
|---|---|
| Type | instant |
| Effect | Resets all non-ultimate cooldowns to 0 |
| Mana Cost | 40 |
| Cooldown | 15s |
| Cast Time | 0.2s |

---

## 13. Modifier List

Max 2 modifiers per spell. No duplicate modifiers on one spell.

| Modifier | Effect | Mana Cost | Cooldown | Other |
|---|---|---|---|---|
| Empower | +20% damage | — | — | — |
| Quick Cast | -30% cast time | +10% | — | — |
| Heavy Impact | +40% damage | +40% | +20% | If base cooldown = 0, uses DEFAULT_COOLDOWN (1s) as base |
| Split | Projectile type only: fires 2 projectiles at ±15° at 60% damage each | — | — | Not valid on non-projectile spells |
| Extended Duration | +50% duration | — | — | Valid only on timed spells |
| Lingering Burn | Adds DoT: 5 dmg/sec for 2s after hit | — | — | Damage spells only |
| Mana Efficient | -20% mana cost | — | — | -10% damage |
| Lifesteal | Heal caster for 15% of damage dealt | — | — | Damage spells only |

### Modifier Validity
- `Split` — projectile behavior type only
- `Extended Duration` — spells with duration (aoe, buff, channel)
- `Lingering Burn` — damage spells only
- `Lifesteal` — damage spells only
- `Quick Cast` — spells with castTime > 0 only

---

## 14. Projectile System

```js
{
  position: { x, y },
  velocity: { x, y },
  damage: number,
  owner: Player,
  lifetime: number,     // auto-expire after N seconds
  size: { w, h },
  type: string          // for visual differentiation
}
```

**Rules:**
- Projectile vs Player collision only
- No projectile vs projectile
- Destroy on boundary hit
- Destroy on player hit
- Auto-destroy on lifetime expiry (fallback safety)

---

## 15. Collision System

Simple AABB:
```js
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
```

Checked each frame: all active projectiles vs all players (excluding owner).

---

## 16. Mana System

- Mana regenerates at `manaRegen` per second
- Clamped: `0 ≤ mana ≤ maxMana`
- Deducted immediately on cast
- No randomness

---

## 17. Cooldown System

```js
cooldowns[spellId] = computedCooldown   // set on cast
// each frame:
cooldowns[spellId] = Math.max(0, cooldowns[spellId] - dt)
```

---

## 18. Match System

`Match.js` owns:
```js
players[]        // [humanPlayer, botPlayer]
activeSpells[]   // live projectiles, aoe zones, active buffs
matchTimer       // counts down from 300
```

**Responsibilities:**
- Spawn players at start positions
- Tick timer each frame
- Run player updates
- Run spell/projectile updates
- Run collision checks
- Evaluate win condition each frame

**Win Condition check (each frame):**
```
if player.hp <= 0 → opponent wins (instant)
if matchTimer <= 0 → higher hp wins (tiebreak: draw)
```

---

## 19. Bot AI

Bot decision loop runs every **0.5 seconds**:

```
if distance to player <= 120px:
    cast random damage spell from deck (if castable)
if self.hp < 30% maxHp:
    cast Healing Pulse if available
if self.mana > 70% maxMana:
    cast ultimate if available (random check)
always:
    move toward player at 60% of normal speed
```

Bot has a **hardcoded deck** (defined in config, not Deck Forge):
```
[Fireball, Ice Shard, Ground Flame, Arcane Burst, Blood Lance, Healing Pulse, Mana Surge, Meteor]
```

No modifier usage on bot spells.

---

## 20. Deck Forge (React UI)

- Accessible **only outside of a match** (pre-match lobby)
- Deck locked once match starts
- Player configures one deck of **8 spells** (7 normal + 1 ultimate)
- For each spell slot, player can attach up to **2 modifiers** (valid modifiers only)
- Invalid modifier combos are blocked with a UI error message
- Deck saved to config/state before entering match

**UI Structure:**
```
DeckForge
├── SpellPool (all available spells listed)
├── DeckSlots (8 slots)
│   └── each slot: SpellCard + ModifierSlots (0–2)
└── SaveDeck / EnterMatch button
```

---

## 21. File / Module Structure

```
src/
├── game/
│   ├── GameEngine.js         // game loop, canvas, delta time
│   ├── Match.js              // match state, timer, win condition
│   ├── Player.js             // player model + methods
│   ├── StateMachine.js       // state machine base
│   ├── states/
│   │   ├── IdleState.js
│   │   ├── MoveState.js
│   │   ├── CastState.js
│   │   ├── DashState.js
│   │   └── DeadState.js
│   ├── spells/
│   │   ├── SpellDefinitions.js   // all static spell data
│   │   ├── SpellInstance.js      // runtime spell object
│   │   ├── ModifierDefinitions.js
│   │   └── behaviors/
│   │       ├── ProjectileBehavior.js
│   │       ├── AoeBehavior.js
│   │       ├── DashBehavior.js
│   │       ├── BuffBehavior.js
│   │       └── InstantBehavior.js
│   ├── Projectile.js
│   ├── CollisionSystem.js
│   ├── BotAI.js
│   └── InputHandler.js
├── ui/
│   ├── App.jsx
│   ├── GameCanvas.jsx        // React wrapper for canvas
│   ├── HUD.jsx               // HP bars, mana, timer, cooldown slots
│   ├── DeckForge.jsx         // deck builder UI
│   └── Settings.jsx          // keybinding config
├── config/
│   ├── defaultDeck.js
│   ├── botDeck.js
│   └── keybindings.js
└── index.jsx
```

---

## 22. HUD

Two layers:

**Canvas-rendered (basic, in-engine):**
- Player HP bar (top-left of canvas)
- Player Mana bar (top-left, below HP)
- Bot HP bar (top-right of canvas)
- Rendered directly in `GameEngine.render()` — no React needed

**React overlay (Phase 11):**
- Match timer (top-center)
- Spell slots 1–8 with cooldown overlay (bottom)
- Full styled HUD wrapping the canvas element

---

## 23. Development Phases

Each phase must be **fully tested before the next phase begins**.

| Phase | Scope | Status |
|---|---|---|
| 1 | Canvas setup, game loop, player rendering, WASD movement, arena boundary, state machine | ✅ Complete |
| 2 | Basic attack only: projectile system, aim assist, hit detection, damage, HP | — |
| 3 | Mana system, mana regen, cooldown tracking | — |
| 4 | Fireball spell: wire spell slot 1, casting, projectile spawn | — |
| 5 | All remaining normal spells (one at a time, test each) | — |
| 6 | Ultimates (one at a time) | — |
| 7 | Modifier system (apply to spells, test each modifier) | — |
| 8 | Bot AI | — |
| 9 | Match system: timer, win condition, match start/end flow | — |
| 10 | React Deck Forge UI | — |
| 11 | HUD + Settings (keybinding rebind) | — |

---

## 24. Scope Rules (V1 Hard Limits)

The following are **explicitly out of scope** for V1. Do not build them:

- Networking / multiplayer
- Internal arena walls
- Fog of war
- Stun / silence / hard CC
- Crit / resist / penetration
- Status effect stacking
- Summons
- Shields
- Advanced bot AI
- Particle systems
- Animations beyond basic movement
- Camera shake
- Ranking / progression
- Cosmetics

**If it is not in this document, it does not get built.**

---

## 25. Testing Principle

> **Every layer and every piece of functionality must be thoroughly tested before moving on to the next.**

**Automated coverage requirement: 90% minimum** across lines, statements, branches, and functions.

- Test runner: Vitest (`yarn test`)
- Coverage: `yarn test:coverage` (v8 provider, enforced via thresholds)
- Coverage scope: `src/game/**` and `src/config/**` (UI excluded)

This applies to every development phase:
- Each spell tested individually before adding the next
- Each modifier tested on each valid spell type
- Bot AI verified with simulated decision loop tests
- Collision system verified with edge cases (boundary, simultaneous hits)
- No phase is "done" until `yarn test:coverage` passes with ≥90% on all metrics
