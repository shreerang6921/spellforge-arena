import { describe, it, expect } from 'vitest'
import { computeAimDirection } from '../game/AimAssist.js'
import { AIM_ASSIST_RADIUS } from '../config/constants.js'

describe('computeAimDirection', () => {
  it('aims toward cursor when cursor is far from target', () => {
    const from   = { x: 80,  y: 90 }
    const cursor = { x: 160, y: 90 }   // aiming right
    const target = { x: 240, y: 90 }   // far away from cursor
    const dir = computeAimDirection(from, cursor, target)
    expect(dir.x).toBeCloseTo(1)
    expect(dir.y).toBeCloseTo(0)
  })

  it('snaps to target when cursor is within aim-assist radius', () => {
    const from   = { x: 80,  y: 90 }
    const target = { x: 240, y: 90 }
    // Place cursor 10px from target center (inside 20px radius)
    const cursor = { x: 240 + 10, y: 90 }
    const dir = computeAimDirection(from, cursor, target)
    // Should aim toward target, not cursor
    expect(dir.x).toBeCloseTo(1)
    expect(dir.y).toBeCloseTo(0)
  })

  it('snaps when cursor is exactly at the aim-assist radius boundary', () => {
    const from   = { x: 80, y: 90 }
    const target = { x: 240, y: 90 }
    const cursor = { x: 240 + AIM_ASSIST_RADIUS, y: 90 } // exactly at boundary
    const dir = computeAimDirection(from, cursor, target)
    expect(dir.x).toBeCloseTo(1)
    expect(dir.y).toBeCloseTo(0)
  })

  it('does not snap when cursor is just beyond aim-assist radius', () => {
    const from   = { x: 80,  y: 90 }
    const target = { x: 240, y: 90 }
    const cursor = { x: 240 + AIM_ASSIST_RADIUS + 1, y: 90 }
    const dir = computeAimDirection(from, cursor, target)
    // Should aim toward cursor (slightly right of target), not directly at target
    // cursor is at x=261, from is at x=80, so dir.x should be positive
    expect(dir.x).toBeGreaterThan(0)
    // Direction toward cursor vs target should differ slightly
    const toCursor = (cursor.x - from.x) / Math.hypot(cursor.x - from.x, cursor.y - from.y)
    expect(dir.x).toBeCloseTo(toCursor, 3)
  })

  it('returns a normalized vector (magnitude ≈ 1) for cursor aim', () => {
    const from   = { x: 80, y: 90 }
    const cursor = { x: 200, y: 50 }
    const target = { x: 10,  y: 10 }  // far from cursor
    const dir = computeAimDirection(from, cursor, target)
    const mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
    expect(mag).toBeCloseTo(1, 5)
  })

  it('returns a normalized vector (magnitude ≈ 1) for snap aim', () => {
    const from   = { x: 80, y: 90 }
    const target = { x: 240, y: 90 }
    const cursor = { x: 242, y: 90 }  // within radius
    const dir = computeAimDirection(from, cursor, target)
    const mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
    expect(mag).toBeCloseTo(1, 5)
  })

  it('returns fallback {x:1, y:0} when from and cursor are the same point', () => {
    const from   = { x: 100, y: 90 }
    const cursor = { x: 100, y: 90 }  // same as from → zero vector
    const target = { x: 500, y: 500 } // far away so no snap
    const dir = computeAimDirection(from, cursor, target)
    expect(dir).toEqual({ x: 1, y: 0 })
  })

  it('aims toward cursor when target is null (dead/no target)', () => {
    const from   = { x: 80,  y: 90 }
    const cursor = { x: 160, y: 90 }
    const dir = computeAimDirection(from, cursor, null)
    expect(dir.x).toBeCloseTo(1)
    expect(dir.y).toBeCloseTo(0)
  })

  it('correctly handles diagonal aim direction', () => {
    const from   = { x: 0,  y: 0  }
    const cursor = { x: 10, y: 10 }
    const target = { x: 100, y: 100 } // far from cursor
    const dir = computeAimDirection(from, cursor, target)
    expect(dir.x).toBeCloseTo(Math.SQRT1_2, 5)
    expect(dir.y).toBeCloseTo(Math.SQRT1_2, 5)
  })
})
