import { describe, it, expect, vi, afterEach } from 'vitest'
import { GameLoop } from '../ui/GameLoop.js'

function makeLoop() {
  const engine = { update: vi.fn() }
  const renderer = { render: vi.fn() }
  const ctx = {}
  return { loop: new GameLoop(engine, renderer, ctx), engine, renderer, ctx }
}

describe('GameLoop — start', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sets running to true on start()', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    expect(loop.running).toBe(true)
  })

  it('calls requestAnimationFrame on start()', () => {
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    expect(rafMock).toHaveBeenCalledTimes(1)
  })

  it('does not double-start if already running', () => {
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    loop.start()
    expect(rafMock).toHaveBeenCalledTimes(1)
  })
})

describe('GameLoop — stop', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sets running to false on stop()', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    loop.stop()
    expect(loop.running).toBe(false)
  })

  it('calls cancelAnimationFrame with the scheduled rAF id', () => {
    const cafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42))
    vi.stubGlobal('cancelAnimationFrame', cafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop } = makeLoop()
    loop.start()
    loop.stop()
    expect(cafMock).toHaveBeenCalledWith(42)
  })

  it('does not throw when stop() called before start()', () => {
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { loop } = makeLoop()
    expect(() => loop.stop()).not.toThrow()
  })
})

describe('GameLoop — _loop tick', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('calls engine.update and renderer.render on first tick', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop, engine, renderer, ctx } = makeLoop()
    loop.start()
    expect(engine.update).toHaveBeenCalled()
    expect(renderer.render).toHaveBeenCalledWith(ctx, engine)
  })

  it('caps dt at 0.05s on huge timestamp gaps', () => {
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop, engine } = makeLoop()
    loop.start()
    engine.update.mockClear()
    const nextLoopFn = rafMock.mock.calls[0][0]
    nextLoopFn(10000)
    expect(engine.update).toHaveBeenCalledWith(0.05)
  })

  it('passes correct dt for normal 16ms frame', () => {
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop, engine } = makeLoop()
    loop.start()
    engine.update.mockClear()
    const nextLoopFn = rafMock.mock.calls[0][0]
    nextLoopFn(16)
    expect(engine.update).toHaveBeenCalledWith(expect.closeTo(0.016, 5))
  })

  it('_loop does not update or render after stop()', () => {
    const rafMock = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafMock)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('performance', { now: vi.fn(() => 0) })
    const { loop, engine, renderer } = makeLoop()
    loop.start()
    loop.stop()
    engine.update.mockClear()
    renderer.render.mockClear()
    // Simulate a stale rAF callback arriving after stop
    const nextLoopFn = rafMock.mock.calls[0][0]
    nextLoopFn(16)
    expect(engine.update).not.toHaveBeenCalled()
    expect(renderer.render).not.toHaveBeenCalled()
  })
})
