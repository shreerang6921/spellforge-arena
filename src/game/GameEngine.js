import { RESOLUTION_W, RESOLUTION_H, COLORS, ARENA } from '../config/constants.js'
import { Player } from './Player.js'
import { InputHandler } from './InputHandler.js'
import { Projectile } from './Projectile.js'
import { AoEZone } from './AoEZone.js'
import { runCollision } from './CollisionSystem.js'
import { computeAimDirection } from './AimAssist.js'
import { SpellInstance } from './spells/SpellInstance.js'
import {
  FIREBALL, ICE_SHARD, ARCANE_BURST, BLOOD_LANCE,
  GROUND_FLAME, DASH, BLINK_STRIKE, PHASE_WALK,
  HEALING_PULSE, MANA_SURGE, SPELL_ECHO, ARCANE_BEAM,
  METEOR, ARCANE_OVERLOAD, TEMPORAL_RESET,
} from './spells/SpellDefinitions.js'
import { EMPOWER } from './spells/ModifierDefinitions.js'
import { BotAI } from './BotAI.js'
import { createBotDeck } from '../config/botDeck.js'

// TODO: Add GameEngine integration tests for spell interactions (echo, overload, lifesteal, lingering burn, etc.)
export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    canvas.width = RESOLUTION_W
    canvas.height = RESOLUTION_H

    this.running = false
    this._lastTime = 0
    this._rafId = null

    this.player = null
    this.bot = null
    this.botAI = null
    this.inputHandler = null
    this.projectiles = []
    this.aoeZones = []
    this.pendingMeteors = []  // { x, y, delay, owner, damage, radius }

    this.arcaneBeamActive = false
    this.arcaneBeamDir = null
  }

  init() {
    this.player = new Player({ x: 80, y: 90, color: COLORS.PLAYER1, isBot: false })
    this.bot = new Player({ x: 240, y: 90, color: COLORS.PLAYER2, isBot: true })

    // ── Test deck (Phases 5–7) — replaced by Deck Forge in Phase 10 ──────────
    // Slot 1: Fireball + Empower    → modifier test: +20% dmg = 24
    this.player.deck[0] = new SpellInstance(FIREBALL, [EMPOWER])
    // Slot 2: Ice Shard             → slow on hit (1.5s, 15% speed reduction)
    this.player.deck[1] = new SpellInstance(ICE_SHARD)
    // Slot 3: Arcane Beam           → hold key to channel hitscan beam
    this.player.deck[2] = new SpellInstance(ARCANE_BEAM)
    // Slot 4: Blood Lance           → HP-only cost (5 HP, 0 mana)
    this.player.deck[3] = new SpellInstance(BLOOD_LANCE)
    // Slot 5: Spell Echo            → buff: next spell fires twice (100% + 50%)
    this.player.deck[4] = new SpellInstance(SPELL_ECHO)
    // Slot 6: Temporal Reset (ult)  → wipes all non-ultimate cooldowns instantly
    this.player.deck[5] = new SpellInstance(TEMPORAL_RESET)
    // Slot 7: Phase Walk            → speed buff + cyan tint for 3s
    this.player.deck[6] = new SpellInstance(PHASE_WALK)
    // Slot 8: Meteor (ult)          → 1.5s delay, expanding ring warning, 60 dmg
    this.player.deck[7] = new SpellInstance(METEOR)
    // ─────────────────────────────────────────────────────────────────────────

    // Bot deck + AI (Phase 8)
    this.bot.deck = createBotDeck()
    this.botAI = new BotAI(this.bot, this.player)

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

    // Track current frame's aim direction so we can refresh it at cast completion
    let currentPlayerDir = { x: 1, y: 0 }

    if (this.inputHandler) {
      const dir = computeAimDirection(
        this.player.position,
        this.inputHandler.mouse,
        this.bot.isDead ? null : this.bot.position
      )
      currentPlayerDir = dir

      // Basic attack
      if (this.player.input.attack) {
        const proj = this.player.tryBasicAttack(dir)
        if (proj) this.projectiles.push(proj)
      }

      // Arcane Beam — channeled, handled separately before normal spell slots
      this._handleArcaneBeam(dt)

      // Regular spell slots — skip Arcane Beam slots (handled above)
      if (!this.player.pendingCast) {
        for (let i = 0; i < this.player.input.spellSlots.length; i++) {
          if (this.player.input.spellSlots[i]) {
            const spell = this.player.deck[i]
            if (spell?.definition.id === 'arcane_beam') break
            this.player.castSpell(i, dir)
            break
          }
        }
      }
    }

    // Tick Bot AI (Phase 8)
    if (this.botAI) this.botAI.update(dt)

    // Process completed casts — player first, then bot
    // Refresh player direction to current frame so spells don't use stale cast-start direction
    if (this.player.completedCast) {
      this.player.completedCast.direction = currentPlayerDir
      this._processCompletedCast(this.player.completedCast, this.player)
      this.player.completedCast = null
    }
    if (this.bot.completedCast) {
      this._processCompletedCast(this.bot.completedCast, this.bot)
      this.bot.completedCast = null
    }

    // Update projectiles and AoE zones
    for (const proj of this.projectiles) proj.update(dt)
    for (const zone of this.aoeZones) zone.update(dt, [this.player, this.bot])

    // Tick pending Meteor strikes
    this._tickPendingMeteors(dt)

    // Tick Lingering Burn DoTs
    this._tickActiveBurns(dt)

    // Collision detection (projectiles only — AoE handles its own damage)
    runCollision(this.projectiles, [this.player, this.bot])

    // Cleanup
    this.projectiles = this.projectiles.filter(p => p.active)
    this.aoeZones = this.aoeZones.filter(z => z.active)
  }

  // ─── Spell execution ────────────────────────────────────────────────────────

  _processCompletedCast(completedCast, owner) {
    const { spell, direction } = completedCast
    const def = spell.definition

    // Consume Spell Echo before processing (non-combat spells still consume)
    const wasEchoActive = owner.spellEchoActive
    if (wasEchoActive) owner.spellEchoActive = false

    switch (def.behaviorType) {
      case 'projectile': {
        const projs = this._spawnSpellProjectile(completedCast, owner)
        this.projectiles.push(...projs)
        // Echo: fire again at 50% damage
        if (wasEchoActive) {
          const echo = { definition: def, computedDamage: spell.computedDamage * 0.5 }
          this.projectiles.push(...this._spawnSpellProjectile({ spell: echo, direction }, owner))
        }
        break
      }
      case 'aoe': {
        if (def.meteorDelay) {
          // Meteor: queue a delayed strike — use provided targetPos, else cursor
          const pos = completedCast.targetPos ?? (this.inputHandler ? this.inputHandler.mouse : owner.position)
          const dmg = this._applyOverloadBonus(spell.computedDamage, def, owner)
          this.pendingMeteors.push({
            x: pos.x, y: pos.y,
            delay: def.meteorDelay,
            totalDelay: def.meteorDelay,
            owner,
            damage: dmg,
            radius: def.aoeRadius,
            color: def.color,
          })
        } else {
          this._spawnAoEZone(completedCast, owner)
          if (wasEchoActive) {
            const echo = { definition: def, computedDamage: spell.computedDamage * 0.5 }
            this._spawnAoEZone({ spell: echo, direction }, owner)
          }
        }
        break
      }
      case 'dash': {
        this._executeDash(completedCast, owner)
        break
      }
      case 'buff': {
        this._executeBuff(completedCast, owner)
        break
      }
      case 'instant': {
        this._executeInstant(completedCast, owner)
        // Echo for Healing Pulse (not Mana Surge — it's non-combat per spec)
        if (wasEchoActive && def.healAmount) {
          owner.heal(Math.floor(def.healAmount * 0.5))
        }
        break
      }
    }
  }

  _spawnSpellProjectile(completedCast, owner) {
    const { spell, direction } = completedCast
    const def = spell.definition
    if (def.behaviorType !== 'projectile') return []

    const baseDmg = this._applyOverloadBonus(spell.computedDamage, def, owner)

    // Build onHit callback: slow + lifesteal + lingeringBurn all chain together
    const buildOnHit = (damage) => {
      const fns = []
      if (def.slowDuration) {
        fns.push((target) => target.applySlowEffect(def.slowDuration))
      }
      if (spell.lifesteal > 0) {
        const healAmt = Math.floor(damage * spell.lifesteal)
        fns.push(() => { if (healAmt > 0) owner.heal(healAmt) })
      }
      if (spell.lingeringBurn) {
        const burn = spell.lingeringBurn
        fns.push((target) => {
          // Apply DoT as a series of timed damage ticks via a pending burn list
          this._activeBurns = this._activeBurns || []
          this._activeBurns.push({
            target, owner,
            dps: burn.damagePerSecond,
            remaining: burn.duration,
          })
        })
      }
      return fns.length ? (target) => fns.forEach(fn => fn(target)) : null
    }

    // Determine fire pattern: Split modifier overrides base projectileCount
    let angleOffsets
    if (spell.splitEnabled) {
      const splitRad = (15 * Math.PI) / 180
      angleOffsets = [-splitRad, splitRad]
    } else {
      const count = def.projectileCount ?? 1
      const spreadRad = ((def.spreadAngle ?? 0) * Math.PI) / 180
      angleOffsets = Array.from({ length: count }, (_, i) => (i - Math.floor(count / 2)) * spreadRad)
    }

    const projectiles = []
    for (const angleOffset of angleOffsets) {
      const cos = Math.cos(angleOffset)
      const sin = Math.sin(angleOffset)
      const vx = direction.x * cos - direction.y * sin
      const vy = direction.x * sin + direction.y * cos
      projectiles.push(new Projectile({
        x: owner.position.x,
        y: owner.position.y,
        vx: vx * def.projectileSpeed,
        vy: vy * def.projectileSpeed,
        damage: baseDmg,
        owner,
        size: def.projectileSize,
        sizeH: def.projectileSizeH,
        type: def.id,
        lifetime: def.projectileLifetime,
        color: def.color,
        onHit: buildOnHit(baseDmg),
      }))
    }

    return projectiles
  }

  _spawnAoEZone(completedCast, owner) {
    const { spell } = completedCast
    const def = spell.definition
    // targetPos (set by BotAI) takes priority; then cursor; then owner position
    const pos = completedCast.targetPos ?? (this.inputHandler ? this.inputHandler.mouse : owner.position)
    const dmg = this._applyOverloadBonus(spell.computedDamage, def, owner)
    const dur = spell.extendedDuration ? (def.aoeDuration ?? 0) * 1.5 : (def.aoeDuration ?? 0)
    this.aoeZones.push(new AoEZone({
      x: pos.x,
      y: pos.y,
      radius: def.aoeRadius,
      damage: dmg,
      tickRate: def.aoeTickRate,
      duration: dur,
      owner,
      color: def.color,
    }))
  }

  _executeDash(completedCast, owner) {
    const { spell, direction } = completedCast
    const def = spell.definition

    if (def.id === 'blink_strike') {
      // Teleport to cursor (capped to blinkMaxRange)
      const mouse = this.inputHandler?.mouse
      let tx = owner.position.x + direction.x * def.blinkMaxRange
      let ty = owner.position.y + direction.y * def.blinkMaxRange

      if (mouse) {
        const dx = mouse.x - owner.position.x
        const dy = mouse.y - owner.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0 && dist < def.blinkMaxRange) {
          tx = mouse.x
          ty = mouse.y
        }
      }

      // Clamp teleport destination to arena
      const half = owner.size / 2
      tx = Math.max(ARENA.LEFT + half, Math.min(ARENA.RIGHT - half, tx))
      ty = Math.max(ARENA.TOP + half, Math.min(ARENA.BOTTOM - half, ty))

      owner.position.x = tx
      owner.position.y = ty

      // AoE damage at landing zone
      const targets = [this.player, this.bot].filter(p => p !== owner && !p.isDead)
      for (const target of targets) {
        const dx = target.position.x - tx
        const dy = target.position.y - ty
        if (Math.sqrt(dx * dx + dy * dy) < def.aoeRadius + target.size / 2) {
          target.takeDamage(spell.computedDamage)
        }
      }
    } else {
      // Regular Dash: move at high speed for dashDuration, then stop
      const speed = def.dashDistance / def.dashDuration
      owner.velocity.x = direction.x * speed
      owner.velocity.y = direction.y * speed
      owner.startDash(def.dashDuration)
    }
  }

  _executeBuff(completedCast, owner) {
    const { spell } = completedCast
    const def = spell.definition

    if (def.id === 'phase_walk') {
      owner.applyPhaseWalk(def.duration)
    } else if (def.id === 'spell_echo') {
      owner.spellEchoActive = true
    } else if (def.id === 'arcane_overload') {
      owner.applyArcaneOverload(def.duration)
    }
    // arcane_beam is handled separately via _handleArcaneBeam
  }

  _executeInstant(completedCast, owner) {
    const { spell } = completedCast
    const def = spell.definition

    if (def.healAmount) {
      owner.heal(def.healAmount)
    }
    if (def.manaRestore) {
      owner.mana = Math.min(owner.maxMana, owner.mana + def.manaRestore)
    }
    if (def.id === 'temporal_reset') {
      // Reset all non-ultimate spell cooldowns to 0
      for (const id in owner.cooldowns) {
        const deckinst = owner.deck.find(s => s?.definition.id === id)
        if (deckinst && !deckinst.definition.isUltimate) {
          owner.cooldowns[id] = 0
        }
      }
    }
  }

  // Applies Arcane Overload +50% damage bonus when the buff is active
  // Only boosts spells tagged with 'damage'
  _applyOverloadBonus(baseDamage, def, owner) {
    if (owner.arcaneOverloadActive && def.tags?.includes('damage') && baseDamage > 0) {
      return Math.round(baseDamage * 1.5)
    }
    return baseDamage
  }

  // Ticks pending Meteor strikes; spawns AoE at impact
  _tickPendingMeteors(dt) {
    for (const m of this.pendingMeteors) {
      m.delay -= dt
      if (m.delay <= 0) {
        m.done = true
        // Impact: immediate full-damage AoE
        const targets = [this.player, this.bot].filter(p => p !== m.owner && !p.isDead)
        for (const target of targets) {
          const dx = target.position.x - m.x
          const dy = target.position.y - m.y
          if (Math.sqrt(dx * dx + dy * dy) < m.radius + target.size / 2) {
            target.takeDamage(m.damage)
          }
        }
      }
    }
    this.pendingMeteors = this.pendingMeteors.filter(m => !m.done)
  }

  _tickActiveBurns(dt) {
    if (!this._activeBurns || this._activeBurns.length === 0) return
    for (const burn of this._activeBurns) {
      if (burn.target.isDead) { burn.remaining = 0; continue }
      burn.remaining -= dt
      if (burn.remaining > 0) {
        burn.target.takeDamage(burn.dps * dt)
      }
    }
    this._activeBurns = this._activeBurns.filter(b => b.remaining > 0)
  }

  _handleArcaneBeam(dt) {
    for (let i = 0; i < this.player.deck.length; i++) {
      const spell = this.player.deck[i]
      if (!spell || spell.definition.id !== 'arcane_beam') continue

      const keyHeld = this.player.input.spellSlots[i]
      const def = spell.definition
      const canChannel = keyHeld && !this.player.isDead && !this.player.pendingCast && this.player.mana > 0

      if (canChannel) {
        // Raw cursor direction — no aim assist for the beam
        const mouse = this.inputHandler.mouse
        const rawDx = mouse.x - this.player.position.x
        const rawDy = mouse.y - this.player.position.y
        const rawLen = Math.sqrt(rawDx * rawDx + rawDy * rawDy)
        const beamDir = rawLen > 0 ? { x: rawDx / rawLen, y: rawDy / rawLen } : { x: 1, y: 0 }

        this.player.mana = Math.max(0, this.player.mana - def.beamManaCostPerSecond * dt)
        this.player.setState('cast')
        this.arcaneBeamActive = true
        this.arcaneBeamDir = beamDir

        // Hitscan: damage bot if within range and in beam direction
        if (!this.bot.isDead) {
          const dx = this.bot.position.x - this.player.position.x
          const dy = this.bot.position.y - this.player.position.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const dot = dx * beamDir.x + dy * beamDir.y
          if (dist <= def.beamMaxRange && dot > 0) {
            this.bot.takeDamage(def.beamDamagePerSecond * dt)
          }
        }
      } else if (this.arcaneBeamActive) {
        // Key released or conditions lost — stop beam
        this.arcaneBeamActive = false
        this.arcaneBeamDir = null
        if (this.player.stateMachine.name === 'cast') {
          this.player.setState('idle')
        }
      }
      break
    }
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  render(ctx) {
    this._drawArena(ctx)
    for (const zone of this.aoeZones) this._drawAoEZone(ctx, zone)
    for (const m of this.pendingMeteors) this._drawMeteorWarning(ctx, m)
    this._drawPlayer(ctx, this.player)
    this._drawPlayer(ctx, this.bot)
    for (const proj of this.projectiles) this._drawProjectile(ctx, proj)
    this._drawArcaneBeam(ctx)
    this._drawHUD(ctx)
    this._drawDeck(ctx)
  }

  _drawArena(ctx) {
    ctx.fillStyle = COLORS.ARENA_BG
    ctx.fillRect(0, 0, RESOLUTION_W, RESOLUTION_H)

    ctx.strokeStyle = COLORS.ARENA_BORDER
    ctx.lineWidth = 1
    ctx.strokeRect(
      ARENA.LEFT,
      ARENA.TOP,
      ARENA.RIGHT - ARENA.LEFT,
      ARENA.BOTTOM - ARENA.TOP
    )
  }

  _drawPlayer(ctx, player) {
    const half = player.size / 2
    const x = Math.round(player.position.x - half)
    const y = Math.round(player.position.y - half)

    ctx.fillStyle = player.isDead ? '#555' : player.color
    ctx.fillRect(x, y, player.size, player.size)

    // Phase Walk tint (semi-transparent cyan overlay)
    if (player.phaseWalkTimer > 0) {
      ctx.fillStyle = '#66ffff'
      ctx.fillRect(x - 1, y - 1, player.size + 2, player.size + 2)
    }

    // Arcane Overload glow (magenta outline)
    if (player.arcaneOverloadActive) {
      ctx.strokeStyle = '#ff44ff'
      ctx.lineWidth = 1
      ctx.strokeRect(x - 1, y - 1, player.size + 2, player.size + 2)
    }
  }

  _drawHUD(ctx) {
    this._drawBar(ctx, 2, 2, 60, 4, this.player.hp / this.player.maxHp, COLORS.HP_BAR, COLORS.HP_BG)
    this._drawBar(ctx, 2, 8, 60, 4, this.player.mana / this.player.maxMana, COLORS.MANA_BAR, COLORS.MANA_BG)
    this._drawBar(ctx, 258, 2, 60, 4, this.bot.hp / this.bot.maxHp, COLORS.HP_BAR, COLORS.HP_BG)
    this._drawBar(ctx, 258, 8, 60, 4, this.bot.mana / this.bot.maxMana, COLORS.MANA_BAR, COLORS.MANA_BG)
  }

  _drawProjectile(ctx, proj) {
    ctx.fillStyle = proj.color
    const x = Math.round(proj.position.x - proj.size.w / 2)
    const y = Math.round(proj.position.y - proj.size.h / 2)
    ctx.fillRect(x, y, proj.size.w, proj.size.h)
  }

  _drawAoEZone(ctx, zone) {
    ctx.fillStyle = zone.color
    // Draw as a square (programmer art); arc requires ctx.arc which may not exist in tests
    const r = zone.radius
    ctx.fillRect(
      Math.round(zone.position.x - r),
      Math.round(zone.position.y - r),
      r * 2,
      r * 2
    )
  }

  _drawMeteorWarning(ctx, m) {
    // Draw an expanding ring that fills to full radius as the meteor falls
    const progress = 1 - (m.delay / m.totalDelay)   // 0 → 1 as delay counts down
    const r = Math.round(m.radius * progress)
    if (r < 1) return
    ctx.strokeStyle = m.color
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(m.x - r), Math.round(m.y - r), r * 2, r * 2)
    // Inner flash as it's about to hit
    if (progress > 0.75) {
      ctx.fillStyle = `rgba(255,68,0,${(progress - 0.75) * 2})`
      ctx.fillRect(Math.round(m.x - r), Math.round(m.y - r), r * 2, r * 2)
    }
  }

  _drawArcaneBeam(ctx) {
    if (!this.arcaneBeamActive || !this.arcaneBeamDir) return
    // Draw beam as a narrow rect — avoids ctx.beginPath/lineTo which aren't mocked in tests
    const range = 150
    const x1 = this.player.position.x
    const y1 = this.player.position.y
    const x2 = x1 + this.arcaneBeamDir.x * range
    const y2 = y1 + this.arcaneBeamDir.y * range
    // Simple thin horizontal/vertical rect approximation using fillRect
    const midX = Math.round((x1 + x2) / 2)
    const midY = Math.round((y1 + y2) / 2)
    const len = Math.round(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2))
    ctx.fillStyle = '#aa44ff'
    ctx.fillRect(Math.round(x1), Math.round(y1), Math.max(len, 1), 2)
    void midX; void midY  // suppress unused warning
  }

  _drawDeck(ctx) {
    const SLOT = 14
    const GAP = 2
    const SLOTS = 8
    const totalW = SLOTS * SLOT + (SLOTS - 1) * GAP
    const startX = Math.floor((RESOLUTION_W - totalW) / 2)
    const y = RESOLUTION_H - SLOT - 2

    for (let i = 0; i < SLOTS; i++) {
      const x = startX + i * (SLOT + GAP)
      const spell = this.player.deck[i]

      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(x, y, SLOT, SLOT)

      if (spell) {
        ctx.fillStyle = spell.definition.color
        ctx.fillRect(x + 1, y + 1, SLOT - 2, SLOT - 2)

        const cd = this.player.cooldowns[spell.definition.id] ?? 0
        const total = spell.computedCooldown
        if (cd > 0 && total > 0) {
          const ratio = cd / total
          ctx.fillStyle = 'rgba(0,0,0,0.75)'
          ctx.fillRect(x + 1, y + 1, SLOT - 2, Math.round((SLOT - 2) * ratio))
        }

        if (this.player.pendingCast?.spell === spell) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1)
        }

        // Spell Echo indicator (glowing border)
        if (this.player.spellEchoActive) {
          ctx.strokeStyle = '#ff88ff'
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1)
        }
      }

      ctx.fillStyle = spell ? '#fff' : '#555'
      ctx.font = '5px monospace'
      ctx.fillText(String(i + 1), x + 1, y + 5)
    }

    // Tooltip for hovered slot — drawn last so it appears on top
    const mouse = this.inputHandler?.mouse
    if (mouse) {
      for (let i = 0; i < SLOTS; i++) {
        const sx = startX + i * (SLOT + GAP)
        if (mouse.x < sx || mouse.x >= sx + SLOT) continue
        if (mouse.y < y || mouse.y >= y + SLOT) continue
        const spell = this.player.deck[i]
        if (!spell) break

        const name = spell.definition.name
        ctx.font = '5px monospace'
        // measureText may not exist in test environments — fall back to char-width estimate
        const charW = ctx.measureText ? ctx.measureText(name).width : name.length * 3.5
        const PAD = 2
        const boxW = Math.ceil(charW) + PAD * 2
        const boxH = 9   // 5px font + top/bottom padding

        // Center above the slot, clamped so it never overflows the canvas
        let tx = sx + Math.floor((SLOT - boxW) / 2)
        tx = Math.max(0, Math.min(RESOLUTION_W - boxW, tx))
        const ty = y - boxH - 2

        ctx.fillStyle = '#111111'
        ctx.fillRect(tx, ty, boxW, boxH)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(name, tx + PAD, ty + boxH - PAD)
        break
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
