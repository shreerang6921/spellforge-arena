import { useState } from 'react'
import { GameCanvas } from './GameCanvas.jsx'
import { DeckForge } from './DeckForge.jsx'
import { DEFAULT_DECK } from '../config/playerDeck.js'

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

  function handleDeckChange(newDeck) {
    setPlayerDeck(newDeck)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDeck))
  }

  function handleEnterMatch() {
    setScreen('game')
  }

  function handleMatchOver() {
    setScreen('forge')
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
          onEnterMatch={handleEnterMatch}
        />
      )}
      {screen === 'game' && (
        <GameCanvas
          deck={playerDeck}
          onMatchOver={handleMatchOver}
        />
      )}
    </div>
  )
}
