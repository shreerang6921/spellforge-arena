import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameEngine } from '../game/GameEngine.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'
import {
  FIREBALL, GROUND_FLAME, METEOR,
  DASH, BLINK_STRIKE,
  PHASE_WALK, SPELL_ECHO, ARCANE_OVERLOAD, ARCANE_BEAM,
  HEALING_PULSE, MANA_SURGE, TEMPORAL_RESET,
  BLOOD_LANCE,
} from '../game/spells/SpellDefinitions.js'
import { LIFESTEAL, LINGERING_BURN, SPLIT } from '../game/spells/ModifierDefinitions.js'

// ─── Canvas / ctx helpers ────────────────────────────────────────────────────

function makeMockCtx() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    fillRect:   vi.fn(),
    strokeRect: vi.fn(),
    fillText:   vi.fn(),
    measureText: vi.fn((str) => ({ width: str.length * 3.5 })),
    save:       vi.fn(),
    restore:    vi.fn(),
    translate:  vi.fn(),
    rotate:     vi.fn(),
  }
}

function makeMockCanvas() {
  const ctx = makeMockCtx()
  const canvas = {
    width:  0,
    height: 0,
    getContext: vi.fn(() => ctx),
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 960, height: 540 })),
  }
  return { canvas, ctx }
}

function makeEngine() {
  const { canvas, ctx } = makeMockCanvas()
  const engine = new GameEngine(canvas)
  engine.init()
  return { engine, ctx }
}

// Directly invoke _processCompletedCast — avoids full update() timing complexity
function processSpell(engine, spell, owner, direction = { x: 1, y: 0 }, targetPos = null) {
  engine._processCompletedCast({ spell, direction, targetPos }, owner)
}

// ─── AoE spells ─────────────────────────────────────────────────────────────

describe('GameEngine — Ground Flame (AoE spell)', () => {
  it('creates an AoEZone when cast', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(GROUND_FLAME), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    expect(engine.aoeZones).toHaveLength(1)
  })

  it('AoEZone has correct damage', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(GROUND_FLAME), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    expect(engine.aoeZones[0].damage).toBe(GROUND_FLAME.baseDamage)
  })

  it('AoEZone has correct radius', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(GROUND_FLAME), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    expect(engine.aoeZones[0].radius).toBe(GROUND_FLAME.aoeRadius)
  })

  it('AoEZone has correct color', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(GROUND_FLAME), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    expect(engine.aoeZones[0].color).toBe(GROUND_FLAME.color)
  })

  it('AoEZone is active on creation', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(GROUND_FLAME), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    expect(engine.aoeZones[0].active).toBe(true)
  })

  it('AoEZone is removed after duration expires', () => {
    const { engine } = makeEngine()
    engine.botAI = null
    processSpell(engine, new SpellInstance(GROUND_FLAME), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    engine.update(10) // well past 3s duration
    expect(engine.aoeZones).toHaveLength(0)
  })

  it('falls back to owner position when no targetPos and no inputHandler', () => {
    const { engine } = makeEngine()
    engine.inputHandler = null
    processSpell(engine, new SpellInstance(GROUND_FLAME), engine.player, { x: 1, y: 0 }, null)
    expect(engine.aoeZones).toHaveLength(1)
    expect(engine.aoeZones[0].position.x).toBe(engine.player.position.x)
  })

  it('falls back to inputHandler.mouse when no targetPos', () => {
    const { engine } = makeEngine()
    engine.inputHandler.mouse = { x: 100, y: 50 }
    processSpell(engine, new SpellInstance(GROUND_FLAME), engine.player, { x: 1, y: 0 }, null)
    expect(engine.aoeZones[0].position).toEqual({ x: 100, y: 50 })
  })
})

