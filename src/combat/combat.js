import enemiesData from '../data/enemies.json';
import { getVessel } from '../world/vessels.js';
import { addXp } from '../character/level.js';

const DAMAGE_VARIANCE = 4;
const BASE_AMBUSH_CHANCE = 0.4;
const DEFEAT_GOLD_PENALTY = 0.2;
const CRIT_CHANCE = 0.15;
const CRIT_MULTIPLIER = 1.6;

export function loadEnemies() {
  return enemiesData;
}

function cloneEncounter(template) {
  return { ...template, currentHp: template.hp };
}

export function createEncounter(rng = Math.random) {
  const common = enemiesData.filter((e) => e.tier === 'common');
  const template = common[Math.floor(rng() * common.length)];
  return cloneEncounter(template);
}

export function createBossEncounter(bossId) {
  const template = enemiesData.find((e) => e.id === bossId && e.tier === 'boss');
  if (!template) throw new Error(`Unknown boss: ${bossId}`);
  return cloneEncounter(template);
}

export function playerCombatStats(state) {
  const vessel = getVessel(state.player.vesselId);
  const { combat } = state.player;
  const escortPower = combat.escorts * combat.escortEffectiveness;
  return {
    attack: combat.baseAttack + escortPower * 3,
    defense: combat.baseDefense + escortPower + vessel.defenseRating,
    hp: combat.hp,
    maxHp: combat.maxHp,
  };
}

export function rollAmbush(ambushAvoidance, rng = Math.random) {
  const chance = Math.max(0, BASE_AMBUSH_CHANCE * (1 - ambushAvoidance));
  return rng() < chance;
}

export function createCombatSession(state, enemy) {
  const base = playerCombatStats(state);
  return {
    enemy,
    playerHp: base.hp,
    playerMaxHp: base.maxHp,
    baseAttack: base.attack,
    baseDefense: base.defense,
    enemyHp: enemy.currentHp,
    round: 0,
    log: [],
    shieldRoundsRemaining: 0,
    shieldBonus: 0,
    attackBuffRoundsRemaining: 0,
    attackBuffBonus: 0,
    guaranteedFlee: false,
    ended: false,
    outcome: null,
  };
}

function currentPlayerAttack(session) {
  return session.baseAttack + (session.attackBuffRoundsRemaining > 0 ? session.attackBuffBonus : 0);
}

function currentPlayerDefense(session) {
  return session.baseDefense + (session.shieldRoundsRemaining > 0 ? session.shieldBonus : 0);
}

/** Returns { amount, isCrit }. Crit rolls consume the same rng stream as the damage roll. */
function rollDamage(attack, defense, rng) {
  const base = Math.max(1, Math.round(attack - defense * 0.5 + (rng() - 0.5) * DAMAGE_VARIANCE));
  const isCrit = rng() < CRIT_CHANCE;
  return { amount: isCrit ? Math.round(base * CRIT_MULTIPLIER) : base, isCrit };
}

function tickBuffs(session) {
  if (session.shieldRoundsRemaining > 0) session.shieldRoundsRemaining -= 1;
  if (session.attackBuffRoundsRemaining > 0) session.attackBuffRoundsRemaining -= 1;
}

// Flavor-text variety is purely cosmetic, so it deliberately does NOT draw
// from the seeded `rng` passed into combat functions — that stream stays
// dedicated to damage/crit math so tests can be deterministic.
function pick(options) {
  return options[Math.floor(Math.random() * options.length)];
}

const PLAYER_HIT_LINES = [
  (n) => `You strike true for ${n} damage!`,
  (n) => `Your blade finds an opening for ${n} damage!`,
  (n) => `You drive them back for ${n} damage!`,
];
const PLAYER_CRIT_LINES = [
  (n) => `A perfect strike! ${n} damage!`,
  (n) => `You catch them completely off guard — ${n} damage!`,
];
const ENEMY_HIT_LINES = [
  (name, n) => `${name} strikes you for ${n} damage!`,
  (name, n) => `${name} lands a heavy blow for ${n} damage!`,
  (name, n) => `${name} catches you across the arm for ${n} damage!`,
];
const ENEMY_CRIT_LINES = [
  (name, n) => `${name} finds a gap in your guard — ${n} damage!`,
  (name, n) => `A vicious blow from ${name} — ${n} damage!`,
];

function pushLog(session, entry) {
  session.log.push({ ...entry, playerHpAfter: session.playerHp, enemyHpAfter: session.enemyHp });
}

function logPlayerHit({ session, type, amount, isCrit }) {
  const text = isCrit ? pick(PLAYER_CRIT_LINES)(amount) : pick(PLAYER_HIT_LINES)(amount);
  pushLog(session, { actor: 'player', type, amount, isCrit, text });
}

function enemyRetaliate(session, rng) {
  const { amount, isCrit } = rollDamage(session.enemy.attack, currentPlayerDefense(session), rng);
  session.playerHp = Math.max(0, session.playerHp - amount);
  const text = isCrit ? pick(ENEMY_CRIT_LINES)(session.enemy.name, amount) : pick(ENEMY_HIT_LINES)(session.enemy.name, amount);
  pushLog(session, { actor: 'enemy', type: 'attack', amount, isCrit, text });
  if (session.playerHp <= 0) {
    session.ended = true;
    session.outcome = 'defeat';
  }
}

