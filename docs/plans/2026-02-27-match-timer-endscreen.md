# Match Timer + End-Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a live countdown timer above the canvas and an end-screen overlay (winner, time remaining, Play Again button) to GameCanvas.jsx.

**Architecture:** `GameEngine` gains an `onMatchOver` callback field called just before `stop()`. `GameCanvas.jsx` polls `engine.match.matchTimer` via `setInterval(500ms)` for the timer display and sets React state from the callback for the end-screen. Restart tears down the old engine and creates a fresh one.

**Tech Stack:** React (useState, useEffect, useRef), vanilla JS GameEngine, Vitest for engine tests.

---

### Task 1: Add `onMatchOver` callback to GameEngine

**Files:**
- Modify: `src/game/GameEngine.js`

**Context:**
`GameEngine.update(dt)` already calls `this.stop()` when `this.match.matchOver` is true (lines ~113–117). We need to fire a callback before stopping so React can capture the result.

**Step 1: Add `this.onMatchOver = null` to the constructor**

In `GameEngine.js` constructor, after `this.match = null`, add:

```js
this.onMatchOver = null
```

**Step 2: Call the callback in the match-over branch of `update()`**

Find the current match-over block (looks like this):

```js
if (this.match) {
  this.match.update(dt)
  if (this.match.matchOver) {
    this.arcaneBeamActive = false
    this.stop()
    return
  }
}
```

Replace with:

```js
if (this.match) {
  this.match.update(dt)
  if (this.match.matchOver) {
    this.onMatchOver?.(this.match.winner, this.match.matchTimer)
    this.arcaneBeamActive = false
    this.stop()
    return
  }
}
```

**Step 3: Run all tests to confirm nothing broke**

```bash
yarn test
```

Expected: all 564 tests pass.

---

### Task 2: Add live timer to GameCanvas.jsx

**Files:**
- Modify: `src/ui/GameCanvas.jsx`

**Context:**
`GameCanvas.jsx` currently has: canvas ref, engine ref, tooltip state, mouse handlers, and the JSX. The canvas wrapper div uses `position: relative`. We need to add a timer display above the canvas.

**Step 1: Add `timerDisplay` state**

After the existing `useState(null)` for tooltip, add:

```js
const [timerDisplay, setTimerDisplay] = useState(300)
const [matchResult, setMatchResult] = useState(null) // { winner, timeLeft }
```

**Step 2: Add interval + callback wiring in useEffect**

Replace the existing `useEffect` with:

```js
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return

  const engine = new GameEngine(canvas)
  engineRef.current = engine

  engine.onMatchOver = (winner, timeLeft) => {
    setMatchResult({ winner, timeLeft })
  }

  engine.init()
  engine.start()

  // Poll timer every 500ms — seconds-level precision is enough for display
  const timerInterval = setInterval(() => {
    const t = engineRef.current?.match?.matchTimer ?? 300
    setTimerDisplay(t)
  }, 500)

  return () => {
    engine.stop()
    clearInterval(timerInterval)
  }
}, [])
```

**Step 3: Add the timer div to the JSX**

The outer div already has `position: relative`. Add the timer above the canvas, inside that div, before `<canvas`:

```jsx
{!matchResult && (
  <div style={{
    position: 'absolute',
    top: '-36px',
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
```

**Step 4: Add the `formatTime` helper**

Add this before the component function:

```js
function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
```

**Step 5: Run the dev server and verify the timer ticks**

```bash
yarn dev
```

Open http://localhost:5173. You should see a white `5:00` above the canvas that ticks down. At ≤30s it turns red.

---

### Task 3: Add end-screen overlay to GameCanvas.jsx

**Files:**
- Modify: `src/ui/GameCanvas.jsx`

**Context:**
`matchResult` state is now set by `onMatchOver`. When non-null, we show a full-canvas overlay. The canvas is 960×540 CSS px (set via inline style).

**Step 1: Add the `handleRestart` function**

Add this inside the `GameCanvas` component, before the return:

```js
function handleRestart() {
  const canvas = canvasRef.current
  if (!canvas) return

  // Tear down old engine
  engineRef.current?.stop()

  // Fresh engine
  const engine = new GameEngine(canvas)
  engineRef.current = engine

  engine.onMatchOver = (winner, timeLeft) => {
    setMatchResult({ winner, timeLeft })
  }

  engine.init()
  engine.start()

  setMatchResult(null)
  setTimerDisplay(300)
}
```

**Step 2: Add winner display helpers**

Add before the component function:

```js
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
```

**Step 3: Add the end-screen overlay to JSX**

Inside the outer `div`, after the `<canvas>` element (but still inside the wrapper div), add:

```jsx
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
      onClick={handleRestart}
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
      Play Again
    </button>
  </div>
)}
```

**Step 4: Run the dev server and verify the end-screen**

```bash
yarn dev
```

To test quickly: open browser console and run:
```js
// Grab the engine and kill the bot instantly to trigger end-screen
document.querySelector('canvas').__engine // won't work directly
```

A better approach: temporarily lower bot HP in `GameEngine.init()` to 1 to trigger a fast win, or just let the timer run out by setting `MATCH_DURATION` to 10 in constants temporarily.

**Step 5: Run all tests to confirm nothing broke**

```bash
yarn test
yarn test:coverage
```

Expected: 564 tests pass, all coverage thresholds above 90%.

---

### Task 4: Verify full flow end-to-end

**No code changes — manual verification only.**

1. Start dev server: `yarn dev`
2. Confirm timer shows `5:00` and counts down
3. Confirm timer turns red at ≤30s (you can temporarily set `MATCH_DURATION = 35` in constants to test this quickly — revert after)
4. Confirm timer is hidden once end-screen appears
5. Confirm end-screen shows correct winner text and color
6. Confirm "Time remaining" shows the correct value at match end
7. Click "Play Again" — confirm end-screen disappears, timer resets to `5:00`, game restarts
8. Confirm second match plays correctly and end-screen appears again on match end
