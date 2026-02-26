export class IdleState {
  constructor(player) {
    this.player = player
    this.name = 'idle'
  }

  enter() {
    this.player.velocity.x = 0
    this.player.velocity.y = 0
  }

  update(_dt) {
    // Idle: enforce zero velocity every frame
    this.player.velocity.x = 0
    this.player.velocity.y = 0
  }

  exit() {}
}
