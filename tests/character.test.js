import { describe, it, expect } from 'vitest';
import { xpForLevel, levelForXp, addXp } from '../src/character/level.js';
import { buildPlayer, raceReputationStart } from '../src/character/createCharacter.js';

describe('leveling curve', () => {
  it('requires 0 XP for level 1', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('requires strictly more XP for each subsequent level', () => {
    for (let level = 1; level < 10; level++) {
      expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level));
    }
  });

  it('levelForXp is the inverse of xpForLevel at exact thresholds', () => {
    for (let level = 1; level < 10; level++) {
      expect(levelForXp(xpForLevel(level))).toBe(level);
    }
  });

  it('addXp raises level, grows max HP, and fully heals on level up', () => {
    const state = { player: { xp: 0, level: 1, combat: { maxHp: 30, hp: 10 } } };
    const leveledUp = addXp(state, xpForLevel(2));
    expect(leveledUp).toBe(true);
    expect(state.player.level).toBe(2);
    expect(state.player.combat.maxHp).toBe(42); // +12 HP per level
    expect(state.player.combat.hp).toBe(42); // full heal on level up
  });

  it('addXp does not report a level up or change HP when the threshold is not crossed', () => {
    const state = { player: { xp: 0, level: 1, combat: { maxHp: 30, hp: 10 } } };
    const leveledUp = addXp(state, 1);
    expect(leveledUp).toBe(false);
    expect(state.player.level).toBe(1);
    expect(state.player.combat.maxHp).toBe(30);
    expect(state.player.combat.hp).toBe(10);
  });

  it('handles multi-level jumps from a single large XP reward', () => {
    const state = { player: { xp: 0, level: 1, combat: { maxHp: 30, hp: 10 } } };
    addXp(state, xpForLevel(4));
    expect(state.player.level).toBe(4);
    expect(state.player.combat.maxHp).toBe(30 + 3 * 12);
  });
});

describe('character creation', () => {
  it('applies race and class modifiers to combat stats', () => {
    const dwarfWarrior = buildPlayer('Test', 'dwarf', 'warrior');
    // base 6 + warrior +6 + dwarf +2 = 14 attack; base 4 + warrior +4 + dwarf +4 = 12 defense
    expect(dwarfWarrior.combat.baseAttack).toBe(14);
    expect(dwarfWarrior.combat.baseDefense).toBe(12);
    expect(dwarfWarrior.armoredVesselDiscount).toBeCloseTo(0.15);
  });

  it('gives mages their starting mana and spellbook, and merchants extra starting gold', () => {
    const mage = buildPlayer('Test', 'human', 'mage');
    expect(mage.maxMana).toBeGreaterThan(0);
    expect(mage.spells.length).toBeGreaterThan(0);

    const merchant = buildPlayer('Test', 'human', 'merchant');
    expect(merchant.gold).toBeGreaterThan(mage.gold);
    expect(merchant.tradeDiscount).toBeGreaterThan(0);
  });

  it('starts every character on foot with worn boots as their only owned vessel', () => {
    const player = buildPlayer('Test', 'elf', 'scout');
    expect(player.vesselId).toBe('worn_boots');
    expect(player.ownedVesselIds).toEqual(['worn_boots']);
  });

  it('carries a race\'s starting guild reputation bonuses', () => {
    expect(raceReputationStart('half_orc')).toMatchObject({ enforcers: -10, outlaws: 5, mercenaries: 5 });
    expect(raceReputationStart('human')).toEqual({});
  });
});
