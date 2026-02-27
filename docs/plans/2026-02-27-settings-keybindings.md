# Settings & Keybindings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Settings screen that lets the player rebind all 12 action keys (4 movement + 8 spell slots), with bindings persisted to localStorage and wired through to `InputHandler`.

**Architecture:** `src/config/keybindings.js` owns defaults and localStorage persistence (mirrors the `playerDeck.js` pattern). `Settings.jsx` is a third screen in `App.jsx` alongside `'forge'` and `'game'`. `App.jsx` holds `keybindings` state and passes it down to `GameCanvas`, which forwards it to `GameEngine.init()`, which passes it to `InputHandler`. `InputHandler` currently hardcodes spell slot keys as `['Digit1'...'Digit8']` — this needs to be updated to read from the `keybindings` param too.

**Tech Stack:** Vanilla JS, React (UI only), localStorage, Vitest

---

## Context & Constraints

- 12 rebindable actions: **Move Up, Move Down, Move Left, Move Right, Spell 1–8**
- Basic Attack (Left Click) and Aim (Mouse) are **not** rebindable per spec
- `InputHandler` at `src/game/InputHandler.js`:
  - Already accepts `keybindings` as third constructor arg for movement keys (lines 12–17)
  - Spell slot keys are currently **hardcoded** as `static SPELL_KEYS = ['Digit1'...'Digit8']` (line 3/6/46) — needs to be made configurable
- `GameEngine.init(deck)` at line 59 currently does `new InputHandler(this.canvas, this.player)` — needs keybindings forwarded
- Test runner: `yarn test` | Coverage: `yarn test:coverage`
- Coverage scope: `src/game/**` and `src/config/**` (UI files excluded)

---

## Task 1: `src/config/keybindings.js` — defaults + localStorage persistence

**Files:**
- Create: `src/config/keybindings.js`
- Create: `src/tests/keybindings.test.js`

### Step 1: Write the failing test

```js
// src/tests/keybindings.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_KEYBINDINGS, loadKeybindings, saveKeybindings } from '../config/keybindings.js'

describe('DEFAULT_KEYBINDINGS', () => {
  it('has correct movement defaults', () => {
    expect(DEFAULT_KEYBINDINGS.up).toBe('KeyW')
    expect(DEFAULT_KEYBINDINGS.down).toBe('KeyS')
    expect(DEFAULT_KEYBINDINGS.left).toBe('KeyA')
    expect(DEFAULT_KEYBINDINGS.right).toBe('KeyD')
  })

  it('has correct spell slot defaults', () => {
    expect(DEFAULT_KEYBINDINGS.spell1).toBe('Digit1')
    expect(DEFAULT_KEYBINDINGS.spell2).toBe('Digit2')
    expect(DEFAULT_KEYBINDINGS.spell8).toBe('Digit8')
  })
})

describe('loadKeybindings', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing stored', () => {
    expect(loadKeybindings()).toEqual(DEFAULT_KEYBINDINGS)
  })

  it('returns stored value when present', () => {
    const custom = { ...DEFAULT_KEYBINDINGS, up: 'ArrowUp' }
    localStorage.setItem('spellforge-keybindings', JSON.stringify(custom))
    expect(loadKeybindings()).toEqual(custom)
  })

  it('returns defaults when localStorage is corrupted', () => {
    localStorage.setItem('spellforge-keybindings', 'not-json')
    expect(loadKeybindings()).toEqual(DEFAULT_KEYBINDINGS)
  })

  it('merges stored partial with defaults — missing keys fall back', () => {
    localStorage.setItem('spellforge-keybindings', JSON.stringify({ up: 'ArrowUp' }))
    const result = loadKeybindings()
    expect(result.up).toBe('ArrowUp')
    expect(result.down).toBe('KeyS')
    expect(result.spell1).toBe('Digit1')
  })
})

describe('saveKeybindings', () => {
  beforeEach(() => localStorage.clear())

  it('stores keybindings in localStorage', () => {
    const custom = { ...DEFAULT_KEYBINDINGS, up: 'ArrowUp' }
    saveKeybindings(custom)
    const stored = JSON.parse(localStorage.getItem('spellforge-keybindings'))
    expect(stored).toEqual(custom)
  })
})
```