/** The enemy strikes first, before the player gets a turn. Vessel defense blunts the blow. */
export function applyAmbushStrike(session, rng = Math.random) {
  const { amount, isCrit } = rollDamage(session.enemy.attack, currentPlayerDefense(session), rng);
  session.playerHp = Math.max(0, session.playerHp - amount);
  pushLog(session, {
    actor: 'enemy',
    type: 'ambush',
    amount,
    isCrit,
    text: `Ambushed! ${session.enemy.name} strikes first for ${amount} damage!`,
  });
  if (session.playerHp <= 0) {
    session.ended = true;
    session.outcome = 'defeat';
  }
  return session;
}

export function playerAttack(session, rng = Math.random) {
  if (session.ended) return session;
  session.round += 1;
  const { amount, isCrit } = rollDamage(currentPlayerAttack(session), session.enemy.defense, rng);
  session.enemyHp = Math.max(0, session.enemyHp - amount);
  logPlayerHit({ session, type: 'attack', amount, isCrit });
  if (session.enemyHp <= 0) {
    session.ended = true;
    session.outcome = 'victory';
    return session;
  }
  enemyRetaliate(session, rng);
  tickBuffs(session);
  return session;
}

export function castSpell(session, spell, rng = Math.random) {
  if (session.ended) return session;
  if (spell.type === 'damage') {
    session.round += 1;
    const { amount, isCrit } = rollDamage(currentPlayerAttack(session) + spell.effect.bonusDamage, session.enemy.defense, rng);
    session.enemyHp = Math.max(0, session.enemyHp - amount);
    pushLog(session, {
      actor: 'player',
      type: 'spell',
      amount,
      isCrit,
      text: `${spell.name} tears through them for ${amount} damage!`,
    });
    if (session.enemyHp <= 0) {
      session.ended = true;
      session.outcome = 'victory';
      return session;
    }
    enemyRetaliate(session, rng);
    tickBuffs(session);
  } else if (spell.type === 'shield') {
    session.round += 1;
    session.shieldRoundsRemaining = spell.effect.durationRounds;
    session.shieldBonus = spell.effect.defenseBonus;
    pushLog(session, {
      actor: 'player',
      type: 'shield',
      amount: 0,
      isCrit: false,
      text: `${spell.name} shimmers into place around you!`,
    });
    enemyRetaliate(session, rng);
    tickBuffs(session);
  } else if (spell.type === 'utility') {
    session.guaranteedFlee = true;
    pushLog(session, {
      actor: 'player',
      type: 'buff',
      amount: 0,
      isCrit: false,
      text: `${spell.name} hums around you — your next retreat is certain.`,
    });
  }
  return session;
}

export function usePotionEffect(session, effect, rng = Math.random) {
  if (session.ended) return session;
  if (effect.type === 'heal') {
    const before = session.playerHp;
    session.playerHp = Math.min(session.playerMaxHp, session.playerHp + effect.magnitude);
    const healed = session.playerHp - before;
    pushLog(session, {
      actor: 'player',
      type: 'heal',
      amount: healed,
      isCrit: false,
      text: `You drink deep — ${healed} health restored!`,
    });
  } else if (effect.type === 'combat_buff') {
    session.attackBuffRoundsRemaining = effect.durationRounds;
    session.attackBuffBonus = effect.attackBonus;
    pushLog(session, {
      actor: 'player',
      type: 'buff',
      amount: 0,
      isCrit: false,
      text: 'You down a vigor tonic, feeling the strength surge.',
    });
  }
  session.round += 1;
  enemyRetaliate(session, rng);
  tickBuffs(session);
  return session;
}

export function attemptFlee(session, rng = Math.random) {
  if (session.ended) return session;
  const success = session.guaranteedFlee || rng() < 0.5;
  session.guaranteedFlee = false;
  if (success) {
    session.ended = true;
    session.outcome = 'fled';
    pushLog(session, {
      actor: 'player',
      type: 'flee',
      amount: 0,
      isCrit: false,
      text: 'You break off and put distance behind you!',
    });
  } else {
    pushLog(session, {
      actor: 'player',
      type: 'flee-fail',
      amount: 0,
      isCrit: false,
      text: 'You stumble trying to break away!',
    });
    enemyRetaliate(session, rng);
    tickBuffs(session);
  }
  return session;
}

export function applyCombatOutcome(state, session) {
  state.player.combat.hp = Math.max(1, session.playerHp || 1);
  if (session.outcome === 'victory') {
    state.player.gold += session.enemy.loot;
    addXp(state, session.enemy.xpReward);
  } else if (session.outcome === 'defeat') {
    const penalty = Math.round(state.player.gold * DEFEAT_GOLD_PENALTY);
    state.player.gold = Math.max(0, state.player.gold - penalty);
  }
  return state;
}
