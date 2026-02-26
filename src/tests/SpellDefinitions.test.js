import { describe, it, expect } from 'vitest'
import { FIREBALL, ICE_SHARD } from '../game/spells/SpellDefinitions.js'

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

describe('ICE_SHARD definition', () => {
  it('has correct id', () => expect(ICE_SHARD.id).toBe('ice_shard'))
  it('has correct name', () => expect(ICE_SHARD.name).toBe('Ice Shard'))
  it('has correct baseDamage', () => expect(ICE_SHARD.baseDamage).toBe(15))
  it('has correct manaCost', () => expect(ICE_SHARD.manaCost).toBe(12))
  it('has correct castTime', () => expect(ICE_SHARD.castTime).toBe(0.2))
  it('has correct cooldown', () => expect(ICE_SHARD.cooldown).toBe(0))
  it('has correct behaviorType', () => expect(ICE_SHARD.behaviorType).toBe('projectile'))
  it('has correct projectileSpeed', () => expect(ICE_SHARD.projectileSpeed).toBe(220))
  it('has correct projectileSize', () => expect(ICE_SHARD.projectileSize).toBe(4))
  it('has correct projectileLifetime', () => expect(ICE_SHARD.projectileLifetime).toBe(3))
  it('is not an ultimate', () => expect(ICE_SHARD.isUltimate).toBe(false))
  it('has projectile and damage tags', () => {
    expect(ICE_SHARD.tags).toContain('projectile')
    expect(ICE_SHARD.tags).toContain('damage')
  })
  it('has a cyan color', () => expect(ICE_SHARD.color).toBe('#00ffff'))
  it('has slowDuration of 1.5', () => expect(ICE_SHARD.slowDuration).toBe(1.5))
  it('has slowFactor of 0.15', () => expect(ICE_SHARD.slowFactor).toBe(0.15))
})
