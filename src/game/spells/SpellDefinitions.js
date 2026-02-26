export const FIREBALL = {
  id: 'fireball',
  name: 'Fireball',
  baseDamage: 20,
  manaCost: 15,
  castTime: 0.3,
  cooldown: 0,
  behaviorType: 'projectile',
  projectileSpeed: 150,
  projectileSize: 5,
  projectileLifetime: 3,
  color: '#ff6600',
  isUltimate: false,
  tags: ['projectile', 'damage'],
}

export const ARCANE_BURST = {
  id: 'arcane_burst',
  name: 'Arcane Burst',
  baseDamage: 12,
  manaCost: 20,
  castTime: 0.2,
  cooldown: 2,
  behaviorType: 'projectile',
  projectileSpeed: 200,
  projectileSize: 3,
  projectileLifetime: 3,
  color: '#ffff00',
  isUltimate: false,
  tags: ['projectile', 'damage'],
  projectileCount: 3,
  spreadAngle: 15,
}

export const ICE_SHARD = {
  id: 'ice_shard',
  name: 'Ice Shard',
  baseDamage: 15,
  manaCost: 12,
  castTime: 0.2,
  cooldown: 0,
  behaviorType: 'projectile',
  projectileSpeed: 220,
  projectileSize: 4,
  projectileLifetime: 3,
  color: '#00ffff',
  isUltimate: false,
  tags: ['projectile', 'damage'],
  slowDuration: 1.5,
  slowFactor: 0.15,
}

export const BLOOD_LANCE = {
  id: 'blood_lance',
  name: 'Blood Lance',
  baseDamage: 40,
  manaCost: 0,
  hpCost: 5,
  castTime: 0.4,
  cooldown: 2,
  behaviorType: 'projectile',
  projectileSpeed: 180,
  projectileSize: 3,
  projectileSizeH: 7,
  projectileLifetime: 3,
  color: '#8b0000',
  isUltimate: false,
  tags: ['projectile', 'damage'],
}

export const GROUND_FLAME = {
  id: 'ground_flame',
  name: 'Ground Flame',
  baseDamage: 5,
  manaCost: 25,
  castTime: 0,
  cooldown: 3,
  behaviorType: 'aoe',
  aoeRadius: 20,
  aoeDuration: 3,
  aoeTickRate: 0.5,
  color: '#ff2200',
  isUltimate: false,
  tags: ['aoe', 'damage'],
}

export const DASH = {
  id: 'dash',
  name: 'Dash',
  baseDamage: 0,
  manaCost: 15,
  castTime: 0,
  cooldown: 3,
  behaviorType: 'dash',
  dashDistance: 50,
  dashDuration: 0.15,
  color: '#aaaaff',
  isUltimate: false,
  tags: ['dash', 'mobility'],
}

export const BLINK_STRIKE = {
  id: 'blink_strike',
  name: 'Blink Strike',
  baseDamage: 25,
  manaCost: 30,
  castTime: 0,
  cooldown: 4,
  behaviorType: 'dash',
  blinkMaxRange: 80,
  aoeRadius: 20,
  color: '#ffffff',
  isUltimate: false,
  tags: ['dash', 'damage', 'mobility'],
}

export const PHASE_WALK = {
  id: 'phase_walk',
  name: 'Phase Walk',
  baseDamage: 0,
  manaCost: 20,
  castTime: 0,
  cooldown: 5,
  behaviorType: 'buff',
  speedBoost: 0.5,
  duration: 3,
  color: '#66ffff',
  isUltimate: false,
  tags: ['buff', 'mobility'],
}

export const HEALING_PULSE = {
  id: 'healing_pulse',
  name: 'Healing Pulse',
  baseDamage: 0,
  manaCost: 30,
  castTime: 0.3,
  cooldown: 4,
  behaviorType: 'instant',
  healAmount: 25,
  color: '#00ff88',
  isUltimate: false,
  tags: ['instant', 'heal'],
}

export const MANA_SURGE = {
  id: 'mana_surge',
  name: 'Mana Surge',
  baseDamage: 0,
  manaCost: 0,
  castTime: 0.2,
  cooldown: 5,
  behaviorType: 'instant',
  manaRestore: 40,
  color: '#4444ff',
  isUltimate: false,
  tags: ['instant', 'utility'],
}

// TODO: Add a second cast animation to show the echo
export const SPELL_ECHO = {
  id: 'spell_echo',
  name: 'Spell Echo',
  baseDamage: 0,
  manaCost: 20,
  castTime: 0.1,
  cooldown: 6,
  behaviorType: 'buff',
  color: '#ff88ff',
  isUltimate: false,
  tags: ['buff', 'utility'],
}

export const ARCANE_BEAM = {
  id: 'arcane_beam',
  name: 'Arcane Beam',
  baseDamage: 0,
  manaCost: 0,
  castTime: 0,
  cooldown: 0,
  behaviorType: 'buff',
  beamDamagePerSecond: 12,
  beamManaCostPerSecond: 8,
  beamMaxRange: 150,
  color: '#aa44ff',
  isUltimate: false,
  tags: ['buff', 'damage'],
}

// ── Ultimates ────────────────────────────────────────────────────────────────

export const METEOR = {
  id: 'meteor',
  name: 'Meteor',
  baseDamage: 60,
  manaCost: 60,
  castTime: 0,
  cooldown: 15,
  behaviorType: 'aoe',
  aoeRadius: 40,
  meteorDelay: 1.5,     // seconds before impact
  color: '#ff4400',
  isUltimate: true,
  tags: ['aoe', 'damage'],
}

export const ARCANE_OVERLOAD = {
  id: 'arcane_overload',
  name: 'Arcane Overload',
  baseDamage: 0,
  manaCost: 50,
  castTime: 0,
  cooldown: 12,
  behaviorType: 'buff',
  damageBonus: 0.5,     // +50% all spell damage
  duration: 5,
  color: '#ff44ff',
  isUltimate: true,
  tags: ['buff'],
}

export const TEMPORAL_RESET = {
  id: 'temporal_reset',
  name: 'Temporal Reset',
  baseDamage: 0,
  manaCost: 40,
  castTime: 0.2,
  cooldown: 15,
  behaviorType: 'instant',
  color: '#88ffff',
  isUltimate: true,
  tags: ['instant', 'utility'],
}
