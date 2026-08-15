import factionsData from '../data/factions.json';

const MIN_REPUTATION = -100;
const MAX_REPUTATION = 100;

export function loadFactions() {
  return factionsData;
}

export function createInitialReputation() {
  const reputation = {};
  for (const faction of factionsData) {
    if (faction.id === 'unaligned') continue;
    reputation[faction.id] = faction.startingReputation;
  }
  return reputation;
}

export function clampReputation(value) {
  return Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, value));
}

export function getReputation(state, factionId) {
  return state.reputation[factionId] ?? 0;
}

export function adjustReputation(state, factionId, delta) {
  const next = clampReputation(getReputation(state, factionId) + delta);
  state.reputation[factionId] = next;
  return next;
}
