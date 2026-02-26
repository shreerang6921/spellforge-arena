import { describe, it, expect } from 'vitest'
import { SpellInstance } from '../game/spells/SpellInstance.js'

const fireball = {
  id: 'fireball',
  name: 'Fireball',
  baseDamage: 20,
  manaCost: 15,
  castTime: 0.3,
  cooldown: 0,
  behaviorType: 'projectile',
  isUltimate: false,
  tags: ['projectile', 'damage'],
}

describe('SpellInstance — construction', () => {
  it('stores the definition', () => {
    const si = new SpellInstance(fireball)
    expect(si.definition).toBe(fireball)
  })

  it('computedDamage equals definition.baseDamage', () => {
    const si = new SpellInstance(fireball)
    expect(si.computedDamage).toBe(fireball.baseDamage)
  })

  it('computedCost equals definition.manaCost', () => {
    const si = new SpellInstance(fireball)
    expect(si.computedCost).toBe(fireball.manaCost)
  })

  it('computedCooldown equals definition.cooldown', () => {
    const si = new SpellInstance(fireball)
    expect(si.computedCooldown).toBe(fireball.cooldown)
  })

  it('computedCastTime equals definition.castTime', () => {
    const si = new SpellInstance(fireball)
    expect(si.computedCastTime).toBe(fireball.castTime)
  })

  it('modifiers defaults to empty array', () => {
    const si = new SpellInstance(fireball)
    expect(si.modifiers).toEqual([])
  })

  it('stores provided modifiers', () => {
    const mod = { id: 'empower', apply: () => {} }
    const si = new SpellInstance(fireball, [mod])
    expect(si.modifiers).toEqual([mod])
  })
})