describe('GameEngine — Meteor (delayed AoE)', () => {
  it('queues a pending meteor rather than an immediate AoEZone', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(METEOR), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    expect(engine.pendingMeteors).toHaveLength(1)
    expect(engine.aoeZones).toHaveLength(0)
  })

  it('pending meteor stores the correct delay', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(METEOR), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    expect(engine.pendingMeteors[0].delay).toBe(METEOR.meteorDelay)
  })

  it('pending meteor stores the target position', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(METEOR), engine.player, { x: 1, y: 0 }, { x: 123, y: 45 })
    expect(engine.pendingMeteors[0].x).toBe(123)
    expect(engine.pendingMeteors[0].y).toBe(45)
  })

  it('meteor is removed from pendingMeteors after delay expires', () => {
    const { engine } = makeEngine()
    engine.botAI = null
    processSpell(engine, new SpellInstance(METEOR), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    engine.update(2) // past 1.5s delay
    expect(engine.pendingMeteors).toHaveLength(0)
  })

  it('meteor deals damage to bot when it lands within radius', () => {
    const { engine } = makeEngine()
    engine.botAI = null
    const targetPos = { x: engine.bot.position.x, y: engine.bot.position.y }
    const initialHp = engine.bot.hp
    processSpell(engine, new SpellInstance(METEOR), engine.player, { x: 1, y: 0 }, targetPos)
    engine.update(2)
    expect(engine.bot.hp).toBeLessThan(initialHp)
  })

  it('meteor does not deal damage to a dead bot', () => {
    const { engine } = makeEngine()
    engine.botAI = null
    engine.bot.takeDamage(999)
    const botHpAfterKill = engine.bot.hp
    processSpell(engine, new SpellInstance(METEOR), engine.player, { x: 1, y: 0 }, { x: engine.bot.position.x, y: engine.bot.position.y })
    engine.update(2)
    expect(engine.bot.hp).toBe(botHpAfterKill)
  })

  it('meteor does not damage bot outside impact radius', () => {
    const { engine } = makeEngine()
    engine.botAI = null
    const initialHp = engine.bot.hp
    // Target far from the bot (bot at x=240, target at x=50)
    processSpell(engine, new SpellInstance(METEOR), engine.player, { x: 1, y: 0 }, { x: 50, y: 50 })
    engine.update(2)
    expect(engine.bot.hp).toBe(initialHp)
  })
})

// ─── Dash spells ─────────────────────────────────────────────────────────────

describe('GameEngine — Dash spell', () => {
  it('puts player in DashState', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(DASH), engine.player, { x: 1, y: 0 })
    expect(engine.player.stateMachine.name).toBe('dash')
  })

  it('sets player velocity in dash direction', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(DASH), engine.player, { x: 1, y: 0 })
    expect(engine.player.velocity.x).toBeGreaterThan(0)
    expect(engine.player.velocity.y).toBeCloseTo(0)
  })

  it('player exits DashState after dashDuration elapses', () => {
    const { engine } = makeEngine()
    engine.botAI = null
    engine.player.deck[0] = new SpellInstance(DASH)
    engine.player.input.spellSlots[0] = true
    engine.update(0.016) // cast (castTime=0, instant)
    engine.player.input.spellSlots[0] = false
    engine.update(DASH.dashDuration + 0.05)
    expect(engine.player.stateMachine.name).not.toBe('dash')
  })
})

describe('GameEngine — Blink Strike spell', () => {
  it('teleports the player toward the target direction', () => {
    const { engine } = makeEngine()
    const startX = engine.player.position.x
    // Mouse at (90, 90), player at (80, 90) → within blinkMaxRange (80), teleports to mouse
    engine.inputHandler.mouse = { x: 90, y: 90 }
    processSpell(engine, new SpellInstance(BLINK_STRIKE), engine.player, { x: 1, y: 0 })
    expect(engine.player.position.x).toBeGreaterThan(startX)
  })

  it('clamps teleport to blinkMaxRange when mouse is far away', () => {
    const { engine } = makeEngine()
    // Mouse is 200px away — exceeds blinkMaxRange (80)
    engine.inputHandler.mouse = { x: 500, y: 90 }
    const startX = engine.player.position.x
    processSpell(engine, new SpellInstance(BLINK_STRIKE), engine.player, { x: 1, y: 0 })
    const moved = engine.player.position.x - startX
    expect(moved).toBeLessThanOrEqual(BLINK_STRIKE.blinkMaxRange + 1)
  })

  it('deals AoE damage to bot at landing zone when in range', () => {
    const { engine } = makeEngine()
    // Player at (80,90), mouse at (90,90) → teleports to (90,90)
    // Place bot at (100,90) → 10px from landing < aoeRadius(20)+size/2(4)=24
    engine.player.position.x = 80
    engine.player.position.y = 90
    engine.bot.position.x = 100
    engine.bot.position.y = 90
    engine.inputHandler.mouse = { x: 90, y: 90 }
    const initialHp = engine.bot.hp
    processSpell(engine, new SpellInstance(BLINK_STRIKE), engine.player, { x: 1, y: 0 })
    expect(engine.bot.hp).toBeLessThan(initialHp)
  })

  it('does not damage dead bot on Blink Strike landing', () => {
    const { engine } = makeEngine()
    engine.bot.takeDamage(999)
    const botHp = engine.bot.hp
    processSpell(engine, new SpellInstance(BLINK_STRIKE), engine.player, { x: 1, y: 0 })
    expect(engine.bot.hp).toBe(botHp)
  })

  it('works without inputHandler (no mouse available)', () => {
    const { engine } = makeEngine()
    engine.inputHandler = null
    // Should not throw — falls back to direction-based target
    expect(() => processSpell(engine, new SpellInstance(BLINK_STRIKE), engine.player, { x: 1, y: 0 })).not.toThrow()
  })
})