### Step 2: Run to confirm failure

```bash
yarn test src/tests/keybindings.test.js
```
Expected: FAIL — "Cannot find module '../config/keybindings.js'"

### Step 3: Implement `src/config/keybindings.js`

```js
const STORAGE_KEY = 'spellforge-keybindings'

export const DEFAULT_KEYBINDINGS = {
  up:     'KeyW',
  down:   'KeyS',
  left:   'KeyA',
  right:  'KeyD',
  spell1: 'Digit1',
  spell2: 'Digit2',
  spell3: 'Digit3',
  spell4: 'Digit4',
  spell5: 'Digit5',
  spell6: 'Digit6',
  spell7: 'Digit7',
  spell8: 'Digit8',
}

export function loadKeybindings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_KEYBINDINGS, ...JSON.parse(raw) }
  } catch {
    // corrupted — ignore
  }
  return { ...DEFAULT_KEYBINDINGS }
}

export function saveKeybindings(bindings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
}
```

### Step 4: Run to confirm passing

```bash
yarn test src/tests/keybindings.test.js
```
Expected: All tests PASS

### Step 5: Run full coverage

```bash
yarn test:coverage
```
Expected: All thresholds > 90%

---

## Task 2: Update `InputHandler` to support custom spell slot keybindings

`InputHandler` currently hardcodes spell keys as a static array. Change it to build the spell key array from the `keybindings` param.

**Files:**
- Modify: `src/game/InputHandler.js`
- Modify: `src/tests/InputHandler.test.js` (add test for custom spell keybinding)

### Step 1: Write the new failing test

Add this describe block to the end of `src/tests/InputHandler.test.js`:

```js
describe('InputHandler — custom spell keybindings', () => {
  it('uses custom spell key when provided', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const { DEFAULT_KEYBINDINGS } = await import('../config/keybindings.js')
    const custom = { ...DEFAULT_KEYBINDINGS, spell1: 'KeyQ' }
    const handler = new InputHandler(canvas, player, custom)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    expect(player.input.spellSlots[0]).toBe(true)
    handler.destroy()
  })

  it('default Digit1 no longer triggers slot 0 when rebound', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const { DEFAULT_KEYBINDINGS } = await import('../config/keybindings.js')
    const custom = { ...DEFAULT_KEYBINDINGS, spell1: 'KeyQ' }
    const handler = new InputHandler(canvas, player, custom)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }))
    expect(player.input.spellSlots[0]).toBe(false)
    handler.destroy()
  })
})
```

Note: Since this uses a dynamic import inside a test, use the top-level import instead:

```js
// At top of InputHandler.test.js, add:
import { DEFAULT_KEYBINDINGS } from '../config/keybindings.js'

// Then the tests become:
describe('InputHandler — custom spell keybindings', () => {
  it('uses custom spell key when provided', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const custom = { ...DEFAULT_KEYBINDINGS, spell1: 'KeyQ' }
    const handler = new InputHandler(canvas, player, custom)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    expect(player.input.spellSlots[0]).toBe(true)
    handler.destroy()
  })

  it('default Digit1 no longer triggers slot 0 when rebound', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const custom = { ...DEFAULT_KEYBINDINGS, spell1: 'KeyQ' }
    const handler = new InputHandler(canvas, player, custom)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }))
    expect(player.input.spellSlots[0]).toBe(false)
    handler.destroy()
  })
})
```

### Step 2: Run to confirm failure

```bash
yarn test src/tests/InputHandler.test.js
```
Expected: The two new tests FAIL (Digit1 still triggers slot 0 regardless of custom binding)

### Step 3: Update `InputHandler.js`

Replace the hardcoded `SPELL_KEYS` with a per-instance array built from `keybindings`:

