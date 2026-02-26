import { AIM_ASSIST_RADIUS } from '../config/constants.js'

export function computeAimDirection(from, cursor, target) {
  let aimX = cursor.x - from.x
  let aimY = cursor.y - from.y

  if (target) {
    const dx = cursor.x - target.x
    const dy = cursor.y - target.y
    const distToTarget = Math.sqrt(dx * dx + dy * dy)
    if (distToTarget <= AIM_ASSIST_RADIUS) {
      aimX = target.x - from.x
      aimY = target.y - from.y
    }
  }

  const len = Math.sqrt(aimX * aimX + aimY * aimY)
  if (len === 0) return { x: 1, y: 0 }
  return { x: aimX / len, y: aimY / len }
}
