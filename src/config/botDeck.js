import {
    FIREBALL,
    ICE_SHARD,
    GROUND_FLAME,
    ARCANE_BURST,
    BLOOD_LANCE,
    HEALING_PULSE,
    MANA_SURGE,
    METEOR,
} from '../game/spells/SpellDefinitions.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'

/**
 * Bot deck — hardcoded per spec §19.
 * No modifiers on bot spells.
 */
export function createBotDeck() {
    return [
        new SpellInstance(FIREBALL),
        new SpellInstance(ICE_SHARD),
        new SpellInstance(GROUND_FLAME),
        new SpellInstance(ARCANE_BURST),
        new SpellInstance(BLOOD_LANCE),
        new SpellInstance(HEALING_PULSE),
        new SpellInstance(MANA_SURGE),
        new SpellInstance(METEOR),   // ultimate slot
    ]
}
