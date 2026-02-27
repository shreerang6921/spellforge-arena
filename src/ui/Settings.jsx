import { useState } from 'react'
import { DEFAULT_KEYBINDINGS } from '../config/keybindings.js'

const ACTION_LABELS = [
  { key: 'up',    label: 'Move Up',    group: 'movement' },
  { key: 'down',  label: 'Move Down',  group: 'movement' },
  { key: 'left',  label: 'Move Left',  group: 'movement' },
  { key: 'right', label: 'Move Right', group: 'movement' },
  { key: 'spell1', label: 'Spell 1', group: 'spells' },
  { key: 'spell2', label: 'Spell 2', group: 'spells' },
  { key: 'spell3', label: 'Spell 3', group: 'spells' },
  { key: 'spell4', label: 'Spell 4', group: 'spells' },
  { key: 'spell5', label: 'Spell 5', group: 'spells' },
  { key: 'spell6', label: 'Spell 6', group: 'spells' },
  { key: 'spell7', label: 'Spell 7', group: 'spells' },
  { key: 'spell8', label: 'Spell 8', group: 'spells' },
]

function formatKeyCode(code) {
  if (!code) return '?'
  if (code.startsWith('Key'))   return code.slice(3)   // 'KeyW' → 'W'
  if (code.startsWith('Digit')) return code.slice(5)   // 'Digit1' → '1'
  if (code === 'ArrowUp')    return '↑'
  if (code === 'ArrowDown')  return '↓'
  if (code === 'ArrowLeft')  return '←'
  if (code === 'ArrowRight') return '→'
  if (code === 'Space')      return 'Spc'
  return code
}

export function Settings({ keybindings, onSave, onBack }) {
  const [bindings, setBindings] = useState({ ...keybindings })
  const [listening, setListening] = useState(null) // action key string or null

  function handleRebindClick(actionKey) {
    setListening(actionKey)

    function onKeyDown(e) {
      e.preventDefault()
      if (e.code === 'Escape') {
        setListening(null)
        window.removeEventListener('keydown', onKeyDown)
        return
      }
      const newBindings = { ...bindings, [actionKey]: e.code }
      setBindings(newBindings)
      onSave(newBindings)
      setListening(null)
      window.removeEventListener('keydown', onKeyDown)
    }

    window.addEventListener('keydown', onKeyDown)
  }

  function handleReset() {
    setBindings({ ...DEFAULT_KEYBINDINGS })
    onSave({ ...DEFAULT_KEYBINDINGS })
  }

  const movementActions = ACTION_LABELS.filter(a => a.group === 'movement')
  const spellActions    = ACTION_LABELS.filter(a => a.group === 'spells')

  const tableStyle = { borderCollapse: 'collapse', width: '100%' }
  const thStyle    = { textAlign: 'left', padding: '4px 12px', color: '#aaa', fontSize: '11px' }
  const tdStyle    = { padding: '5px 12px', fontSize: '13px' }

  function renderRow({ key, label }) {
    return (
      <tr key={key}>
        <td style={tdStyle}>{label}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>
          <button
            onClick={() => handleRebindClick(key)}
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '3px 14px',
              background: listening === key ? '#442244' : '#222',
              color:      listening === key ? '#ff88ff' : '#fff',
              border:     `1px solid ${listening === key ? '#ff88ff' : '#555'}`,
              cursor: 'pointer',
              minWidth: '72px',
            }}
          >
            {listening === key ? 'Press key…' : formatKeyCode(bindings[key])}
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      padding: '36px',
      fontFamily: 'monospace',
      color: '#fff',
      minWidth: '420px',
    }}>
      <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '2px' }}>
        SETTINGS
      </div>
      <div style={{ fontSize: '12px', color: '#888' }}>
        Click a key to rebind it, then press any key. Esc to cancel.
      </div>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
        {/* Movement */}
        <div>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '6px', letterSpacing: '1px' }}>MOVEMENT</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Action</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Key</th>
              </tr>
            </thead>
            <tbody>{movementActions.map(renderRow)}</tbody>
          </table>
        </div>

        {/* Spells */}
        <div>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '6px', letterSpacing: '1px' }}>SPELLS</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Action</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Key</th>
              </tr>
            </thead>
            <tbody>{spellActions.map(renderRow)}</tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
        <button
          onClick={handleReset}
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '7px 20px',
            background: '#222',
            color: '#aaa',
            border: '1px solid #444',
            cursor: 'pointer',
          }}
        >
          Reset Defaults
        </button>
        <button
          onClick={onBack}
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '7px 24px',
            background: '#222',
            color: '#fff',
            border: '1px solid #555',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      </div>
    </div>
  )
}