// ─── Buff spells ─────────────────────────────────────────────────────────────

describe('GameEngine — Phase Walk (buff)', () => {
  it('activates phaseWalkTimer on the player', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(PHASE_WALK), engine.player)
    expect(engine.player.phaseWalkTimer).toBeGreaterThan(0)
  })

  it('phaseWalkTimer matches spell duration', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(PHASE_WALK), engine.player)
    expect(engine.player.phaseWalkTimer).toBe(PHASE_WALK.duration)
  })

  it('boosts speed multiplier while active', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(PHASE_WALK), engine.player)
    expect(engine.player.speedMultiplier).toBeGreaterThan(1.0)
  })
})

describe('GameEngine — Spell Echo (buff)', () => {
  it('sets spellEchoActive on the player', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(SPELL_ECHO), engine.player)
    expect(engine.player.spellEchoActive).toBe(true)
  })
})

describe('GameEngine — Arcane Overload (buff)', () => {
  it('activates arcaneOverloadActive on the player', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(ARCANE_OVERLOAD), engine.player)
    expect(engine.player.arcaneOverloadActive).toBe(true)
  })

  it('arcaneOverloadTimer matches spell duration', () => {
    const { engine } = makeEngine()
    processSpell(engine, new SpellInstance(ARCANE_OVERLOAD), engine.player)
    expect(engine.player.arcaneOverloadTimer).toBe(ARCANE_OVERLOAD.duration)
  })
})

// ─── Instant spells ──────────────────────────────────────────────────────────

describe('GameEngine — Healing Pulse (instant)', () => {
  it('heals the player by healAmount', () => {
    const { engine } = makeEngine()
    engine.player.takeDamage(50)
    const hpBefore = engine.player.hp
    processSpell(engine, new SpellInstance(HEALING_PULSE), engine.player)
    expect(engine.player.hp).toBe(hpBefore + HEALING_PULSE.healAmount)
  })

  it('does not exceed maxHp when healing', () => {
    const { engine } = makeEngine()
    // Player at full HP
    processSpell(engine, new SpellInstance(HEALING_PULSE), engine.player)
    expect(engine.player.hp).toBe(engine.player.maxHp)
  })
})

describe('GameEngine — Mana Surge (instant)', () => {
  it('restores mana by manaRestore amount', () => {
    const { engine } = makeEngine()
    engine.player.mana = 10
    processSpell(engine, new SpellInstance(MANA_SURGE), engine.player)
    expect(engine.player.mana).toBe(Math.min(engine.player.maxMana, 10 + MANA_SURGE.manaRestore))
  })

  it('does not exceed maxMana', () => {
    const { engine } = makeEngine()
    engine.player.mana = 90
    processSpell(engine, new SpellInstance(MANA_SURGE), engine.player)
    expect(engine.player.mana).toBe(engine.player.maxMana)
  })
})

