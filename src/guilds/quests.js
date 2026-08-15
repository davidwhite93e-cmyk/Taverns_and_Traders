import questsData from '../data/quests.json';
import { getReputation, adjustReputation, getGuild } from './reputation.js';
import { addXp } from '../character/level.js';

export function loadQuests() {
  return questsData;
}

export function getQuest(questId) {
  const quest = questsData.find((q) => q.id === questId);
  if (!quest) throw new Error(`Unknown quest: ${questId}`);
  return quest;
}

const TIER_ORDER = { early: 0, mid: 1, final: 2 };

export function getQuestsForGuild(guildId) {
  return questsData.filter((q) => q.guildId === guildId).sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
}

/** Status of a single quest for the current run: 'completed' | 'available' | 'locked'. */
export function getQuestStatus(state, quest) {
  const completed = state.completedQuests || [];
  if (completed.includes(quest.id)) return 'completed';
  const eligible = getReputation(state, quest.guildId) >= quest.requiredReputation && state.player.level >= quest.requiredLevel;
  return eligible ? 'available' : 'locked';
}

export function getAvailableQuests(state) {
  const completed = state.completedQuests || [];
  return questsData.filter(
    (quest) =>
      !completed.includes(quest.id) &&
      getReputation(state, quest.guildId) >= quest.requiredReputation &&
      state.player.level >= quest.requiredLevel
  );
}

function applyRewards(state, quest) {
  state.player.gold += quest.rewardGold;
  addXp(state, quest.rewardXp);
  adjustReputation(state, quest.guildId, quest.reputationDelta);
  if (quest.rivalReputationDelta) {
    const rivalId = getGuild(quest.guildId).rivalOf;
    if (rivalId) adjustReputation(state, rivalId, quest.rivalReputationDelta);
  }
  state.completedQuests = state.completedQuests || [];
  state.completedQuests.push(quest.id);
}

/** Completes a standard (non-final) quest immediately. */
export function completeQuest(state, questId) {
  const quest = getQuest(questId);
  if (quest.isFinal) {
    throw new Error('Final commissions must be resolved through their boss encounter');
  }
  if ((state.completedQuests || []).includes(questId)) {
    throw new Error('Quest already completed');
  }
  if (getReputation(state, quest.guildId) < quest.requiredReputation || state.player.level < quest.requiredLevel) {
    throw new Error('Not yet eligible for this quest');
  }
  applyRewards(state, quest);
  return quest;
}

/** Called only after the player has defeated the quest's boss in combat. */
export function completeFinalQuest(state, questId) {
  const quest = getQuest(questId);
  if (!quest.isFinal) {
    throw new Error('Not a final commission');
  }
  if ((state.completedQuests || []).includes(questId)) {
    throw new Error('Quest already completed');
  }
  applyRewards(state, quest);
  state.achievedEnding = quest.endingId;
  return quest;
}
