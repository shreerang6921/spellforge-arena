import { PLAYER, ARENA, BASIC_ATTACK } from '../config/constants.js'
import { StateMachine } from './StateMachine.js'
import { IdleState } from './states/IdleState.js'
import { MoveState } from './states/MoveState.js'
import { CastState } from './states/CastState.js'
import { DashState } from './states/DashState.js'
import { DeadState } from './states/DeadState.js'
import { Projectile } from './Projectile.js'

export class Player {
  constructor({ x, y, color, isBot = false }) {
    this.position = { x, y }
    this.velocity = { x: 0, y: 0 }

    this.hp = PLAYER.MAX_HP
    this.maxHp = PLAYER.MAX_HP
    this.mana = PLAYER.MAX_MANA
    this.maxMana = PLAYER.MAX_MANA
    this.manaRegen = PLAYER.MANA_REGEN
    this.size = PLAYER.SIZE

    this.speedMultiplier = 1.0   // combined multiplier from all active effects
    this.slowTimer = 0           // remaining duration of slow effect
    this.phaseWalkTimer = 0      // remaining duration of Phase Walk buff
    this.dashTimer = 0           // remaining duration of Dash movement
    this.arcaneOverloadTimer = 0 // remaining duration of Arcane Overload buff

    this.spellEchoActive = false // true when Spell Echo buff is active

    this.deck = []
    this.cooldowns = {}

    this.color = color
    this.isBot = isBot

    this.attackCooldown = 0
    this.pendingCast = null    // { spell, direction, timeRemaining }
    this.completedCast = null  // { spell, direction } — consumed by GameEngine each frame

    // Input state (set externally by InputHandler or BotAI)
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false,
      spellSlots: [false, false, false, false, false, false, false, false],
    }

    // State machine
    this.stateMachine = new StateMachine()
    this.states = {
      idle: new IdleState(this),
      move: new MoveState(this),
      cast: new CastState(this),
      dash: new DashState(this),
      dead: new DeadState(this),
    }
    this.stateMachine.setState(this.states.idle)
  }

  get isDead() {
    return this.stateMachine.name === 'dead'
  }

  setState(name) {
    const state = this.states[name]
    if (!state) throw new Error(`Unknown state: ${name}`)
    this.stateMachine.setState(state)
  }

  update(dt) {
    if (this.isDead) return

    this.completedCast = null     // clear previous frame's completed cast
    this._tickPendingCast(dt)     // may resolve pendingCast → sets completedCast

    // Tick dash timer; exit DashState when it expires
    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt)
      if (this.dashTimer === 0) {
        this.setState('idle')
      }
    }

    // Determine state from input (skip if in cast/dash/dead)
    const moving = this.input.up || this.input.down || this.input.left || this.input.right
    const currentName = this.stateMachine.name

    if (currentName !== 'cast' && currentName !== 'dash' && currentName !== 'dead') {
      if (moving) {
        this.stateMachine.setState(this.states.move)
      } else {
        this.stateMachine.setState(this.states.idle)
      }
    }

    this.stateMachine.update(dt)
    this._applyMovement(dt)
    this._regenMana(dt)
    this._tickCooldowns(dt)
    this._tickStatusEffects(dt)
  }

  _applyMovement(dt) {
    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt
    this._clampToBounds()
  }

  _clampToBounds() {
    const half = this.size / 2
    // Keep physics in float; rounding happens at render time
    this.position.x = Math.max(ARENA.LEFT + half, Math.min(ARENA.RIGHT - half, this.position.x))
    this.position.y = Math.max(ARENA.TOP + half, Math.min(ARENA.BOTTOM - half, this.position.y))
  }

  _regenMana(dt) {
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt)
  }

  _tickPendingCast(dt) {
    if (!this.pendingCast) return
    this.pendingCast.timeRemaining -= dt
    if (this.pendingCast.timeRemaining <= 0) {
      this.completedCast = {
        spell: this.pendingCast.spell,
        direction: this.pendingCast.direction,
        targetPos: this.pendingCast.targetPos ?? null,
      }
      this.pendingCast = null
      this.setState('idle')
    }
  }

  _tickCooldowns(dt) {
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt)
    }
    for (const id in this.cooldowns) {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt)
      }
    }
  }

  _tickStatusEffects(dt) {
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt)
    }
    if (this.phaseWalkTimer > 0) {
      this.phaseWalkTimer = Math.max(0, this.phaseWalkTimer - dt)
    }
    if (this.arcaneOverloadTimer > 0) {
      this.arcaneOverloadTimer = Math.max(0, this.arcaneOverloadTimer - dt)
    }
    this._recomputeSpeedMultiplier()
  }

  _recomputeSpeedMultiplier() {
    let mult = 1.0
    if (this.phaseWalkTimer > 0) mult *= 1.5
    if (this.slowTimer > 0) mult *= 0.85
    this.speedMultiplier = mult
  }

  // --- Status effect APIs ---

  applySlowEffect(duration) {
    // No stacking — refresh timer
    this.slowTimer = duration
    this._recomputeSpeedMultiplier()
  }

  applyPhaseWalk(duration) {
    this.phaseWalkTimer = duration
    this._recomputeSpeedMultiplier()
  }

  applyArcaneOverload(duration) {
    this.arcaneOverloadTimer = duration
  }

  get arcaneOverloadActive() {
    return this.arcaneOverloadTimer > 0
  }

  startDash(duration) {
    this.dashTimer = duration
    this.setState('dash')
  }

  // --- Spell casting ---

  castSpell(slotIndex, direction = { x: 1, y: 0 }, targetPos = null) {
    if (this.isDead) return false
    if (this.pendingCast) return false
    const spell = this.deck[slotIndex]
    if (!spell) return false
    if (this.mana < spell.computedCost) return false
    const id = spell.definition.id
    if ((this.cooldowns[id] ?? 0) > 0) return false

    // Blood Lance: cannot cast if HP ≤ hpCost
    const hpCost = spell.definition.hpCost ?? 0
    if (hpCost > 0 && this.hp <= hpCost) return false

    this.mana -= spell.computedCost
    this.cooldowns[id] = spell.computedCooldown

    // Deduct HP cost (Blood Lance)
    if (hpCost > 0) {
      this.hp = Math.max(0, this.hp - hpCost)
    }

    if (spell.computedCastTime > 0) {
      this.pendingCast = { spell, direction, targetPos, timeRemaining: spell.computedCastTime }
      this.setState('cast')
    } else {
      this.completedCast = { spell, direction, targetPos }
    }
    return true
  }

  tryBasicAttack(direction) {
    if (this.isDead) return null
    if (this.attackCooldown > 0) return null

    this.attackCooldown = BASIC_ATTACK.COOLDOWN
    return new Projectile({
      x: this.position.x,
      y: this.position.y,
      vx: direction.x * BASIC_ATTACK.SPEED,
      vy: direction.y * BASIC_ATTACK.SPEED,
      damage: BASIC_ATTACK.DAMAGE,
      owner: this,
      size: BASIC_ATTACK.SIZE,
      type: 'basic',
      lifetime: BASIC_ATTACK.LIFETIME,
      color: BASIC_ATTACK.COLOR,
    })
  }

  takeDamage(amount) {
    if (this.isDead) return
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp <= 0) {
      this.hp = 0
      this.stateMachine.setState(this.states.dead)
    }
  }

  heal(amount) {
    if (this.isDead) return
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }
}
