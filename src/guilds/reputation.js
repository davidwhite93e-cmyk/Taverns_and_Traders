import guildsData from '../data/guilds.json';

const MIN_REPUTATION = -100;
const MAX_REPUTATION = 100;

export function loadGuilds() {
  return guildsData;
}

export function getGuild(guildId) {
  const guild = guildsData.find((g) => g.id === guildId);
  if (!guild) throw new Error(`Unknown guild: ${guildId}`);
  return guild;
}

/** raceReputationStart is the {guildId: bonus} bonus map from the chosen race, if any. */
export function createInitialReputation(raceReputationStart = {}) {
  const reputation = {};
  for (const guild of guildsData) {
    const base = guild.startingReputation + (raceReputationStart[guild.id] || 0);
    reputation[guild.id] = clampReputation(base);
  }
  return reputation;
}

export function clampReputation(value) {
  return Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, value));
}

export function getReputation(state, guildId) {
  return state.reputation[guildId] ?? 0;
}

export function adjustReputation(state, guildId, delta) {
  const next = clampReputation(getReputation(state, guildId) + delta);
  state.reputation[guildId] = next;
  return next;
}
