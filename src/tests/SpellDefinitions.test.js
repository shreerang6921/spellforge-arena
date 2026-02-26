import { describe, it, expect } from 'vitest'
import {
  FIREBALL, ICE_SHARD, ARCANE_BURST,
  BLOOD_LANCE, GROUND_FLAME,
  DASH, BLINK_STRIKE, PHASE_WALK,
  HEALING_PULSE, MANA_SURGE, SPELL_ECHO, ARCANE_BEAM,
  METEOR, ARCANE_OVERLOAD, TEMPORAL_RESET,
} from '../game/spells/SpellDefinitions.js'

// ── FIREBALL ──────────────────────────────────────────────────────────────────

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

// ── ARCANE_BURST ──────────────────────────────────────────────────────────────

describe('ARCANE_BURST definition', () => {
  it('has correct id', () => expect(ARCANE_BURST.id).toBe('arcane_burst'))
  it('has correct name', () => expect(ARCANE_BURST.name).toBe('Arcane Burst'))
  it('has correct baseDamage', () => expect(ARCANE_BURST.baseDamage).toBe(12))
  it('has correct manaCost', () => expect(ARCANE_BURST.manaCost).toBe(20))
  it('has correct castTime', () => expect(ARCANE_BURST.castTime).toBe(0.2))
  it('has correct cooldown', () => expect(ARCANE_BURST.cooldown).toBe(2))
  it('has correct behaviorType', () => expect(ARCANE_BURST.behaviorType).toBe('projectile'))
  it('has correct projectileSpeed', () => expect(ARCANE_BURST.projectileSpeed).toBe(200))
  it('has correct projectileSize', () => expect(ARCANE_BURST.projectileSize).toBe(3))
  it('has correct projectileCount of 3', () => expect(ARCANE_BURST.projectileCount).toBe(3))
  it('has correct spreadAngle of 15', () => expect(ARCANE_BURST.spreadAngle).toBe(15))
  it('is not an ultimate', () => expect(ARCANE_BURST.isUltimate).toBe(false))
  it('has projectile and damage tags', () => {
    expect(ARCANE_BURST.tags).toContain('projectile')
    expect(ARCANE_BURST.tags).toContain('damage')
  })
  it('has a yellow color', () => expect(ARCANE_BURST.color).toBe('#ffff00'))
})

// ── ICE_SHARD ─────────────────────────────────────────────────────────────────

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

// ── BLOOD_LANCE ───────────────────────────────────────────────────────────────

describe('BLOOD_LANCE definition', () => {
  it('has correct id', () => expect(BLOOD_LANCE.id).toBe('blood_lance'))
  it('has correct baseDamage', () => expect(BLOOD_LANCE.baseDamage).toBe(40))
  it('has manaCost of 10', () => expect(BLOOD_LANCE.manaCost).toBe(10))
  it('has hpCost of 5', () => expect(BLOOD_LANCE.hpCost).toBe(5))
  it('has correct castTime', () => expect(BLOOD_LANCE.castTime).toBe(0.4))
  it('has correct cooldown', () => expect(BLOOD_LANCE.cooldown).toBe(2))
  it('has projectile behaviorType', () => expect(BLOOD_LANCE.behaviorType).toBe('projectile'))
  it('is not an ultimate', () => expect(BLOOD_LANCE.isUltimate).toBe(false))
  it('has damage tag', () => expect(BLOOD_LANCE.tags).toContain('damage'))
  it('has a dark red color', () => expect(BLOOD_LANCE.color).toBe('#8b0000'))
})

// ── GROUND_FLAME ──────────────────────────────────────────────────────────────

describe('GROUND_FLAME definition', () => {
  it('has correct id', () => expect(GROUND_FLAME.id).toBe('ground_flame'))
  it('has correct baseDamage (per tick)', () => expect(GROUND_FLAME.baseDamage).toBe(5))
  it('has correct manaCost', () => expect(GROUND_FLAME.manaCost).toBe(25))
  it('is aoe behaviorType', () => expect(GROUND_FLAME.behaviorType).toBe('aoe'))
  it('has correct aoeRadius', () => expect(GROUND_FLAME.aoeRadius).toBe(20))
  it('has correct aoeDuration of 3', () => expect(GROUND_FLAME.aoeDuration).toBe(3))
  it('has correct aoeTickRate of 0.5s', () => expect(GROUND_FLAME.aoeTickRate).toBe(0.5))
  it('has correct cooldown', () => expect(GROUND_FLAME.cooldown).toBe(3))
  it('is not an ultimate', () => expect(GROUND_FLAME.isUltimate).toBe(false))
  it('has aoe and damage tags', () => {
    expect(GROUND_FLAME.tags).toContain('aoe')
    expect(GROUND_FLAME.tags).toContain('damage')
  })
})

// ── DASH ──────────────────────────────────────────────────────────────────────

