import endingsData from '../data/endings.json';
import { getReputation } from './reputation.js';

export const WEALTH_THRESHOLD = 1000;
export const REPUTATION_THRESHOLD = 50;
export const RUIN_THRESHOLD = 200;

export function loadEndings() {
  return endingsData;
}

export function getEnding(endingId) {
  const ending = endingsData.find((e) => e.id === endingId);
  if (!ending) throw new Error(`Unknown ending: ${endingId}`);
  return ending;
}

/** Determine which ending a run resolves to from final gold + faction standing. */
export function computeEndingId(state) {
  const gold = state.player.gold;
  const concordRep = getReputation(state, 'concord');
  const freeCaravansRep = getReputation(state, 'free_caravans');

  if (gold < RUIN_THRESHOLD) {
    return 'ruined_wanderer';
  }
  if (gold >= WEALTH_THRESHOLD && concordRep >= REPUTATION_THRESHOLD && concordRep > freeCaravansRep) {
    return 'concord_magnate';
  }
  if (gold >= WEALTH_THRESHOLD && freeCaravansRep >= REPUTATION_THRESHOLD && freeCaravansRep > concordRep) {
    return 'free_caravan_legend';
  }
  if (gold >= WEALTH_THRESHOLD) {
    return 'independent_wayfarer';
  }
  return 'ruined_wanderer';
}

export function computeEnding(state) {
  return getEnding(computeEndingId(state));
}
