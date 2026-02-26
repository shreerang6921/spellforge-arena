import { PLAYER } from '../config/constants.js'

const DECISION_INTERVAL = 0.5  // seconds between AI ticks

/**
 * Bot AI — spec §19.
 *
 * Decision loop (runs every 0.5s):
 *   1. If HP < 30% → try Healing Pulse
 *   2. If mana > 70% → 50% chance to cast ultimate
 *   3. If distance to player ≤ 120px → cast a random damage spell
 *   Always: move toward player at 60% speed
 */
export class BotAI {
    constructor(bot, player) {
        this.bot = bot
        this.player = player
        this._timer = 0
    }

    update(dt) {
        if (this.bot.isDead) return

        this._moveTowardPlayer()

        this._timer += dt
        if (this._timer >= DECISION_INTERVAL) {
            this._timer -= DECISION_INTERVAL
            this._think()
        }
    }

    _think() {
        const bot = this.bot
        const player = this.player
        if (player.isDead) return

        const dx = player.position.x - bot.position.x
        const dy = player.position.y - bot.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Normalised aim direction toward the player
        const dir = dist > 0
            ? { x: dx / dist, y: dy / dist }
            : { x: 1, y: 0 }

        // AoE target = player's current position
        const targetPos = { x: player.position.x, y: player.position.y }

        // ── Priority 1: heal if critically low ────────────────────────────────────
        if (bot.hp < bot.maxHp * 0.3) {
            const slot = bot.deck.findIndex(s => s?.definition.id === 'healing_pulse')
            if (slot >= 0 && bot.castSpell(slot, dir, targetPos)) return
        }

        // ── Priority 2: cast ultimate when flush with mana (50% random check) ─────
        if (bot.mana > bot.maxMana * 0.7) {
            const slot = bot.deck.findIndex(s => s?.definition.isUltimate)
            if (slot >= 0 && Math.random() < 0.5) {
                if (bot.castSpell(slot, dir, targetPos)) return
            }
        }

        // ── Priority 3: cast a random damage spell when in range ──────────────────
        if (dist <= 120) {
            const damageSlots = bot.deck
                .map((s, i) => ({ s, i }))
                .filter(({ s }) =>
                    s &&
                    !s.definition.isUltimate &&
                    s.definition.tags?.includes('damage')
                )

            if (damageSlots.length > 0) {
                const pick = damageSlots[Math.floor(Math.random() * damageSlots.length)]
                bot.castSpell(pick.i, dir, targetPos)
            }
        }
    }

    // Move toward the player at 60% of base speed, scaled by active buffs
    _moveTowardPlayer() {
        const bot = this.bot
        const player = this.player

        const dx = player.position.x - bot.position.x
        const dy = player.position.y - bot.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 1) {
            bot.velocity.x = 0
            bot.velocity.y = 0
            return
        }

        const speed = PLAYER.SPEED * 0.6 * bot.speedMultiplier
        bot.velocity.x = (dx / dist) * speed
        bot.velocity.y = (dy / dist) * speed
    }
}
