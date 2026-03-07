import { describe, it, expect, vi } from 'vitest'
import { GameEngine } from '../game/GameEngine.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'
import { FIREBALL, ICE_SHARD, ARCANE_BURST } from '../game/spells/SpellDefinitions.js'

describe('GameEngine — init', () => {
  it('creates player and bot after init()', () => {
    const engine = new GameEngine()
    engine.init()
    expect(engine.player).not.toBeNull()
    expect(engine.bot).not.toBeNull()
    expect(engine.player.isBot).toBe(false)
    expect(engine.bot.isBot).toBe(true)
  })

  it('spawns player and bot at different positions', () => {
    const engine = new GameEngine()
    engine.init()
    expect(engine.player.position.x).not.toBe(engine.bot.position.x)
  })
})

describe('GameEngine — update', () => {
  it('updates both player and bot', () => {
    const engine = new GameEngine()
    engine.init()
    const spyPlayer = vi.spyOn(engine.player, 'update')
    const spyBot    = vi.spyOn(engine.bot,    'update')
    engine.update(0.016)
    expect(spyPlayer).toHaveBeenCalledWith(0.016)
    expect(spyBot).toHaveBeenCalledWith(0.016)
  })
})

describe('GameEngine — projectile management', () => {
  it('projectiles list is empty after init()', () => {
    const engine = new GameEngine()
    engine.init()
    expect(engine.projectiles).toEqual([])
  })

  it('creates a projectile when player.input.attack is true and cooldown is 0', () => {
    const engine = new GameEngine()
    engine.init()
    engine.player.input.attack = true
    engine.update(0.016)
    expect(engine.projectiles.length).toBe(1)
  })

  it('does not create a projectile when attack input is false', () => {
    const engine = new GameEngine()
    engine.init()
    engine.player.input.attack = false
    engine.update(0.016)
    expect(engine.projectiles.length).toBe(0)
  })

  it('does not create a second projectile while cooldown is active', () => {
    const engine = new GameEngine()
    engine.init()
    engine.player.input.attack = true
    engine.update(0.016) // fires
    engine.update(0.016) // still in cooldown
    expect(engine.projectiles.length).toBe(1)
  })

  it('projectiles are updated each frame (position changes)', () => {
    const engine = new GameEngine()
    engine.init()
    engine.player.input.attack = true
    engine.update(0.016) // fires
    const x0 = engine.projectiles[0].position.x
    engine.player.input.attack = false
    engine.update(0.1)
    expect(engine.projectiles[0].position.x).not.toBe(x0)
  })

  it('removes inactive projectiles after update', () => {
    const engine = new GameEngine()
    engine.init()
    engine.player.input.attack = true
    engine.update(0.016)
    // Force expire the projectile
    engine.projectiles[0].active = false
    engine.player.input.attack = false
    engine.update(0.016)
    expect(engine.projectiles.length).toBe(0)
  })
})

describe('GameEngine — Fireball spell casting', () => {
  function makeEngineWithFireball() {
    const engine = new GameEngine()
    engine.init()
    engine.player.deck[0] = new SpellInstance(FIREBALL)
    return engine
  }

  it('pressing spell slot 1 starts a pending cast', () => {
    const engine = makeEngineWithFireball()
    engine.player.input.spellSlots[0] = true
    engine.update(0.016)
    expect(engine.player.pendingCast).not.toBeNull()
  })

  it('no projectile spawns immediately on cast start (has cast time)', () => {
    const engine = makeEngineWithFireball()
    engine.player.input.spellSlots[0] = true
    engine.update(0.016)
    expect(engine.projectiles.length).toBe(0)
  })

  it('spawns a projectile after cast time elapses', () => {
    const engine = makeEngineWithFireball()
    engine.player.input.spellSlots[0] = true
    engine.update(0.016)
    engine.player.input.spellSlots[0] = false
    engine.update(0.5)  // 0.016 + 0.5 > 0.3s cast time
    expect(engine.projectiles.length).toBe(1)
  })

  it('Fireball projectile has correct damage', () => {
    const engine = makeEngineWithFireball()
    engine.player.input.spellSlots[0] = true
    engine.update(0.016)
    engine.player.input.spellSlots[0] = false
    engine.update(0.5)
    expect(engine.projectiles[0].damage).toBe(FIREBALL.baseDamage)
  })

  it('Fireball projectile has correct color', () => {
    const engine = makeEngineWithFireball()
    engine.player.input.spellSlots[0] = true
    engine.update(0.016)
    engine.player.input.spellSlots[0] = false
    engine.update(0.5)
    expect(engine.projectiles[0].color).toBe(FIREBALL.color)
  })

  it('Fireball projectile has correct size', () => {
    const engine = makeEngineWithFireball()
    engine.player.input.spellSlots[0] = true
    engine.update(0.016)
    engine.player.input.spellSlots[0] = false
    engine.update(0.5)
    expect(engine.projectiles[0].size).toEqual({ w: FIREBALL.projectileSize, h: FIREBALL.projectileSize })
  })

  it('Fireball deducts mana on cast', () => {
    const engine = makeEngineWithFireball()
    engine.player.input.spellSlots[0] = true
    engine.update(0.016)
    expect(engine.player.mana).toBeLessThan(100)
  })

  it('does not cast Fireball while already casting', () => {
    const engine = makeEngineWithFireball()
    engine.player.input.spellSlots[0] = true
    engine.update(0.016)
    const manaAfterFirst = engine.player.mana
    engine.update(0.016)  // still casting, should not cast again
    expect(engine.player.mana).toBeCloseTo(manaAfterFirst, 0)
  })
})

