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
  const [mode, setMode] = useState(null)
  const [deckForgeReturn, setDeckForgeReturn] = useState('home')
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
      alert('Online mode coming soon!')
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
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'forge' && (
        <DeckForge
          deck={playerDeck}
          onDeckChange={handleDeckChange}
          onSave={handleDeckForgeSave}
          saveLabel={deckForgeReturn === 'deck-preview' ? 'SAVE & CONTINUE →' : 'SAVE'}
          onBack={() => setScreen(deckForgeReturn)}
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
