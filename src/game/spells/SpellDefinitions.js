export const FIREBALL = {
  id: 'fireball',
  name: 'Fireball',
  description: 'Lob a slow but powerful fire bolt. 20 dmg, 15 mana, 0.3s cast.',
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
  description: 'Shotgun blast of 3 arcane bolts in a 30° spread. 12 dmg each, 20 mana.',
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
  description: 'Fast icy projectile that slows the target by 85% for 1.5s. 15 dmg, 12 mana.',
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
  description: 'High-damage piercing lance. Costs 5 HP to cast in addition to 10 mana. 40 dmg.',
  baseDamage: 40,
  manaCost: 10,
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
  description: 'Places a burning AoE zone at your feet. 5 dmg every 0.5s for 3s. 25 mana.',
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
  description: 'Quickly dash 50px in your movement direction. 15 mana, 3s cooldown.',
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
  description: 'Teleport to cursor (max 80px) and deal 25 dmg in a 20px AoE on landing. 30 mana.',
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
  description: 'Boost movement speed by 50% for 3 seconds. 20 mana, 5s cooldown.',
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
  description: 'Instantly restore 25 HP. 30 mana, 4s cooldown.',
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
  description: 'Instantly restore 40 mana. Free to cast, 5s cooldown.',
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

// TODO: Add a visual indicator (e.g. glowing border on deck slot) to show Spell Echo buff is active
export const SPELL_ECHO = {
  id: 'spell_echo',
  name: 'Spell Echo',
  description: 'Your next spell fires twice — once at full power, once at 50% damage with no modifiers. 20 mana.',
  baseDamage: 0,
  manaCost: 20,
  castTime: 0.1,
  cooldown: 6,
  behaviorType: 'buff',
  color: '#ff88ff',
  isUltimate: false,
  tags: ['buff', 'utility'],
}

// TODO: Explore whether its a good idea to allow beam follow the cursor
export const ARCANE_BEAM = {
  id: 'arcane_beam',
  name: 'Arcane Beam',
  description: 'Hold to channel a hitscan beam. 12 dmg/s, drains 15 mana/s. Stops when mana runs out.',
  baseDamage: 0,
  manaCost: 0,
  castTime: 0,
  cooldown: 0,
  behaviorType: 'buff',
  beamDamagePerSecond: 12,
  beamManaCostPerSecond: 15,
  beamMaxRange: 150,
  color: '#aa44ff',
  isUltimate: false,
  tags: ['buff', 'damage'],
}

// ── Ultimates ────────────────────────────────────────────────────────────────

export const METEOR = {
  id: 'meteor',
  name: 'Meteor',
  description: 'Call down a massive meteor at cursor position after 1.5s delay. 60 dmg in a 40px AoE. 60 mana.',
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
  description: 'Overcharge your magic — all spells deal +50% damage for 5 seconds. 50 mana.',
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
  description: 'Instantly reset all spell cooldowns to zero. 40 mana.',
  baseDamage: 0,
  manaCost: 40,
  castTime: 0.2,
  cooldown: 15,
  behaviorType: 'instant',
  color: '#88ffff',
  isUltimate: true,
  tags: ['instant', 'utility'],
}