```js
import { RESOLUTION_W, RESOLUTION_H } from '../config/constants.js'
import { DEFAULT_KEYBINDINGS } from '../config/keybindings.js'

export class InputHandler {
  constructor(canvas, player, keybindings) {
    this.canvas = canvas
    this.player = player
    this.mouse = { x: 0, y: 0 }

    const kb = { ...DEFAULT_KEYBINDINGS, ...keybindings }

    this.keys = {
      up:    kb.up,
      down:  kb.down,
      left:  kb.left,
      right: kb.right,
    }

    // Build spell slot key array from keybindings (slot 0 = spell1, etc.)
    this.spellKeys = [
      kb.spell1, kb.spell2, kb.spell3, kb.spell4,
      kb.spell5, kb.spell6, kb.spell7, kb.spell8,
    ]

    this._onKeyDown   = this._onKeyDown.bind(this)
    this._onKeyUp     = this._onKeyUp.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onMouseDown = this._onMouseDown.bind(this)
    this._onMouseUp   = this._onMouseUp.bind(this)

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup',   this._onKeyUp)
    canvas.addEventListener('mousemove', this._onMouseMove)
    canvas.addEventListener('mousedown', this._onMouseDown)
    canvas.addEventListener('mouseup',   this._onMouseUp)
  }

  _onKeyDown(e) { this._setKey(e.code, true) }
  _onKeyUp(e)   { this._setKey(e.code, false) }

  _setKey(code, value) {
    if (code === this.keys.up)    this.player.input.up    = value
    if (code === this.keys.down)  this.player.input.down  = value
    if (code === this.keys.left)  this.player.input.left  = value
    if (code === this.keys.right) this.player.input.right = value

    const slot = this.spellKeys.indexOf(code)
    if (slot !== -1) this.player.input.spellSlots[slot] = value
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = RESOLUTION_W / rect.width
    const scaleY = RESOLUTION_H / rect.height
    this.mouse.x = Math.round((e.clientX - rect.left) * scaleX)
    this.mouse.y = Math.round((e.clientY - rect.top)  * scaleY)
  }

  _onMouseDown(e) {
    if (e.button === 0) this.player.input.attack = true
  }

  _onMouseUp(e) {
    if (e.button === 0) this.player.input.attack = false
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup',   this._onKeyUp)
    this.canvas.removeEventListener('mousemove', this._onMouseMove)
    this.canvas.removeEventListener('mousedown', this._onMouseDown)
    this.canvas.removeEventListener('mouseup',   this._onMouseUp)
  }
}
```

**Note:** The `static SPELL_KEYS` class property is removed — anything referencing `InputHandler.SPELL_KEYS` externally must be updated. Check:

```bash
grep -r "InputHandler.SPELL_KEYS" src/
```

If any files reference it, update them to use `handler.spellKeys` on an instance instead.

### Step 4: Run all tests

```bash
yarn test
```
Expected: All tests PASS (existing tests still pass because defaults are preserved via `DEFAULT_KEYBINDINGS` merge)

### Step 5: Run coverage

```bash
yarn test:coverage
```
Expected: All thresholds > 90%

---

## Task 3: Wire keybindings through `GameEngine.init` and `GameCanvas`

**Files:**
- Modify: `src/game/GameEngine.js` (line 59 — `InputHandler` construction; line 41 — `init` signature)
- Modify: `src/ui/GameCanvas.jsx` (accept `keybindings` prop, pass to `engine.init`)

### Step 1: Update `GameEngine.init` to accept and forward keybindings

In `src/game/GameEngine.js`, two changes:

```js
// Line 41 — change signature:
init(deck = null, keybindings = null) {

// Line 59 — pass keybindings to InputHandler:
this.inputHandler = new InputHandler(this.canvas, this.player, keybindings ?? undefined)
```

`keybindings ?? undefined` converts `null` → `undefined`, so `InputHandler` uses its default merge logic correctly.

### Step 2: Run all tests to confirm nothing broke

```bash
yarn test
```
Expected: All tests pass

### Step 3: Update `GameCanvas.jsx` to accept and forward keybindings

In `src/ui/GameCanvas.jsx`:

```jsx
// Change prop signature:
export function GameCanvas({ deck, keybindings, onMatchOver }) {

// In the useEffect, change engine.init call:
engine.init(instances, keybindings ?? undefined)
```

