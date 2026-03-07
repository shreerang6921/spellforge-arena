import { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../game/GameEngine.js'
import { deckToSpellInstances } from '../config/playerDeck.js'
import { MATCH_DURATION, RESOLUTION_W, RESOLUTION_H } from '../config/constants.js'
import { InputHandler } from '../game/InputHandler.js'
import { Renderer } from './Renderer.js'
import { GameLoop } from './GameLoop.js'

// Mirror of the deck slot layout from Renderer._drawDeck
const SLOT = 14
const GAP = 2
const SLOTS = 8
const TOTAL_W = SLOTS * SLOT + (SLOTS - 1) * GAP
const DECK_START_X = Math.floor((RESOLUTION_W - TOTAL_W) / 2)
const DECK_Y = RESOLUTION_H - SLOT - 2

function formatSpellKey(keybindings, slotIndex) {
  const code = keybindings?.[`spell${slotIndex + 1}`]
  if (!code) return String(slotIndex + 1)  // fallback to number
  if (code.startsWith('Key'))   return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code === 'ArrowUp')    return '↑'
  if (code === 'ArrowDown')  return '↓'
  if (code === 'ArrowLeft')  return '←'
  if (code === 'ArrowRight') return '→'
  if (code === 'Space')      return 'Spc'
  return code.length > 3 ? code.slice(0, 3) : code
}

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

export function GameCanvas({ deck, keybindings, onMatchOver, onRestart }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const timerIntervalRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [spellPanel, setSpellPanel] = useState(null) // { name, description, slotIndex, cssX }
  const [timerDisplay, setTimerDisplay] = useState(MATCH_DURATION)
  const [matchResult, setMatchResult] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width  = RESOLUTION_W
    canvas.height = RESOLUTION_H

    const engine = new GameEngine()
    engineRef.current = engine

    const instances = deckToSpellInstances(deck)
    engine.init(instances, keybindings ?? undefined)

    const handler = new InputHandler(canvas, engine.player, keybindings ?? undefined)
    engine.inputHandler = handler

    const renderer = new Renderer()
    const loop = new GameLoop(engine, renderer, ctx)

    engine.onMatchOver = (winner, timeLeft) => {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
      setMatchResult({ winner, timeLeft })
      loop.stop()
    }

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
    setSpellPanel(null)
  }

  function handleCanvasClick(e) {
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
            // Toggle off if same slot clicked again
            if (spellPanel?.slotIndex === i) { setSpellPanel(null); return }
            const cssX = (sx + SLOT / 2) * (rect.width / RESOLUTION_W) + rect.left - canvas.getBoundingClientRect().left
            setSpellPanel({
              name: spell.definition.name,
              description: spell.definition.description,
              slotIndex: i,
              cssX,
            })
            return
          }
          break
        }
      }
    }
    setSpellPanel(null)
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
        onClick={handleCanvasClick}
        style={{
          display: 'block',
          imageRendering: 'pixelated',
          width: '960px',
          height: '540px',
          background: '#000',
        }}
      />
      {/* Key binding numbers — React overlay for crisp text instead of blurry canvas text */}
      {!matchResult && Array.from({ length: SLOTS }, (_, i) => {
        const cssX = (DECK_START_X + i * (SLOT + GAP) + 1) * (960 / RESOLUTION_W)
        const cssY = (DECK_Y + 1) * (540 / RESOLUTION_H)
        const hasSpell = deck?.[i] != null
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${cssX}px`,
            top: `${cssY}px`,
            fontFamily: 'monospace',
            fontSize: '11px',
            lineHeight: 1,
            color: hasSpell ? '#fff' : '#888',
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            {formatSpellKey(keybindings, i)}
          </div>
        )
      })}
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
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={onRestart}
              style={{
                fontFamily: 'monospace',
                fontSize: '16px',
                padding: '10px 28px',
                background: '#e8a020',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '1px',
                fontWeight: 'bold',
              }}
            >
              RESTART
            </button>
            <button
              onClick={onMatchOver}
              style={{
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
              ← HOME
            </button>
          </div>
        </div>
      )}
      {spellPanel && !matchResult && (
        <div style={{
          position: 'absolute',
          bottom: `${(SLOT + 6) * (540 / RESOLUTION_H)}px`,
          left: `${Math.min(spellPanel.cssX - 80, 960 - 200)}px`,
          width: '200px',
          background: '#111',
          border: '1px solid #555',
          fontFamily: 'monospace',
          padding: '8px 10px',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
            {spellPanel.name}
          </div>
          <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.5' }}>
            {spellPanel.description ?? ''}
          </div>
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
