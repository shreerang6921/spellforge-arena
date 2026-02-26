import { useEffect, useRef } from 'react'
import { GameEngine } from '../game/GameEngine.js'

export function GameCanvas() {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new GameEngine(canvas)
    engineRef.current = engine
    engine.init()
    engine.start()

    return () => engine.stop()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        width: '960px',    // 320 * 3
        height: '540px',   // 180 * 3
        background: '#000',
      }}
    />
  )
}
