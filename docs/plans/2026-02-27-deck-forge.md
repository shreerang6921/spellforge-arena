# Phase 10: Deck Forge UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a pre-match Deck Forge screen where players configure their 8-spell deck (7 normal + 1 ultimate) with up to 2 modifiers per spell, persisted in localStorage.

**Architecture:** `App.jsx` owns `screen` ('forge'|'game') and `playerDeck` state (serializable array, saved to localStorage). `DeckForge.jsx` is a single-file React component for the builder UI. `src/config/playerDeck.js` provides lookup maps, DEFAULT_DECK, and `deckToSpellInstances()`. `GameEngine.init(deck)` accepts an optional deck array and falls back to DEFAULT_DECK if any slot is null.

**Tech Stack:** React (useState, useEffect), vanilla JS GameEngine, Vitest for playerDeck.js tests.

---

### Task 1: Create `src/config/playerDeck.js`

**Files:**
- Create: `src/config/playerDeck.js`
- Create: `src/tests/playerDeck.test.js`

**Context:**
All 15 spell definitions are in `src/game/spells/SpellDefinitions.js` (12 normal + 3 ultimates).
All 8 modifiers are in `src/game/spells/ModifierDefinitions.js` (also exports `ALL_MODIFIERS`).
`SpellInstance` is in `src/game/spells/SpellInstance.js` — constructor takes `(definition, modifiers[])`.

The serializable deck format is an array of 8 entries, each `{ spellId: string, modifierIds: string[] }` or `null`.

**Step 1: Write the failing tests first**

Create `src/tests/playerDeck.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  SPELL_BY_ID,
  MODIFIER_BY_ID,
  DEFAULT_DECK,
  deckToSpellInstances,
} from '../config/playerDeck.js'

describe('SPELL_BY_ID', () => {
  it('contains all 15 spells', () => {
    expect(Object.keys(SPELL_BY_ID)).toHaveLength(15)
  })
  it('maps fireball id to FIREBALL definition', () => {
    expect(SPELL_BY_ID['fireball'].name).toBe('Fireball')
  })
  it('contains all 3 ultimates', () => {
    const ults = Object.values(SPELL_BY_ID).filter(s => s.isUltimate)
    expect(ults).toHaveLength(3)
  })
})

describe('MODIFIER_BY_ID', () => {
  it('contains all 8 modifiers', () => {
    expect(Object.keys(MODIFIER_BY_ID)).toHaveLength(8)
  })
  it('maps empower id to EMPOWER modifier', () => {
    expect(MODIFIER_BY_ID['empower'].name).toBe('Empower')
  })
})

describe('DEFAULT_DECK', () => {
  it('has 8 slots', () => {
    expect(DEFAULT_DECK).toHaveLength(8)
  })
  it('first 7 slots are normal (non-ultimate) spells', () => {
    for (let i = 0; i < 7; i++) {
      const spell = SPELL_BY_ID[DEFAULT_DECK[i].spellId]
      expect(spell.isUltimate).toBe(false)
    }
  })
  it('slot 8 is an ultimate spell', () => {
    const spell = SPELL_BY_ID[DEFAULT_DECK[7].spellId]
    expect(spell.isUltimate).toBe(true)
  })
  it('all slots have empty modifierIds arrays', () => {
    for (const slot of DEFAULT_DECK) {
      expect(slot.modifierIds).toEqual([])
    }
  })
})

describe('deckToSpellInstances', () => {
  it('returns an array of 8 SpellInstances for a valid deck', () => {
    const instances = deckToSpellInstances(DEFAULT_DECK)
    expect(instances).toHaveLength(8)
    expect(instances[0]).not.toBeNull()
  })

  it('each instance has the correct spell definition', () => {
    const instances = deckToSpellInstances(DEFAULT_DECK)
    expect(instances[0].definition.id).toBe(DEFAULT_DECK[0].spellId)
  })

  it('applies modifiers correctly', () => {
    const deck = [
      { spellId: 'fireball', modifierIds: ['empower'] },
      ...DEFAULT_DECK.slice(1),
    ]
    const instances = deckToSpellInstances(deck)
    // Empower adds 20% damage; fireball baseDamage=20, so 20*1.2=24
    expect(instances[0].computedDamage).toBe(24)
  })

  it('returns null for a slot with an unknown spellId', () => {
    const deck = [
      { spellId: 'nonexistent_spell', modifierIds: [] },
      ...DEFAULT_DECK.slice(1),
    ]
    const instances = deckToSpellInstances(deck)
    expect(instances[0]).toBeNull()
  })

  it('skips unknown modifierIds silently', () => {
    const deck = [
      { spellId: 'fireball', modifierIds: ['nonexistent_mod'] },
      ...DEFAULT_DECK.slice(1),
    ]
    const instances = deckToSpellInstances(deck)
    // Should still create the instance, just without the bad modifier
    expect(instances[0]).not.toBeNull()
    expect(instances[0].modifiers).toHaveLength(0)
    // Damage should be unmodified (base 20)
    expect(instances[0].computedDamage).toBe(20)
  })

  it('returns null for a null slot', () => {
    const deck = [null, ...DEFAULT_DECK.slice(1)]
    const instances = deckToSpellInstances(deck)
    expect(instances[0]).toBeNull()
  })
})
```

