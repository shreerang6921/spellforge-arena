export class AoEZone {
  constructor({ x, y, radius, damage, tickRate, duration, owner, color }) {
    this.position = { x, y }
    this.radius   = radius
    this.damage   = damage
    this.tickRate  = tickRate
    this.remaining = duration
    this.owner    = owner
    this.color    = color
    this.tickTimer = tickRate   // first tick fires after one full tickRate
    this.active   = true
  }

  update(dt, players) {
    if (!this.active) return

    this.remaining -= dt
    if (this.remaining <= 0) {
      this.active = false
      return
    }

    this.tickTimer -= dt
    if (this.tickTimer <= 0) {
      this.tickTimer += this.tickRate
      for (const player of players) {
        if (player === this.owner) continue
        if (player.isDead) continue
        const dx = player.position.x - this.position.x
        const dy = player.position.y - this.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < this.radius + player.size / 2) {
          player.takeDamage(this.damage)
        }
      }
    }
  }
}
