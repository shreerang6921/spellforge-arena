import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameEngine } from '../game/GameEngine.js'
import { RESOLUTION_W, RESOLUTION_H } from '../config/constants.js'

function makeMockCtx() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    fillRect:   vi.fn(),
    strokeRect: vi.fn(),
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

describe('GameEngine — init', () => {
  it('sets canvas dimensions to internal resolution', () => {
    const { canvas } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    expect(canvas.width).toBe(RESOLUTION_W)
    expect(canvas.height).toBe(RESOLUTION_H)
  })

  it('creates player and bot after init()', () => {
    const { canvas } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    engine.init()
    expect(engine.player).not.toBeNull()
    expect(engine.bot).not.toBeNull()
    expect(engine.player.isBot).toBe(false)
    expect(engine.bot.isBot).toBe(true)
  })

  it('spawns player and bot at different positions', () => {
    const { canvas } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    engine.init()
    expect(engine.player.position.x).not.toBe(engine.bot.position.x)
  })
})

describe('GameEngine — start / stop', () => {
  it('sets running to true on start()', () => {
    const { canvas } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    engine.init()
    // Mock RAF so it doesn't actually schedule
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    engine.start()
    expect(engine.running).toBe(true)
    engine.stop()
    vi.unstubAllGlobals()
  })

  it('sets running to false on stop()', () => {
    const { canvas } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    engine.init()
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    engine.start()
    engine.stop()
    expect(engine.running).toBe(false)
    vi.unstubAllGlobals()
  })

  it('does not double-start if already running', () => {
    const { canvas } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    engine.init()
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    engine.start()
    engine.start()  // second call should be ignored
    expect(rafMock).toHaveBeenCalledTimes(1)
    engine.stop()
    vi.unstubAllGlobals()
  })
})

describe('GameEngine — update', () => {
  it('updates both player and bot', () => {
    const { canvas } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    engine.init()
    const spyPlayer = vi.spyOn(engine.player, 'update')
    const spyBot    = vi.spyOn(engine.bot,    'update')
    engine.update(0.016)
    expect(spyPlayer).toHaveBeenCalledWith(0.016)
    expect(spyBot).toHaveBeenCalledWith(0.016)
  })
})

describe('GameEngine — render', () => {
  it('calls fillRect at least once (arena background)', () => {
    const { canvas, ctx } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    engine.init()
    engine.render(ctx)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('calls strokeRect for arena border', () => {
    const { canvas, ctx } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    engine.init()
    engine.render(ctx)
    expect(ctx.strokeRect).toHaveBeenCalled()
  })

  it('renders without throwing when a player is dead', () => {
    const { canvas, ctx } = makeMockCanvas()
    const engine = new GameEngine(canvas)
    engine.init()
    engine.player.takeDamage(999)
    expect(() => engine.render(ctx)).not.toThrow()
  })
})
