import questsData from '../data/quests.json';
import { getReputation, adjustReputation } from './reputation.js';

export function loadQuests() {
  return questsData;
}

function rivalFactionId(factionId) {
  return factionId === 'concord' ? 'free_caravans' : 'concord';
}

export function getAvailableQuests(state) {
  const completed = state.completedQuests || [];
  return questsData.filter(
    (quest) =>
      !completed.includes(quest.id) && getReputation(state, quest.factionId) >= quest.requiredReputation
  );
}

export function completeQuest(state, questId) {
  const quest = questsData.find((q) => q.id === questId);
  if (!quest) throw new Error(`Unknown quest: ${questId}`);

  state.completedQuests = state.completedQuests || [];
  if (state.completedQuests.includes(questId)) {
    throw new Error('Quest already completed');
  }
  if (getReputation(state, quest.factionId) < quest.requiredReputation) {
    throw new Error('Reputation too low for this quest');
  }

  state.player.gold += quest.rewardGold;
  adjustReputation(state, quest.factionId, quest.reputationDelta);
  if (quest.rivalReputationDelta) {
    adjustReputation(state, rivalFactionId(quest.factionId), quest.rivalReputationDelta);
  }
  state.completedQuests.push(questId);
  return quest;
}
