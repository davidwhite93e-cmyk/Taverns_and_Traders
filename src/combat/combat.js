const ENCOUNTER_TYPES = [
  { id: 'steppe_bandits', name: 'Steppe Bandits', attack: 8, defense: 4, hp: 30, loot: 40 },
  { id: 'fen_raiders', name: 'Fen Raiders', attack: 10, defense: 3, hp: 26, loot: 35 },
  { id: 'rival_caravan', name: 'Rival Caravan Guard', attack: 12, defense: 8, hp: 45, loot: 70 },
];

const MAX_ROUNDS = 50;
const DAMAGE_VARIANCE = 4;
const FLEE_CHANCE = 0.5;
const DEFEAT_GOLD_PENALTY = 0.2;

export function createEncounter(rng = Math.random) {
  const template = ENCOUNTER_TYPES[Math.floor(rng() * ENCOUNTER_TYPES.length)];
  return { ...template, currentHp: template.hp };
}

export function playerCombatStats(state) {
  const { combat } = state.player;
  return {
    attack: combat.baseAttack + combat.escorts * 3,
    defense: combat.baseDefense + combat.escorts * 1,
    hp: combat.hp,
    maxHp: combat.maxHp,
  };
}

function rollDamage(attack, defense, rng) {
  return Math.max(1, Math.round(attack - defense * 0.5 + (rng() - 0.5) * DAMAGE_VARIANCE));
}

/** Simple auto-resolve turn-based combat: player and enemy trade blows until one reaches 0 HP. */
export function resolveCombat(player, enemy, rng = Math.random) {
  let playerHp = player.hp;
  let enemyHp = enemy.hp;
  const log = [];
  let round = 0;

  while (playerHp > 0 && enemyHp > 0 && round < MAX_ROUNDS) {
    round += 1;

    const playerDamage = rollDamage(player.attack, enemy.defense, rng);
    enemyHp = Math.max(0, enemyHp - playerDamage);
    log.push({ round, actor: 'player', damage: playerDamage, enemyHp, playerHp });
    if (enemyHp <= 0) break;

    const enemyDamage = rollDamage(enemy.attack, player.defense, rng);
    playerHp = Math.max(0, playerHp - enemyDamage);
    log.push({ round, actor: 'enemy', damage: enemyDamage, enemyHp, playerHp });
  }

  return {
    outcome: playerHp <= 0 ? 'defeat' : 'victory',
    rounds: round,
    log,
    playerHpRemaining: playerHp,
    enemyHpRemaining: enemyHp,
  };
}

export function attemptFlee(rng = Math.random) {
  return rng() < FLEE_CHANCE;
}

export function applyCombatOutcome(state, encounter, result) {
  state.player.combat.hp = Math.max(1, result.playerHpRemaining || 1);
  if (result.outcome === 'victory') {
    state.player.gold += encounter.loot;
  } else {
    const penalty = Math.round(state.player.gold * DEFEAT_GOLD_PENALTY);
    state.player.gold = Math.max(0, state.player.gold - penalty);
  }
  return state;
}