describe('DASH definition', () => {
  it('has correct id', () => expect(DASH.id).toBe('dash'))
  it('has 0 baseDamage', () => expect(DASH.baseDamage).toBe(0))
  it('has correct manaCost', () => expect(DASH.manaCost).toBe(15))
  it('is dash behaviorType', () => expect(DASH.behaviorType).toBe('dash'))
  it('has dashDistance of 50', () => expect(DASH.dashDistance).toBe(50))
  it('has dashDuration of 0.15', () => expect(DASH.dashDuration).toBe(0.15))
  it('has correct cooldown', () => expect(DASH.cooldown).toBe(3))
  it('is not an ultimate', () => expect(DASH.isUltimate).toBe(false))
  it('has mobility tag', () => expect(DASH.tags).toContain('mobility'))
})

// ── BLINK_STRIKE ──────────────────────────────────────────────────────────────

describe('BLINK_STRIKE definition', () => {
  it('has correct id', () => expect(BLINK_STRIKE.id).toBe('blink_strike'))
  it('has correct baseDamage', () => expect(BLINK_STRIKE.baseDamage).toBe(25))
  it('has correct manaCost', () => expect(BLINK_STRIKE.manaCost).toBe(30))
  it('is dash behaviorType', () => expect(BLINK_STRIKE.behaviorType).toBe('dash'))
  it('has blinkMaxRange of 80', () => expect(BLINK_STRIKE.blinkMaxRange).toBe(80))
  it('has aoeRadius of 20', () => expect(BLINK_STRIKE.aoeRadius).toBe(20))
  it('has correct cooldown', () => expect(BLINK_STRIKE.cooldown).toBe(4))
  it('is not an ultimate', () => expect(BLINK_STRIKE.isUltimate).toBe(false))
  it('has dash and damage tags', () => {
    expect(BLINK_STRIKE.tags).toContain('dash')
    expect(BLINK_STRIKE.tags).toContain('damage')
  })
})

// ── PHASE_WALK ────────────────────────────────────────────────────────────────

describe('PHASE_WALK definition', () => {
  it('has correct id', () => expect(PHASE_WALK.id).toBe('phase_walk'))
  it('has 0 baseDamage', () => expect(PHASE_WALK.baseDamage).toBe(0))
  it('has correct manaCost', () => expect(PHASE_WALK.manaCost).toBe(20))
  it('is buff behaviorType', () => expect(PHASE_WALK.behaviorType).toBe('buff'))
  it('has speedBoost of 0.5 (+50%)', () => expect(PHASE_WALK.speedBoost).toBe(0.5))
  it('has duration of 3s', () => expect(PHASE_WALK.duration).toBe(3))
  it('has correct cooldown', () => expect(PHASE_WALK.cooldown).toBe(5))
  it('is not an ultimate', () => expect(PHASE_WALK.isUltimate).toBe(false))
  it('has buff and mobility tags', () => {
    expect(PHASE_WALK.tags).toContain('buff')
    expect(PHASE_WALK.tags).toContain('mobility')
  })
})

// ── HEALING_PULSE ─────────────────────────────────────────────────────────────

describe('HEALING_PULSE definition', () => {
  it('has correct id', () => expect(HEALING_PULSE.id).toBe('healing_pulse'))
  it('has 0 baseDamage', () => expect(HEALING_PULSE.baseDamage).toBe(0))
  it('has correct manaCost', () => expect(HEALING_PULSE.manaCost).toBe(30))
  it('is instant behaviorType', () => expect(HEALING_PULSE.behaviorType).toBe('instant'))
  it('heals 25 HP', () => expect(HEALING_PULSE.healAmount).toBe(25))
  it('has castTime of 0.3', () => expect(HEALING_PULSE.castTime).toBe(0.3))
  it('has cooldown of 4', () => expect(HEALING_PULSE.cooldown).toBe(4))
  it('is not an ultimate', () => expect(HEALING_PULSE.isUltimate).toBe(false))
})

// ── MANA_SURGE ────────────────────────────────────────────────────────────────

describe('MANA_SURGE definition', () => {
  it('has correct id', () => expect(MANA_SURGE.id).toBe('mana_surge'))
  it('has 0 manaCost', () => expect(MANA_SURGE.manaCost).toBe(0))
  it('is instant behaviorType', () => expect(MANA_SURGE.behaviorType).toBe('instant'))
  it('restores 40 mana', () => expect(MANA_SURGE.manaRestore).toBe(40))
  it('has castTime of 0.2', () => expect(MANA_SURGE.castTime).toBe(0.2))
  it('has cooldown of 5', () => expect(MANA_SURGE.cooldown).toBe(5))
  it('is not an ultimate', () => expect(MANA_SURGE.isUltimate).toBe(false))
  it('has utility tag', () => expect(MANA_SURGE.tags).toContain('utility'))
})

// ── SPELL_ECHO ────────────────────────────────────────────────────────────────

