export class SpellInstance {
  constructor(definition, modifiers = []) {
    this.definition = definition
    this.modifiers = modifiers
    // Computed values start equal to base values.
    // Phase 7 will apply modifier adjustments here.
    this.computedDamage   = definition.baseDamage
    this.computedCost     = definition.manaCost
    this.computedCooldown = definition.cooldown
    this.computedCastTime = definition.castTime
  }
}
