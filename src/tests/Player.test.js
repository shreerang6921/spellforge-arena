import { describe, it, expect, beforeEach } from 'vitest'
import { Player } from '../game/Player.js'
import { PLAYER, ARENA } from '../config/constants.js'

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