describe('GameEngine — Temporal Reset (instant)', () => {
  it('resets non-ultimate cooldowns to 0', () => {
    const { engine } = makeEngine()
    engine.player.deck[0] = new SpellInstance(FIREBALL)
    engine.player.cooldowns['fireball'] = 2.5
    processSpell(engine, new SpellInstance(TEMPORAL_RESET), engine.player)
    expect(engine.player.cooldowns['fireball']).toBe(0)
  })

  it('does not reset ultimate spell cooldowns', () => {
    const { engine } = makeEngine()
    engine.player.deck[7] = new SpellInstance(METEOR)
    engine.player.cooldowns['meteor'] = 10
    processSpell(engine, new SpellInstance(TEMPORAL_RESET), engine.player)
    expect(engine.player.cooldowns['meteor']).toBe(10)
  })
})

// ─── Blood Lance (HP cost) ───────────────────────────────────────────────────

describe('GameEngine — Blood Lance (HP cost spell)', () => {
  it('deducts HP on a successful cast', () => {
    const { engine } = makeEngine()
    engine.player.deck[0] = new SpellInstance(BLOOD_LANCE)
    const hpBefore = engine.player.hp
    engine.player.input.spellSlots[0] = true
    engine.update(0.016) // starts pending cast
    expect(engine.player.hp).toBeLessThan(hpBefore)
  })

  it('cannot cast when HP is exactly at the HP cost threshold', () => {
    const { engine } = makeEngine()
    engine.player.deck[0] = new SpellInstance(BLOOD_LANCE)
    engine.player.hp = BLOOD_LANCE.hpCost
    const result = engine.player.castSpell(0, { x: 1, y: 0 })
    expect(result).toBe(false)
  })

  it('spawns a projectile after Blood Lance cast time elapses', () => {
    const { engine } = makeEngine()
    engine.botAI = null
    engine.player.deck[0] = new SpellInstance(BLOOD_LANCE)
    engine.player.input.spellSlots[0] = true
    engine.update(0.016)
    engine.player.input.spellSlots[0] = false
    engine.update(BLOOD_LANCE.castTime + 0.05)
    expect(engine.projectiles.length).toBeGreaterThan(0)
  })
})

// ─── _applyOverloadBonus ─────────────────────────────────────────────────────

describe('GameEngine — _applyOverloadBonus', () => {
  it('multiplies damage by 1.5 when Arcane Overload is active and spell has damage tag', () => {
    const { engine } = makeEngine()
    engine.player.arcaneOverloadTimer = 5
    const result = engine._applyOverloadBonus(20, FIREBALL, engine.player)
    expect(result).toBe(30)
  })

  it('does not modify damage when Arcane Overload is inactive', () => {
    const { engine } = makeEngine()
    // arcaneOverloadTimer defaults to 0
    const result = engine._applyOverloadBonus(20, FIREBALL, engine.player)
    expect(result).toBe(20)
  })

  it('does not modify damage for spells without damage tag', () => {
    const { engine } = makeEngine()
    engine.player.arcaneOverloadTimer = 5
    const result = engine._applyOverloadBonus(20, PHASE_WALK, engine.player)
    expect(result).toBe(20)
  })

  it('does not modify when baseDamage is 0', () => {
    const { engine } = makeEngine()
    engine.player.arcaneOverloadTimer = 5
    const result = engine._applyOverloadBonus(0, FIREBALL, engine.player)
    expect(result).toBe(0)
  })

  it('rounds the result after multiplying', () => {
    const { engine } = makeEngine()
    engine.player.arcaneOverloadTimer = 5
    // 15 * 1.5 = 22.5 → rounds to 23
    const result = engine._applyOverloadBonus(15, FIREBALL, engine.player)
    expect(result).toBe(23)
  })
})

// ─── Spell Echo behavior ─────────────────────────────────────────────────────