describe('GameEngine — _spawnSpellProjectile', () => {
  it('returns empty array for non-projectile behavior types', () => {
    const engine = new GameEngine()
    engine.init()
    const buffSpell = new SpellInstance({
      id: 'buff', baseDamage: 0, manaCost: 10, castTime: 0, cooldown: 0,
      behaviorType: 'buff', projectileSpeed: 0, projectileSize: 0, projectileLifetime: 1, color: '#fff',
    })
    const result = engine._spawnSpellProjectile({ spell: buffSpell, direction: { x: 1, y: 0 } }, engine.player)
    expect(result).toEqual([])
  })

  it('returns a single-element array for a standard projectile spell', () => {
    const engine = new GameEngine()
    engine.init()
    const spell = new SpellInstance(FIREBALL)
    const result = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    expect(result).toHaveLength(1)
  })

  it('onHit is null for spells without slowDuration', () => {
    const engine = new GameEngine()
    engine.init()
    const spell = new SpellInstance(FIREBALL)
    const [proj] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    expect(proj.onHit).toBeNull()
  })

  it('attaches onHit callback for Ice Shard projectile', () => {
    const engine = new GameEngine()
    engine.init()
    const spell = new SpellInstance(ICE_SHARD)
    const [proj] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    expect(typeof proj.onHit).toBe('function')
  })

  it('Ice Shard onHit applies slow to the target', () => {
    const engine = new GameEngine()
    engine.init()
    const spell = new SpellInstance(ICE_SHARD)
    const [proj] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    proj.onHit(engine.bot)
    expect(engine.bot.slowTimer).toBe(ICE_SHARD.slowDuration)
    expect(engine.bot.speedMultiplier).toBeCloseTo(0.85)
  })
})

describe('GameEngine — Ice Shard spell casting', () => {
  function makeEngineWithIceShard() {
    const engine = new GameEngine()
    engine.init()
    engine.player.deck[1] = new SpellInstance(ICE_SHARD)
    return engine
  }

  it('pressing spell slot 2 starts a pending cast', () => {
    const engine = makeEngineWithIceShard()
    engine.player.input.spellSlots[1] = true
    engine.update(0.016)
    expect(engine.player.pendingCast).not.toBeNull()
  })

  it('spawns a projectile after cast time elapses', () => {
    const engine = makeEngineWithIceShard()
    engine.player.input.spellSlots[1] = true
    engine.update(0.016)
    engine.player.input.spellSlots[1] = false
    engine.update(0.4)  // > 0.2s cast time
    expect(engine.projectiles.length).toBe(1)
  })

  it('Ice Shard projectile has correct damage', () => {
    const engine = makeEngineWithIceShard()
    engine.player.input.spellSlots[1] = true
    engine.update(0.016)
    engine.player.input.spellSlots[1] = false
    engine.update(0.4)
    expect(engine.projectiles[0].damage).toBe(ICE_SHARD.baseDamage)
  })

  it('Ice Shard projectile has correct color', () => {
    const engine = makeEngineWithIceShard()
    engine.player.input.spellSlots[1] = true
    engine.update(0.016)
    engine.player.input.spellSlots[1] = false
    engine.update(0.4)
    expect(engine.projectiles[0].color).toBe(ICE_SHARD.color)
  })

  it('Ice Shard projectile has correct size', () => {
    const engine = makeEngineWithIceShard()
    engine.player.input.spellSlots[1] = true
    engine.update(0.016)
    engine.player.input.spellSlots[1] = false
    engine.update(0.4)
    expect(engine.projectiles[0].size).toEqual({ w: ICE_SHARD.projectileSize, h: ICE_SHARD.projectileSize })
  })

  it('Ice Shard projectile has an onHit callback', () => {
    const engine = makeEngineWithIceShard()
    engine.player.input.spellSlots[1] = true
    engine.update(0.016)
    engine.player.input.spellSlots[1] = false
    engine.update(0.4)
    expect(typeof engine.projectiles[0].onHit).toBe('function')
  })

  it('Ice Shard deducts mana on cast', () => {
    const engine = makeEngineWithIceShard()
    engine.player.input.spellSlots[1] = true
    engine.update(0.016)
    expect(engine.player.mana).toBeLessThan(100)
  })
})

