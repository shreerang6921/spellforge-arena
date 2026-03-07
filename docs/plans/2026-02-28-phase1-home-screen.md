# Phase 1: Home Screen & Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Home screen, Deck Preview screen, and update app routing from the V1 `'forge' | 'game'` model to V2's `'home' | 'forge' | 'deck-preview' | 'game'` model with a `mode` flag (`'bot' | 'online'`).

**Architecture:** Pure React UI change — no game logic touched. `App.jsx` gains a `mode` state and a `deckForgeReturn` state to track navigation context. Two new components: `Home.jsx` (menu) and `DeckPreview.jsx` (read-only deck + Continue/Edit). `DeckForge.jsx` gets updated props to support returning to either Home or DeckPreview. `Settings` back button now returns to Home instead of Deck Forge.

**Tech Stack:** React, existing CSS-in-JS inline styles (monospace, dark theme). No new dependencies.

---

## Current State

`App.jsx` routing: `'forge' | 'settings' | 'game'`
- App opens on `'forge'` (DeckForge screen)
- DeckForge has "Enter Match" → goes to game
- DeckForge has "Settings" → goes to settings
- Settings "Back" → goes back to forge
- Game "match over" → goes back to forge

## Target State

`App.jsx` routing: `'home' | 'forge' | 'deck-preview' | 'game'`
- App opens on `'home'`
- Home has 4 buttons: Play vs Bot, Play Online, Deck Forge, Settings
- "Play vs Bot" → sets `mode='bot'`, goes to `'deck-preview'`
- "Play Online" → sets `mode='online'`, goes to `'deck-preview'` (lobby wired in Phase 3)
- "Deck Forge" (from Home) → sets `deckForgeReturn='home'`, goes to `'forge'`
- "Settings" (from Home) → goes to `'settings'`
- DeckPreview "Continue" → if bot: goes to `'game'`; if online: placeholder alert for now (Phase 3)
- DeckPreview "Edit Deck" → sets `deckForgeReturn='deck-preview'`, goes to `'forge'`
- DeckForge save → returns to `deckForgeReturn` screen (`'home'` or `'deck-preview'`)
- Settings "Back" → goes to `'home'`
- Game match over → goes to `'home'`

---

## Shared Style Constants

All screens use the same dark monospace theme. Define these once in `App.jsx` and pass as needed, or just inline them (existing pattern).

```js
// existing root wrapper style — keep as-is
{
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#0a0a0a',
  color: '#fff',
  fontFamily: 'monospace',
}
```

Button style for Home (primary = highlighted, secondary = muted):
```js
// primary button (Play vs Bot)
{ padding: '12px 40px', fontSize: '16px', fontFamily: 'monospace',
  background: '#e8a020', color: '#000', border: 'none', cursor: 'pointer',
  letterSpacing: '2px', fontWeight: 'bold', marginBottom: '10px', width: '220px' }

// secondary buttons
{ padding: '10px 40px', fontSize: '14px', fontFamily: 'monospace',
  background: 'transparent', color: '#aaa', border: '1px solid #444',
  cursor: 'pointer', letterSpacing: '1px', marginBottom: '10px', width: '220px' }
```

---

## Task 1: Create `Home.jsx`

**Files:**
- Create: `src/ui/Home.jsx`

### Step 1: Create the component

```jsx
// src/ui/Home.jsx
export function Home({ onPlayBot, onPlayOnline, onDeckForge, onSettings }) {
  const primaryBtn = {
    display: 'block', padding: '12px 40px', fontSize: '16px',
    fontFamily: 'monospace', background: '#e8a020', color: '#000',
    border: 'none', cursor: 'pointer', letterSpacing: '2px',
    fontWeight: 'bold', marginBottom: '12px', width: '220px',
  }
  const secondaryBtn = {
    display: 'block', padding: '10px 40px', fontSize: '14px',
    fontFamily: 'monospace', background: 'transparent', color: '#aaa',
    border: '1px solid #444', cursor: 'pointer', letterSpacing: '1px',
    marginBottom: '10px', width: '220px',
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'monospace', letterSpacing: '4px', marginBottom: '48px', fontSize: '28px' }}>
        ✦ SPELLFORGE ARENA ✦
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={primaryBtn} onClick={onPlayBot}>PLAY VS BOT</button>
        <button style={secondaryBtn} onClick={onPlayOnline}>PLAY ONLINE</button>
        <button style={secondaryBtn} onClick={onDeckForge}>DECK FORGE</button>
        <button style={secondaryBtn} onClick={onSettings}>SETTINGS</button>
      </div>
    </div>
  )
}
```

### Step 2: Verify file exists

Run: `ls src/ui/Home.jsx`
Expected: file listed

