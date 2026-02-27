import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InputHandler } from '../game/InputHandler.js'
import { Player } from '../game/Player.js'
import { DEFAULT_KEYBINDINGS } from '../config/keybindings.js'

function makePlayer() {
  return new Player({ x: 160, y: 90, color: '#fff' })
}

function makeCanvas() {
  return {
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 960, height: 540 })),
  }
}

describe('InputHandler — key events', () => {
  let player, canvas, handler

  beforeEach(() => {
    player  = makePlayer()
    canvas  = makeCanvas()
    handler = new InputHandler(canvas, player)
  })

  afterEach(() => {
    handler.destroy()
  })

  it('sets input.up on W keydown', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    expect(player.input.up).toBe(true)
  })

  it('sets input.down on S keydown', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))
    expect(player.input.down).toBe(true)
  })

  it('sets input.left on A keydown', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))
    expect(player.input.left).toBe(true)
  })

  it('sets input.right on D keydown', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }))
    expect(player.input.right).toBe(true)
  })

  it('clears input.up on W keyup', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    window.dispatchEvent(new KeyboardEvent('keyup',   { code: 'KeyW' }))
    expect(player.input.up).toBe(false)
  })

  it('clears input.right on D keyup', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }))
    window.dispatchEvent(new KeyboardEvent('keyup',   { code: 'KeyD' }))
    expect(player.input.right).toBe(false)
  })

  it('ignores unrelated keys', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    expect(player.input.up).toBe(false)
    expect(player.input.down).toBe(false)
    expect(player.input.left).toBe(false)
    expect(player.input.right).toBe(false)
  })

  it('removes event listeners on destroy()', () => {
    handler.destroy()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    expect(player.input.up).toBe(false)
  })
})

describe('InputHandler — mouse coords', () => {
  it('converts screen coords to game coords on mousemove', () => {
    const player = makePlayer()
    const canvas = {
      addEventListener: (event, cb) => {
        if (event === 'mousemove') canvas._cb = cb
      },
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 960, height: 540 })),
    }
    const handler = new InputHandler(canvas, player)
    // Simulate mousemove at screen (480, 270) → game (160, 90)
    canvas._cb({ clientX: 480, clientY: 270 })
    expect(handler.mouse.x).toBe(160)
    expect(handler.mouse.y).toBe(90)
    handler.destroy()
  })

  it('maps top-left corner (0,0) to game (0,0)', () => {
    const player = makePlayer()
    const canvas = {
      addEventListener: (event, cb) => {
        if (event === 'mousemove') canvas._cb = cb
      },
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 960, height: 540 })),
    }
    const handler = new InputHandler(canvas, player)
    canvas._cb({ clientX: 0, clientY: 0 })
    expect(handler.mouse.x).toBe(0)
    expect(handler.mouse.y).toBe(0)
    handler.destroy()
  })
})

describe('InputHandler — mouse click (attack)', () => {
  it('sets player.input.attack=true on left mousedown', () => {
    const player = makePlayer()
    const cbs = {}
    const canvas = {
      addEventListener:    (evt, cb) => { cbs[evt] = cb },
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 960, height: 540 })),
    }
    const handler = new InputHandler(canvas, player)
    cbs['mousedown']({ button: 0 })
    expect(player.input.attack).toBe(true)
    handler.destroy()
  })

  it('sets player.input.attack=false on left mouseup', () => {
    const player = makePlayer()
    const cbs = {}
    const canvas = {
      addEventListener:    (evt, cb) => { cbs[evt] = cb },
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 960, height: 540 })),
    }
    const handler = new InputHandler(canvas, player)
    cbs['mousedown']({ button: 0 })
    cbs['mouseup']({ button: 0 })
    expect(player.input.attack).toBe(false)
    handler.destroy()
  })

  it('ignores non-left mouse button clicks', () => {
    const player = makePlayer()
    const cbs = {}
    const canvas = {
      addEventListener:    (evt, cb) => { cbs[evt] = cb },
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 960, height: 540 })),
    }
    const handler = new InputHandler(canvas, player)
    cbs['mousedown']({ button: 2 })  // right click
    expect(player.input.attack).toBe(false)
    handler.destroy()
  })
})

describe('InputHandler — spell slot keys', () => {
  it('sets spellSlots[0]=true on Digit1 keydown', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const handler = new InputHandler(canvas, player)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }))
    expect(player.input.spellSlots[0]).toBe(true)
    handler.destroy()
  })

  it('clears spellSlots[0] on Digit1 keyup', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const handler = new InputHandler(canvas, player)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }))
    window.dispatchEvent(new KeyboardEvent('keyup',   { code: 'Digit1' }))
    expect(player.input.spellSlots[0]).toBe(false)
    handler.destroy()
  })

  it('sets spellSlots[7]=true on Digit8 keydown', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const handler = new InputHandler(canvas, player)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit8' }))
    expect(player.input.spellSlots[7]).toBe(true)
    handler.destroy()
  })

  it('does not affect spellSlots for non-spell keys', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const handler = new InputHandler(canvas, player)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    expect(player.input.spellSlots.every(v => v === false)).toBe(true)
    handler.destroy()
  })
})

describe('InputHandler — custom keybindings', () => {
  it('respects custom keybinding for up', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const handler = new InputHandler(canvas, player, { up: 'ArrowUp', down: 'KeyS', left: 'KeyA', right: 'KeyD' })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
    expect(player.input.up).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))  // default, should not work
    // Note: up is already true, test that ArrowUp triggered it (not KeyW — KeyW maps to nothing)
    handler.destroy()
  })
})

describe('InputHandler — custom spell keybindings', () => {
  it('uses custom spell key when provided', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const custom = { ...DEFAULT_KEYBINDINGS, spell1: 'KeyQ' }
    const handler = new InputHandler(canvas, player, custom)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    expect(player.input.spellSlots[0]).toBe(true)
    handler.destroy()
  })

  it('default Digit1 no longer triggers slot 0 when rebound', () => {
    const player = makePlayer()
    const canvas = makeCanvas()
    const custom = { ...DEFAULT_KEYBINDINGS, spell1: 'KeyQ' }
    const handler = new InputHandler(canvas, player, custom)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }))
    expect(player.input.spellSlots[0]).toBe(false)
    handler.destroy()
  })
})