describe('GameEngine — Spell Echo behavior', () => {
  it('Spell Echo + projectile spawns two sets of projectiles', () => {
    const { engine } = makeEngine()
    engine.player.spellEchoActive = true
    processSpell(engine, new SpellInstance(FIREBALL), engine.player)
    expect(engine.projectiles).toHaveLength(2)
  })

  it('echo projectile has 50% damage of the original', () => {
    const { engine } = makeEngine()
    engine.player.spellEchoActive = true
    const spell = new SpellInstance(FIREBALL)
    processSpell(engine, spell, engine.player)
    const damages = engine.projectiles.map(p => p.damage).sort((a, b) => a - b)
    expect(damages[0]).toBe(Math.round(spell.computedDamage * 0.5))
    expect(damages[1]).toBe(spell.computedDamage)
  })

  it('Spell Echo + AoE spawns two AoE zones', () => {
    const { engine } = makeEngine()
    engine.player.spellEchoActive = true
    processSpell(engine, new SpellInstance(GROUND_FLAME), engine.player, { x: 1, y: 0 }, { x: 160, y: 90 })
    expect(engine.aoeZones).toHaveLength(2)
  })

  it('Spell Echo + Healing Pulse heals extra 50%', () => {
    const { engine } = makeEngine()
    engine.player.takeDamage(60)
    const hpBefore = engine.player.hp
    engine.player.spellEchoActive = true
    processSpell(engine, new SpellInstance(HEALING_PULSE), engine.player)
    const expectedHeal = HEALING_PULSE.healAmount + Math.floor(HEALING_PULSE.healAmount * 0.5)
    expect(engine.player.hp).toBe(hpBefore + expectedHeal)
  })

  it('Spell Echo buff is consumed after any cast', () => {
    const { engine } = makeEngine()
    engine.player.spellEchoActive = true
    processSpell(engine, new SpellInstance(FIREBALL), engine.player)
    expect(engine.player.spellEchoActive).toBe(false)
  })
})

// ─── Modifier interactions ───────────────────────────────────────────────────

describe('GameEngine — Lifesteal modifier', () => {
  it('heals the caster when a lifesteal projectile hits', () => {
    const { engine } = makeEngine()
    engine.player.takeDamage(40)
    const hpBefore = engine.player.hp
    const spell = new SpellInstance(FIREBALL, [LIFESTEAL])
    const [proj] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    proj.onHit(engine.bot)
    expect(engine.player.hp).toBeGreaterThan(hpBefore)
  })

  it('lifesteal onHit is attached to the projectile', () => {
    const { engine } = makeEngine()
    const spell = new SpellInstance(FIREBALL, [LIFESTEAL])
    const [proj] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    expect(typeof proj.onHit).toBe('function')
  })
})

describe('GameEngine — Lingering Burn modifier', () => {
  it('applies DoT to the hit target', () => {
    const { engine } = makeEngine()
    const spell = new SpellInstance(FIREBALL, [LINGERING_BURN])
    const [proj] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    const hpBefore = engine.bot.hp
    proj.onHit(engine.bot)
    engine._tickActiveBurns(1.0) // tick 1 full second of burn (5 dmg/s)
    expect(engine.bot.hp).toBeLessThan(hpBefore)
  })

  it('burn expires after its duration', () => {
    const { engine } = makeEngine()
    const spell = new SpellInstance(FIREBALL, [LINGERING_BURN])
    const [proj] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    proj.onHit(engine.bot)
    engine._tickActiveBurns(3) // well past 2s duration
    expect(engine._activeBurns ?? []).toHaveLength(0)
  })

  it('burn is removed immediately for a dead target', () => {
    const { engine } = makeEngine()
    const spell = new SpellInstance(FIREBALL, [LINGERING_BURN])
    const [proj] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    proj.onHit(engine.bot)
    engine.bot.takeDamage(999) // kill bot
    const hpAfterKill = engine.bot.hp
    engine._tickActiveBurns(0.5)
    expect(engine.bot.hp).toBe(hpAfterKill)
  })

  it('lingeringBurn onHit is attached to the projectile', () => {
    const { engine } = makeEngine()
    const spell = new SpellInstance(FIREBALL, [LINGERING_BURN])
    const [proj] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    expect(typeof proj.onHit).toBe('function')
  })
})

describe('GameEngine — _tickActiveBurns edge cases', () => {
  it('does nothing when _activeBurns is undefined', () => {
    const { engine } = makeEngine()
    expect(() => engine._tickActiveBurns(0.1)).not.toThrow()
  })

  it('does nothing when _activeBurns is empty', () => {
    const { engine } = makeEngine()
    engine._activeBurns = []
    expect(() => engine._tickActiveBurns(0.1)).not.toThrow()
  })
})

