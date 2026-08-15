import { describe, it, expect } from 'vitest';
import {
  createCombatSession,
  playerAttack,
  castSpell,
  usePotionEffect,
  attemptFlee,
  applyAmbushStrike,
  applyCombatOutcome,
  rollAmbush,
} from '../src/combat/combat.js';
import { getSpell } from '../src/combat/spells.js';
import { createNewGame } from '../src/state/GameState.js';

const noNoise = () => 0.5; // rollDamage's (rng()-0.5) term becomes 0: fully deterministic damage

// rollDamage draws twice per call: once for variance, once for the crit
// check. A queue lets a test pin exactly which draws land as crits.
function queueRng(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function weakEnemy() {
  return { name: 'Training Dummy', tier: 'common', attack: 5, defense: 0, hp: 50, loot: 20, xpReward: 5, currentHp: 50 };
}

describe('combat session', () => {
  it('a lethal attack ends the fight in victory without an enemy retaliation', () => {
    const state = createNewGame('Test', 'human', 'warrior');
    const session = createCombatSession(state, { ...weakEnemy(), hp: 1, currentHp: 1 });
    playerAttack(session, noNoise);
    expect(session.ended).toBe(true);
    expect(session.outcome).toBe('victory');
  });

  it('a non-lethal attack triggers an enemy retaliation', () => {
    const state = createNewGame('Test', 'human', 'warrior');
    const session = createCombatSession(state, weakEnemy());
    const hpBefore = session.playerHp;
    playerAttack(session, noNoise);
    expect(session.playerHp).toBeLessThan(hpBefore);
    expect(session.ended).toBe(false);
  });

  it('a damage spell adds its bonus damage on top of the base attack', () => {
    const state = createNewGame('Test', 'human', 'mage');
    const session = createCombatSession(state, weakEnemy());
    const spell = getSpell('arcane_bolt');
    const before = session.enemyHp;
    castSpell(session, spell, noNoise);
    const plainAttackSession = createCombatSession(state, weakEnemy());
    playerAttack(plainAttackSession, noNoise);
    const spellDamage = before - session.enemyHp;
    const plainDamage = before - plainAttackSession.enemyHp;
    expect(spellDamage).toBeGreaterThan(plainDamage);
  });

  it('a healing potion restores HP but is capped at max HP', () => {
    const state = createNewGame('Test', 'human', 'warrior');
    const session = createCombatSession(state, weakEnemy());
    session.playerHp = session.playerMaxHp - 5;
    usePotionEffect(session, { type: 'heal', magnitude: 999 }, noNoise);
    expect(session.playerHp).toBeLessThanOrEqual(session.playerMaxHp);
  });

  it('a guaranteed flee (from the utility spell) always succeeds', () => {
    const state = createNewGame('Test', 'human', 'mage');
    const session = createCombatSession(state, weakEnemy());
    session.guaranteedFlee = true;
    attemptFlee(session, () => 0.999); // rng that would normally fail a 50/50 roll
    expect(session.outcome).toBe('fled');
    expect(session.ended).toBe(true);
  });

  it('an ambush strike can happen before the player acts', () => {
    const state = createNewGame('Test', 'human', 'warrior');
    const session = createCombatSession(state, weakEnemy());
    const hpBefore = session.playerHp;
    applyAmbushStrike(session, noNoise);
    expect(session.playerHp).toBeLessThan(hpBefore);
    expect(session.round).toBe(0); // ambush strike is not a player round
  });
});

describe('critical hits', () => {
  it('a crit deals more damage than a non-crit with identical variance', () => {
    const state = createNewGame('Test', 'human', 'warrior');

    const critSession = createCombatSession(state, weakEnemy());
    playerAttack(critSession, queueRng([0.5, 0.01, 0.5, 0.99])); // player crits (0.01 < 0.15 chance), enemy doesn't
    const critDamage = critSession.log[0].amount;
    expect(critSession.log[0].isCrit).toBe(true);

    const plainSession = createCombatSession(state, weakEnemy());
    playerAttack(plainSession, queueRng([0.5, 0.99, 0.5, 0.99])); // neither side crits
    const plainDamage = plainSession.log[0].amount;
    expect(plainSession.log[0].isCrit).toBe(false);

    expect(critDamage).toBeGreaterThan(plainDamage);
  });
});

describe('structured combat log', () => {
  it('records actor/type/amount/isCrit/text and running HP snapshots on every entry', () => {
    const state = createNewGame('Test', 'human', 'warrior');
    const session = createCombatSession(state, weakEnemy());
    playerAttack(session, queueRng([0.5, 0.99, 0.5, 0.99])); // non-lethal: player hit + enemy retaliation

    expect(session.log).toHaveLength(2);

    const [playerEntry, enemyEntry] = session.log;
    expect(playerEntry).toMatchObject({ actor: 'player', type: 'attack', isCrit: false });
    expect(playerEntry.amount).toBeGreaterThan(0);
    expect(typeof playerEntry.text).toBe('string');
    expect(playerEntry.text.length).toBeGreaterThan(0);
    expect(playerEntry.enemyHpAfter).toBe(session.enemy.hp - playerEntry.amount);
    expect(playerEntry.playerHpAfter).toBe(session.playerMaxHp); // unchanged by the player's own swing

    expect(enemyEntry).toMatchObject({ actor: 'enemy', type: 'attack', isCrit: false });
    expect(enemyEntry.amount).toBeGreaterThan(0);
    expect(enemyEntry.playerHpAfter).toBe(session.playerMaxHp - enemyEntry.amount);
    expect(enemyEntry.enemyHpAfter).toBe(playerEntry.enemyHpAfter); // unchanged by the enemy's own swing

    // final session state matches the last entry's snapshot
    expect(session.playerHp).toBe(enemyEntry.playerHpAfter);
    expect(session.enemyHp).toBe(enemyEntry.enemyHpAfter);
  });

  it('a heal entry records the actual amount restored, capped at max HP', () => {
    const state = createNewGame('Test', 'human', 'warrior');
    const session = createCombatSession(state, weakEnemy());
    session.playerHp = session.playerMaxHp - 5;
    usePotionEffect(session, { type: 'heal', magnitude: 999 }, queueRng([0.5, 0.99]));
    const healEntry = session.log[0];
    expect(healEntry.type).toBe('heal');
    expect(healEntry.amount).toBe(5); // only the missing 5 HP, not the full 999 magnitude
  });
});

describe('ambush odds', () => {
  it('perfect ambush avoidance means an ambush never triggers', () => {
    for (let i = 0; i < 50; i++) {
      expect(rollAmbush(1, Math.random)).toBe(false);
    }
  });
});

describe('applyCombatOutcome', () => {
  it('victory grants loot gold and XP', () => {
    const state = createNewGame('Test', 'human', 'warrior');
    const goldBefore = state.player.gold;
    const xpBefore = state.player.xp;
    const session = { outcome: 'victory', enemy: { loot: 50, xpReward: 15 }, playerHp: 20 };
    applyCombatOutcome(state, session);
    expect(state.player.gold).toBe(goldBefore + 50);
    expect(state.player.xp).toBe(xpBefore + 15);
  });

  it('defeat costs a fraction of current gold and never drops below zero', () => {
    const state = createNewGame('Test', 'human', 'warrior');
    state.player.gold = 100;
    const session = { outcome: 'defeat', enemy: { loot: 0, xpReward: 0 }, playerHp: 1 };
    applyCombatOutcome(state, session);
    expect(state.player.gold).toBe(80); // 20% penalty
    expect(state.player.gold).toBeGreaterThanOrEqual(0);
  });
});
