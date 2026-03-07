import { ARENA, COLORS } from '../config/constants.js'
import { Player } from './Player.js'
import { Projectile } from './Projectile.js'
import { AoEZone } from './AoEZone.js'
import { runCollision } from './CollisionSystem.js'
import { computeAimDirection } from './AimAssist.js'
import { BotAI } from './BotAI.js'
import { createBotDeck } from '../config/botDeck.js'
import { Match } from './Match.js'
import { deckToSpellInstances, DEFAULT_DECK } from '../config/playerDeck.js'

// TODO: Add GameEngine integration tests for spell interactions (echo, overload, lifesteal, lingering burn, etc.)
export class GameEngine {
  constructor() {
    this.player = null
    this.bot = null
    this.botAI = null
    this.inputHandler = null
    this.projectiles = []
    this.aoeZones = []
    this.pendingMeteors = []  // { x, y, delay, owner, damage, radius }

    this.arcaneBeamActive = false
    this.arcaneBeamDir = null

    this.match = null
    this.onMatchOver = null
  }

  init(deck = null, keybindings = null) {
    this.player = new Player({ x: 80, y: 90, color: COLORS.PLAYER1, isBot: false })
    this.bot = new Player({ x: 240, y: 90, color: COLORS.PLAYER2, isBot: true })

    // Player deck: use provided deck, fall back to default if any slot is null/missing
    const instances = deck ?? deckToSpellInstances(DEFAULT_DECK)
    const hasNulls = instances.some(s => s == null)
    if (hasNulls) {
      console.warn('GameEngine.init: deck contains null slots, falling back to DEFAULT_DECK')
      this.player.deck = deckToSpellInstances(DEFAULT_DECK)
    } else {
      this.player.deck = instances
    }

    // Bot deck + AI (Phase 8)
    this.bot.deck = createBotDeck()
    this.botAI = new BotAI(this.bot, this.player)

    this.match = new Match([this.player, this.bot])
  }

  update(dt) {
    // Tick match state (timer + win condition)
    if (this.match) {
      this.match.update(dt)
      if (this.match.matchOver) {
        this.onMatchOver?.(this.match.winner, this.match.matchTimer)
        this.arcaneBeamActive = false
        return
      }
    }

    this.player.update(dt)
    this.bot.update(dt)

    // Track current frame's aim direction so we can refresh it at cast completion
    let currentPlayerDir = { x: 1, y: 0 }

    // Compute aim direction (uses inputHandler.mouse when available, else default right)
    if (this.inputHandler) {
      currentPlayerDir = computeAimDirection(
        this.player.position,
        this.inputHandler.mouse,
        this.bot.isDead ? null : this.bot.position
      )
    }

    // Process player input (works whether inputHandler is set or input is driven directly)
    // Basic attack
    if (this.player.input.attack) {
      const proj = this.player.tryBasicAttack(currentPlayerDir)
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
          this.player.castSpell(i, currentPlayerDir)
          break
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
      angleOffsets = [-splitRad, 0, splitRad]
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

}
