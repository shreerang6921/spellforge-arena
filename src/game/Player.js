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

    this.speedMultiplier = 1.0   // modified by buffs (Phase Walk etc.)

    this.deck = []
    this.cooldowns = {}

    this.color = color
    this.isBot = isBot

    this.attackCooldown = 0

    // Input state (set externally by InputHandler or BotAI)
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false,
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

    // Determine state from input
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
  }

  _applyMovement(dt) {
    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt
    this._clampToBounds()
  }

  _clampToBounds() {
    const half = this.size / 2
    // Keep physics in float; rounding happens at render time
    this.position.x = Math.max(ARENA.LEFT + half, Math.min(ARENA.RIGHT  - half, this.position.x))
    this.position.y = Math.max(ARENA.TOP  + half, Math.min(ARENA.BOTTOM - half, this.position.y))
  }

  _regenMana(dt) {
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt)
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

  castSpell(slotIndex) {
    if (this.isDead) return false
    const spell = this.deck[slotIndex]
    if (!spell) return false
    if (this.mana < spell.computedCost) return false
    const id = spell.definition.id
    if ((this.cooldowns[id] ?? 0) > 0) return false

    this.mana -= spell.computedCost
    this.cooldowns[id] = spell.computedCooldown
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
