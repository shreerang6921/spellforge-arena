import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BotAI } from '../game/BotAI.js'
import { Player } from '../game/Player.js'
import { SpellInstance } from '../game/spells/SpellInstance.js'
import {
    FIREBALL, ICE_SHARD, GROUND_FLAME, ARCANE_BURST,
    BLOOD_LANCE, HEALING_PULSE, MANA_SURGE, METEOR,
} from '../game/spells/SpellDefinitions.js'
import { createBotDeck } from '../config/botDeck.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlayer(x = 80, y = 90) {
    return new Player({ x, y, color: '#fff', isBot: false })
}

function makeBot(x = 240, y = 90) {
    return new Player({ x, y, color: '#f00', isBot: true })
}

function makeBotWithDeck(bot) {
    bot.deck = createBotDeck()
    return bot
}

// ── Construction ──────────────────────────────────────────────────────────────

describe('BotAI — construction', () => {
    it('stores bot and player references', () => {
        const bot = makeBot()
        const player = makePlayer()
        const ai = new BotAI(bot, player)
        expect(ai.bot).toBe(bot)
        expect(ai.player).toBe(player)
    })

    it('initialises timer to 0', () => {
        const ai = new BotAI(makeBot(), makePlayer())
        expect(ai._timer).toBe(0)
    })
})

// ── update — no-op when dead ──────────────────────────────────────────────────

describe('BotAI — update skips dead bot', () => {
    it('does not tick timer if bot is dead', () => {
        const bot = makeBot()
        const player = makePlayer()
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)
        bot.takeDamage(999) // kill the bot
        ai.update(0.5)
        expect(ai._timer).toBe(0) // timer never incremented
    })
})

// ── Movement ─────────────────────────────────────────────────────────────────

describe('BotAI — _moveTowardPlayer', () => {
    it('moves bot toward the player', () => {
        const bot = makeBot(240, 90)
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)
        ai.update(0.016)
        // bot is at x=240, player at x=80 → bot should move left (negative vx)
        expect(bot.velocity.x).toBeLessThan(0)
    })

    it('bot velocity is 0 when already on top of player', () => {
        const bot = makeBot(80, 90)
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)
        ai.update(0.016)
        expect(bot.velocity.x).toBe(0)
        expect(bot.velocity.y).toBe(0)
    })

    it('bot velocity direction is normalized (magnitude ≈ expected speed)', () => {
        const bot = makeBot(240, 90)
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)
        ai.update(0.016)

        // Speed should be PLAYER.SPEED * 0.6 (≈ 48 px/s)
        const speed = Math.sqrt(bot.velocity.x ** 2 + bot.velocity.y ** 2)
        expect(speed).toBeCloseTo(80 * 0.6, 1)
    })
})

// ── Decision interval timing ──────────────────────────────────────────────────

describe('BotAI — decision interval', () => {
    it('_think is not called before 0.5s elapses', () => {
        const bot = makeBot()
        const player = makePlayer()
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        const thinkSpy = vi.spyOn(ai, '_think')
        ai.update(0.3) // not yet at 0.5s threshold
        expect(thinkSpy).not.toHaveBeenCalled()
    })

    it('_think is called once 0.5s elapses', () => {
        const bot = makeBot()
        const player = makePlayer()
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        const thinkSpy = vi.spyOn(ai, '_think')
        ai.update(0.5)
        expect(thinkSpy).toHaveBeenCalledTimes(1)
    })

    it('_think is called again after another 0.5s', () => {
        const bot = makeBot()
        const player = makePlayer()
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        const thinkSpy = vi.spyOn(ai, '_think')
        ai.update(0.5)
        ai.update(0.5)
        expect(thinkSpy).toHaveBeenCalledTimes(2)
    })

    it('timer resets after each think cycle', () => {
        const bot = makeBot()
        const player = makePlayer()
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)
        ai.update(0.5)
        // After 0.5s exactly, timer should wrap back to ~0
        expect(ai._timer).toBeCloseTo(0, 5)
    })
})

// ── Priority 1: Heal if critically low HP ────────────────────────────────────

describe('BotAI — _think: healing priority', () => {
    it('casts Healing Pulse when HP < 30% and spell is available', () => {
        const bot = makeBot(200, 90)  // close enough to player to trigger
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        bot.takeDamage(75) // 25 HP remaining (25% of 100) < 30%
        bot.mana = 100

        const healSlot = bot.deck.findIndex(s => s.definition.id === 'healing_pulse')
        expect(healSlot).toBeGreaterThanOrEqual(0)

        const castSpy = vi.spyOn(bot, 'castSpell')
        ai._think()

        // Should have tried to cast healing_pulse slot
        expect(castSpy).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Object),
            expect.any(Object)
        )
        // Confirm the slot cast is the healing pulse slot
        const calls = castSpy.mock.calls
        const healCast = calls.find(([slot]) => slot === healSlot)
        expect(healCast).toBeDefined()
    })

    it('skips heal if HP is above 30%', () => {
        const bot = makeBot(200, 90)
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        bot.takeDamage(60) // 40 HP = 40% > 30%; should NOT heal
        bot.mana = 100

        const healSlot = bot.deck.findIndex(s => s.definition.id === 'healing_pulse')
        const castSpy = vi.spyOn(bot, 'castSpell')
        ai._think()

        // castSpell may be called for other reasons (e.g. damage spell)
        // but healing_pulse should NOT be the first cast attempt
        const firstCall = castSpy.mock.calls[0]
        if (firstCall) {
            expect(firstCall[0]).not.toBe(healSlot)
        }
    })
})

