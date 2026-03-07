import { useState } from 'react'
import { SPELL_BY_ID, MODIFIER_BY_ID } from '../config/playerDeck.js'
import { ALL_MODIFIERS, validateModifier } from '../game/spells/ModifierDefinitions.js'

const NORMAL_SPELLS = Object.values(SPELL_BY_ID).filter(s => !s.isUltimate)
const ULTIMATE_SPELLS = Object.values(SPELL_BY_ID).filter(s => s.isUltimate)

function isDeckComplete(deck) {
  for (let i = 0; i < 7; i++) {
    if (!deck[i]) return false
    const def = SPELL_BY_ID[deck[i].spellId]
    if (!def || def.isUltimate) return false
  }
  if (!deck[7]) return false
  const ult = SPELL_BY_ID[deck[7].spellId]
  if (!ult || !ult.isUltimate) return false
  return true
}

export function DeckForge({ deck, onDeckChange, onSave, saveLabel = 'SAVE', onBack }) {
  const [selectedPoolSpell, setSelectedPoolSpell] = useState(null)
  const [selectedDeckSlot, setSelectedDeckSlot] = useState(null)
  const [validationError, setValidationError] = useState(null)

  const usedSpellIds = new Set(deck.filter(Boolean).map(s => s.spellId))
  const complete = isDeckComplete(deck)

  function handlePoolSpellClick(spellDef) {
    if (selectedPoolSpell?.id === spellDef.id) {
      setSelectedPoolSpell(null)
      return
    }
    setSelectedPoolSpell(spellDef)
    setSelectedDeckSlot(null)
    setValidationError(null)
  }

  function handleDeckSlotClick(slotIndex) {
    if (selectedPoolSpell) {
      const isUltSlot = slotIndex === 7
      if (selectedPoolSpell.isUltimate && !isUltSlot) {
        setValidationError('Ultimates can only go in slot 8')
        return
      }
      if (!selectedPoolSpell.isUltimate && isUltSlot) {
        setValidationError('Slot 8 is reserved for ultimates')
        return
      }
      const newDeck = [...deck]
      newDeck[slotIndex] = { spellId: selectedPoolSpell.id, modifierIds: [] }
      onDeckChange(newDeck)
      setSelectedPoolSpell(null)
      setValidationError(null)
      return
    }

    if (deck[slotIndex]) {
      setSelectedDeckSlot(slotIndex === selectedDeckSlot ? null : slotIndex)
      setValidationError(null)
    }
  }

  function handleRemoveSpell(slotIndex) {
    const newDeck = [...deck]
    newDeck[slotIndex] = null
    onDeckChange(newDeck)
    if (selectedDeckSlot === slotIndex) setSelectedDeckSlot(null)
    setValidationError(null)
  }

  function handleModifierClick(modifier) {
    if (selectedDeckSlot === null) return
    const slot = deck[selectedDeckSlot]
    if (!slot) return
    const spellDef = SPELL_BY_ID[slot.spellId]
    const existingMods = slot.modifierIds.map(id => MODIFIER_BY_ID[id]).filter(Boolean)

    if (slot.modifierIds.includes(modifier.id)) {
      const newDeck = [...deck]
      newDeck[selectedDeckSlot] = {
        ...slot,
        modifierIds: slot.modifierIds.filter(id => id !== modifier.id),
      }
      onDeckChange(newDeck)
      setValidationError(null)
      return
    }

    const error = validateModifier(modifier, spellDef, existingMods)
    if (error) {
      setValidationError(error)
      return
    }

    const newDeck = [...deck]
    newDeck[selectedDeckSlot] = {
      ...slot,
      modifierIds: [...slot.modifierIds, modifier.id],
    }
    onDeckChange(newDeck)
    setValidationError(null)
  }

  const selectedSlotData = selectedDeckSlot !== null ? deck[selectedDeckSlot] : null
  const selectedSlotDef = selectedSlotData ? SPELL_BY_ID[selectedSlotData.spellId] : null

  // Which spell description to show in the left-panel info box
  const infoSpell = selectedPoolSpell ?? (selectedSlotDef ?? null)

  return (
    <div style={{
      width: '960px',
      background: '#111',
      border: '1px solid #333',
      fontFamily: 'monospace',
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #333',
        textAlign: 'center',
        letterSpacing: '4px',
        color: '#aaa',
        fontSize: '13px',
      }}>
        ✦ DECK FORGE ✦
      </div>

      {/* Main two-column area */}
      <div style={{ display: 'flex', minHeight: '400px' }}>
        {/* Left: Spell Pool */}
        <div style={{
          width: '260px',
          borderRight: '1px solid #333',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', marginBottom: '8px' }}>
            SPELL POOL
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {NORMAL_SPELLS.map(spell => {
              const inDeck = usedSpellIds.has(spell.id)
              const isSelected = selectedPoolSpell?.id === spell.id
              return (
                <div
                  key={spell.id}
                  onClick={() => inDeck ? null : handlePoolSpellClick(spell)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 8px',
                    marginBottom: '3px',
                    cursor: inDeck ? 'default' : 'pointer',
                    opacity: inDeck ? 0.35 : 1,
                    background: isSelected ? '#1a2a1a' : 'transparent',
                    border: isSelected ? '1px solid #4a4' : '1px solid transparent',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ width: '10px', height: '10px', background: spell.color, flexShrink: 0 }} />
                  {spell.name}
                </div>
              )
            })}
            <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', margin: '10px 0 8px' }}>
              ULTIMATES
            </div>
            {ULTIMATE_SPELLS.map(spell => {
              const inDeck = usedSpellIds.has(spell.id)
              const isSelected = selectedPoolSpell?.id === spell.id
              return (
                <div
                  key={spell.id}
                  onClick={() => inDeck ? null : handlePoolSpellClick(spell)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 8px',
                    marginBottom: '3px',
                    cursor: inDeck ? 'default' : 'pointer',
                    opacity: inDeck ? 0.35 : 1,
                    background: isSelected ? '#2a2a0a' : 'transparent',
                    border: isSelected ? '1px solid #aa4' : '1px solid transparent',
                    color: '#ffd700',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ width: '10px', height: '10px', background: spell.color, flexShrink: 0 }} />
                  {spell.name}
                </div>
              )
            })}
          </div>

          {/* Spell info box — shown when a spell is selected from pool or deck */}
          {infoSpell && (
            <div style={{
              marginTop: '10px',
              padding: '8px 10px',
              background: '#0a0a0a',
              border: '1px solid #333',
              borderLeft: `3px solid ${infoSpell.color}`,
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: infoSpell.isUltimate ? '#ffd700' : '#fff',
                marginBottom: '4px',
              }}>
                {infoSpell.name}
              </div>
              <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.5' }}>
                {infoSpell.description}
              </div>
            </div>
          )}
        </div>

        {/* Right: Deck Slots + Modifier Panel */}
        <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', marginBottom: '8px' }}>
              YOUR DECK  (7 normal + 1 ultimate)
            </div>
            {deck.map((slot, i) => {
              const isUltSlot = i === 7
              const spellDef = slot ? SPELL_BY_ID[slot.spellId] : null
              const isSelected = selectedDeckSlot === i
              const mods = slot?.modifierIds ?? []
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ width: '16px', color: isUltSlot ? '#ffd700' : '#666', fontSize: '12px', textAlign: 'right' }}>
                    {i + 1}.
                  </span>
                  <div
                    onClick={() => handleDeckSlotClick(i)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #fff' : '1px solid #333',
                      background: isSelected ? '#1a1a2a' : '#0d0d0d',
                      fontSize: '13px',
                      minHeight: '28px',
                    }}
                  >
                    {spellDef ? (
                      <>
                        <div style={{ width: '10px', height: '10px', background: spellDef.color, flexShrink: 0 }} />
                        <span style={{ color: isUltSlot ? '#ffd700' : '#fff' }}>{spellDef.name}</span>
                        {mods.map(id => {
                          const mod = MODIFIER_BY_ID[id]
                          return mod ? (
                            <span key={id} style={{
                              fontSize: '10px',
                              background: '#1a3a1a',
                              border: '1px solid #3a3',
                              color: '#8f8',
                              padding: '1px 5px',
                            }}>
                              {mod.name}
                            </span>
                          ) : null
                        })}
                      </>
                    ) : (
                      <span style={{ color: '#444' }}>
                        {isUltSlot ? '— ultimate slot —' : '— empty —'}
                      </span>
                    )}
                  </div>
                  {spellDef && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveSpell(i) }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#555',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 6px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Modifier Panel — only when a filled slot is selected */}
          {selectedSlotDef && (
            <div style={{ borderTop: '1px solid #333', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', marginBottom: '6px' }}>
                MODIFIERS — {selectedSlotDef.name}
              </div>
              {/* Spell description in modifier panel */}
              <div style={{
                fontSize: '11px',
                color: '#777',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: '1px solid #222',
              }}>
                {selectedSlotDef.description}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ALL_MODIFIERS.map(mod => {
                  const applied = selectedSlotData.modifierIds.includes(mod.id)
                  const existingMods = selectedSlotData.modifierIds
                    .map(id => MODIFIER_BY_ID[id]).filter(Boolean)
                  const error = applied ? null : validateModifier(mod, selectedSlotDef, existingMods)
                  const invalid = !!error
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleModifierClick(mod)}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        padding: '5px 10px',
                        cursor: invalid ? 'not-allowed' : 'pointer',
                        opacity: invalid ? 0.35 : 1,
                        background: applied ? '#1a3a1a' : '#1a1a1a',
                        border: applied ? '1px solid #4a4' : '1px solid #444',
                        color: applied ? '#8f8' : '#ccc',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        minWidth: '120px',
                      }}
                    >
                      <span>{mod.name}{applied ? ' ✓' : ''}</span>
                      <span style={{ fontSize: '10px', color: applied ? '#6c6' : '#666' }}>{mod.effect}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #333',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '44px',
      }}>
        <div style={{ fontSize: '12px', color: '#f66' }}>
          {validationError ?? ''}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                fontFamily: 'monospace', fontSize: '14px', padding: '8px 16px',
                letterSpacing: '1px', cursor: 'pointer',
                background: 'transparent', color: '#666', border: '1px solid #333',
              }}
            >
              ← BACK
            </button>
          )}
          <button
            onClick={onSave}
            disabled={!complete}
            style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              padding: '8px 24px',
              letterSpacing: '1px',
              cursor: complete ? 'pointer' : 'not-allowed',
              background: complete ? '#1a3a1a' : '#1a1a1a',
              color: complete ? '#8f8' : '#555',
              border: complete ? '1px solid #4a4' : '1px solid #333',
            }}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
