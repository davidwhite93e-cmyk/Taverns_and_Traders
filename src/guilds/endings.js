import endingsData from '../data/endings.json';

export const WEALTH_ENDING_GOLD = 100000;

export function loadEndings() {
  return endingsData;
}

export function getEnding(endingId) {
  const ending = endingsData.find((e) => e.id === endingId);
  if (!ending) throw new Error(`Unknown ending: ${endingId}`);
  return ending;
}

/**
 * Returns the ending id the run has achieved, or null if none yet.
 * A completed guild final commission takes priority (it's a definitive
 * story conclusion); otherwise the wealth threshold is checked.
 */
export function computeEndingId(state) {
  if (state.achievedEnding) return state.achievedEnding;
  if (state.player.gold >= WEALTH_ENDING_GOLD) return 'wealth';
  return null;
}

export function computeEnding(state) {
  const id = computeEndingId(state);
  return id ? getEnding(id) : null;
}
