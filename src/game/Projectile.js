export class Projectile {
  constructor({ x, y, vx, vy, damage, owner, size, type, lifetime = 2, color = '#ffffff', onHit = null }) {
    this.position = { x, y }
    this.velocity = { x: vx, y: vy }
    this.damage = damage
    this.owner = owner
    this.size = { w: size, h: size }
    this.type = type
    this.lifetime = lifetime
    this.color = color
    this.onHit = onHit
    this.active = true
  }

  update(dt) {
    if (!this.active) return
    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt
    this.lifetime -= dt
    if (this.lifetime <= 0) {
      this.active = false
    }
  }
}
