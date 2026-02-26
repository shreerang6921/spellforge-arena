import { describe, it, expect, beforeEach } from 'vitest'
import { Player } from '../game/Player.js'
import { Projectile } from '../game/Projectile.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'
import { PLAYER, ARENA, BASIC_ATTACK } from '../config/constants.js'

const fireDef     = { id: 'fireball',  baseDamage: 20, manaCost: 15,  castTime: 0.3, cooldown: 2 }
const zeroCostDef = { id: 'free',      baseDamage: 10, manaCost: 0,   castTime: 0,   cooldown: 1 }
const bigCostDef  = { id: 'expensive', baseDamage: 50, manaCost: 200, castTime: 0,   cooldown: 1 }
const instantDef  = { id: 'instant',   baseDamage: 10, manaCost: 10,  castTime: 0,   cooldown: 1 }

function makePlayer(overrides = {}) {
  return new Player({ x: 160, y: 90, color: '#fff', ...overrides })
}

describe('Player — initial state', () => {
  it('initialises with full HP and mana', () => {
    const p = makePlayer()
    expect(p.hp).toBe(PLAYER.MAX_HP)
    expect(p.mana).toBe(PLAYER.MAX_MANA)
  })

  it('starts in idle state', () => {
    const p = makePlayer()
    expect(p.stateMachine.name).toBe('idle')
  })

  it('is not dead initially', () => {
    const p = makePlayer()
    expect(p.isDead).toBe(false)
  })
})

describe('Player — takeDamage', () => {
  it('reduces HP by given amount', () => {
    const p = makePlayer()
    p.takeDamage(20)
    expect(p.hp).toBe(80)
  })

  it('does not reduce HP below 0', () => {
    const p = makePlayer()
    p.takeDamage(999)
    expect(p.hp).toBe(0)
  })

  it('transitions to DeadState when HP hits 0', () => {
    const p = makePlayer()
    p.takeDamage(100)
    expect(p.stateMachine.name).toBe('dead')
    expect(p.isDead).toBe(true)
  })

  it('does not deal damage to a dead player', () => {
    const p = makePlayer()
    p.takeDamage(100)  // kill
    p.takeDamage(50)   // should be ignored
    expect(p.hp).toBe(0)
  })
})

describe('Player — heal', () => {
  it('restores HP', () => {
    const p = makePlayer()
    p.takeDamage(40)
    p.heal(20)
    expect(p.hp).toBe(80)
  })

  it('does not exceed maxHp', () => {
    const p = makePlayer()
    p.heal(999)
    expect(p.hp).toBe(PLAYER.MAX_HP)
  })

  it('does not heal a dead player', () => {
    const p = makePlayer()
    p.takeDamage(100)
    p.heal(50)
    expect(p.hp).toBe(0)
    expect(p.isDead).toBe(true)
  })
})

describe('Player — movement', () => {
  it('moves right when input.right is true', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.input.right = true
    p.update(1)
    expect(p.position.x).toBeGreaterThan(160)
  })

  it('moves left when input.left is true', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.input.left = true
    p.update(1)
    expect(p.position.x).toBeLessThan(160)
  })

  it('moves up when input.up is true', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.input.up = true
    p.update(1)
    expect(p.position.y).toBeLessThan(90)
  })

  it('moves down when input.down is true', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.input.down = true
    p.update(1)
    expect(p.position.y).toBeGreaterThan(90)
  })

  it('transitions to MoveState when moving', () => {
    const p = makePlayer()
    p.input.right = true
    p.update(0.016)
    expect(p.stateMachine.name).toBe('move')
  })

  it('transitions back to IdleState when no input', () => {
    const p = makePlayer()
    p.input.right = true
    p.update(0.016)
    p.input.right = false
    p.update(0.016)
    expect(p.stateMachine.name).toBe('idle')
  })

  it('normalises diagonal movement (no speed boost)', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.input.right = true
    p.input.down  = true
    p.update(1)

    const dx = p.position.x - 160
    const dy = p.position.y - 90
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Should be ~PLAYER.SPEED, not PLAYER.SPEED * sqrt(2)
    expect(dist).toBeCloseTo(PLAYER.SPEED, 0)
  })

  it('does not move when dead', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.takeDamage(100)
    p.input.right = true
    p.update(1)
    expect(p.position.x).toBe(160)
  })
})

