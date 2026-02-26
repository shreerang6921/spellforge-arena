import { describe, it, expect } from 'vitest'
import {
    EMPOWER, QUICK_CAST, HEAVY_IMPACT, SPLIT,
    EXTENDED_DURATION, LINGERING_BURN, MANA_EFFICIENT, LIFESTEAL,
    ALL_MODIFIERS, validateModifier,
} from '../game/spells/ModifierDefinitions.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'
import { DEFAULT_COOLDOWN } from '../config/constants.js'

// ── Shared spell stubs ────────────────────────────────────────────────────────

const damageProjDef = {
    id: 'fireball', name: 'Fireball',
    baseDamage: 20, manaCost: 15, castTime: 0.3, cooldown: 0,
    behaviorType: 'projectile',
    tags: ['projectile', 'damage'],
}

const damageAoeDef = {
    id: 'ground_flame', name: 'Ground Flame',
    baseDamage: 5, manaCost: 25, castTime: 0, cooldown: 3,
    behaviorType: 'aoe', aoeDuration: 3,
    tags: ['aoe', 'damage'],
}

const buffDef = {
    id: 'phase_walk', name: 'Phase Walk',
    baseDamage: 0, manaCost: 20, castTime: 0, cooldown: 5,
    behaviorType: 'buff', duration: 3,
    tags: ['buff', 'mobility'],
}

const instantHealDef = {
    id: 'healing_pulse', name: 'Healing Pulse',
    baseDamage: 0, manaCost: 30, castTime: 0.3, cooldown: 4,
    behaviorType: 'instant',
    tags: ['instant', 'heal'],
}

const noCooldownDamageDef = {
    id: 'ice_shard', name: 'Ice Shard',
    baseDamage: 15, manaCost: 12, castTime: 0.2, cooldown: 0,
    behaviorType: 'projectile',
    tags: ['projectile', 'damage'],
}

// ── ALL_MODIFIERS export ───────────────────────────────────────────────────────

describe('ALL_MODIFIERS', () => {
    it('exports 8 modifier definitions', () => {
        expect(ALL_MODIFIERS).toHaveLength(8)
    })

    it('contains EMPOWER', () => {
        expect(ALL_MODIFIERS).toContain(EMPOWER)
    })

    it('contains LIFESTEAL', () => {
        expect(ALL_MODIFIERS).toContain(LIFESTEAL)
    })
})

// ── EMPOWER ───────────────────────────────────────────────────────────────────

describe('EMPOWER — validOn', () => {
    it('is valid on damage spells', () => {
        expect(EMPOWER.validOn(damageProjDef)).toBe(true)
    })

    it('is NOT valid on non-damage spells (buff)', () => {
        expect(EMPOWER.validOn(buffDef)).toBe(false)
    })

    it('is NOT valid on healing spells', () => {
        expect(EMPOWER.validOn(instantHealDef)).toBe(false)
    })
})

describe('EMPOWER — apply', () => {
    it('increases computedDamage by 20%', () => {
        const inst = new SpellInstance(damageProjDef, [EMPOWER])
        expect(inst.computedDamage).toBe(Math.round(20 * 1.2))
    })

    it('does not alter mana cost', () => {
        const inst = new SpellInstance(damageProjDef, [EMPOWER])
        expect(inst.computedCost).toBe(damageProjDef.manaCost)
    })

    it('does not alter cooldown', () => {
        const inst = new SpellInstance(damageProjDef, [EMPOWER])
        expect(inst.computedCooldown).toBe(damageProjDef.cooldown)
    })
})

// ── QUICK_CAST ────────────────────────────────────────────────────────────────

describe('QUICK_CAST — validOn', () => {
    it('is valid on spells with castTime > 0', () => {
        expect(QUICK_CAST.validOn(damageProjDef)).toBe(true)
    })

    it('is NOT valid on instant spells (castTime = 0)', () => {
        expect(QUICK_CAST.validOn(buffDef)).toBe(false)
    })
})

describe('QUICK_CAST — apply', () => {
    it('reduces computedCastTime by 30%', () => {
        const inst = new SpellInstance(damageProjDef, [QUICK_CAST])
        expect(inst.computedCastTime).toBeCloseTo(0.3 * 0.7, 4)
    })

    it('increases computedCost by 10%', () => {
        const inst = new SpellInstance(damageProjDef, [QUICK_CAST])
        expect(inst.computedCost).toBe(Math.ceil(15 * 1.1))
    })

    it('does not change damage', () => {
        const inst = new SpellInstance(damageProjDef, [QUICK_CAST])
        expect(inst.computedDamage).toBe(damageProjDef.baseDamage)
    })
})

// ── HEAVY_IMPACT ──────────────────────────────────────────────────────────────

