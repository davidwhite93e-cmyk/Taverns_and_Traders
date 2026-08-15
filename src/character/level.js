const XP_BASE = 40;
const XP_EXPONENT = 1.6;
const HP_PER_LEVEL = 12;

/** Cumulative XP required to reach a given level (level 1 = 0 XP). */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(XP_BASE * Math.pow(level - 1, XP_EXPONENT));
}

export function levelForXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
}

/**
 * Adds XP to the player, updates their level, and grows/refills max HP to
 * match (bosses are tuned assuming a leveled-up character, so HP has to
 * scale with level or late-game fights become unwinnable regardless of
 * gear). Returns true if they leveled up.
 */
export function addXp(state, amount) {
  state.player.xp += amount;
  const newLevel = levelForXp(state.player.xp);
  const leveledUp = newLevel > state.player.level;
  if (leveledUp) {
    const levelsGained = newLevel - state.player.level;
    state.player.combat.maxHp += levelsGained * HP_PER_LEVEL;
    state.player.combat.hp = state.player.combat.maxHp;
  }
  state.player.level = newLevel;
  return leveledUp;
}
