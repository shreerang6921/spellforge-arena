import { describe, it, expect } from 'vitest'
import {
  SPELL_BY_ID,
  MODIFIER_BY_ID,
  DEFAULT_DECK,
  deckToSpellInstances,
} from '../config/playerDeck.js'

describe('SPELL_BY_ID', () => {
  it('contains all 15 spells', () => {
    expect(Object.keys(SPELL_BY_ID)).toHaveLength(15)
  })
  it('maps fireball id to FIREBALL definition', () => {
    expect(SPELL_BY_ID['fireball'].name).toBe('Fireball')
  })
  it('contains all 3 ultimates', () => {
    const ults = Object.values(SPELL_BY_ID).filter(s => s.isUltimate)
    expect(ults).toHaveLength(3)
  })
})

describe('MODIFIER_BY_ID', () => {
  it('contains all 8 modifiers', () => {
    expect(Object.keys(MODIFIER_BY_ID)).toHaveLength(8)
  })
  it('maps empower id to EMPOWER modifier', () => {
    expect(MODIFIER_BY_ID['empower'].name).toBe('Empower')
  })
})

describe('DEFAULT_DECK', () => {
  it('has 8 slots', () => {
    expect(DEFAULT_DECK).toHaveLength(8)
  })
  it('first 7 slots are normal (non-ultimate) spells', () => {
    for (let i = 0; i < 7; i++) {
      const spell = SPELL_BY_ID[DEFAULT_DECK[i].spellId]
      expect(spell.isUltimate).toBe(false)
    }
  })
  it('slot 8 is an ultimate spell', () => {
    const spell = SPELL_BY_ID[DEFAULT_DECK[7].spellId]
    expect(spell.isUltimate).toBe(true)
  })
  it('all slots have empty modifierIds arrays', () => {
    for (const slot of DEFAULT_DECK) {
      expect(slot.modifierIds).toEqual([])
    }
  })
})

describe('deckToSpellInstances', () => {
  it('returns an array of 8 SpellInstances for a valid deck', () => {
    const instances = deckToSpellInstances(DEFAULT_DECK)
    expect(instances).toHaveLength(8)
    expect(instances[0]).not.toBeNull()
  })

  it('each instance has the correct spell definition', () => {
    const instances = deckToSpellInstances(DEFAULT_DECK)
    expect(instances[0].definition.id).toBe(DEFAULT_DECK[0].spellId)
  })

  it('applies modifiers correctly', () => {
    const deck = [
      { spellId: 'fireball', modifierIds: ['empower'] },
      ...DEFAULT_DECK.slice(1),
    ]
    const instances = deckToSpellInstances(deck)
    // Empower adds 20% damage; fireball baseDamage=20, so 20*1.2=24
    expect(instances[0].computedDamage).toBe(24)
  })

  it('returns null for a slot with an unknown spellId', () => {
    const deck = [
      { spellId: 'nonexistent_spell', modifierIds: [] },
      ...DEFAULT_DECK.slice(1),
    ]
    const instances = deckToSpellInstances(deck)
    expect(instances[0]).toBeNull()
  })

  it('skips unknown modifierIds silently', () => {
    const deck = [
      { spellId: 'fireball', modifierIds: ['nonexistent_mod'] },
      ...DEFAULT_DECK.slice(1),
    ]
    const instances = deckToSpellInstances(deck)
    // Should still create the instance, just without the bad modifier
    expect(instances[0]).not.toBeNull()
    expect(instances[0].modifiers).toHaveLength(0)
    // Damage should be unmodified (base 20)
    expect(instances[0].computedDamage).toBe(20)
  })

  it('returns null for a null slot', () => {
    const deck = [null, ...DEFAULT_DECK.slice(1)]
    const instances = deckToSpellInstances(deck)
    expect(instances[0]).toBeNull()
  })

  it('treats a slot with no modifierIds field as having no modifiers', () => {
    const deck = [{ spellId: 'fireball' }, ...DEFAULT_DECK.slice(1)]
    const instances = deckToSpellInstances(deck)
    expect(instances[0]).not.toBeNull()
    expect(instances[0].modifiers).toHaveLength(0)
  })
})