describe('GameEngine — Split modifier', () => {
  it('fires 3 projectiles instead of 1', () => {
    const { engine } = makeEngine()
    const spell = new SpellInstance(FIREBALL, [SPLIT])
    const projs = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    expect(projs).toHaveLength(3)
  })

  it('split projectiles travel in different directions (-15°/0°/+15°)', () => {
    const { engine } = makeEngine()
    const spell = new SpellInstance(FIREBALL, [SPLIT])
    const [p0, p1, p2] = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    // center projectile has vy=0, outer two have opposite vy signs
    expect(p1.velocity.y).toBeCloseTo(0)
    expect(p0.velocity.y).not.toBeCloseTo(p2.velocity.y)
  })

  it('split projectile damage is 40% of base', () => {
    const { engine } = makeEngine()
    const spell = new SpellInstance(FIREBALL, [SPLIT])
    const projs = engine._spawnSpellProjectile({ spell, direction: { x: 1, y: 0 } }, engine.player)
    // SPLIT sets computedDamage = round(20 * 0.4) = 8
    for (const p of projs) {
      expect(p.damage).toBe(8)
    }
  })
})

// ─── Arcane Beam ─────────────────────────────────────────────────────────────

describe('GameEngine — _handleArcaneBeam', () => {
  // arcane_beam is not in DEFAULT_DECK — inject it into slot 0 for each test
  const BEAM_SLOT = 0

  function makeBeamEngine() {
    const { engine, ctx } = makeEngine()
    engine.player.deck[BEAM_SLOT] = new SpellInstance(ARCANE_BEAM)
    return { engine, ctx }
  }

  it('arcaneBeamActive is false initially', () => {
    const { engine } = makeBeamEngine()
    expect(engine.arcaneBeamActive).toBe(false)
  })

  it('activates beam when arcane_beam slot key is held', () => {
    const { engine } = makeBeamEngine()
    engine.player.input.spellSlots[BEAM_SLOT] = true
    engine.update(0.016)
    expect(engine.arcaneBeamActive).toBe(true)
  })

  it('puts player in CastState while channeling', () => {
    const { engine } = makeBeamEngine()
    engine.player.input.spellSlots[BEAM_SLOT] = true
    engine.update(0.016)
    expect(engine.player.stateMachine.name).toBe('cast')
  })

  it('drains player mana while channeling', () => {
    const { engine } = makeBeamEngine()
    engine.player.input.spellSlots[BEAM_SLOT] = true
    const manaBefore = engine.player.mana
    engine.update(0.5)
    expect(engine.player.mana).toBeLessThan(manaBefore)
  })

  it('deactivates beam when key is released', () => {
    const { engine } = makeBeamEngine()
    engine.player.input.spellSlots[BEAM_SLOT] = true
    engine.update(0.016)
    engine.player.input.spellSlots[BEAM_SLOT] = false
    engine.update(0.016)
    expect(engine.arcaneBeamActive).toBe(false)
  })

  it('resets player to idle when beam is released from CastState', () => {
    const { engine } = makeBeamEngine()
    engine.player.input.spellSlots[BEAM_SLOT] = true
    engine.update(0.016)
    engine.player.input.spellSlots[BEAM_SLOT] = false
    engine.update(0.016)
    expect(engine.player.stateMachine.name).toBe('idle')
  })

  it('deactivates beam when player dies while channeling', () => {
    const { engine } = makeBeamEngine()
    engine.player.input.spellSlots[BEAM_SLOT] = true
    engine.update(0.016)
    expect(engine.arcaneBeamActive).toBe(true)
    engine.player.takeDamage(999)
    engine.update(0.016)
    expect(engine.arcaneBeamActive).toBe(false)
  })

  it('damages bot when bot is within beam range and in the beam direction', () => {
    const { engine } = makeBeamEngine()
    // Place bot 40px to the right of player (within 150px beam range)
    engine.player.position.x = 80
    engine.player.position.y = 90
    engine.bot.position.x = 120
    engine.bot.position.y = 90
    // Mouse points rightward (same direction as bot)
    engine.inputHandler.mouse = { x: 200, y: 90 }
    engine.player.input.spellSlots[BEAM_SLOT] = true
    const hpBefore = engine.bot.hp
    engine.update(0.5)
    expect(engine.bot.hp).toBeLessThan(hpBefore)
  })

  it('does not damage a dead bot', () => {
    const { engine } = makeBeamEngine()
    engine.bot.takeDamage(999)
    engine.player.position.x = 80
    engine.bot.position.x = 120
    engine.inputHandler.mouse = { x: 200, y: 90 }
    engine.player.input.spellSlots[BEAM_SLOT] = true
    const botHp = engine.bot.hp
    engine.update(0.5)
    expect(engine.bot.hp).toBe(botHp)
  })
})