describe('GameEngine — Arcane Burst spell casting', () => {
  function makeEngineWithArcaneBurst() {
    const engine = new GameEngine()
    engine.init()
    engine.player.deck[2] = new SpellInstance(ARCANE_BURST)
    return engine
  }

  it('pressing spell slot 3 starts a pending cast', () => {
    const engine = makeEngineWithArcaneBurst()
    engine.player.input.spellSlots[2] = true
    engine.update(0.016)
    expect(engine.player.pendingCast).not.toBeNull()
  })

  it('spawns 3 projectiles after cast time elapses', () => {
    const engine = makeEngineWithArcaneBurst()
    engine.player.input.spellSlots[2] = true
    engine.update(0.016)
    engine.player.input.spellSlots[2] = false
    engine.update(0.21)  // resolves 0.2s cast; projectiles only travel 0.21s (stay in bounds)
    expect(engine.projectiles.length).toBe(3)
  })

  it('each projectile has the correct damage', () => {
    const engine = new GameEngine()
    engine.init()
    const spell = new SpellInstance(ARCANE_BURST)
    const projs = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    for (const proj of projs) {
      expect(proj.damage).toBe(ARCANE_BURST.baseDamage)
    }
  })

  it('each projectile has the correct color', () => {
    const engine = new GameEngine()
    engine.init()
    const spell = new SpellInstance(ARCANE_BURST)
    const projs = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    for (const proj of projs) {
      expect(proj.color).toBe(ARCANE_BURST.color)
    }
  })

  it('each projectile has the correct size', () => {
    const engine = new GameEngine()
    engine.init()
    const spell = new SpellInstance(ARCANE_BURST)
    const projs = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    for (const proj of projs) {
      expect(proj.size).toEqual({ w: ARCANE_BURST.projectileSize, h: ARCANE_BURST.projectileSize })
    }
  })

  it('projectiles have different directions (spread cone)', () => {
    const engine = new GameEngine()
    engine.init()
    const spell = new SpellInstance(ARCANE_BURST)
    const [p0, p1, p2] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    // Side projectiles must differ from center
    expect(p0.velocity.x).not.toBeCloseTo(p1.velocity.x)
    expect(p2.velocity.x).not.toBeCloseTo(p1.velocity.x)
  })

  it('center projectile travels straight toward aim direction', () => {
    const engine = makeEngineWithArcaneBurst()
    // Force a specific direction via completedCast directly
    const spell = new SpellInstance(ARCANE_BURST)
    const projs = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    // Center projectile (index 1) should have vy ≈ 0 and vx = speed
    expect(projs[1].velocity.x).toBeCloseTo(ARCANE_BURST.projectileSpeed)
    expect(projs[1].velocity.y).toBeCloseTo(0, 5)
  })

  it('side projectiles are spread at ±15° from center', () => {
    const engine = makeEngineWithArcaneBurst()
    const spell = new SpellInstance(ARCANE_BURST)
    const projs = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    const angle = 15 * Math.PI / 180
    // Left projectile (index 0): -15°
    expect(projs[0].velocity.x).toBeCloseTo(Math.cos(-angle) * ARCANE_BURST.projectileSpeed, 3)
    expect(projs[0].velocity.y).toBeCloseTo(Math.sin(-angle) * ARCANE_BURST.projectileSpeed, 3)
    // Right projectile (index 2): +15°
    expect(projs[2].velocity.x).toBeCloseTo(Math.cos(angle) * ARCANE_BURST.projectileSpeed, 3)
    expect(projs[2].velocity.y).toBeCloseTo(Math.sin(angle) * ARCANE_BURST.projectileSpeed, 3)
  })

  it('_spawnSpellProjectile returns 3 projectiles for Arcane Burst', () => {
    const engine = new GameEngine()
    engine.init()
    const spell = new SpellInstance(ARCANE_BURST)
    const result = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    expect(result).toHaveLength(3)
  })

  it('Arcane Burst deducts mana on cast', () => {
    const engine = makeEngineWithArcaneBurst()
    engine.player.input.spellSlots[2] = true
    engine.update(0.016)
    expect(engine.player.mana).toBeLessThan(100)
  })

  it('Arcane Burst has a 2s cooldown after casting', () => {
    const engine = makeEngineWithArcaneBurst()
    engine.player.input.spellSlots[2] = true
    engine.update(0.016)
    expect(engine.player.cooldowns['arcane_burst']).toBeCloseTo(ARCANE_BURST.cooldown)
  })
})
