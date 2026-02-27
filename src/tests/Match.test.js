import { describe, it, expect, beforeEach } from 'vitest'
import { Match } from '../game/Match.js'
import { MATCH_DURATION } from '../config/constants.js'

function makePlayer(overrides = {}) {
  return {
    hp: 100,
    isDead: false,
    ...overrides,
  }
}

function makeMatch(pOverrides = {}, botOverrides = {}) {
  const p = makePlayer(pOverrides)
  const bot = makePlayer(botOverrides)
  return { match: new Match([p, bot]), p, bot }
}

// ─── Construction ────────────────────────────────────────────────────────────

describe('Match — construction', () => {
  it('initialises matchTimer to MATCH_DURATION', () => {
    const { match } = makeMatch()
    expect(match.matchTimer).toBe(MATCH_DURATION)
  })

  it('matchOver is false initially', () => {
    const { match } = makeMatch()
    expect(match.matchOver).toBe(false)
  })

  it('winner is null initially', () => {
    const { match } = makeMatch()
    expect(match.winner).toBe(null)
  })

  it('stores players reference', () => {
    const p = makePlayer()
    const bot = makePlayer()
    const match = new Match([p, bot])
    expect(match.players[0]).toBe(p)
    expect(match.players[1]).toBe(bot)
  })
})

// ─── Timer ticking ────────────────────────────────────────────────────────────

describe('Match — timer', () => {
  it('decrements matchTimer each update', () => {
    const { match } = makeMatch()
    match.update(1)
    expect(match.matchTimer).toBeCloseTo(MATCH_DURATION - 1)
  })

  it('decrements by the correct dt', () => {
    const { match } = makeMatch()
    match.update(0.016)
    expect(match.matchTimer).toBeCloseTo(MATCH_DURATION - 0.016)
  })

  it('does not decrement when matchOver', () => {
    const { match } = makeMatch()
    match.matchOver = true
    match.update(10)
    expect(match.matchTimer).toBe(MATCH_DURATION) // unchanged
  })

  it('clamps matchTimer to 0 on expiry', () => {
    const { match } = makeMatch()
    match.update(MATCH_DURATION + 100)
    expect(match.matchTimer).toBe(0)
  })
})

// ─── Instant-win: player death ────────────────────────────────────────────────

describe('Match — instant win (death)', () => {
  it('bot wins when player is dead', () => {
    const { match, p } = makeMatch()
    p.isDead = true
    match.update(0.016)
    expect(match.winner).toBe('bot')
    expect(match.matchOver).toBe(true)
  })

  it('player wins when bot is dead', () => {
    const { match, bot } = makeMatch()
    bot.isDead = true
    match.update(0.016)
    expect(match.winner).toBe('player')
    expect(match.matchOver).toBe(true)
  })

  it('player death is checked before timer tick', () => {
    const { match, p } = makeMatch()
    // Start at 1s remaining, player is dead — should end immediately without
    // decrementing timer further
    match.matchTimer = 1
    p.isDead = true
    match.update(2)
    expect(match.matchTimer).toBe(1) // timer not touched after death check
    expect(match.winner).toBe('bot')
  })

  it('bot death is checked before timer tick', () => {
    const { match, bot } = makeMatch()
    match.matchTimer = 1
    bot.isDead = true
    match.update(2)
    expect(match.matchTimer).toBe(1)
    expect(match.winner).toBe('player')
  })
})

// ─── Timer expiry: win by HP ──────────────────────────────────────────────────

describe('Match — timer expiry win condition', () => {
  it('player wins when time runs out and player has more HP', () => {
    const { match, p, bot } = makeMatch({ hp: 80 }, { hp: 40 })
    match.update(MATCH_DURATION + 1)
    expect(match.winner).toBe('player')
    expect(match.matchOver).toBe(true)
  })

  it('bot wins when time runs out and bot has more HP', () => {
    const { match, p, bot } = makeMatch({ hp: 30 }, { hp: 70 })
    match.update(MATCH_DURATION + 1)
    expect(match.winner).toBe('bot')
    expect(match.matchOver).toBe(true)
  })

  it('draw when time runs out and both players have equal HP', () => {
    const { match } = makeMatch({ hp: 60 }, { hp: 60 })
    match.update(MATCH_DURATION + 1)
    expect(match.winner).toBe('draw')
    expect(match.matchOver).toBe(true)
  })

  it('draw at full HP (neither player took damage)', () => {
    const { match } = makeMatch({ hp: 100 }, { hp: 100 })
    match.update(MATCH_DURATION + 1)
    expect(match.winner).toBe('draw')
  })
})

// ─── No further updates after matchOver ──────────────────────────────────────

describe('Match — no state change after matchOver', () => {
  it('does not change winner after match ends', () => {
    const { match, bot } = makeMatch()
    bot.isDead = true
    match.update(0.016)
    expect(match.winner).toBe('player')

    // Simulate player dying too — should not change winner
    match.players[0].isDead = true
    match.update(0.016)
    expect(match.winner).toBe('player')
  })

  it('matchOver stays true after further updates', () => {
    const { match } = makeMatch()
    match.update(MATCH_DURATION + 1)
    match.update(1)
    expect(match.matchOver).toBe(true)
  })
})
