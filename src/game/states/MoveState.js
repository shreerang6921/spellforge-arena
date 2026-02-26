import { PLAYER } from '../../config/constants.js'

export class MoveState {
  constructor(player) {
    this.player = player
    this.name = 'move'
  }

  enter() {}

  update(_dt) {
    const speed = PLAYER.SPEED * this.player.speedMultiplier
    const input = this.player.input

    let vx = 0
    let vy = 0

    if (input.up)    vy -= 1
    if (input.down)  vy += 1
    if (input.left)  vx -= 1
    if (input.right) vx += 1

    // Normalize diagonal movement
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
