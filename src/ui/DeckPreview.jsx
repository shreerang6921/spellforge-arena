import { SPELL_BY_ID, MODIFIER_BY_ID } from '../config/playerDeck.js'

export function DeckPreview({ deck, mode, onContinue, onEditDeck, onBack }) {
  const titleBtn = {
    padding: '10px 32px', fontFamily: 'monospace', fontSize: '14px',
    cursor: 'pointer', letterSpacing: '1px', border: 'none',
  }

  return (
    <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%' }}>
      <h2 style={{ fontFamily: 'monospace', letterSpacing: '3px', marginBottom: '8px' }}>
        YOUR DECK
      </h2>
      <p style={{ color: '#888', fontSize: '12px', marginBottom: '24px', fontFamily: 'monospace' }}>
        {mode === 'bot' ? 'PRACTICE vs BOT' : 'PLAY ONLINE'}
      </p>

      <div style={{ marginBottom: '32px' }}>
        {deck.map((slot, i) => {
          const spellDef = slot ? SPELL_BY_ID[slot.spellId] : null
          const isUltSlot = i === 7
          const modNames = slot
            ? slot.modifierIds.map(id => MODIFIER_BY_ID[id]?.name ?? id).join(', ')
            : ''

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px', marginBottom: '4px',
              border: '1px solid #333', background: '#111',
            }}>
              <span style={{ color: '#555', width: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
                {isUltSlot ? 'U' : i + 1}
              </span>
              <div style={{
                width: '12px', height: '12px', borderRadius: '2px', flexShrink: 0,
                background: spellDef?.color ?? '#333',
              }} />
              <span style={{
                fontFamily: 'monospace', fontSize: '13px', flex: 1, textAlign: 'left',
                color: spellDef ? '#fff' : '#555',
              }}>
                {spellDef ? spellDef.name : '— empty —'}
              </span>
              {modNames && (
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888' }}>
                  [{modNames}]
                </span>
              )}
              {isUltSlot && spellDef && (
                <span style={{ fontSize: '10px', color: '#e8a020', fontFamily: 'monospace' }}>ULT</span>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          style={{ ...titleBtn, background: '#e8a020', color: '#000', fontWeight: 'bold' }}
          onClick={onContinue}
        >
          CONTINUE →
        </button>
        <button
          style={{ ...titleBtn, background: 'transparent', color: '#aaa', border: '1px solid #444' }}
          onClick={onEditDeck}
        >
          EDIT DECK
        </button>
        <button
          style={{ ...titleBtn, background: 'transparent', color: '#666', border: '1px solid #333' }}
          onClick={onBack}
        >
          ← HOME
        </button>
      </div>
    </div>
  )
}