describe('HEAVY_IMPACT — validOn', () => {
    it('is valid on damage spells', () => {
        expect(HEAVY_IMPACT.validOn(damageProjDef)).toBe(true)
    })

    it('is NOT valid on non-damage buff spells', () => {
        expect(HEAVY_IMPACT.validOn(buffDef)).toBe(false)
    })
})

describe('HEAVY_IMPACT — apply', () => {
    it('increases computedDamage by 40%', () => {
        const inst = new SpellInstance(damageProjDef, [HEAVY_IMPACT])
        expect(inst.computedDamage).toBe(Math.round(20 * 1.4))
    })

    it('increases computedCost by 40%', () => {
        const inst = new SpellInstance(damageProjDef, [HEAVY_IMPACT])
        expect(inst.computedCost).toBe(Math.ceil(15 * 1.4))
    })

    it('applies 20% cooldown on top of DEFAULT_COOLDOWN when base cooldown is 0', () => {
        const inst = new SpellInstance(noCooldownDamageDef, [HEAVY_IMPACT])
        expect(inst.computedCooldown).toBeCloseTo(DEFAULT_COOLDOWN * 1.2, 4)
    })

    it('applies 20% cooldown on top of existing cooldown when base cooldown > 0', () => {
        const inst = new SpellInstance(damageAoeDef, [HEAVY_IMPACT])
        // base cooldown is 3
        expect(inst.computedCooldown).toBeCloseTo(3 * 1.2, 4)
    })
})

// ── SPLIT ─────────────────────────────────────────────────────────────────────

describe('SPLIT — validOn', () => {
    it('is valid on projectile spells', () => {
        expect(SPLIT.validOn(damageProjDef)).toBe(true)
    })

    it('is NOT valid on aoe spells', () => {
        expect(SPLIT.validOn(damageAoeDef)).toBe(false)
    })

    it('is NOT valid on buff spells', () => {
        expect(SPLIT.validOn(buffDef)).toBe(false)
    })
})

describe('SPLIT — apply', () => {
    it('sets splitEnabled to true', () => {
        const inst = new SpellInstance(damageProjDef, [SPLIT])
        expect(inst.splitEnabled).toBe(true)
    })

    it('reduces computedDamage by 40% (60% of base)', () => {
        const inst = new SpellInstance(damageProjDef, [SPLIT])
        expect(inst.computedDamage).toBe(Math.round(20 * 0.6))
    })
})

// ── EXTENDED_DURATION ─────────────────────────────────────────────────────────

describe('EXTENDED_DURATION — validOn', () => {
    it('is valid on aoe spells', () => {
        expect(EXTENDED_DURATION.validOn(damageAoeDef)).toBe(true)
    })

    it('is valid on buff spells', () => {
        expect(EXTENDED_DURATION.validOn(buffDef)).toBe(true)
    })

    it('is NOT valid on projectile spells without aoeDuration', () => {
        expect(EXTENDED_DURATION.validOn(damageProjDef)).toBe(false)
    })

    it('is NOT valid on instant heal spells', () => {
        expect(EXTENDED_DURATION.validOn(instantHealDef)).toBe(false)
    })
})

describe('EXTENDED_DURATION — apply', () => {
    it('sets extendedDuration flag to true', () => {
        const inst = new SpellInstance(damageAoeDef, [EXTENDED_DURATION])
        expect(inst.extendedDuration).toBe(true)
    })

    it('does not modify damage or cost', () => {
        const inst = new SpellInstance(damageAoeDef, [EXTENDED_DURATION])
        expect(inst.computedDamage).toBe(damageAoeDef.baseDamage)
        expect(inst.computedCost).toBe(damageAoeDef.manaCost)
    })
})

// ── LINGERING_BURN ────────────────────────────────────────────────────────────

describe('LINGERING_BURN — validOn', () => {
    it('is valid on damage spells', () => {
        expect(LINGERING_BURN.validOn(damageProjDef)).toBe(true)
    })

    it('is NOT valid on non-damage spells', () => {
        expect(LINGERING_BURN.validOn(buffDef)).toBe(false)
    })

    it('is NOT valid on heal spells', () => {
        expect(LINGERING_BURN.validOn(instantHealDef)).toBe(false)
    })
})

describe('LINGERING_BURN — apply', () => {
    it('sets lingeringBurn with damagePerSecond of 5', () => {
        const inst = new SpellInstance(damageProjDef, [LINGERING_BURN])
        expect(inst.lingeringBurn?.damagePerSecond).toBe(5)
    })

    it('sets lingeringBurn duration of 2 seconds', () => {
        const inst = new SpellInstance(damageProjDef, [LINGERING_BURN])
        expect(inst.lingeringBurn?.duration).toBe(2)
    })

    it('does not change base damage or cost', () => {
        const inst = new SpellInstance(damageProjDef, [LINGERING_BURN])
        expect(inst.computedDamage).toBe(damageProjDef.baseDamage)
        expect(inst.computedCost).toBe(damageProjDef.manaCost)
    })
})