describe('SPELL_ECHO definition', () => {
  it('has correct id', () => expect(SPELL_ECHO.id).toBe('spell_echo'))
  it('has 0 baseDamage', () => expect(SPELL_ECHO.baseDamage).toBe(0))
  it('has correct manaCost', () => expect(SPELL_ECHO.manaCost).toBe(20))
  it('is buff behaviorType', () => expect(SPELL_ECHO.behaviorType).toBe('buff'))
  it('has castTime of 0.1', () => expect(SPELL_ECHO.castTime).toBe(0.1))
  it('has cooldown of 6', () => expect(SPELL_ECHO.cooldown).toBe(6))
  it('is not an ultimate', () => expect(SPELL_ECHO.isUltimate).toBe(false))
  it('has buff tag', () => expect(SPELL_ECHO.tags).toContain('buff'))
})

// ── ARCANE_BEAM ───────────────────────────────────────────────────────────────

describe('ARCANE_BEAM definition', () => {
  it('has correct id', () => expect(ARCANE_BEAM.id).toBe('arcane_beam'))
  it('is buff behaviorType', () => expect(ARCANE_BEAM.behaviorType).toBe('buff'))
  it('has beamDamagePerSecond of 12', () => expect(ARCANE_BEAM.beamDamagePerSecond).toBe(12))
  it('has beamManaCostPerSecond of 15', () => expect(ARCANE_BEAM.beamManaCostPerSecond).toBe(15))
  it('has beamMaxRange of 150', () => expect(ARCANE_BEAM.beamMaxRange).toBe(150))
  it('has 0 cooldown (channeled)', () => expect(ARCANE_BEAM.cooldown).toBe(0))
  it('is not an ultimate', () => expect(ARCANE_BEAM.isUltimate).toBe(false))
  it('has damage tag', () => expect(ARCANE_BEAM.tags).toContain('damage'))
})

// ── METEOR (ultimate) ─────────────────────────────────────────────────────────

describe('METEOR definition', () => {
  it('has correct id', () => expect(METEOR.id).toBe('meteor'))
  it('has correct baseDamage', () => expect(METEOR.baseDamage).toBe(60))
  it('has correct manaCost', () => expect(METEOR.manaCost).toBe(60))
  it('is aoe behaviorType', () => expect(METEOR.behaviorType).toBe('aoe'))
  it('has aoeRadius of 40', () => expect(METEOR.aoeRadius).toBe(40))
  it('has meteorDelay of 1.5', () => expect(METEOR.meteorDelay).toBe(1.5))
  it('has cooldown of 15', () => expect(METEOR.cooldown).toBe(15))
  it('IS an ultimate', () => expect(METEOR.isUltimate).toBe(true))
  it('has aoe and damage tags', () => {
    expect(METEOR.tags).toContain('aoe')
    expect(METEOR.tags).toContain('damage')
  })
})

// ── ARCANE_OVERLOAD (ultimate) ────────────────────────────────────────────────

describe('ARCANE_OVERLOAD definition', () => {
  it('has correct id', () => expect(ARCANE_OVERLOAD.id).toBe('arcane_overload'))
  it('has 0 baseDamage', () => expect(ARCANE_OVERLOAD.baseDamage).toBe(0))
  it('has correct manaCost', () => expect(ARCANE_OVERLOAD.manaCost).toBe(50))
  it('is buff behaviorType', () => expect(ARCANE_OVERLOAD.behaviorType).toBe('buff'))
  it('has damageBonus of 0.5 (+50%)', () => expect(ARCANE_OVERLOAD.damageBonus).toBe(0.5))
  it('has duration of 5s', () => expect(ARCANE_OVERLOAD.duration).toBe(5))
  it('has cooldown of 12', () => expect(ARCANE_OVERLOAD.cooldown).toBe(12))
  it('IS an ultimate', () => expect(ARCANE_OVERLOAD.isUltimate).toBe(true))
})

// ── TEMPORAL_RESET (ultimate) ─────────────────────────────────────────────────

describe('TEMPORAL_RESET definition', () => {
  it('has correct id', () => expect(TEMPORAL_RESET.id).toBe('temporal_reset'))
  it('has 0 baseDamage', () => expect(TEMPORAL_RESET.baseDamage).toBe(0))
  it('has correct manaCost', () => expect(TEMPORAL_RESET.manaCost).toBe(40))
  it('is instant behaviorType', () => expect(TEMPORAL_RESET.behaviorType).toBe('instant'))
  it('has castTime of 0.2', () => expect(TEMPORAL_RESET.castTime).toBe(0.2))
  it('has cooldown of 15', () => expect(TEMPORAL_RESET.cooldown).toBe(15))
  it('IS an ultimate', () => expect(TEMPORAL_RESET.isUltimate).toBe(true))
  it('has utility tag', () => expect(TEMPORAL_RESET.tags).toContain('utility'))
})
