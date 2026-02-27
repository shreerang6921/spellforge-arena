import {
  FIREBALL, ICE_SHARD, ARCANE_BURST, BLOOD_LANCE,
  GROUND_FLAME, DASH, BLINK_STRIKE, PHASE_WALK,
  HEALING_PULSE, MANA_SURGE, SPELL_ECHO, ARCANE_BEAM,
  METEOR, ARCANE_OVERLOAD, TEMPORAL_RESET,
} from '../game/spells/SpellDefinitions.js'
import { ALL_MODIFIERS } from '../game/spells/ModifierDefinitions.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'

// Lookup maps for serialization/deserialization
export const SPELL_BY_ID = Object.fromEntries(
  [
    FIREBALL, ICE_SHARD, ARCANE_BURST, BLOOD_LANCE,
    GROUND_FLAME, DASH, BLINK_STRIKE, PHASE_WALK,
    HEALING_PULSE, MANA_SURGE, SPELL_ECHO, ARCANE_BEAM,
    METEOR, ARCANE_OVERLOAD, TEMPORAL_RESET,
  ].map(s => [s.id, s])
)

export const MODIFIER_BY_ID = Object.fromEntries(
  ALL_MODIFIERS.map(m => [m.id, m])
)

// Default starting deck — 7 normal + 1 ultimate, no modifiers
export const DEFAULT_DECK = [
  { spellId: 'fireball',      modifierIds: [] },
  { spellId: 'ice_shard',     modifierIds: [] },
  { spellId: 'arcane_burst',  modifierIds: [] },
  { spellId: 'blood_lance',   modifierIds: [] },
  { spellId: 'ground_flame',  modifierIds: [] },
  { spellId: 'dash',          modifierIds: [] },
  { spellId: 'phase_walk',    modifierIds: [] },
  { spellId: 'meteor',        modifierIds: [] },
]

/**
 * Converts a serializable deck array to SpellInstance[].
 * Returns null for slots with unknown spellIds or null entries.
 * Unknown modifierIds are silently skipped.
 * @param {Array} deck  Array of { spellId, modifierIds } or null
 * @returns {Array}     SpellInstance[] with null for bad slots
 */
export function deckToSpellInstances(deck) {
  return deck.map(slot => {
    if (!slot) return null
    const def = SPELL_BY_ID[slot.spellId]
    if (!def) return null
    const mods = (slot.modifierIds ?? [])
      .map(id => MODIFIER_BY_ID[id])
      .filter(Boolean)
    return new SpellInstance(def, mods)
  })
}