**Step 2: Run to confirm they fail**

```bash
cd /home/shreerang/Projects/Deepstack/spellforge-arena && yarn test src/tests/playerDeck.test.js
```

Expected: FAIL — `playerDeck.js` not found.

**Step 3: Implement `src/config/playerDeck.js`**

```js
import {
  FIREBALL, ICE_SHARD, ARCANE_BURST, BLOOD_LANCE,
  GROUND_FLAME, DASH, BLINK_STRIKE, PHASE_WALK,
  HEALING_PULSE, MANA_SURGE, SPELL_ECHO, ARCANE_BEAM,
  METEOR, ARCANE_OVERLOAD, TEMPORAL_RESET,
} from '../game/spells/SpellDefinitions.js'
import { ALL_MODIFIERS } from '../game/spells/ModifierDefinitions.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'

// Lookup maps for serialization/deserialization
export const SPELL_BY_ID = Object.fromEntries(
  [
    FIREBALL, ICE_SHARD, ARCANE_BURST, BLOOD_LANCE,
    GROUND_FLAME, DASH, BLINK_STRIKE, PHASE_WALK,
    HEALING_PULSE, MANA_SURGE, SPELL_ECHO, ARCANE_BEAM,
    METEOR, ARCANE_OVERLOAD, TEMPORAL_RESET,
  ].map(s => [s.id, s])
)

export const MODIFIER_BY_ID = Object.fromEntries(
  ALL_MODIFIERS.map(m => [m.id, m])
)

// Default starting deck — 7 normal + 1 ultimate, no modifiers
export const DEFAULT_DECK = [
  { spellId: 'fireball',      modifierIds: [] },
  { spellId: 'ice_shard',     modifierIds: [] },
  { spellId: 'arcane_burst',  modifierIds: [] },
  { spellId: 'blood_lance',   modifierIds: [] },
  { spellId: 'ground_flame',  modifierIds: [] },
  { spellId: 'dash',          modifierIds: [] },
  { spellId: 'phase_walk',    modifierIds: [] },
  { spellId: 'meteor',        modifierIds: [] },
]

/**
 * Converts a serializable deck array to SpellInstance[].
 * Returns null for slots with unknown spellIds or null entries.
 * Unknown modifierIds are silently skipped.
 * @param {Array} deck  Array of { spellId, modifierIds } or null
 * @returns {Array}     SpellInstance[] with null for bad slots
 */
export function deckToSpellInstances(deck) {
  return deck.map(slot => {
    if (!slot) return null
    const def = SPELL_BY_ID[slot.spellId]
    if (!def) return null
    const mods = (slot.modifierIds ?? [])
      .map(id => MODIFIER_BY_ID[id])
      .filter(Boolean)
    return new SpellInstance(def, mods)
  })
}
```

**Step 4: Run tests to confirm they pass**

```bash
yarn test src/tests/playerDeck.test.js
```

Expected: all tests pass.

**Step 5: Run full suite + coverage**

```bash
yarn test:coverage
```

Expected: 564+ tests pass, all thresholds ≥ 90%.

---

### Task 2: Update `GameEngine.init()` to accept a deck

**Files:**
- Modify: `src/game/GameEngine.js`
- Modify: `src/tests/GameEngine.test.js` (verify existing tests still pass — no new tests needed here since playerDeck.js covers the conversion logic)