(The `instances` variable is `deckToSpellInstances(deck)`, already computed before the `engine.init` call.)

### Step 4: Run tests

```bash
yarn test
```
Expected: All tests pass

---

## Task 4: `Settings.jsx` — rebinding UI screen

**Files:**
- Create: `src/ui/Settings.jsx`

No unit tests needed (UI component, coverage scope excludes `src/ui/`).

### Step 1: Implement `src/ui/Settings.jsx`

```jsx
import { useState } from 'react'
import { DEFAULT_KEYBINDINGS } from '../config/keybindings.js'

const ACTION_LABELS = [
  { key: 'up',    label: 'Move Up',    group: 'movement' },
  { key: 'down',  label: 'Move Down',  group: 'movement' },
  { key: 'left',  label: 'Move Left',  group: 'movement' },
  { key: 'right', label: 'Move Right', group: 'movement' },
  { key: 'spell1', label: 'Spell 1', group: 'spells' },
  { key: 'spell2', label: 'Spell 2', group: 'spells' },
  { key: 'spell3', label: 'Spell 3', group: 'spells' },
  { key: 'spell4', label: 'Spell 4', group: 'spells' },
  { key: 'spell5', label: 'Spell 5', group: 'spells' },
  { key: 'spell6', label: 'Spell 6', group: 'spells' },
  { key: 'spell7', label: 'Spell 7', group: 'spells' },
  { key: 'spell8', label: 'Spell 8', group: 'spells' },
]

function formatKeyCode(code) {
  if (!code) return '?'
  if (code.startsWith('Key'))   return code.slice(3)   // 'KeyW' → 'W'
  if (code.startsWith('Digit')) return code.slice(5)   // 'Digit1' → '1'
  if (code === 'ArrowUp')    return '↑'
  if (code === 'ArrowDown')  return '↓'
  if (code === 'ArrowLeft')  return '←'
  if (code === 'ArrowRight') return '→'
  if (code === 'Space')      return 'Space'
  return code
}

export function Settings({ keybindings, onSave, onBack }) {
  const [bindings, setBindings] = useState({ ...keybindings })
  const [listening, setListening] = useState(null) // action key string or null

  function handleRebindClick(actionKey) {
    setListening(actionKey)

    function onKeyDown(e) {
      e.preventDefault()
      if (e.code === 'Escape') {
        setListening(null)
        window.removeEventListener('keydown', onKeyDown)
        return
      }
      const newBindings = { ...bindings, [actionKey]: e.code }
      setBindings(newBindings)
      onSave(newBindings)
      setListening(null)
      window.removeEventListener('keydown', onKeyDown)
    }

    window.addEventListener('keydown', onKeyDown)
  }

  function handleReset() {
    setBindings({ ...DEFAULT_KEYBINDINGS })
    onSave({ ...DEFAULT_KEYBINDINGS })
  }

  const movementActions = ACTION_LABELS.filter(a => a.group === 'movement')
  const spellActions    = ACTION_LABELS.filter(a => a.group === 'spells')

  const tableStyle = { borderCollapse: 'collapse', width: '100%' }
  const thStyle    = { textAlign: 'left', padding: '4px 12px', color: '#aaa', fontSize: '11px' }
  const tdStyle    = { padding: '5px 12px', fontSize: '13px' }

  function renderRow({ key, label }) {
    return (
      <tr key={key}>
        <td style={tdStyle}>{label}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>
          <button
            onClick={() => handleRebindClick(key)}
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '3px 14px',
              background: listening === key ? '#442244' : '#222',
              color:      listening === key ? '#ff88ff' : '#fff',
              border:     `1px solid ${listening === key ? '#ff88ff' : '#555'}`,
              cursor: 'pointer',
              minWidth: '72px',
            }}
          >
            {listening === key ? 'Press key…' : formatKeyCode(bindings[key])}
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      padding: '36px',
      fontFamily: 'monospace',
      color: '#fff',
      minWidth: '420px',
    }}>
      <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '2px' }}>
        SETTINGS
      </div>
      <div style={{ fontSize: '12px', color: '#888' }}>
        Click a key to rebind it, then press any key. Esc to cancel.
      </div>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
        {/* Movement */}
        <div>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '6px', letterSpacing: '1px' }}>MOVEMENT</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Action</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Key</th>
              </tr>
            </thead>
            <tbody>{movementActions.map(renderRow)}</tbody>
          </table>
        </div>

        {/* Spells */}
        <div>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '6px', letterSpacing: '1px' }}>SPELLS</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Action</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Key</th>
              </tr>
            </thead>
            <tbody>{spellActions.map(renderRow)}</tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
        <button
          onClick={handleReset}
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '7px 20px',
            background: '#222',
            color: '#aaa',
            border: '1px solid #444',
            cursor: 'pointer',
          }}
        >
          Reset Defaults
        </button>
        <button
          onClick={onBack}
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '7px 24px',
            background: '#222',
            color: '#fff',
            border: '1px solid #555',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      </div>
    </div>
  )
}
```

