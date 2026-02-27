# Match Timer + End-Screen Design

**Date:** 2026-02-27
**Branch:** sk-add-match-logic
**Status:** Approved

---

## Overview

Add two visual indicators for the match system implemented in Phase 9:

1. **Live countdown timer** displayed above the canvas while a match is in progress.
2. **End-screen overlay** shown when the match ends, with winner headline, time remaining, and a Play Again button.

---

## Architecture

### Engine change (minimal)

`GameEngine.js` gets one new field:

```js
this.onMatchOver = null  // (winner: string, timeLeft: number) => void
```

Called just before `this.stop()` in the match-over branch of `update()`:

```js
if (this.match.matchOver) {
  this.onMatchOver?.(this.match.winner, this.match.matchTimer)
  this.arcaneBeamActive = false
  this.stop()
  return
}
```

No other engine changes. The engine remains pure JS with no React knowledge.

### React changes (GameCanvas.jsx only)

Three additions to `GameCanvas.jsx`:

1. **`timerDisplay` state** (`useState(300)`) — updated every 500ms by a `setInterval` that reads `engineRef.current.match.matchTimer`. Interval is cleared on unmount.

2. **`matchResult` state** (`useState(null)`) — set to `{ winner, timeLeft }` by `engine.onMatchOver`. Non-null value triggers the end-screen overlay.

3. **`handleRestart` function** — clears `matchResult`, tears down the old engine, creates a fresh `GameEngine`, calls `init()` and `start()`, and re-registers the `onMatchOver` callback.

Score tracking is intentionally deferred: when it is implemented, scores will live as separate React `useState` in `GameCanvas` and will be incremented by the `onMatchOver` callback before restart. The full-reinit restart design makes this addition trivial.

---

## UI Design

### Live Timer

- **Position:** `position: absolute`, top-center of the `div` wrapping the canvas
- **Style:** white monospace bold text, 20px, no background
- **Format:** `MM:SS` (e.g. `4:32`)
- **Color change:** turns red (`#ff4444`) when ≤ 30 seconds remaining
- **Visibility:** hidden once `matchResult` is set (end-screen takes over)

```
┌────────────────────────────────────────┐
│                 4:32                   │  ← React div, position: absolute, top-center
├────────────────────────────────────────┤
│                                        │
│             GAME CANVAS                │
│                                        │
└────────────────────────────────────────┘
```

### End-Screen Overlay

- **Position:** `position: absolute`, covers the full canvas (960×540 px)
- **Background:** semi-transparent dark overlay (`rgba(0,0,0,0.75)`)
- **Layout:** vertically centered flex column

Winner headline variants:

| Outcome | Text | Color |
|---|---|---|
| Player wins | **You Win!** | `#ffd700` (gold) |
| Bot wins | **Bot Wins!** | `#ff4444` (red) |
| Draw | **Draw** | `#aaaaaa` (gray) |

Sub-line: `Time remaining: M:SS` (white, smaller font)

Button: **Play Again** — styled dark button, hover state.

```
┌────────────────────────────────────────┐
│                                        │
│           ██  You Win!  ██             │  ← large, gold
│                                        │
│         Time remaining: 2:14          │  ← white, smaller
│                                        │
│             [ Play Again ]            │  ← styled button
│                                        │
└────────────────────────────────────────┘
```

---

## Files Changed

| File | Change |
|---|---|
| `src/game/GameEngine.js` | Add `this.onMatchOver = null`; call it in `update()` match-over branch |
| `src/ui/GameCanvas.jsx` | Add timer state + interval, matchResult state + end-screen overlay, restart handler |

No new files. No test changes for the UI layer (React UI is outside coverage scope `src/game/**`, `src/config/**`). The `onMatchOver` field on GameEngine is tested implicitly via integration.

---

## Non-Goals

- Score tracking across matches (deferred — architecture supports it)
- Animated transitions or particle effects on win (V2)
- Sound effects (V2)
