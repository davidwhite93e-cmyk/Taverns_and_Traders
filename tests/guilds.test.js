import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialReputation, getReputation, adjustReputation, clampReputation } from '../src/guilds/reputation.js';
import { completeQuest, completeFinalQuest, getAvailableQuests, getQuestStatus, getQuestsForGuild } from '../src/guilds/quests.js';
import { computeEndingId, WEALTH_ENDING_GOLD } from '../src/guilds/endings.js';
import { createNewGame } from '../src/state/GameState.js';

describe('guild reputation', () => {
  it('starts every guild at 0 with no race bonus', () => {
    const rep = createInitialReputation();
    expect(rep).toEqual({ enforcers: 0, outlaws: 0, mercenaries: 0, arcane_order: 0 });
  });

  it('applies a race reputation bonus at creation', () => {
    const rep = createInitialReputation({ enforcers: -10, outlaws: 5 });
    expect(rep.enforcers).toBe(-10);
    expect(rep.outlaws).toBe(5);
    expect(rep.mercenaries).toBe(0);
  });

  it('clamps reputation to [-100, 100]', () => {
    expect(clampReputation(150)).toBe(100);
    expect(clampReputation(-150)).toBe(-100);
    expect(clampReputation(42)).toBe(42);
  });

  it('adjustReputation clamps in place and returns the new value', () => {
    const state = { reputation: { enforcers: 95 } };
    const result = adjustReputation(state, 'enforcers', 20);
    expect(result).toBe(100);
    expect(getReputation(state, 'enforcers')).toBe(100);
  });
});

describe('quest gating and completion', () => {
  let state;

  beforeEach(() => {
    state = createNewGame('Test', 'human', 'merchant');
  });

  it('early quests are available from the start', () => {
    const available = getAvailableQuests(state);
    expect(available.some((q) => q.id === 'enforcers_road_escort')).toBe(true);
  });

  it('final quests are locked until reputation and level thresholds are met', () => {
    const final = getQuestsForGuild('enforcers').find((q) => q.isFinal);
    expect(getQuestStatus(state, final)).toBe('locked');
  });

  it('completing a quest grants gold, xp, and reputation, and dings the rival guild', () => {
    const before = { gold: state.player.gold, xp: state.player.xp };
    const quest = completeQuest(state, 'enforcers_road_escort');
    expect(state.player.gold).toBe(before.gold + quest.rewardGold);
    expect(state.player.xp).toBe(before.xp + quest.rewardXp);
    expect(getReputation(state, 'enforcers')).toBe(quest.reputationDelta);
    expect(getReputation(state, 'outlaws')).toBe(quest.rivalReputationDelta); // outlaws is enforcers' rivalOf
  });

  it('refuses to complete the same quest twice', () => {
    completeQuest(state, 'enforcers_road_escort');
    expect(() => completeQuest(state, 'enforcers_road_escort')).toThrow(/already completed/);
  });

  it('refuses a final quest through the normal completion path', () => {
    expect(() => completeQuest(state, 'enforcers_final')).toThrow(/boss encounter/);
  });

  it('completeFinalQuest records the achieved ending', () => {
    // bypass the normal reputation/level gate — this only tests reward application post-boss-victory
    const quest = completeFinalQuest(state, 'enforcers_final');
    expect(state.achievedEnding).toBe('enforcers');
    expect(state.completedQuests).toContain(quest.id);
  });
});

describe('ending resolution', () => {
  let state;

  beforeEach(() => {
    state = createNewGame('Test', 'human', 'merchant');
  });

  it('returns null when no ending condition is met', () => {
    expect(computeEndingId(state)).toBeNull();
  });

  it('resolves to the wealth ending once gold crosses the threshold', () => {
    state.player.gold = WEALTH_ENDING_GOLD;
    expect(computeEndingId(state)).toBe('wealth');
  });

  it('a completed guild final commission takes priority over the wealth ending', () => {
    state.player.gold = WEALTH_ENDING_GOLD;
    state.achievedEnding = 'outlaws';
    expect(computeEndingId(state)).toBe('outlaws');
  });
});
