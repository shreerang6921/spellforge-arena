import { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../game/GameEngine.js'
import { MATCH_DURATION } from '../config/constants.js'

// Mirror of the deck slot layout from GameEngine._drawDeck
const RESOLUTION_W = 320
const RESOLUTION_H = 180
const SLOT = 14
const GAP = 2
const SLOTS = 8
const TOTAL_W = SLOTS * SLOT + (SLOTS - 1) * GAP        // 126
const DECK_START_X = Math.floor((RESOLUTION_W - TOTAL_W) / 2) // 97
const DECK_Y = RESOLUTION_H - SLOT - 2                  // 164

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

export function GameCanvas() {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const timerIntervalRef = useRef(null)
  const [tooltip, setTooltip] = useState(null) // { name, x, y } in viewport px
  const [timerDisplay, setTimerDisplay] = useState(MATCH_DURATION)
  const [matchResult, setMatchResult] = useState(null) // { winner, timeLeft }

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

    engine.init()
    engine.start()

    // Poll timer every 500ms — seconds-level precision is enough for display
    timerIntervalRef.current = setInterval(() => {
      const t = engineRef.current?.match?.matchTimer ?? MATCH_DURATION
      setTimerDisplay(t)
    }, 500)

    return () => {
      engine.stop()
      clearInterval(timerIntervalRef.current)
    }
  }, [])

  function handleMouseMove(e) {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (!canvas || !engine?.player) return

    const rect = canvas.getBoundingClientRect()
    // Map from CSS pixels → internal game coordinates
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

  function handleRestart() {
    const canvas = canvasRef.current
    if (!canvas) return

    // Tear down old engine
    engineRef.current?.stop()

    // Fresh engine
    const engine = new GameEngine(canvas)
    engineRef.current = engine

    engine.onMatchOver = (winner, timeLeft) => {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
      setMatchResult({ winner, timeLeft })
    }

    engine.init()
    engine.start()

    timerIntervalRef.current = setInterval(() => {
      const t = engineRef.current?.match?.matchTimer ?? MATCH_DURATION
      setTimerDisplay(t)
    }, 500)

    setMatchResult(null)
    setTimerDisplay(MATCH_DURATION)
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
