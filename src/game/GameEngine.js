import { RESOLUTION_W, RESOLUTION_H, COLORS, ARENA } from '../config/constants.js'
import { Player } from './Player.js'
import { InputHandler } from './InputHandler.js'
import { Projectile } from './Projectile.js'
import { runCollision } from './CollisionSystem.js'
import { computeAimDirection } from './AimAssist.js'
import { SpellInstance } from './spells/SpellInstance.js'
import { FIREBALL } from './spells/SpellDefinitions.js'

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    canvas.width  = RESOLUTION_W
    canvas.height = RESOLUTION_H

    this.running = false
    this._lastTime = 0
    this._rafId = null

    this.player = null
    this.bot    = null
    this.inputHandler = null
    this.projectiles = []
  }

  init() {
    this.player = new Player({ x: 80,  y: 90, color: COLORS.PLAYER1, isBot: false })
    this.bot    = new Player({ x: 240, y: 90, color: COLORS.PLAYER2, isBot: true  })

    // Temporary deck for Phase 4 — will be replaced by Deck Forge in Phase 10
    this.player.deck[0] = new SpellInstance(FIREBALL)

    this.inputHandler = new InputHandler(this.canvas, this.player)
  }

  start() {
    if (this.running) return
    this.running = true
    this._lastTime = performance.now()
    this._loop(this._lastTime)
  }

  stop() {
    this.running = false
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    if (this.inputHandler) {
      this.inputHandler.destroy()
    }
  }

  _loop(timestamp) {
    if (!this.running) return

    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05) // cap at 50ms
    this._lastTime = timestamp

    this.update(dt)
    this.render(this.ctx)

    this._rafId = requestAnimationFrame((ts) => this._loop(ts))
  }

  update(dt) {
    this.player.update(dt)
    this.bot.update(dt)

    if (this.inputHandler) {
      const dir = computeAimDirection(
        this.player.position,
        this.inputHandler.mouse,
        this.bot.isDead ? null : this.bot.position
      )

      // Basic attack
      if (this.player.input.attack) {
        const proj = this.player.tryBasicAttack(dir)
        if (proj) this.projectiles.push(proj)
      }

      // Spell slots — only one slot per frame, skip if already casting
      if (!this.player.pendingCast) {
        for (let i = 0; i < this.player.input.spellSlots.length; i++) {
          if (this.player.input.spellSlots[i]) {
            this.player.castSpell(i, dir)
            break
          }
        }
      }
    }

    // Spawn projectile when a cast completes
    if (this.player.completedCast) {
      const proj = this._spawnSpellProjectile(this.player.completedCast, this.player)
      if (proj) this.projectiles.push(proj)
      this.player.completedCast = null
    }

    // Update all projectiles
    for (const proj of this.projectiles) {
      proj.update(dt)
    }

    // Collision detection
    runCollision(this.projectiles, [this.player, this.bot])

    // Remove inactive projectiles
    this.projectiles = this.projectiles.filter(p => p.active)
  }

  render(ctx) {
    this._drawArena(ctx)
    this._drawPlayer(ctx, this.player)
    this._drawPlayer(ctx, this.bot)
    for (const proj of this.projectiles) {
      this._drawProjectile(ctx, proj)
    }
    this._drawHUD(ctx)
    this._drawDeck(ctx)
  }

  _drawArena(ctx) {
    // Background
    ctx.fillStyle = COLORS.ARENA_BG
    ctx.fillRect(0, 0, RESOLUTION_W, RESOLUTION_H)

    // Arena border
    ctx.strokeStyle = COLORS.ARENA_BORDER
    ctx.lineWidth = 1
    ctx.strokeRect(
      ARENA.LEFT,
      ARENA.TOP,
      ARENA.RIGHT  - ARENA.LEFT,
      ARENA.BOTTOM - ARENA.TOP
    )
  }

  _drawPlayer(ctx, player) {
    const half = player.size / 2
    // Round only at render time — physics uses floats
    const x = Math.round(player.position.x - half)
    const y = Math.round(player.position.y - half)

    ctx.fillStyle = player.isDead ? '#555' : player.color
    ctx.fillRect(x, y, player.size, player.size)
  }

  _drawHUD(ctx) {
    this._drawBar(ctx,  2,  2, 60, 4, this.player.hp    / this.player.maxHp,    COLORS.HP_BAR,   COLORS.HP_BG)
    this._drawBar(ctx,  2,  8, 60, 4, this.player.mana  / this.player.maxMana,  COLORS.MANA_BAR, COLORS.MANA_BG)
    this._drawBar(ctx, 258, 2, 60, 4, this.bot.hp       / this.bot.maxHp,       COLORS.HP_BAR,   COLORS.HP_BG)
    this._drawBar(ctx, 258, 8, 60, 4, this.bot.mana     / this.bot.maxMana,     COLORS.MANA_BAR, COLORS.MANA_BG)
  }

  _spawnSpellProjectile(completedCast, owner) {
    const { spell, direction } = completedCast
    const def = spell.definition
    if (def.behaviorType !== 'projectile') return null
    return new Projectile({
      x: owner.position.x,
      y: owner.position.y,
      vx: direction.x * def.projectileSpeed,
      vy: direction.y * def.projectileSpeed,
      damage: spell.computedDamage,
      owner,
      size: def.projectileSize,
      type: def.id,
      lifetime: def.projectileLifetime,
      color: def.color,
    })
  }

  _drawProjectile(ctx, proj) {
    ctx.fillStyle = proj.color
    const x = Math.round(proj.position.x - proj.size.w / 2)
    const y = Math.round(proj.position.y - proj.size.h / 2)
    ctx.fillRect(x, y, proj.size.w, proj.size.h)
  }

  _drawDeck(ctx) {
    const SLOT  = 14
    const GAP   = 2
    const SLOTS = 8
    const totalW = SLOTS * SLOT + (SLOTS - 1) * GAP
    const startX = Math.floor((RESOLUTION_W - totalW) / 2)
    const y = RESOLUTION_H - SLOT - 2   // 2px above canvas bottom

    for (let i = 0; i < SLOTS; i++) {
      const x = startX + i * (SLOT + GAP)
      const spell = this.player.deck[i]

      // Slot background
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(x, y, SLOT, SLOT)

      if (spell) {
        // Spell colour fill (inner, 1px inset)
        ctx.fillStyle = spell.definition.color
        ctx.fillRect(x + 1, y + 1, SLOT - 2, SLOT - 2)

        // Cooldown dark overlay (top-down wipe)
        const cd    = this.player.cooldowns[spell.definition.id] ?? 0
        const total = spell.computedCooldown
        if (cd > 0 && total > 0) {
          const ratio = cd / total
          ctx.fillStyle = 'rgba(0,0,0,0.75)'
          ctx.fillRect(x + 1, y + 1, SLOT - 2, Math.round((SLOT - 2) * ratio))
        }

        // White border while this slot is being cast
        if (this.player.pendingCast?.spell === spell) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1)
        }
      }

      // Slot number label
      ctx.fillStyle = spell ? '#fff' : '#555'
      ctx.font = '5px monospace'
      ctx.fillText(String(i + 1), x + 1, y + 5)
    }
  }

  _drawBar(ctx, x, y, w, h, ratio, fill, bg) {
    ctx.fillStyle = bg
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = fill
    ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, ratio))), h)
  }
}