// ── Priority 2: Ultimate when mana > 70% ─────────────────────────────────────

describe('BotAI — _think: ultimate casting', () => {
    it('attempts to cast the ultimate when mana > 70%', () => {
        const bot = makeBot(240, 90)
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        bot.hp = 100 // not critically low
        bot.mana = 80 // > 70

        const ultimateSlot = bot.deck.findIndex(s => s?.definition.isUltimate)
        expect(ultimateSlot).toBeGreaterThanOrEqual(0)

        // Force Math.random to return < 0.5 so the 50% check passes
        vi.spyOn(Math, 'random').mockReturnValue(0.3)
        const castSpy = vi.spyOn(bot, 'castSpell')

        ai._think()

        vi.restoreAllMocks()

        // Expect ultimate slot to have been attempted
        const ultCast = castSpy.mock.calls.find(([slot]) => slot === ultimateSlot)
        expect(ultCast).toBeDefined()
    })

    it('skips ultimate when random() >= 0.5', () => {
        const bot = makeBot(240, 90)
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        bot.hp = 100
        bot.mana = 80

        const ultimateSlot = bot.deck.findIndex(s => s?.definition.isUltimate)

        vi.spyOn(Math, 'random').mockReturnValue(0.8) // > 0.5 → skip ultimate
        const castSpy = vi.spyOn(bot, 'castSpell')

        ai._think()

        vi.restoreAllMocks()

        const ultCast = castSpy.mock.calls.find(([slot]) => slot === ultimateSlot)
        expect(ultCast).toBeUndefined()
    })

    it('does not attempt ultimate when mana <= 70%', () => {
        const bot = makeBot(240, 90)
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        bot.hp = 100
        bot.mana = 65 // ≤ 70

        const ultimateSlot = bot.deck.findIndex(s => s?.definition.isUltimate)
        const castSpy = vi.spyOn(bot, 'castSpell')

        ai._think()

        const ultCast = castSpy.mock.calls.find(([slot]) => slot === ultimateSlot)
        expect(ultCast).toBeUndefined()
    })
})

// ── Priority 3: Damage spell within range ────────────────────────────────────

describe('BotAI — _think: damage cast in range', () => {
    it('casts a damage spell when within 120px of player', () => {
        const bot = makeBot(200, 90)     // 120px from player
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        bot.hp = 60  // > 30% so no heal
        bot.mana = 60 // ≤ 70% so no ultimate priority

        const castSpy = vi.spyOn(bot, 'castSpell')
        ai._think()

        expect(castSpy).toHaveBeenCalled()
    })

    it('does NOT cast a damage spell when more than 120px away', () => {
        const bot = makeBot(80, 90)   // same position as player — distance=0 is fine,
        // but let's place bot FAR from player
        const farBot = makeBot(320, 90)
        const player = makePlayer(80, 90)  // 240px apart
        makeBotWithDeck(farBot)
        const ai = new BotAI(farBot, player)

        farBot.hp = 60
        farBot.mana = 60

        const castSpy = vi.spyOn(farBot, 'castSpell')
        ai._think()

        expect(castSpy).not.toHaveBeenCalled()
    })
})

// ── _think: no-op when player is dead ────────────────────────────────────────

describe('BotAI — _think: skips when player is dead', () => {
    it('does not cast any spell if player is dead', () => {
        const bot = makeBot(200, 90)
        const player = makePlayer(80, 90)
        makeBotWithDeck(bot)
        const ai = new BotAI(bot, player)

        player.takeDamage(999)  // kill player

        const castSpy = vi.spyOn(bot, 'castSpell')
        ai._think()

        expect(castSpy).not.toHaveBeenCalled()
    })
})

// ── createBotDeck ─────────────────────────────────────────────────────────────

describe('createBotDeck', () => {
    it('returns an array of 8 SpellInstances', () => {
        const deck = createBotDeck()
        expect(deck).toHaveLength(8)
        for (const slot of deck) {
            expect(slot).toBeInstanceOf(SpellInstance)
        }
    })

    it('contains exactly one ultimate (Meteor)', () => {
        const deck = createBotDeck()
        const ultimates = deck.filter(s => s.definition.isUltimate)
        expect(ultimates).toHaveLength(1)
        expect(ultimates[0].definition.id).toBe('meteor')
    })

    it('contains Fireball, Ice Shard, Ground Flame, and Arcane Burst', () => {
        const deck = createBotDeck()
        const ids = deck.map(s => s.definition.id)
        expect(ids).toContain('fireball')
        expect(ids).toContain('ice_shard')
        expect(ids).toContain('ground_flame')
        expect(ids).toContain('arcane_burst')
    })

    it('contains Blood Lance, Healing Pulse, and Mana Surge', () => {
        const deck = createBotDeck()
        const ids = deck.map(s => s.definition.id)
        expect(ids).toContain('blood_lance')
        expect(ids).toContain('healing_pulse')
        expect(ids).toContain('mana_surge')
    })

    it('no spell in bot deck has modifiers', () => {
        const deck = createBotDeck()
        for (const slot of deck) {
            expect(slot.modifiers).toHaveLength(0)
        }
    })
})
