import { describe, it, expect, beforeEach } from 'vitest'
import { Player } from '../game/Player.js'
import { PLAYER } from '../config/constants.js'

function makePlayer() {
  return new Player({ x: 160, y: 90, color: '#fff' })
}

describe('IdleState', () => {
  it('zeroes velocity when transitioning into idle', () => {
    const p = makePlayer()
    // First move to a different state, set a velocity, then come back to idle
    p.setState('move')
    p.velocity = { x: 50, y: 50 }
    p.setState('idle')
    // enter() is called → velocity zeroed; update() also enforces this
    p.update(0.016)
    expect(p.velocity.x).toBe(0)
    expect(p.velocity.y).toBe(0)
  })

  it('keeps player stationary with no input', () => {
    const p = makePlayer()
    const startX = p.position.x
    const startY = p.position.y
    p.update(1)
    expect(p.position.x).toBe(startX)
    expect(p.position.y).toBe(startY)
  })
})

describe('MoveState', () => {
  it('moves at full speed horizontally', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.input.right = true
    p.update(1)
    expect(p.position.x - 160).toBeCloseTo(PLAYER.SPEED, 0)
  })

  it('zeroes velocity on exit', () => {
    const p = makePlayer()
    p.input.right = true
    p.update(0.016)
    p.input.right = false
    p.update(0.016)   // triggers transition back to idle → exit() called
    expect(p.velocity.x).toBe(0)
    expect(p.velocity.y).toBe(0)
  })
})

describe('CastState', () => {
  it('moves at 60% speed', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.setState('cast')
    p.input.right = true
    p.update(1)
    expect(p.position.x - 160).toBeCloseTo(PLAYER.SPEED * 0.6, 0)
  })

  it('state name is cast', () => {
    const p = makePlayer()
    p.setState('cast')
    expect(p.stateMachine.name).toBe('cast')
  })

  it('does not auto-transition away (locked until external code exits)', () => {
    const p = makePlayer()
    p.setState('cast')
    p.input.right = true
    p.update(0.016)
    // Should remain in cast (state machine only transitions if not cast/dash/dead)
    expect(p.stateMachine.name).toBe('cast')
  })

  it('moves up, down, left in cast state', () => {
    const dirs = [
      { input: 'up',   axis: 'y', dir: -1 },
      { input: 'down', axis: 'y', dir:  1 },
      { input: 'left', axis: 'x', dir: -1 },
    ]
    for (const { input, axis, dir } of dirs) {
      const p = makePlayer({ x: 160, y: 90 })
      p.setState('cast')
      p.input[input] = true
      p.update(1)
      const delta = p.position[axis] - (axis === 'x' ? 160 : 90)
      expect(delta * dir).toBeGreaterThan(0)
    }
  })

  it('normalises diagonal movement in cast state', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.setState('cast')
    p.input.right = true
    p.input.down  = true
    p.update(1)
    const dx = p.position.x - 160
    const dy = p.position.y - 90
    const dist = Math.sqrt(dx * dx + dy * dy)
    expect(dist).toBeCloseTo(PLAYER.SPEED * 0.6, 0)
  })

  it('zeroes velocity on exit', () => {
    const p = makePlayer()
    p.setState('cast')
    p.velocity = { x: 50, y: 50 }
    p.setState('idle')
    p.update(0.016)
    expect(p.velocity.x).toBe(0)
    expect(p.velocity.y).toBe(0)
  })
})

describe('DashState', () => {
  it('state name is dash', () => {
    const p = makePlayer()
    p.setState('dash')
    expect(p.stateMachine.name).toBe('dash')
  })

  it('update() does not throw and preserves externally set velocity', () => {
    const p = makePlayer()
    p.setState('dash')
    p.velocity = { x: 500, y: 0 }
    expect(() => p.stateMachine.update(0.016)).not.toThrow()
    // Velocity unchanged by update (dash logic is external)
    expect(p.velocity.x).toBe(500)
  })

  it('zeroes velocity on exit', () => {
    const p = makePlayer()
    p.setState('dash')
    p.velocity = { x: 500, y: 0 }
    p.setState('idle')
    expect(p.velocity.x).toBe(0)
    expect(p.velocity.y).toBe(0)
  })
})

describe('DeadState', () => {
  it('zeroes velocity on enter', () => {
    const p = makePlayer()
    p.velocity = { x: 80, y: 80 }
    p.setState('dead')
    expect(p.velocity.x).toBe(0)
    expect(p.velocity.y).toBe(0)
  })

  it('isDead returns true', () => {
    const p = makePlayer()
    p.setState('dead')
    expect(p.isDead).toBe(true)
  })

  it('update() does not throw', () => {
    const p = makePlayer()
    p.setState('dead')
    expect(() => p.stateMachine.update(0.016)).not.toThrow()
  })

  it('does not move even with input', () => {
    const p = makePlayer({ x: 160, y: 90 })
    p.takeDamage(100)
    p.input.right = true
    p.update(1)
    expect(p.position.x).toBe(160)
  })
})