---

## Task 5: Wire Settings into `App.jsx` + Settings button in `DeckForge.jsx`

**Files:**
- Modify: `src/ui/App.jsx`
- Modify: `src/ui/DeckForge.jsx` (add Settings button to footer)

### Step 1: Update `App.jsx`

```jsx
import { useState } from 'react'
import { GameCanvas } from './GameCanvas.jsx'
import { DeckForge } from './DeckForge.jsx'
import { Settings } from './Settings.jsx'
import { DEFAULT_DECK } from '../config/playerDeck.js'
import { loadKeybindings, saveKeybindings } from '../config/keybindings.js'

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
  const [keybindings, setKeybindings] = useState(() => loadKeybindings())

  function handleDeckChange(newDeck) {
    setPlayerDeck(newDeck)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDeck))
  }

  function handleKeybindingsChange(newBindings) {
    setKeybindings(newBindings)
    saveKeybindings(newBindings)
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
          onEnterMatch={() => setScreen('game')}
          onOpenSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'settings' && (
        <Settings
          keybindings={keybindings}
          onSave={handleKeybindingsChange}
          onBack={() => setScreen('forge')}
        />
      )}
      {screen === 'game' && (
        <GameCanvas
          deck={playerDeck}
          keybindings={keybindings}
          onMatchOver={() => setScreen('forge')}
        />
      )}
    </div>
  )
}
```

### Step 2: Add Settings button to `DeckForge.jsx` footer

Find the footer in `DeckForge.jsx` that contains the "Enter Match" button. Add `onOpenSettings` to the props and insert a Settings button:

```jsx
// Destructure props — add onOpenSettings:
export function DeckForge({ deck, onDeckChange, onEnterMatch, onOpenSettings }) {

// In the footer row, add a Settings button alongside Enter Match:
<button
  onClick={onOpenSettings}
  style={{
    fontFamily: 'monospace',
    fontSize: '14px',
    padding: '8px 20px',
    background: '#222',
    color: '#aaa',
    border: '1px solid #444',
    cursor: 'pointer',
  }}
>
  ⚙ Settings
</button>
```

### Step 3: Run all tests

```bash
yarn test
```
Expected: All tests pass

### Step 4: Run full coverage check

```bash
yarn test:coverage
```
Expected: All thresholds > 90%

---

## Manual Verification Checklist

1. Deck Forge footer shows a "⚙ Settings" button
2. Click Settings → Settings screen shows two columns: Movement (4 rows) and Spells (8 rows)
3. Each row shows the current key (e.g. "W", "1")
4. Click a key button → turns pink, shows "Press key…"
5. Press a new key → button updates immediately; binding saved to localStorage
6. Press Esc during listen → cancels, key unchanged
7. "Reset Defaults" → all 12 keys revert to W/S/A/D and 1–8
8. "Back" → returns to Deck Forge
9. Enter a match → player moves with rebound movement keys
10. Spell slots fire with rebound spell keys (rebind spell1 to Q → pressing Q casts slot 1)
11. Refresh page → Settings shows persisted custom bindings; in-game bindings still work
