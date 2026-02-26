import { describe, it, expect, vi } from 'vitest'
import { isColliding, isOutOfBounds, runCollision } from '../game/CollisionSystem.js'
import { ARENA } from '../config/constants.js'
import { Projectile } from '../game/Projectile.js'
import { Player } from '../game/Player.js'

function makeProj(overrides = {}) {
  return new Projectile({
    x: 160, y: 90,
    vx: 100, vy: 0,
    damage: 8,
    owner: null,
    size: 3,
    type: 'basic',
    lifetime: 2,
    ...overrides,
  })
}

function makePlayer(overrides = {}) {
  return new Player({ x: 160, y: 90, color: '#fff', ...overrides })
}

// --- isColliding ---

describe('isColliding', () => {
  it('returns true for overlapping squares', () => {
    const a = { x: 10, y: 10 }, sa = { w: 10, h: 10 }
    const b = { x: 15, y: 15 }, sb = { w: 10, h: 10 }
    expect(isColliding(a, sa, b, sb)).toBe(true)
  })

  it('returns false when separated horizontally', () => {
    const a = { x: 10, y: 10 }, sa = { w: 10, h: 10 }
    const b = { x: 30, y: 10 }, sb = { w: 10, h: 10 }
    expect(isColliding(a, sa, b, sb)).toBe(false)
  })

  it('returns false when separated vertically', () => {
    const a = { x: 10, y: 10 }, sa = { w: 10, h: 10 }
    const b = { x: 10, y: 30 }, sb = { w: 10, h: 10 }
    expect(isColliding(a, sa, b, sb)).toBe(false)
  })

  it('returns false when rects are exactly touching (edge-to-edge)', () => {
    // a occupies [5, 15] on x; b starts at 15 — strict less-than means no overlap
    const a = { x: 10, y: 10 }, sa = { w: 10, h: 10 }
    const b = { x: 15, y: 10 }, sb = { w: 10, h: 10 }
    // aRight = 10 + 5 = 15; bLeft = 15 - 5 = 10; 10 < 10+10 && 10+10 > 10 → overlapping
    // Actually these would overlap since they share the edge by one pixel. Let's test clear separation.
    const c = { x: 20, y: 10 }, sc = { w: 4, h: 4 }
    const d = { x: 30, y: 10 }, sd = { w: 4, h: 4 }
    expect(isColliding(c, sc, d, sd)).toBe(false)
  })

  it('returns true for large rect containing small rect', () => {
    const big = { x: 100, y: 90 }, bigS = { w: 20, h: 20 }
    const small = { x: 100, y: 90 }, smallS = { w: 4, h: 4 }
    expect(isColliding(big, bigS, small, smallS)).toBe(true)
  })
})

// --- isOutOfBounds ---

describe('isOutOfBounds', () => {
  it('returns false for a projectile in the center of the arena', () => {
    const proj = makeProj({ x: 160, y: 90 })
    expect(isOutOfBounds(proj)).toBe(false)
  })

  it('returns true when x < ARENA.LEFT', () => {
    const proj = makeProj({ x: ARENA.LEFT - 1, y: 90 })
    expect(isOutOfBounds(proj)).toBe(true)
  })

  it('returns true when x > ARENA.RIGHT', () => {
    const proj = makeProj({ x: ARENA.RIGHT + 1, y: 90 })
    expect(isOutOfBounds(proj)).toBe(true)
  })

  it('returns true when y < ARENA.TOP', () => {
    const proj = makeProj({ x: 160, y: ARENA.TOP - 1 })
    expect(isOutOfBounds(proj)).toBe(true)
  })

  it('returns true when y > ARENA.BOTTOM', () => {
    const proj = makeProj({ x: 160, y: ARENA.BOTTOM + 1 })
    expect(isOutOfBounds(proj)).toBe(true)
  })

  it('returns false at arena edge (on boundary)', () => {
    const proj = makeProj({ x: ARENA.LEFT, y: ARENA.TOP })
    expect(isOutOfBounds(proj)).toBe(false)
  })
})

// --- runCollision ---

describe('runCollision', () => {
  it('damages enemy and deactivates projectile on hit', () => {
    const owner = makePlayer({ x: 80, y: 90 })
    const enemy = makePlayer({ x: 240, y: 90 })
    const proj = makeProj({ x: 240, y: 90, owner })
    runCollision([proj], [owner, enemy])
    expect(enemy.hp).toBe(92)          // 100 - 8
    expect(proj.active).toBe(false)
  })

  it('does not damage when projectile misses', () => {
    const owner = makePlayer({ x: 80, y: 90 })
    const enemy = makePlayer({ x: 240, y: 90 })
    const proj = makeProj({ x: 160, y: 90, owner })
    runCollision([proj], [owner, enemy])
    expect(enemy.hp).toBe(100)
    expect(proj.active).toBe(true)
  })

  it('skips projectile hitting its own owner', () => {
    const owner = makePlayer({ x: 160, y: 90 })
    const proj = makeProj({ x: 160, y: 90, owner })
    runCollision([proj], [owner])
    expect(owner.hp).toBe(100)
    expect(proj.active).toBe(true)
  })

  it('skips dead players', () => {
    const owner = makePlayer({ x: 80, y: 90 })
    const enemy = makePlayer({ x: 240, y: 90 })
    enemy.takeDamage(100)  // kill enemy
    const proj = makeProj({ x: 240, y: 90, owner })
    runCollision([proj], [owner, enemy])
    expect(proj.active).toBe(true) // no hit registered
  })

  it('deactivates projectile that goes out of bounds', () => {
    const owner = makePlayer({ x: 80, y: 90 })
    const enemy = makePlayer({ x: 240, y: 90 })
    const proj = makeProj({ x: ARENA.LEFT - 5, y: 90, owner })
    runCollision([proj], [owner, enemy])
    expect(proj.active).toBe(false)
    expect(enemy.hp).toBe(100)
  })

  it('skips already inactive projectiles entirely', () => {
    const enemy = makePlayer({ x: 160, y: 90 })
    const proj = makeProj({ x: 160, y: 90, owner: {} })
    proj.active = false
    runCollision([proj], [enemy])
    expect(enemy.hp).toBe(100)
  })

  it('handles multiple projectiles independently', () => {
    const owner = makePlayer({ x: 80, y: 90 })
    const enemy = makePlayer({ x: 240, y: 90 })
    const hit  = makeProj({ x: 240, y: 90, owner, damage: 8 })
    const miss = makeProj({ x: 160, y: 90, owner, damage: 8 })
    runCollision([hit, miss], [owner, enemy])
    expect(enemy.hp).toBe(92)
    expect(hit.active).toBe(false)
    expect(miss.active).toBe(true)
  })

  it('does not hit enemy again after projectile is deactivated', () => {
    const owner = makePlayer({ x: 80, y: 90 })
    const enemy = makePlayer({ x: 240, y: 90 })
    const proj = makeProj({ x: 240, y: 90, owner })
    runCollision([proj], [owner, enemy])
    runCollision([proj], [owner, enemy])  // second call, proj is already inactive
    expect(enemy.hp).toBe(92)  // only hit once
  })
})