**Context:**
`GameEngine.init()` currently hardcodes the player's deck (test deck from Phases 5–7). We need it to accept an optional `deck` parameter (array of `SpellInstance | null`). If any slot is null or `deck` is not provided, fall back to `deckToSpellInstances(DEFAULT_DECK)`.

The import block at the top currently imports individual spell definitions and `SPLIT` modifier for the hardcoded test deck. After this change, those imports can be removed since the deck is provided externally.

**Step 1: Modify `GameEngine.js`**

At the top, replace the individual spell + modifier imports with:

```js
import { deckToSpellInstances, DEFAULT_DECK } from '../config/playerDeck.js'
```

Remove these now-unused imports:
```js
// REMOVE these lines:
import {
  FIREBALL, ICE_SHARD, ARCANE_BURST, BLOOD_LANCE,
  GROUND_FLAME, DASH, BLINK_STRIKE, PHASE_WALK,
  HEALING_PULSE, MANA_SURGE, SPELL_ECHO, ARCANE_BEAM,
  METEOR, ARCANE_OVERLOAD, TEMPORAL_RESET,
} from './spells/SpellDefinitions.js'
import { SPLIT } from './spells/ModifierDefinitions.js'
```

Change the `init()` signature and player deck assignment:

```js
init(deck = null) {
  this.player = new Player({ x: 80, y: 90, color: COLORS.PLAYER1, isBot: false })
  this.bot = new Player({ x: 240, y: 90, color: COLORS.PLAYER2, isBot: true })

  // Player deck: use provided deck, fall back to default if any slot is null/missing
  const instances = deck ?? deckToSpellInstances(DEFAULT_DECK)
  const hasNulls = instances.some(s => s == null)
  if (hasNulls) {
    console.warn('GameEngine.init: deck contains null slots, falling back to DEFAULT_DECK')
    this.player.deck = deckToSpellInstances(DEFAULT_DECK)
  } else {
    this.player.deck = instances
  }

  // Bot deck + AI (Phase 8)
  this.bot.deck = createBotDeck()
  this.botAI = new BotAI(this.bot, this.player)

  this.inputHandler = new InputHandler(this.canvas, this.player)
  this.match = new Match([this.player, this.bot])
}
```

**Step 2: Run full test suite**

```bash
yarn test
```

Expected: all tests pass (existing GameEngine tests call `engine.init()` with no args, which now uses the default fallback path — behavior is identical).

**Step 3: Run coverage**

```bash
yarn test:coverage
```

Expected: all thresholds ≥ 90%.

---

### Task 3: Update `App.jsx` — screen routing + deck state

**Files:**
- Modify: `src/ui/App.jsx`

**Context:**
`App.jsx` currently renders the header + `GameCanvas` + footer hint unconditionally. We need it to manage two screens: `'forge'` (default) and `'game'`. It owns `playerDeck` state (serializable format) loaded from localStorage.

**Step 1: Rewrite `App.jsx`**

```jsx
import { useState } from 'react'
import { GameCanvas } from './GameCanvas.jsx'
import { DeckForge } from './DeckForge.jsx'
import { DEFAULT_DECK } from '../config/playerDeck.js'

const STORAGE_KEY = 'spellforge-deck'

function loadDeck() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupted storage — ignore
  }
  return DEFAULT_DECK
}

export function App() {
  const [screen, setScreen] = useState('forge')
  const [playerDeck, setPlayerDeck] = useState(() => loadDeck())

  function handleDeckChange(newDeck) {
    setPlayerDeck(newDeck)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDeck))
  }

  function handleEnterMatch() {
    setScreen('game')
  }

  function handleMatchOver() {
    setScreen('forge')
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'monospace',
    }}>
      {screen === 'forge' && (
        <DeckForge
          deck={playerDeck}
          onDeckChange={handleDeckChange}
          onEnterMatch={handleEnterMatch}
        />
      )}
      {screen === 'game' && (
        <GameCanvas
          deck={playerDeck}
          onMatchOver={handleMatchOver}
        />
      )}
    </div>
  )
}
```

**Step 2: Run the dev server to confirm no crash**

```bash
yarn dev
```

Open http://localhost:5173 — you'll see a blank screen (DeckForge doesn't exist yet). No console errors is the goal. If there's an import error for `DeckForge.jsx`, create an empty placeholder:

