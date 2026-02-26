export class SpellInstance {
  constructor(definition, modifiers = []) {
    this.definition = definition
    this.modifiers = modifiers

    // Base computed values — modifiers will mutate these
    this.computedDamage = definition.baseDamage
    this.computedCost = definition.manaCost
    this.computedCooldown = definition.cooldown
    this.computedCastTime = definition.castTime

    // Special modifier flags (set by modifier.apply if present)
    this.splitEnabled = false   // Split modifier
    this.lingeringBurn = null    // { damagePerSecond, duration }
    this.lifesteal = 0       // fraction (0–1)
    this.extendedDuration = false   // Extended Duration modifier

    // Apply each modifier in order
    for (const mod of modifiers) {
      mod.apply(this)
    }
  }
}

