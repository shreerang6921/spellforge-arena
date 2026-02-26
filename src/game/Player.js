import { PLAYER, ARENA } from '../config/constants.js'
import { StateMachine } from './StateMachine.js'
import { IdleState } from './states/IdleState.js'
import { MoveState } from './states/MoveState.js'
import { CastState } from './states/CastState.js'
import { DashState } from './states/DashState.js'
import { DeadState } from './states/DeadState.js'

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

    // Input state (set externally by InputHandler or BotAI)
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
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