```jsx
// src/ui/DeckForge.jsx — temporary placeholder
export function DeckForge() {
  return <div style={{ color: '#fff', padding: '40px' }}>Deck Forge — coming soon</div>
}
```

**Step 3: Run tests**

```bash
yarn test
```

Expected: all tests still pass.

---

### Task 4: Update `GameCanvas.jsx` — accept deck + onMatchOver props

**Files:**
- Modify: `src/ui/GameCanvas.jsx`

**Context:**
`GameCanvas` currently creates the engine with no deck and manages `handleRestart` internally. With the two-screen flow:
- It receives `deck` (serializable deck array) and `onMatchOver` (callback to return to forge screen) as props.
- When match ends, instead of showing an end-screen inline and restarting itself, it calls `onMatchOver()` to go back to Deck Forge.
- The end-screen (winner display + Play Again) now lives on the Deck Forge screen or as a brief overlay — **keep the end-screen overlay in GameCanvas** but change "Play Again" to call `onMatchOver()` instead of restarting internally.
- `engine.init()` is called with the converted `SpellInstance[]` from `deckToSpellInstances(deck)`.

**Step 1: Rewrite `GameCanvas.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../game/GameEngine.js'
import { deckToSpellInstances } from '../config/playerDeck.js'
import { MATCH_DURATION } from '../config/constants.js'

// Mirror of the deck slot layout from GameEngine._drawDeck
const RESOLUTION_W = 320
const RESOLUTION_H = 180
const SLOT = 14
const GAP = 2
const SLOTS = 8
const TOTAL_W = SLOTS * SLOT + (SLOTS - 1) * GAP
const DECK_START_X = Math.floor((RESOLUTION_W - TOTAL_W) / 2)
const DECK_Y = RESOLUTION_H - SLOT - 2

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function winnerText(winner) {
  if (winner === 'player') return 'You Win!'
  if (winner === 'bot') return 'Bot Wins!'
  return 'Draw'
}

function winnerColor(winner) {
  if (winner === 'player') return '#ffd700'
  if (winner === 'bot') return '#ff4444'
  return '#aaaaaa'
}

export function GameCanvas({ deck, onMatchOver }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const timerIntervalRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [timerDisplay, setTimerDisplay] = useState(MATCH_DURATION)
  const [matchResult, setMatchResult] = useState(null)

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
    engine.init(instances)
    engine.start()

    timerIntervalRef.current = setInterval(() => {
      const t = engineRef.current?.match?.matchTimer ?? MATCH_DURATION
      setTimerDisplay(t)
    }, 500)

    return () => {
      engine.stop()
      clearInterval(timerIntervalRef.current)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps — deck is captured once at mount

  function handleMouseMove(e) {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (!canvas || !engine?.player) return
    const rect = canvas.getBoundingClientRect()
    const gx = (e.clientX - rect.left) * (RESOLUTION_W / rect.width)
    const gy = (e.clientY - rect.top)  * (RESOLUTION_H / rect.height)
    if (gy >= DECK_Y && gy < DECK_Y + SLOT) {
      for (let i = 0; i < SLOTS; i++) {
        const sx = DECK_START_X + i * (SLOT + GAP)
        if (gx >= sx && gx < sx + SLOT) {
          const spell = engine.player.deck[i]
          if (spell) {
            setTooltip({ name: spell.definition.name, x: e.clientX, y: e.clientY })
            return
          }
          break
        }
      }
    }
    setTooltip(null)
  }

  function handleMouseLeave() {
    setTooltip(null)
  }

  return (
    <div style={{ position: 'relative' }}>
      {!matchResult && (
        <div style={{
          position: 'absolute',
          top: '8px',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: '20px',
          fontWeight: 'bold',
          color: timerDisplay <= 30 ? '#ff4444' : '#ffffff',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          {formatTime(timerDisplay)}
        </div>
      )}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          imageRendering: 'pixelated',
          width: '960px',
          height: '540px',
          background: '#000',
        }}
      />
      {matchResult && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '960px',
          height: '540px',
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '48px',
            fontWeight: 'bold',
            color: winnerColor(matchResult.winner),
            letterSpacing: '2px',
          }}>
            {winnerText(matchResult.winner)}
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffffff',
          }}>
            Time remaining: {formatTime(matchResult.timeLeft)}
          </div>
          <button
            onClick={onMatchOver}
            style={{
              marginTop: '8px',
              fontFamily: 'monospace',
              fontSize: '16px',
              padding: '10px 28px',
              background: '#222',
              color: '#fff',
              border: '2px solid #555',
              cursor: 'pointer',
              letterSpacing: '1px',
            }}
          >
            Back to Forge
          </button>
        </div>
      )}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 10,
          top: tooltip.y - 30,
          background: '#111',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '3px 7px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          {tooltip.name}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Run tests**

```bash
yarn test
```

Expected: all tests pass.

---

### Task 5: Build `DeckForge.jsx`

**Files:**
- Create: `src/ui/DeckForge.jsx` (replace placeholder if it exists)

**Context:**
The full Deck Forge UI. All 15 spells are available via `SPELL_BY_ID`, all modifiers via `ALL_MODIFIERS` and `MODIFIER_BY_ID`, validation via `validateModifier` from `ModifierDefinitions.js`.

The deck is a serializable array of 8 `{ spellId, modifierIds[] } | null` entries. Slots 0–6 must be normal spells; slot 7 must be an ultimate.

The component has two interaction modes:
1. `selectedPoolSpell` set → clicking a deck slot places that spell there
2. `selectedDeckSlot` set → modifier panel shows; clicking modifiers adds/removes them

**Implement `src/ui/DeckForge.jsx`:**

```jsx
import { useState } from 'react'
import { SPELL_BY_ID, MODIFIER_BY_ID } from '../config/playerDeck.js'
import { ALL_MODIFIERS, validateModifier } from '../game/spells/ModifierDefinitions.js'
import { DECK_SIZE, ULTIMATE_LIMIT } from '../config/constants.js'

