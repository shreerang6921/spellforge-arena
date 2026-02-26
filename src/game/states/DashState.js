export class DashState {
  constructor(player) {
    this.player = player
    this.name = 'dash'
  }

  enter() {}

  update(_dt) {
    // Velocity set externally by dash spell logic; player cannot steer during dash
  }

  exit() {
    this.player.velocity.x = 0
    this.player.velocity.y = 0
  }
}