---

## Task 2: Create `DeckPreview.jsx`

**Files:**
- Create: `src/ui/DeckPreview.jsx`

The Deck Preview shows all 8 slots read-only with spell color, name, and modifiers. It uses `SPELL_BY_ID` and `MODIFIER_BY_ID` from `playerDeck.js` to resolve names.

### Step 1: Create the component

```jsx
// src/ui/DeckPreview.jsx
import { SPELL_BY_ID, MODIFIER_BY_ID } from '../config/playerDeck.js'

export function DeckPreview({ deck, mode, onContinue, onEditDeck }) {
  const titleBtn = {
    padding: '10px 32px', fontFamily: 'monospace', fontSize: '14px',
    cursor: 'pointer', letterSpacing: '1px', border: 'none',
  }

  return (
    <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%' }}>
      <h2 style={{ fontFamily: 'monospace', letterSpacing: '3px', marginBottom: '8px' }}>
        YOUR DECK
      </h2>
      <p style={{ color: '#888', fontSize: '12px', marginBottom: '24px', fontFamily: 'monospace' }}>
        {mode === 'bot' ? 'PRACTICE vs BOT' : 'PLAY ONLINE'}
      </p>

      <div style={{ marginBottom: '32px' }}>
        {deck.map((slot, i) => {
          const spellDef = slot ? SPELL_BY_ID[slot.spellId] : null
          const isUltSlot = i === 7
          const modNames = slot
            ? slot.modifierIds.map(id => MODIFIER_BY_ID[id]?.name ?? id).join(', ')
            : ''

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px', marginBottom: '4px',
              border: '1px solid #333', background: '#111',
            }}>
              <span style={{ color: '#555', width: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
                {isUltSlot ? 'U' : i + 1}
              </span>
              <div style={{
                width: '12px', height: '12px', borderRadius: '2px', flexShrink: 0,
                background: spellDef?.color ?? '#333',
              }} />
              <span style={{ fontFamily: 'monospace', fontSize: '13px', flex: 1, textAlign: 'left',
                color: spellDef ? '#fff' : '#555' }}>
                {spellDef ? spellDef.name : '— empty —'}
              </span>
              {modNames && (
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888' }}>
                  [{modNames}]
                </span>
              )}
              {isUltSlot && spellDef && (
                <span style={{ fontSize: '10px', color: '#e8a020', fontFamily: 'monospace' }}>ULT</span>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          style={{ ...titleBtn, background: '#e8a020', color: '#000', fontWeight: 'bold' }}
          onClick={onContinue}
        >
          CONTINUE →
        </button>
        <button
          style={{ ...titleBtn, background: 'transparent', color: '#aaa', border: '1px solid #444' }}
          onClick={onEditDeck}
        >
          EDIT DECK
        </button>
      </div>
    </div>
  )
}
```

### Step 2: Verify file exists

Run: `ls src/ui/DeckPreview.jsx`
Expected: file listed

---

## Task 3: Update `DeckForge.jsx` props

**Files:**
- Modify: `src/ui/DeckForge.jsx`

DeckForge currently receives `onEnterMatch` and `onOpenSettings`. In V2 it no longer triggers match start — it just saves and returns. The `onOpenSettings` prop is removed (Settings is accessed from Home only).

**Changes:**
- Replace `onEnterMatch` prop with `onSave` (called after saving; App decides where to navigate)
- Remove `onOpenSettings` prop and the Settings button inside DeckForge
- Rename the "Enter Match →" button to "Save & Return" (or context-aware label via a `saveLabel` prop)

### Step 1: Read the current bottom section of DeckForge

Read `src/ui/DeckForge.jsx` lines 180–end to find the footer/button area before editing.

### Step 2: Update the component signature

Find:
```jsx
export function DeckForge({ deck, onDeckChange, onEnterMatch, onOpenSettings }) {
```

Replace with:
```jsx
export function DeckForge({ deck, onDeckChange, onSave, saveLabel = 'SAVE & RETURN' }) {
```

### Step 3: Remove Settings button and update Enter Match button

Find the footer area containing the Settings button and Enter Match button. Replace the entire footer with:

```jsx
<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '12px' }}>
  <button
    disabled={!complete}
    onClick={() => complete && onSave()}
    style={{
      padding: '8px 20px', fontFamily: 'monospace', fontSize: '13px',
      background: complete ? '#e8a020' : '#333',
      color: complete ? '#000' : '#666',
      border: 'none', cursor: complete ? 'pointer' : 'default',
      letterSpacing: '1px',
    }}
  >
    {saveLabel}
  </button>
</div>
```

### Step 4: Verify the file compiles (run dev server or check for syntax errors)

