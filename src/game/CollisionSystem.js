import { ARENA } from '../config/constants.js'

export function isColliding(aPos, aSize, bPos, bSize) {
  const ax = aPos.x - aSize.w / 2
  const ay = aPos.y - aSize.h / 2
  const bx = bPos.x - bSize.w / 2
  const by = bPos.y - bSize.h / 2
  return (
    ax < bx + bSize.w &&
    ax + aSize.w > bx &&
    ay < by + bSize.h &&
    ay + aSize.h > by
  )
}

export function isOutOfBounds(proj) {
  return (
    proj.position.x < ARENA.LEFT ||
    proj.position.x > ARENA.RIGHT ||
    proj.position.y < ARENA.TOP ||
    proj.position.y > ARENA.BOTTOM
  )
}

export function runCollision(projectiles, players) {
  for (const proj of projectiles) {
    if (!proj.active) continue

    if (isOutOfBounds(proj)) {
      proj.active = false
      continue
    }

    for (const player of players) {
      if (player === proj.owner) continue
      if (player.isDead) continue

      const playerSize = { w: player.size, h: player.size }
      if (isColliding(proj.position, proj.size, player.position, playerSize)) {
        player.takeDamage(proj.damage)
        if (proj.onHit) proj.onHit(player)
        proj.active = false
        break
      }
    }
  }
}
