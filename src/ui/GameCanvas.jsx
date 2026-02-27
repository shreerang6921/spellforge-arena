import { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../game/GameEngine.js'

// Mirror of the deck slot layout from GameEngine._drawDeck
const RESOLUTION_W = 320
const RESOLUTION_H = 180
const SLOT = 14
const GAP = 2
const SLOTS = 8
const TOTAL_W = SLOTS * SLOT + (SLOTS - 1) * GAP        // 126
const DECK_START_X = Math.floor((RESOLUTION_W - TOTAL_W) / 2) // 97
const DECK_Y = RESOLUTION_H - SLOT - 2                  // 164

export function GameCanvas() {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const [tooltip, setTooltip] = useState(null) // { name, x, y } in viewport px

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new GameEngine(canvas)
    engineRef.current = engine
    engine.init()
    engine.start()

    return () => engine.stop()
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

  return (
    <div style={{ position: 'relative' }}>
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
