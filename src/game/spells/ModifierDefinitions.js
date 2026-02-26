import { DEFAULT_COOLDOWN } from '../../config/constants.js'

/**
 * Modifier definitions.
 * Each modifier has:
 *   id, name
 *   damageMult      — multiplies computedDamage (default 1.0)
 *   costMult        — multiplies computedCost    (default 1.0)
 *   cooldownMult    — multiplies computedCooldown (default 1.0)
 *   castTimeMult    — multiplies computedCastTime (default 1.0)
 *   validOn(def)    — returns true if this modifier may be applied to the given SpellDefinition
 *   apply(inst)     — mutates a SpellInstance to bake in the effects (called by SpellInstance constructor)
 *   effect          — descriptor string for UI display
 */

export const EMPOWER = {
    id: 'empower',
    name: 'Empower',
    effect: '+20% damage',
    validOn(def) { return def.tags?.includes('damage') },
    apply(inst) {
        inst.computedDamage = Math.round(inst.computedDamage * 1.2)
    },
}

export const QUICK_CAST = {
    id: 'quick_cast',
    name: 'Quick Cast',
    effect: '-30% cast time, +10% mana cost',
    validOn(def) { return (def.castTime ?? 0) > 0 },
    apply(inst) {
        inst.computedCastTime = +(inst.computedCastTime * 0.7).toFixed(4)
        inst.computedCost = Math.ceil(inst.computedCost * 1.1)
    },
}

export const HEAVY_IMPACT = {
    id: 'heavy_impact',
    name: 'Heavy Impact',
    effect: '+40% damage, +40% mana cost, +20% cooldown',
    validOn(def) { return def.tags?.includes('damage') },
    apply(inst) {
        inst.computedDamage = Math.round(inst.computedDamage * 1.4)
        inst.computedCost = Math.ceil(inst.computedCost * 1.4)
        // If base cooldown is 0, use DEFAULT_COOLDOWN as the base before applying mult
        const baseCd = inst.definition.cooldown === 0 ? DEFAULT_COOLDOWN : inst.computedCooldown
        inst.computedCooldown = +(baseCd * 1.2).toFixed(4)
    },
}

export const SPLIT = {
    id: 'split',
    name: 'Split',
    effect: 'Fires 2 projectiles at ±15° at 60% damage each',
    validOn(def) { return def.behaviorType === 'projectile' },
    apply(inst) {
        // Mark on the instance — GameEngine reads these flags when spawning
        inst.splitEnabled = true
        inst.computedDamage = Math.round(inst.computedDamage * 0.6)
    },
}

export const EXTENDED_DURATION = {
    id: 'extended_duration',
    name: 'Extended Duration',
    effect: '+50% duration',
    validOn(def) { return ['aoe', 'buff'].includes(def.behaviorType) || !!def.aoeDuration },
    apply(inst) {
        inst.extendedDuration = true   // flag read by GameEngine when spawning AoE zones / buffs
    },
}

export const LINGERING_BURN = {
    id: 'lingering_burn',
    name: 'Lingering Burn',
    effect: 'Adds DoT: 5 dmg/s for 2s on hit',
    validOn(def) { return def.tags?.includes('damage') },
    apply(inst) {
        inst.lingeringBurn = { damagePerSecond: 5, duration: 2 }
    },
}

export const MANA_EFFICIENT = {
    id: 'mana_efficient',
    name: 'Mana Efficient',
    effect: '-20% mana cost, -10% damage',
    validOn(_def) { return true },   // valid on all spells
    apply(inst) {
        inst.computedCost = Math.max(0, Math.floor(inst.computedCost * 0.8))
        inst.computedDamage = Math.round(inst.computedDamage * 0.9)
    },
}

export const LIFESTEAL = {
    id: 'lifesteal',
    name: 'Lifesteal',
    effect: 'Heal caster for 15% of damage dealt',
    validOn(def) { return def.tags?.includes('damage') },
    apply(inst) {
        inst.lifesteal = 0.15
    },
}

// All modifiers in display order
export const ALL_MODIFIERS = [
    EMPOWER,
    QUICK_CAST,
    HEAVY_IMPACT,
    SPLIT,
    EXTENDED_DURATION,
    LINGERING_BURN,
    MANA_EFFICIENT,
    LIFESTEAL,
]

/**
 * Validate that a modifier may be applied to a spell definition.
 * Returns an error string if invalid, or null if valid.
 */
export function validateModifier(modDef, spellDef, existingModifiers = []) {
    if (!modDef.validOn(spellDef)) {
        return `${modDef.name} cannot be applied to ${spellDef.name}`
    }
    if (existingModifiers.some(m => m.id === modDef.id)) {
        return `${modDef.name} is already applied`
    }
    if (existingModifiers.length >= 2) {
        return 'Maximum 2 modifiers per spell'
    }
    return null
}
