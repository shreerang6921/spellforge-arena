# Phase 10: Deck Forge UI — Design

**Date:** 2026-02-27
**Branch:** sk-add-match-logic
**Status:** Approved

---

## Overview

Add a pre-match Deck Forge screen where the player configures their 8-spell deck (7 normal + 1 ultimate) with up to 2 modifiers per spell before entering a match. The deck persists in localStorage.

---

## Architecture

### App flow

`App.jsx` manages two screens via `screen` state (`'forge'` | `'game'`):

- **forge**: shows `DeckForge` component
- **game**: shows `GameCanvas` component, receives `playerDeck` as prop

```
App
├── screen: 'forge'  →  DeckForge(deck, onDeckChange, onEnterMatch)
└── screen: 'game'   →  GameCanvas(deck)
                         └── match ends → back to 'forge'
```

### Deck state format

The deck is stored as a plain serializable array (not SpellInstances) to enable localStorage persistence:

```js
// One entry per slot (8 total)
[
  { spellId: 'fireball', modifierIds: ['empower'] },
  { spellId: 'ice_shard', modifierIds: [] },
  null,  // empty slot
  ...
]
```

`App.jsx` owns `playerDeck` as `useState`, initialized from `localStorage.getItem('spellforge-deck')` (parsed JSON) or `DEFAULT_DECK` if nothing saved. Saves to localStorage on every `onDeckChange` call.

### New files

| File | Purpose |
|---|---|
| `src/config/playerDeck.js` | `DEFAULT_DECK`, `deckToSpellInstances()`, `ALL_SPELLS` lookup map |
| `src/ui/DeckForge.jsx` | Full Deck Forge UI component |

### Modified files

| File | Change |
|---|---|
| `src/ui/App.jsx` | Add screen state, deck state, localStorage load/save, route to DeckForge or GameCanvas |
| `src/ui/GameCanvas.jsx` | Accept `deck` prop; convert to SpellInstances for engine.init() |
| `src/game/GameEngine.js` | `init(deck)` accepts an optional deck array; falls back to DEFAULT_DECK if deck has nulls |

---

## `src/config/playerDeck.js`

Exports:

```js
// Lookup maps for serialization/deserialization
export const SPELL_BY_ID    // { fireball: FIREBALL, ... } — all 15 spells
export const MODIFIER_BY_ID // { empower: EMPOWER, ... } — all 8 modifiers

// Starting deck (no modifiers)
export const DEFAULT_DECK = [
  { spellId: 'fireball',      modifierIds: [] },
  { spellId: 'ice_shard',     modifierIds: [] },
  { spellId: 'arcane_burst',  modifierIds: [] },
  { spellId: 'blood_lance',   modifierIds: [] },
  { spellId: 'ground_flame',  modifierIds: [] },
  { spellId: 'dash',          modifierIds: [] },
  { spellId: 'phase_walk',    modifierIds: [] },
  { spellId: 'meteor',        modifierIds: [] },  // ultimate
]

// Converts serializable deck → SpellInstance[]
// Returns null for slots with unknown spellIds
// Unknown modifierIds are silently skipped
export function deckToSpellInstances(deck)
```

---

## DeckForge Component

### Props

```js
DeckForge({ deck, onDeckChange, onEnterMatch })
```

### Local state

```js
selectedPoolSpell   // spellDefinition object | null — spell selected from pool
selectedDeckSlot    // index 0–7 | null — slot selected from deck
validationError     // string | null — last modifier/deck validation error
```

### Interaction rules

**Spell pool → deck slot:**
1. Click spell in pool → sets `selectedPoolSpell`
2. Click empty deck slot → places spell there; if slot was filled, old spell is removed
3. Click filled deck slot with same spell → removes spell (toggle)
4. Spells already in the deck are dimmed in the pool (click to remove from that slot directly too)

**Slot selection for modifiers:**
1. Click filled deck slot (without `selectedPoolSpell` active) → sets `selectedDeckSlot`
2. Modifier panel appears showing all 8 modifiers for that slot's spell
3. Click valid, non-applied modifier → adds it (via `validateModifier`); error shown if invalid
4. Click already-applied modifier → removes it
5. Slot highlighted in deck while selected

**Enter Match:**
- Disabled if deck is not complete (any of slots 0–6 empty/null or slot 7 not an ultimate)
- Calls `onEnterMatch(deck)`

### UI layout

```
┌──────────────────────────────────────────────────────┐
│                   ✦ DECK FORGE ✦                     │
├─────────────────────┬────────────────────────────────┤
│  SPELL POOL         │  YOUR DECK  (7 normal + 1 ult) │
│                     │                                │
│  ● Fireball         │  1. ██ Fireball  [Empower]     │
│  ● Ice Shard        │  2. ██ Ice Shard               │
│  ● Arcane Burst     │  3. ██ Ground Flame            │
│  ...                │  4. — empty —                  │
│  ── ULTIMATES ──    │  ...                           │
│  ◆ Meteor           │  ── ULTIMATE ──                │
│  ◆ Arcane Overload  │  8. ██ Meteor                  │
│  ◆ Temporal Reset   │                                │
│                     ├────────────────────────────────┤
│                     │  MODIFIERS  (Slot 1: Fireball) │
│                     │  [Empower ✓] [Quick Cast]      │
│                     │  [Split ✕]   [Lifesteal]       │
│                     │  (✕ = not valid for this spell) │
├─────────────────────┴────────────────────────────────┤
│  ⚠ error message here (if any)                       │
│                               [ Enter Match → ]      │
└──────────────────────────────────────────────────────┘
```

### Visual style

- Background: `#0a0a0a` (matches App)
- Font: monospace throughout
- Spell color swatch: small colored square using `spellDef.color`
- Selected pool spell: gold border highlight
- Selected deck slot: white border highlight
- Applied modifier: green border
- Invalid modifier: 40% opacity, `not-allowed` cursor
- Ultimates: gold color (`#ffd700`) in both pool and deck
- Enter Match button: disabled (grey) when deck incomplete, bright when ready

---

## Error Handling

`deckToSpellInstances(deck)`:
- Unknown `spellId` → `null` for that slot
- Unknown `modifierId` → silently skipped

`GameEngine.init(deck)`:
- If `deck` has any `null` entries → falls back to `deckToSpellInstances(DEFAULT_DECK)` and logs a console warning
- If `deck` is not provided → same fallback

This ensures the game never crashes due to corrupted localStorage data.

---

## Testing

Coverage scope: `src/game/**` and `src/config/**`

**`src/config/playerDeck.js`** needs tests (new file in coverage scope):

1. `DEFAULT_DECK` — valid structure: 8 entries, first 7 non-ultimate, last is ultimate
2. `deckToSpellInstances()` — happy path: correct SpellInstances returned
3. `deckToSpellInstances()` — unknown spellId returns null for that slot
4. `deckToSpellInstances()` — unknown modifierId is skipped
5. `deckToSpellInstances()` — modifiers are applied correctly on the SpellInstance
6. `SPELL_BY_ID` lookup — contains all 15 spells
7. `MODIFIER_BY_ID` lookup — contains all 8 modifiers

`DeckForge.jsx` and `App.jsx` changes are React UI outside coverage scope — no unit tests required.

---

## Non-Goals (V1)

- Keyboard navigation in Deck Forge
- Animated transitions between screens
- Spell search/filter in the pool
- Undo/redo for deck edits
- Multiple saved decks
