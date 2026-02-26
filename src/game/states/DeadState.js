export class DeadState {
  constructor(player) {
    this.player = player
    this.name = 'dead'
  }

  enter() {
    this.player.velocity.x = 0
    this.player.velocity.y = 0
  }

  update(_dt) {
    // Dead players do nothing
  }

  exit() {}
}