// ─── Rendering helpers ───────────────────────────────────────────────────────

describe('GameEngine — _drawAoEZone rendering', () => {
  it('calls fillRect when an AoEZone is active', () => {
    const { engine } = makeEngine()
    const ctx = makeMockCtx()
    engine.aoeZones.push({ position: { x: 160, y: 90 }, radius: 20, color: '#ff0000', active: true })
    const fillsBefore = ctx.fillRect.mock.calls.length
    engine.render(ctx)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })
})

describe('GameEngine — _drawMeteorWarning rendering', () => {
  it('calls strokeRect when a pending meteor exists', () => {
    const { engine } = makeEngine()
    const ctx = makeMockCtx()
    engine.pendingMeteors.push({ x: 160, y: 90, delay: 0.5, totalDelay: 1.5, radius: 40, color: '#ff4400' })
    const strokesBefore = ctx.strokeRect.mock.calls.length
    engine.render(ctx)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })

  it('draws inner flash fillRect when progress > 0.75', () => {
    const { engine } = makeEngine()
    const ctx = makeMockCtx()
    // delay=0.1, totalDelay=1.5 → progress ≈ 0.93 > 0.75
    engine.pendingMeteors.push({ x: 160, y: 90, delay: 0.1, totalDelay: 1.5, radius: 40, color: '#ff4400' })
    const fillsBefore = ctx.fillRect.mock.calls.length
    engine.render(ctx)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })

  it('skips rendering when progress is 0 (r < 1)', () => {
    const { engine } = makeEngine()
    const ctx = makeMockCtx()
    // delay == totalDelay → progress = 0 → r = 0 → early return
    engine.pendingMeteors.push({ x: 160, y: 90, delay: 1.5, totalDelay: 1.5, radius: 40, color: '#ff4400' })
    const strokesBefore = ctx.strokeRect.mock.calls.length
    engine.render(ctx)
    // strokeRect should NOT have been called for this meteor (r=0 → skip)
    // NOTE: arena border still calls strokeRect once; we just check no extra calls beyond that
    expect(ctx.strokeRect.mock.calls.length).toBe(strokesBefore + 1) // +1 for arena border only
  })
})

describe('GameEngine — _drawArcaneBeam rendering', () => {
  it('calls fillRect for beam when arcaneBeamActive is true', () => {
    const { engine } = makeEngine()
    const ctx = makeMockCtx()
    engine.arcaneBeamActive = true
    engine.arcaneBeamDir = { x: 1, y: 0 }
    const fillsBefore = ctx.fillRect.mock.calls.length
    engine.render(ctx)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })

  it('does not throw when arcaneBeamActive is false', () => {
    const { engine } = makeEngine()
    const ctx = makeMockCtx()
    engine.arcaneBeamActive = false
    expect(() => engine.render(ctx)).not.toThrow()
  })
})

// Tooltip is now a React HTML overlay in GameCanvas.jsx (crisp text at full browser resolution)
// No canvas-side tooltip tests needed

describe('GameEngine — _drawDeck Spell Echo indicator', () => {
  it('draws extra strokeRect borders on deck when spellEchoActive', () => {
    const { engine } = makeEngine()
    const ctx = makeMockCtx()
    engine.player.spellEchoActive = true
    const strokesBefore = ctx.strokeRect.mock.calls.length
    engine.render(ctx)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })
})

describe('GameEngine — _drawPlayer buff visuals', () => {
  it('calls extra fillRect for Phase Walk tint overlay', () => {
    const { engine } = makeEngine()
    const ctx = makeMockCtx()
    engine.player.phaseWalkTimer = 3
    const fillsBefore = ctx.fillRect.mock.calls.length
    engine.render(ctx)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })

  it('calls extra strokeRect for Arcane Overload glow', () => {
    const { engine } = makeEngine()
    const ctx = makeMockCtx()
    engine.player.arcaneOverloadTimer = 5
    const strokesBefore = ctx.strokeRect.mock.calls.length
    engine.render(ctx)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })
})
