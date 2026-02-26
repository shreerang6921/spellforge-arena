import { describe, it, expect } from 'vitest'
import { FIREBALL } from '../game/spells/SpellDefinitions.js'

describe('FIREBALL definition', () => {
  it('has correct id', () => expect(FIREBALL.id).toBe('fireball'))
  it('has correct baseDamage', () => expect(FIREBALL.baseDamage).toBe(20))
  it('has correct manaCost', () => expect(FIREBALL.manaCost).toBe(15))
  it('has correct castTime', () => expect(FIREBALL.castTime).toBe(0.3))
  it('has correct cooldown', () => expect(FIREBALL.cooldown).toBe(0))
  it('has correct behaviorType', () => expect(FIREBALL.behaviorType).toBe('projectile'))
  it('has correct projectileSpeed', () => expect(FIREBALL.projectileSpeed).toBe(150))
  it('has correct projectileSize', () => expect(FIREBALL.projectileSize).toBe(5))
  it('is not an ultimate', () => expect(FIREBALL.isUltimate).toBe(false))
  it('has projectile and damage tags', () => {
    expect(FIREBALL.tags).toContain('projectile')
    expect(FIREBALL.tags).toContain('damage')
  })
  it('has a color', () => expect(typeof FIREBALL.color).toBe('string'))
})