Run: `yarn build 2>&1 | tail -20`
Expected: build succeeds with no errors

---

## Task 4: Update `App.jsx` routing

**Files:**
- Modify: `src/ui/App.jsx`

### Step 1: Write the new App.jsx

Replace the entire file with:

```jsx
import { useState } from 'react'
import { GameCanvas } from './GameCanvas.jsx'
import { DeckForge } from './DeckForge.jsx'
import { Settings } from './Settings.jsx'
import { Home } from './Home.jsx'
import { DeckPreview } from './DeckPreview.jsx'
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
  const [screen, setScreen] = useState('home')
  const [mode, setMode] = useState(null)             // 'bot' | 'online'
  const [deckForgeReturn, setDeckForgeReturn] = useState('home')  // where DeckForge returns to
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

  function handlePlayBot() {
    setMode('bot')
    setScreen('deck-preview')
  }

  function handlePlayOnline() {
    setMode('online')
    setScreen('deck-preview')
  }

  function handleDeckForgeFromHome() {
    setDeckForgeReturn('home')
    setScreen('forge')
  }

  function handleEditDeckFromPreview() {
    setDeckForgeReturn('deck-preview')
    setScreen('forge')
  }

  function handleDeckForgeSave() {
    setScreen(deckForgeReturn)
  }

  function handleContinueFromPreview() {
    if (mode === 'bot') {
      setScreen('game')
    } else {
      // Phase 3: setScreen('lobby')
      alert('Online mode coming in Phase 3!')
    }
  }

  const rootStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: 'monospace',
  }

  return (
    <div style={rootStyle}>
      {screen === 'home' && (
        <Home
          onPlayBot={handlePlayBot}
          onPlayOnline={handlePlayOnline}
          onDeckForge={handleDeckForgeFromHome}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'deck-preview' && (
        <DeckPreview
          deck={playerDeck}
          mode={mode}
          onContinue={handleContinueFromPreview}
          onEditDeck={handleEditDeckFromPreview}
        />
      )}
      {screen === 'forge' && (
        <DeckForge
          deck={playerDeck}
          onDeckChange={handleDeckChange}
          onSave={handleDeckForgeSave}
          saveLabel={deckForgeReturn === 'deck-preview' ? 'SAVE & CONTINUE →' : 'SAVE & RETURN'}
        />
      )}
      {screen === 'settings' && (
        <Settings
          keybindings={keybindings}
          onSave={handleKeybindingsChange}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'game' && (
        <GameCanvas
          deck={playerDeck}
          keybindings={keybindings}
          onMatchOver={() => setScreen('home')}
        />
      )}
    </div>
  )
}
```

### Step 2: Run the dev server and manually verify all flows

Run: `yarn dev`

Check each flow in the browser:
- [ ] App opens on Home screen with 4 buttons
- [ ] "Play vs Bot" → Deck Preview shows "PRACTICE vs BOT", deck slots visible
- [ ] "Continue" from Deck Preview (bot mode) → game starts
- [ ] Match ends → returns to Home (not Deck Forge)
- [ ] "Edit Deck" from Deck Preview → Deck Forge with "SAVE & CONTINUE →" button
- [ ] Save in Deck Forge (from preview) → returns to Deck Preview
- [ ] "Deck Forge" from Home → Deck Forge with "SAVE & RETURN" button
- [ ] Save in Deck Forge (from home) → returns to Home
- [ ] "Settings" from Home → Settings screen
- [ ] "Back" in Settings → returns to Home (not Deck Forge)
- [ ] "Play Online" → Deck Preview shows "PLAY ONLINE"; Continue shows placeholder alert

### Step 3: Verify existing tests still pass

Run: `yarn test`
Expected: all 580+ existing tests pass (no game logic was touched)

### Step 4: Run coverage check

Run: `yarn test:coverage`
Expected: all metrics remain ≥ 90% (UI is excluded from scope; no regression)

### Step 5: Commit

```bash
git add src/ui/Home.jsx src/ui/DeckPreview.jsx src/ui/DeckForge.jsx src/ui/App.jsx
git commit -m "feat: add home screen and deck preview navigation (Phase 1)"
```

---

## Summary of All File Changes

| File | Action | Notes |
|---|---|---|
| `src/ui/Home.jsx` | Create | New home menu with 4 buttons |
| `src/ui/DeckPreview.jsx` | Create | Read-only deck view + Continue/Edit |
| `src/ui/App.jsx` | Modify | New routing: home/forge/deck-preview/game + mode state |
| `src/ui/DeckForge.jsx` | Modify | Replace `onEnterMatch`/`onOpenSettings` with `onSave`/`saveLabel` |

No game logic files touched. No new dependencies. All 580+ existing tests should continue passing.
