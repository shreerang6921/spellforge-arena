import { describe, it, expect } from 'vitest'
import { Projectile } from '../game/Projectile.js'

function makeProj(overrides = {}) {
  return new Projectile({
    x: 100, y: 90,
    vx: 100, vy: 0,
    damage: 8,
    owner: {},
    size: 3,
    type: 'basic',
    lifetime: 2,
    ...overrides,
  })
}

describe('Projectile — construction', () => {
  it('sets position correctly', () => {
    const p = makeProj({ x: 50, y: 60 })
    expect(p.position).toEqual({ x: 50, y: 60 })
  })

  it('sets velocity correctly', () => {
    const p = makeProj({ vx: 200, vy: -50 })
    expect(p.velocity).toEqual({ x: 200, y: -50 })
  })

  it('sets size as object with w and h', () => {
    const p = makeProj({ size: 3 })
    expect(p.size).toEqual({ w: 3, h: 3 })
  })

  it('sets damage, owner, type, lifetime', () => {
    const owner = {}
    const p = makeProj({ damage: 8, owner, type: 'basic', lifetime: 2 })
    expect(p.damage).toBe(8)
    expect(p.owner).toBe(owner)
    expect(p.type).toBe('basic')
    expect(p.lifetime).toBe(2)
  })

  it('starts active', () => {
    const p = makeProj()
    expect(p.active).toBe(true)
  })

  it('defaults lifetime to 2 when not provided', () => {
    const p = new Projectile({ x: 0, y: 0, vx: 0, vy: 0, damage: 0, owner: {}, size: 3, type: 'basic' })
    expect(p.lifetime).toBe(2)
  })
})

describe('Projectile — update', () => {
  it('moves horizontally based on velocity', () => {
    const p = makeProj({ x: 100, y: 90, vx: 200, vy: 0 })
    p.update(0.5)
    expect(p.position.x).toBeCloseTo(200)
    expect(p.position.y).toBeCloseTo(90)
  })

  it('moves vertically based on velocity', () => {
    const p = makeProj({ x: 100, y: 90, vx: 0, vy: -100 })
    p.update(1)
    expect(p.position.x).toBeCloseTo(100)
    expect(p.position.y).toBeCloseTo(-10)
  })

  it('decrements lifetime by dt', () => {
    const p = makeProj({ lifetime: 2 })
    p.update(0.5)
    expect(p.lifetime).toBeCloseTo(1.5)
  })

  it('sets active=false when lifetime reaches 0', () => {
    const p = makeProj({ lifetime: 0.1 })
    p.update(0.2)
    expect(p.active).toBe(false)
  })

  it('sets active=false when lifetime goes exactly to 0', () => {
    const p = makeProj({ lifetime: 1 })
    p.update(1)
    expect(p.active).toBe(false)
  })

  it('does not update position when already inactive', () => {
    const p = makeProj({ x: 100, y: 90, vx: 200, vy: 0 })
    p.active = false
    p.update(1)
    expect(p.position.x).toBe(100)
    expect(p.position.y).toBe(90)
  })

  it('does not decrement lifetime when already inactive', () => {
    const p = makeProj({ lifetime: 2 })
    p.active = false
    p.update(1)
    expect(p.lifetime).toBe(2)
  })
})