const NORMAL_SPELLS = Object.values(SPELL_BY_ID).filter(s => !s.isUltimate)
const ULTIMATE_SPELLS = Object.values(SPELL_BY_ID).filter(s => s.isUltimate)

function isDeckComplete(deck) {
  // Slots 0-6: non-null, non-ultimate; slot 7: non-null, ultimate
  for (let i = 0; i < 7; i++) {
    if (!deck[i]) return false
    const def = SPELL_BY_ID[deck[i].spellId]
    if (!def || def.isUltimate) return false
  }
  if (!deck[7]) return false
  const ult = SPELL_BY_ID[deck[7].spellId]
  if (!ult || !ult.isUltimate) return false
  return true
}

export function DeckForge({ deck, onDeckChange, onEnterMatch }) {
  const [selectedPoolSpell, setSelectedPoolSpell] = useState(null)
  const [selectedDeckSlot, setSelectedDeckSlot] = useState(null)
  const [validationError, setValidationError] = useState(null)

  const usedSpellIds = new Set(deck.filter(Boolean).map(s => s.spellId))
  const complete = isDeckComplete(deck)

  function handlePoolSpellClick(spellDef) {
    if (selectedPoolSpell?.id === spellDef.id) {
      setSelectedPoolSpell(null)
      return
    }
    setSelectedPoolSpell(spellDef)
    setSelectedDeckSlot(null)
    setValidationError(null)
  }

  function handleDeckSlotClick(slotIndex) {
    // If we have a spell selected from pool, place it
    if (selectedPoolSpell) {
      const isUltSlot = slotIndex === 7
      if (selectedPoolSpell.isUltimate && !isUltSlot) {
        setValidationError('Ultimates can only go in slot 8')
        return
      }
      if (!selectedPoolSpell.isUltimate && isUltSlot) {
        setValidationError('Slot 8 is reserved for ultimates')
        return
      }
      const newDeck = [...deck]
      newDeck[slotIndex] = { spellId: selectedPoolSpell.id, modifierIds: [] }
      onDeckChange(newDeck)
      setSelectedPoolSpell(null)
      setValidationError(null)
      return
    }

    // No pool spell — select the slot for modifier editing (only if filled)
    if (deck[slotIndex]) {
      setSelectedDeckSlot(slotIndex === selectedDeckSlot ? null : slotIndex)
      setValidationError(null)
    }
  }

  function handleRemoveSpell(slotIndex) {
    const newDeck = [...deck]
    newDeck[slotIndex] = null
    onDeckChange(newDeck)
    if (selectedDeckSlot === slotIndex) setSelectedDeckSlot(null)
    setValidationError(null)
  }

  function handleModifierClick(modifier) {
    if (selectedDeckSlot === null) return
    const slot = deck[selectedDeckSlot]
    if (!slot) return
    const spellDef = SPELL_BY_ID[slot.spellId]
    const existingMods = slot.modifierIds.map(id => MODIFIER_BY_ID[id]).filter(Boolean)

    // Toggle off if already applied
    if (slot.modifierIds.includes(modifier.id)) {
      const newDeck = [...deck]
      newDeck[selectedDeckSlot] = {
        ...slot,
        modifierIds: slot.modifierIds.filter(id => id !== modifier.id),
      }
      onDeckChange(newDeck)
      setValidationError(null)
      return
    }

    // Validate before adding
    const error = validateModifier(modifier, spellDef, existingMods)
    if (error) {
      setValidationError(error)
      return
    }

    const newDeck = [...deck]
    newDeck[selectedDeckSlot] = {
      ...slot,
      modifierIds: [...slot.modifierIds, modifier.id],
    }
    onDeckChange(newDeck)
    setValidationError(null)
  }

  const selectedSlotData = selectedDeckSlot !== null ? deck[selectedDeckSlot] : null
  const selectedSlotDef = selectedSlotData ? SPELL_BY_ID[selectedSlotData.spellId] : null

  return (
    <div style={{
      width: '960px',
      background: '#111',
      border: '1px solid #333',
      fontFamily: 'monospace',
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #333',
        textAlign: 'center',
        letterSpacing: '4px',
        color: '#aaa',
        fontSize: '13px',
      }}>
        ✦ DECK FORGE ✦
      </div>

      {/* Main two-column area */}
      <div style={{ display: 'flex', minHeight: '400px' }}>
        {/* Left: Spell Pool */}
        <div style={{
          width: '260px',
          borderRight: '1px solid #333',
          padding: '12px',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', marginBottom: '8px' }}>
            SPELL POOL
          </div>
          {NORMAL_SPELLS.map(spell => {
            const inDeck = usedSpellIds.has(spell.id)
            const isSelected = selectedPoolSpell?.id === spell.id
            return (
              <div
                key={spell.id}
                onClick={() => inDeck ? null : handlePoolSpellClick(spell)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 8px',
                  marginBottom: '3px',
                  cursor: inDeck ? 'default' : 'pointer',
                  opacity: inDeck ? 0.35 : 1,
                  background: isSelected ? '#1a2a1a' : 'transparent',
                  border: isSelected ? '1px solid #4a4' : '1px solid transparent',
                  fontSize: '13px',
                }}
              >
                <div style={{ width: '10px', height: '10px', background: spell.color, flexShrink: 0 }} />
                {spell.name}
              </div>
            )
          })}
          <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', margin: '10px 0 8px' }}>
            ULTIMATES
          </div>
          {ULTIMATE_SPELLS.map(spell => {
            const inDeck = usedSpellIds.has(spell.id)
            const isSelected = selectedPoolSpell?.id === spell.id
            return (
              <div
                key={spell.id}
                onClick={() => inDeck ? null : handlePoolSpellClick(spell)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 8px',
                  marginBottom: '3px',
                  cursor: inDeck ? 'default' : 'pointer',
                  opacity: inDeck ? 0.35 : 1,
                  background: isSelected ? '#2a2a0a' : 'transparent',
                  border: isSelected ? '1px solid #aa4' : '1px solid transparent',
                  color: '#ffd700',
                  fontSize: '13px',
                }}
              >
                <div style={{ width: '10px', height: '10px', background: spell.color, flexShrink: 0 }} />
                {spell.name}
              </div>
            )
          })}
        </div>

        {/* Right: Deck Slots + Modifier Panel */}
        <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Deck Slots */}
          <div>
            <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', marginBottom: '8px' }}>
              YOUR DECK  (7 normal + 1 ultimate)
            </div>
            {deck.map((slot, i) => {
              const isUltSlot = i === 7
              const spellDef = slot ? SPELL_BY_ID[slot.spellId] : null
              const isSelected = selectedDeckSlot === i
              const mods = slot?.modifierIds ?? []
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {/* Slot label */}
                  <span style={{ width: '16px', color: isUltSlot ? '#ffd700' : '#666', fontSize: '12px', textAlign: 'right' }}>
                    {i + 1}.
                  </span>
                  {/* Slot body */}
                  <div
                    onClick={() => handleDeckSlotClick(i)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #fff' : '1px solid #333',
                      background: isSelected ? '#1a1a2a' : '#0d0d0d',
                      fontSize: '13px',
                      minHeight: '28px',
                    }}
                  >
                    {spellDef ? (
                      <>
                        <div style={{ width: '10px', height: '10px', background: spellDef.color, flexShrink: 0 }} />
                        <span style={{ color: isUltSlot ? '#ffd700' : '#fff' }}>{spellDef.name}</span>
                        {mods.map(id => {
                          const mod = MODIFIER_BY_ID[id]
                          return mod ? (
                            <span key={id} style={{
                              fontSize: '10px',
                              background: '#1a3a1a',
                              border: '1px solid #3a3',
                              color: '#8f8',
                              padding: '1px 5px',
                            }}>
                              {mod.name}
                            </span>
                          ) : null
                        })}
                      </>
                    ) : (
                      <span style={{ color: '#444' }}>
                        {isUltSlot ? '— ultimate slot —' : '— empty —'}
                      </span>
                    )}
                  </div>
                  {/* Remove button */}
                  {spellDef && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveSpell(i) }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#555',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 6px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Modifier Panel — only when a filled slot is selected */}
          {selectedSlotDef && (
            <div style={{ borderTop: '1px solid #333', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', marginBottom: '8px' }}>
                MODIFIERS — {selectedSlotDef.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ALL_MODIFIERS.map(mod => {
                  const applied = selectedSlotData.modifierIds.includes(mod.id)
                  const existingMods = selectedSlotData.modifierIds
                    .map(id => MODIFIER_BY_ID[id]).filter(Boolean)
                  const error = applied ? null : validateModifier(mod, selectedSlotDef, existingMods)
                  const invalid = !!error
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleModifierClick(mod)}
                      title={invalid ? error : mod.effect}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        padding: '4px 10px',
                        cursor: invalid ? 'not-allowed' : 'pointer',
                        opacity: invalid ? 0.35 : 1,
                        background: applied ? '#1a3a1a' : '#1a1a1a',
                        border: applied ? '1px solid #4a4' : '1px solid #444',
                        color: applied ? '#8f8' : '#ccc',
                      }}
                    >
                      {mod.name}{applied ? ' ✓' : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: error + Enter Match */}
      <div style={{
        borderTop: '1px solid #333',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '44px',
      }}>
        <div style={{ fontSize: '12px', color: '#f66' }}>
          {validationError ?? ''}
        </div>
        <button
          onClick={complete ? onEnterMatch : undefined}
          disabled={!complete}
          style={{
            fontFamily: 'monospace',
            fontSize: '14px',
            padding: '8px 24px',
            letterSpacing: '1px',
            cursor: complete ? 'pointer' : 'not-allowed',
            background: complete ? '#1a3a1a' : '#1a1a1a',
            color: complete ? '#8f8' : '#555',
            border: complete ? '1px solid #4a4' : '1px solid #333',
          }}
        >
          Enter Match →
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Run dev server**

```bash
yarn dev
```

Open http://localhost:5173. You should see the Deck Forge UI with the default deck loaded. Test:
- Click a spell in the pool → it highlights
- Click a deck slot → spell is placed
- Click a filled slot → modifier panel appears
- Click valid modifier → it's added with green border
- Click invalid modifier → error appears at bottom
- Click ✕ on a slot → spell is removed
- Fill all 8 slots → Enter Match button turns green and is clickable
- Remove a spell → button greys out again

**Step 3: Run full tests + coverage**

```bash
yarn test && yarn test:coverage
```

Expected: all tests pass, coverage ≥ 90% on all metrics.

---

### Task 6: End-to-end verification

**No code changes — manual testing only.**

1. Open http://localhost:5173
2. Deck Forge loads with DEFAULT_DECK pre-filled
3. Refresh page — deck persists from localStorage
4. Clear a spell, refresh — change persists
5. Fill an empty slot, click **Enter Match →** — game screen loads with your custom deck
6. In game: your spell key bindings match the deck you configured
7. Match ends — end-screen shows "Back to Forge" button
8. Click **Back to Forge** — returns to Deck Forge screen with your deck intact
9. Edit deck, Enter Match again — new deck is active in game
10. Open DevTools → Application → localStorage → verify `spellforge-deck` key contains correct JSON