describe('Player — arena boundary clamping', () => {
  it('clamps to the right boundary', () => {
    const p = makePlayer({ x: ARENA.RIGHT - 1, y: 90 })
    p.input.right = true
    p.update(5)
    expect(p.position.x).toBeLessThanOrEqual(ARENA.RIGHT - p.size / 2)
  })

  it('clamps to the left boundary', () => {
    const p = makePlayer({ x: ARENA.LEFT + 1, y: 90 })
    p.input.left = true
    p.update(5)
    expect(p.position.x).toBeGreaterThanOrEqual(ARENA.LEFT + p.size / 2)
  })

  it('clamps to the top boundary', () => {
    const p = makePlayer({ x: 160, y: ARENA.TOP + 1 })
    p.input.up = true
    p.update(5)
    expect(p.position.y).toBeGreaterThanOrEqual(ARENA.TOP + p.size / 2)
  })

  it('clamps to the bottom boundary', () => {
    const p = makePlayer({ x: 160, y: ARENA.BOTTOM - 1 })
    p.input.down = true
    p.update(5)
    expect(p.position.y).toBeLessThanOrEqual(ARENA.BOTTOM - p.size / 2)
  })
})

describe('Player — mana regen', () => {
  it('regenerates mana over time', () => {
    const p = makePlayer()
    p.mana = 0
    p.update(1)
    expect(p.mana).toBeCloseTo(PLAYER.MANA_REGEN, 1)
  })

  it('does not exceed maxMana', () => {
    const p = makePlayer()
    p.mana = PLAYER.MAX_MANA
    p.update(10)
    expect(p.mana).toBe(PLAYER.MAX_MANA)
  })
})

describe('Player — basic attack (tryBasicAttack)', () => {
  const dir = { x: 1, y: 0 }

  it('attackCooldown initialises to 0', () => {
    const p = makePlayer()
    expect(p.attackCooldown).toBe(0)
  })

  it('returns a Projectile when cooldown is 0', () => {
    const p = makePlayer()
    const proj = p.tryBasicAttack(dir)
    expect(proj).toBeInstanceOf(Projectile)
  })

  it('projectile has correct damage', () => {
    const p = makePlayer()
    const proj = p.tryBasicAttack(dir)
    expect(proj.damage).toBe(BASIC_ATTACK.DAMAGE)
  })

  it('projectile has correct size', () => {
    const p = makePlayer()
    const proj = p.tryBasicAttack(dir)
    expect(proj.size).toEqual({ w: BASIC_ATTACK.SIZE, h: BASIC_ATTACK.SIZE })
  })

  it('projectile velocity reflects direction and speed', () => {
    const p = makePlayer()
    const proj = p.tryBasicAttack(dir)
    expect(proj.velocity.x).toBeCloseTo(BASIC_ATTACK.SPEED)
    expect(proj.velocity.y).toBeCloseTo(0)
  })

  it('projectile owner is the player', () => {
    const p = makePlayer()
    const proj = p.tryBasicAttack(dir)
    expect(proj.owner).toBe(p)
  })

  it('projectile spawns at player position', () => {
    const p = makePlayer({ x: 80, y: 90 })
    const proj = p.tryBasicAttack(dir)
    expect(proj.position.x).toBe(80)
    expect(proj.position.y).toBe(90)
  })

  it('sets attackCooldown after firing', () => {
    const p = makePlayer()
    p.tryBasicAttack(dir)
    expect(p.attackCooldown).toBeCloseTo(BASIC_ATTACK.COOLDOWN)
  })

  it('returns null when cooldown > 0', () => {
    const p = makePlayer()
    p.tryBasicAttack(dir)           // fire once, sets cooldown
    const proj = p.tryBasicAttack(dir)  // should be blocked
    expect(proj).toBeNull()
  })

  it('returns null when player is dead', () => {
    const p = makePlayer()
    p.takeDamage(100)
    const proj = p.tryBasicAttack(dir)
    expect(proj).toBeNull()
  })

  it('attackCooldown decrements over time', () => {
    const p = makePlayer()
    p.tryBasicAttack(dir)
    const before = p.attackCooldown
    p.update(0.1)
    expect(p.attackCooldown).toBeLessThan(before)
  })

  it('attackCooldown does not go below 0', () => {
    const p = makePlayer()
    p.tryBasicAttack(dir)
    p.update(10)
    expect(p.attackCooldown).toBe(0)
  })

  it('can attack again after cooldown expires', () => {
    const p = makePlayer()
    p.tryBasicAttack(dir)
    p.update(BASIC_ATTACK.COOLDOWN + 0.1)
    const proj = p.tryBasicAttack(dir)
    expect(proj).toBeInstanceOf(Projectile)
  })
})

