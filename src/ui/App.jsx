import { GameCanvas } from './GameCanvas.jsx'

export function App() {
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
      <h1 style={{ fontSize: '14px', letterSpacing: '4px', marginBottom: '12px', color: '#aaa' }}>
        SPELLFORGE ARENA
      </h1>
      <GameCanvas />
      <p style={{ fontSize: '10px', color: '#555', marginTop: '8px' }}>
        WASD to move
      </p>
    </div>
  )
}
