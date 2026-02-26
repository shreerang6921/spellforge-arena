import { PLAYER } from '../../config/constants.js'

export class CastState {
  constructor(player) {
    this.player = player
    this.name = 'cast'
  }

  enter() {}

  update(_dt) {
    // Bots manage velocity via BotAI; don't override it here
    if (this.player.isBot) return

    // 60% speed while casting
    const speed = PLAYER.SPEED * 0.6 * this.player.speedMultiplier
    const input = this.player.input

    let vx = 0
    let vy = 0

    if (input.up)    vy -= 1
    if (input.down)  vy += 1
    if (input.left)  vx -= 1
    if (input.right) vx += 1

    if (vx !== 0 && vy !== 0) {
      const inv = 1 / Math.sqrt(2)
      vx *= inv
      vy *= inv
    }

    this.player.velocity.x = vx * speed
    this.player.velocity.y = vy * speed
  }

  exit() {
    this.player.velocity.x = 0
    this.player.velocity.y = 0
  }
}