describe('Player — castSpell', () => {
  it('returns false when player is dead', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.takeDamage(100)
    expect(p.castSpell(0)).toBe(false)
  })

  it('returns false when slot is empty', () => {
    const p = makePlayer()
    expect(p.castSpell(0)).toBe(false)
  })

  it('returns false when mana is insufficient', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(bigCostDef)
    expect(p.castSpell(0)).toBe(false)
  })

  it('returns false when spell is on cooldown', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0)
    expect(p.castSpell(0)).toBe(false)
  })

  it('returns true on a successful cast', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    expect(p.castSpell(0)).toBe(true)
  })

  it('deducts mana on a successful cast', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0)
    expect(p.mana).toBe(PLAYER.MAX_MANA - fireDef.manaCost)
  })

  it('sets cooldown on a successful cast', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0)
    expect(p.cooldowns['fireball']).toBeCloseTo(fireDef.cooldown)
  })

  it('allows casting a zero-cost spell with 0 mana', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(zeroCostDef)
    p.mana = 0
    expect(p.castSpell(0)).toBe(true)
  })

  it('spell cooldowns tick down over time', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0)
    const before = p.cooldowns['fireball']
    p.update(0.5)
    expect(p.cooldowns['fireball']).toBeLessThan(before)
  })

  it('spell cooldown does not go below 0', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0)
    p.update(100)
    expect(p.cooldowns['fireball']).toBe(0)
  })

  it('can cast again after cooldown expires', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0)
    p.update(fireDef.cooldown + 0.1)
    expect(p.castSpell(0)).toBe(true)
  })

  it('mana is not deducted on a failed cast (cooldown blocked)', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0)
    const manaAfterFirst = p.mana
    p.castSpell(0)
    expect(p.mana).toBe(manaAfterFirst)
  })
})

describe('Player — pendingCast / cast time', () => {
  const dir = { x: 1, y: 0 }

  it('pendingCast is null initially', () => {
    expect(makePlayer().pendingCast).toBeNull()
  })

  it('completedCast is null initially', () => {
    expect(makePlayer().completedCast).toBeNull()
  })

  it('sets pendingCast when spell has castTime > 0', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0, dir)
    expect(p.pendingCast).not.toBeNull()
    expect(p.pendingCast.timeRemaining).toBeCloseTo(0.3)
  })

  it('enters CastState when castTime > 0', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0, dir)
    expect(p.stateMachine.name).toBe('cast')
  })

  it('stores direction in pendingCast', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0, dir)
    expect(p.pendingCast.direction).toEqual(dir)
  })

  it('blocks a second cast while pendingCast is active', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0, dir)
    expect(p.castSpell(0, dir)).toBe(false)
  })

  it('sets completedCast immediately when castTime is 0', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(instantDef)
    p.castSpell(0, dir)
    expect(p.pendingCast).toBeNull()
    expect(p.completedCast).not.toBeNull()
  })

  it('completedCast has correct spell and direction', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(instantDef)
    p.castSpell(0, dir)
    expect(p.completedCast.spell.definition).toBe(instantDef)
    expect(p.completedCast.direction).toEqual(dir)
  })

  it('resolves pendingCast to completedCast after cast time elapses', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0, dir)
    p.update(0.4)  // past the 0.3s cast time
    expect(p.pendingCast).toBeNull()
    expect(p.completedCast).not.toBeNull()
  })

  it('exits CastState after pendingCast resolves', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0, dir)
    p.update(0.4)
    expect(p.stateMachine.name).not.toBe('cast')
  })

  it('clears completedCast at start of each update', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(instantDef)
    p.castSpell(0, dir)       // sets completedCast immediately
    expect(p.completedCast).not.toBeNull()
    p.update(0.016)           // next update clears it
    expect(p.completedCast).toBeNull()
  })

  it('pendingCast ticks down over time', () => {
    const p = makePlayer()
    p.deck[0] = new SpellInstance(fireDef)
    p.castSpell(0, dir)
    const before = p.pendingCast.timeRemaining
    p.update(0.1)
    expect(p.pendingCast.timeRemaining).toBeLessThan(before)
  })
})

