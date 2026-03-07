import { describe, it, expect, vi } from 'vitest'
import { Renderer } from '../ui/Renderer.js'
import { GameEngine } from '../game/GameEngine.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'
import { FIREBALL } from '../game/spells/SpellDefinitions.js'

function makeMockCtx() {
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '',
    fillRect:   vi.fn(),
    strokeRect: vi.fn(),
    fillText:   vi.fn(),
    save:       vi.fn(),
    restore:    vi.fn(),
    translate:  vi.fn(),
    rotate:     vi.fn(),
  }
}

function makeEngine() {
  const engine = new GameEngine()
  engine.init()
  return engine
}

// ─── Basic render ─────────────────────────────────────────────────────────────

describe('Renderer — render', () => {
  it('calls fillRect at least once (arena background)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    renderer.render(ctx, engine)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('calls strokeRect for arena border', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    renderer.render(ctx, engine)
    expect(ctx.strokeRect).toHaveBeenCalled()
  })

  it('renders without throwing when a player is dead', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.takeDamage(999)
    expect(() => renderer.render(ctx, engine)).not.toThrow()
  })

  it('renders active projectiles (extra fillRect calls)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.input.attack = true
    engine.update(0.016)
    const callsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})

// ─── Deck HUD ─────────────────────────────────────────────────────────────────

describe('Renderer — deck HUD (_drawDeck)', () => {
  it('renders without throwing with an empty deck', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.deck = []
    expect(() => renderer.render(ctx, engine)).not.toThrow()
  })

  it('does not call fillText for slot numbers (rendered as React overlay)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    renderer.render(ctx, engine)
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('draws extra fillRect calls when a spell is in the deck', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.deck = []
    renderer.render(ctx, engine)
    const emptyDeckCalls = ctx.fillRect.mock.calls.length
    ctx.fillRect.mockClear()
    engine.player.deck[0] = new SpellInstance(FIREBALL)
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(emptyDeckCalls)
  })

  it('draws a strokeRect for the slot being cast (pendingCast)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    const spell = engine.player.deck[0]
    engine.player.pendingCast = { spell, direction: { x: 1, y: 0 }, timeRemaining: 0.2 }
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })

  it('draws cooldown overlay when spell is on cooldown', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    const cooldownDef = { ...FIREBALL, id: 'testcd', cooldown: 2 }
    const spell = new SpellInstance(cooldownDef)
    engine.player.deck[0] = spell
    engine.player.cooldowns['testcd'] = 1
    renderer.render(ctx, engine)
    expect(ctx.fillRect).toHaveBeenCalled()
  })
})

// ─── AoEZone rendering ────────────────────────────────────────────────────────

describe('Renderer — _drawAoEZone', () => {
  it('calls fillRect when an AoEZone is active', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.aoeZones.push({ position: { x: 160, y: 90 }, radius: 20, color: '#ff0000', active: true })
    const fillsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })
})

// ─── Meteor warning rendering ─────────────────────────────────────────────────

describe('Renderer — _drawMeteorWarning', () => {
  it('calls strokeRect when a pending meteor exists', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.pendingMeteors.push({ x: 160, y: 90, delay: 0.5, totalDelay: 1.5, radius: 40, color: '#ff4400' })
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })

  it('draws inner flash fillRect when progress > 0.75', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.pendingMeteors.push({ x: 160, y: 90, delay: 0.1, totalDelay: 1.5, radius: 40, color: '#ff4400' })
    const fillsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })

  it('skips rendering when progress is 0 (r < 1)', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.pendingMeteors.push({ x: 160, y: 90, delay: 1.5, totalDelay: 1.5, radius: 40, color: '#ff4400' })
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    // arena border adds 1 strokeRect; meteor at r=0 adds nothing extra
    expect(ctx.strokeRect.mock.calls.length).toBe(strokesBefore + 1)
  })
})

// ─── Arcane Beam rendering ────────────────────────────────────────────────────

describe('Renderer — _drawArcaneBeam', () => {
  it('calls fillRect for beam when arcaneBeamActive is true', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.arcaneBeamActive = true
    engine.arcaneBeamDir = { x: 1, y: 0 }
    const fillsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })

  it('does not throw when arcaneBeamActive is false', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.arcaneBeamActive = false
    expect(() => renderer.render(ctx, engine)).not.toThrow()
  })
})

// ─── Spell Echo indicator ─────────────────────────────────────────────────────

describe('Renderer — _drawDeck Spell Echo indicator', () => {
  it('draws extra strokeRect borders on deck when spellEchoActive', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.spellEchoActive = true
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })
})

// ─── Player buff visuals ──────────────────────────────────────────────────────

describe('Renderer — _drawPlayer buff visuals', () => {
  it('calls extra fillRect for Phase Walk tint overlay', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.phaseWalkTimer = 3
    const fillsBefore = ctx.fillRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(fillsBefore)
  })

  it('calls extra strokeRect for Arcane Overload glow', () => {
    const ctx = makeMockCtx()
    const engine = makeEngine()
    const renderer = new Renderer()
    engine.player.arcaneOverloadTimer = 5
    const strokesBefore = ctx.strokeRect.mock.calls.length
    renderer.render(ctx, engine)
    expect(ctx.strokeRect.mock.calls.length).toBeGreaterThan(strokesBefore)
  })
})
