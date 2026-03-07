import { RESOLUTION_W, RESOLUTION_H, COLORS, ARENA } from '../config/constants.js'

export class Renderer {
  render(ctx, engine) {
    this._drawArena(ctx)
    for (const zone of engine.aoeZones)      this._drawAoEZone(ctx, zone)
    for (const m   of engine.pendingMeteors) this._drawMeteorWarning(ctx, m)
    this._drawPlayer(ctx, engine.player)
    this._drawPlayer(ctx, engine.bot)
    for (const proj of engine.projectiles)  this._drawProjectile(ctx, proj)
    this._drawArcaneBeam(ctx, engine)
    this._drawHUD(ctx, engine)
    this._drawDeck(ctx, engine)
  }

  _drawArena(ctx) {
    ctx.fillStyle = COLORS.ARENA_BG
    ctx.fillRect(0, 0, RESOLUTION_W, RESOLUTION_H)
    ctx.strokeStyle = COLORS.ARENA_BORDER
    ctx.lineWidth = 1
    ctx.strokeRect(ARENA.LEFT, ARENA.TOP, ARENA.RIGHT - ARENA.LEFT, ARENA.BOTTOM - ARENA.TOP)
  }

  _drawPlayer(ctx, player) {
    const half = player.size / 2
    const x = Math.round(player.position.x - half)
    const y = Math.round(player.position.y - half)
    ctx.fillStyle = player.isDead ? '#555' : player.color
    ctx.fillRect(x, y, player.size, player.size)
    if (player.phaseWalkTimer > 0) {
      ctx.fillStyle = '#66ffff'
      ctx.fillRect(x - 1, y - 1, player.size + 2, player.size + 2)
    }
    if (player.arcaneOverloadActive) {
      ctx.strokeStyle = '#ff44ff'
      ctx.lineWidth = 1
      ctx.strokeRect(x - 1, y - 1, player.size + 2, player.size + 2)
    }
  }

  _drawHUD(ctx, engine) {
    this._drawBar(ctx, 2,   2, 60, 4, engine.player.hp   / engine.player.maxHp,   COLORS.HP_BAR,   COLORS.HP_BG)
    this._drawBar(ctx, 2,   8, 60, 4, engine.player.mana / engine.player.maxMana, COLORS.MANA_BAR, COLORS.MANA_BG)
    this._drawBar(ctx, 258, 2, 60, 4, engine.bot.hp      / engine.bot.maxHp,      COLORS.HP_BAR,   COLORS.HP_BG)
    this._drawBar(ctx, 258, 8, 60, 4, engine.bot.mana    / engine.bot.maxMana,    COLORS.MANA_BAR, COLORS.MANA_BG)
  }

  _drawProjectile(ctx, proj) {
    ctx.fillStyle = proj.color
    const x = Math.round(proj.position.x - proj.size.w / 2)
    const y = Math.round(proj.position.y - proj.size.h / 2)
    ctx.fillRect(x, y, proj.size.w, proj.size.h)
  }

  _drawAoEZone(ctx, zone) {
    ctx.fillStyle = zone.color
    const r = zone.radius
    ctx.fillRect(Math.round(zone.position.x - r), Math.round(zone.position.y - r), r * 2, r * 2)
  }

  _drawMeteorWarning(ctx, m) {
    const progress = 1 - (m.delay / m.totalDelay)
    const r = Math.round(m.radius * progress)
    if (r < 1) return
    ctx.strokeStyle = m.color
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(m.x - r), Math.round(m.y - r), r * 2, r * 2)
    if (progress > 0.75) {
      ctx.fillStyle = `rgba(255,68,0,${(progress - 0.75) * 2})`
      ctx.fillRect(Math.round(m.x - r), Math.round(m.y - r), r * 2, r * 2)
    }
  }

  _drawArcaneBeam(ctx, engine) {
    if (!engine.arcaneBeamActive || !engine.arcaneBeamDir) return
    const range = 150
    const x1 = engine.player.position.x
    const y1 = engine.player.position.y
    const angle = Math.atan2(engine.arcaneBeamDir.y, engine.arcaneBeamDir.x)
    ctx.save()
    ctx.translate(Math.round(x1), Math.round(y1))
    ctx.rotate(angle)
    ctx.fillStyle = '#aa44ff'
    ctx.fillRect(0, -1, range, 2)
    ctx.restore()
  }

  _drawDeck(ctx, engine) {
    const SLOT  = 14
    const GAP   = 2
    const SLOTS = 8
    const totalW = SLOTS * SLOT + (SLOTS - 1) * GAP
    const startX = Math.floor((RESOLUTION_W - totalW) / 2)
    const y = RESOLUTION_H - SLOT - 2

    for (let i = 0; i < SLOTS; i++) {
      const x     = startX + i * (SLOT + GAP)
      const spell = engine.player.deck[i]

      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(x, y, SLOT, SLOT)

      if (spell) {
        ctx.fillStyle = spell.definition.color
        ctx.fillRect(x + 1, y + 1, SLOT - 2, SLOT - 2)

        const cd    = engine.player.cooldowns[spell.definition.id] ?? 0
        const total = spell.computedCooldown
        if (cd > 0 && total > 0) {
          const ratio = cd / total
          ctx.fillStyle = 'rgba(0,0,0,0.75)'
          ctx.fillRect(x + 1, y + 1, SLOT - 2, Math.round((SLOT - 2) * ratio))
        }

        if (engine.player.pendingCast?.spell === spell) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1)
        }

        if (engine.player.spellEchoActive) {
          ctx.strokeStyle = '#ff88ff'
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1)
        }
      }
    }
  }

  _drawBar(ctx, x, y, w, h, ratio, fill, bg) {
    ctx.fillStyle = bg
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = fill
    ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, ratio))), h)
  }
}
