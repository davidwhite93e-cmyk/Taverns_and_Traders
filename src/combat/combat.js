import enemiesData from '../data/enemies.json';
import { getVessel } from '../world/vessels.js';
import { addXp } from '../character/level.js';

const DAMAGE_VARIANCE = 4;
const BASE_AMBUSH_CHANCE = 0.4;
const DEFEAT_GOLD_PENALTY = 0.2;

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

function rollDamage(attack, defense, rng) {
  return Math.max(1, Math.round(attack - defense * 0.5 + (rng() - 0.5) * DAMAGE_VARIANCE));
}

function tickBuffs(session) {
  if (session.shieldRoundsRemaining > 0) session.shieldRoundsRemaining -= 1;
  if (session.attackBuffRoundsRemaining > 0) session.attackBuffRoundsRemaining -= 1;
}

function enemyRetaliate(session, rng) {
  const damage = rollDamage(session.enemy.attack, currentPlayerDefense(session), rng);
  session.playerHp = Math.max(0, session.playerHp - damage);
  session.log.push({ actor: 'enemy', text: `${session.enemy.name} hits you for ${damage} damage.` });
  if (session.playerHp <= 0) {
    session.ended = true;
    session.outcome = 'defeat';
  }
}

/** The enemy strikes first, before the player gets a turn. Vessel defense blunts the blow. */
export function applyAmbushStrike(session, rng = Math.random) {
  const damage = rollDamage(session.enemy.attack, currentPlayerDefense(session), rng);
  session.playerHp = Math.max(0, session.playerHp - damage);
  session.log.push({
    actor: 'enemy',
    text: `Ambushed! ${session.enemy.name} strikes first for ${damage} damage.`,
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
  const damage = rollDamage(currentPlayerAttack(session), session.enemy.defense, rng);
  session.enemyHp = Math.max(0, session.enemyHp - damage);
  session.log.push({ actor: 'player', text: `You strike for ${damage} damage.` });
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
    const damage = rollDamage(currentPlayerAttack(session) + spell.effect.bonusDamage, session.enemy.defense, rng);
    session.enemyHp = Math.max(0, session.enemyHp - damage);
    session.log.push({ actor: 'player', text: `You cast ${spell.name}, dealing ${damage} damage.` });
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
    session.log.push({ actor: 'player', text: `You raise ${spell.name}, bracing for the next blows.` });
    enemyRetaliate(session, rng);
    tickBuffs(session);
  } else if (spell.type === 'utility') {
    session.guaranteedFlee = true;
    session.log.push({ actor: 'player', text: `${spell.name} hums around you — your next retreat is certain.` });
  }
  return session;
}

export function usePotionEffect(session, effect, rng = Math.random) {
  if (session.ended) return session;
  if (effect.type === 'heal') {
    session.playerHp = Math.min(session.playerMaxHp, session.playerHp + effect.magnitude);
    session.log.push({ actor: 'player', text: `You drink a healing draught, recovering ${effect.magnitude} HP.` });
  } else if (effect.type === 'combat_buff') {
    session.attackBuffRoundsRemaining = effect.durationRounds;
    session.attackBuffBonus = effect.attackBonus;
    session.log.push({ actor: 'player', text: 'You down a vigor tonic, feeling the strength surge.' });
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
    session.log.push({ actor: 'player', text: 'You break off and flee down the road.' });
  } else {
    session.log.push({ actor: 'player', text: 'You fail to break away!' });
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