describe('Player — spellSlots input', () => {
  it('spellSlots initialises to 8 false values', () => {
    const p = makePlayer()
    expect(p.input.spellSlots).toEqual(Array(8).fill(false))
  })
})

describe('Player — CastState movement penalty', () => {
  it('moves slower in CastState than MoveState', () => {
    const pNormal = makePlayer({ x: 160, y: 90 })
    pNormal.input.right = true
    pNormal.update(1)
    const normalDist = pNormal.position.x - 160

    const pCasting = makePlayer({ x: 160, y: 90 })
    pCasting.setState('cast')
    pCasting.input.right = true
    pCasting.update(1)
    const castDist = pCasting.position.x - 160

    expect(castDist).toBeLessThan(normalDist)
    expect(castDist).toBeCloseTo(normalDist * 0.6, 0)
  })
})

describe('Player — slow effect (applySlowEffect)', () => {
  it('slowTimer initialises to 0', () => {
    const p = makePlayer()
    expect(p.slowTimer).toBe(0)
  })

  it('speedMultiplier initialises to 1.0', () => {
    const p = makePlayer()
    expect(p.speedMultiplier).toBe(1.0)
  })

  it('applySlowEffect sets slowTimer to given duration', () => {
    const p = makePlayer()
    p.applySlowEffect(1.5)
    expect(p.slowTimer).toBe(1.5)
  })

  it('applySlowEffect sets speedMultiplier to 0.85 (15% slow)', () => {
    const p = makePlayer()
    p.applySlowEffect(1.5)
    expect(p.speedMultiplier).toBeCloseTo(0.85)
  })

  it('slow reduces movement distance while active', () => {
    const pNormal = makePlayer({ x: 160, y: 90 })
    pNormal.input.right = true
    pNormal.update(1)
    const normalDist = pNormal.position.x - 160

    const pSlowed = makePlayer({ x: 160, y: 90 })
    pSlowed.applySlowEffect(1.5)
    pSlowed.input.right = true
    pSlowed.update(1)
    const slowDist = pSlowed.position.x - 160

    expect(slowDist).toBeLessThan(normalDist)
    expect(slowDist).toBeCloseTo(normalDist * 0.85, 0)
  })

  it('slowTimer decrements over time', () => {
    const p = makePlayer()
    p.applySlowEffect(1.5)
    p.update(0.5)
    expect(p.slowTimer).toBeCloseTo(1.0, 1)
  })

  it('speedMultiplier resets to 1.0 when slow expires', () => {
    const p = makePlayer()
    p.applySlowEffect(0.5)
    p.update(1.0)  // well past duration
    expect(p.slowTimer).toBe(0)
    expect(p.speedMultiplier).toBe(1.0)
  })

  it('does not go below 0 slowTimer', () => {
    const p = makePlayer()
    p.applySlowEffect(0.1)
    p.update(10)
    expect(p.slowTimer).toBe(0)
  })

  it('refreshes duration when slow re-applied (no stacking)', () => {
    const p = makePlayer()
    p.applySlowEffect(1.5)
    p.update(1.0)   // 0.5s remaining
    p.applySlowEffect(1.5)  // refresh
    expect(p.slowTimer).toBeCloseTo(1.5)
    expect(p.speedMultiplier).toBeCloseTo(0.85)
  })
})
