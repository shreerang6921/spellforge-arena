import { RESOLUTION_W, RESOLUTION_H, COLORS, ARENA } from '../config/constants.js'
import { Player } from './Player.js'
import { InputHandler } from './InputHandler.js'

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
  }

  init() {
    this.player = new Player({ x: 80,  y: 90, color: COLORS.PLAYER1, isBot: false })
    this.bot    = new Player({ x: 240, y: 90, color: COLORS.PLAYER2, isBot: true  })

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
  }

  render(ctx) {
    this._drawArena(ctx)
    this._drawPlayer(ctx, this.player)
    this._drawPlayer(ctx, this.bot)
    this._drawHUD(ctx)
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

  _drawBar(ctx, x, y, w, h, ratio, fill, bg) {
    ctx.fillStyle = bg
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = fill
    ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, ratio))), h)
  }
}