// ── MANA_EFFICIENT ────────────────────────────────────────────────────────────

describe('MANA_EFFICIENT — validOn', () => {
    it('is valid on all spell types', () => {
        expect(MANA_EFFICIENT.validOn(damageProjDef)).toBe(true)
        expect(MANA_EFFICIENT.validOn(buffDef)).toBe(true)
        expect(MANA_EFFICIENT.validOn(instantHealDef)).toBe(true)
        expect(MANA_EFFICIENT.validOn(damageAoeDef)).toBe(true)
    })
})

describe('MANA_EFFICIENT — apply', () => {
    it('reduces computedCost by 20%', () => {
        const inst = new SpellInstance(damageProjDef, [MANA_EFFICIENT])
        expect(inst.computedCost).toBe(Math.floor(15 * 0.8))
    })

    it('reduces computedDamage by 10%', () => {
        const inst = new SpellInstance(damageProjDef, [MANA_EFFICIENT])
        expect(inst.computedDamage).toBe(Math.round(20 * 0.9))
    })

    it('clamps cost to 0 — never negative', () => {
        const zeroCostDef = { ...damageProjDef, manaCost: 0 }
        const inst = new SpellInstance(zeroCostDef, [MANA_EFFICIENT])
        expect(inst.computedCost).toBe(0)
    })
})

// ── LIFESTEAL ─────────────────────────────────────────────────────────────────

describe('LIFESTEAL — validOn', () => {
    it('is valid on damage spells', () => {
        expect(LIFESTEAL.validOn(damageProjDef)).toBe(true)
    })

    it('is NOT valid on non-damage spells', () => {
        expect(LIFESTEAL.validOn(buffDef)).toBe(false)
        expect(LIFESTEAL.validOn(instantHealDef)).toBe(false)
    })
})

describe('LIFESTEAL — apply', () => {
    it('sets lifesteal to 0.15', () => {
        const inst = new SpellInstance(damageProjDef, [LIFESTEAL])
        expect(inst.lifesteal).toBe(0.15)
    })

    it('does not change damage or cost', () => {
        const inst = new SpellInstance(damageProjDef, [LIFESTEAL])
        expect(inst.computedDamage).toBe(damageProjDef.baseDamage)
        expect(inst.computedCost).toBe(damageProjDef.manaCost)
    })
})

// ── Modifier stacking (two modifiers applied together) ────────────────────────

describe('Modifier combinations', () => {
    it('EMPOWER + HEAVY_IMPACT stacks damage correctly', () => {
        const inst = new SpellInstance(damageProjDef, [EMPOWER, HEAVY_IMPACT])
        // EMPOWER: 20 * 1.2 = 24, HEAVY_IMPACT: 24 * 1.4 = 33.6 → 34
        expect(inst.computedDamage).toBe(Math.round(Math.round(20 * 1.2) * 1.4))
    })

    it('LINGERING_BURN + LIFESTEAL both apply without conflict', () => {
        const inst = new SpellInstance(damageProjDef, [LINGERING_BURN, LIFESTEAL])
        expect(inst.lingeringBurn).not.toBeNull()
        expect(inst.lifesteal).toBe(0.15)
    })

    it('MANA_EFFICIENT + QUICK_CAST both reduce respective values', () => {
        const inst = new SpellInstance(damageProjDef, [QUICK_CAST, MANA_EFFICIENT])
        expect(inst.computedCost).toBeLessThan(damageProjDef.manaCost)
        expect(inst.computedCastTime).toBeLessThan(damageProjDef.castTime)
    })
})

// ── validateModifier ──────────────────────────────────────────────────────────

describe('validateModifier', () => {
    it('returns null for a valid modifier with no existing mods', () => {
        expect(validateModifier(EMPOWER, damageProjDef, [])).toBeNull()
    })

    it('returns an error string if modifier is invalid for spell type', () => {
        const err = validateModifier(SPLIT, damageAoeDef, [])
        expect(typeof err).toBe('string')
        expect(err).not.toBeNull()
    })

    it('returns an error string if the same modifier is already applied', () => {
        const err = validateModifier(EMPOWER, damageProjDef, [EMPOWER])
        expect(err).not.toBeNull()
        expect(err).toContain('already applied')
    })

    it('returns an error string if 2 modifiers are already applied (max reached)', () => {
        const err = validateModifier(MANA_EFFICIENT, damageProjDef, [EMPOWER, LINGERING_BURN])
        expect(err).not.toBeNull()
        expect(err).toContain('Maximum')
    })

    it('allows a second distinct valid modifier', () => {
        expect(validateModifier(LINGERING_BURN, damageProjDef, [EMPOWER])).toBeNull()
    })

    it('error message includes the modifier name for invalid spell type', () => {
        const err = validateModifier(SPLIT, buffDef, [])
        expect(err).toContain('Split')
        expect(err).toContain('Phase Walk')
    })
})
