import { loadCities } from '../world/world.js';
import { loadGoods } from '../economy/goods.js';
import { createMarket } from '../economy/market.js';
import { createInitialReputation } from '../guilds/reputation.js';
import { buildPlayer, raceReputationStart } from '../character/createCharacter.js';

const SAVE_KEY = 'wayfarers-ledger-save';

export function createNewGame(playerName, raceId, classId) {
  const cities = loadCities();
  const goods = loadGoods();
  const startCity = cities.find((c) => c.isStartCity) || cities[0];

  return {
    player: buildPlayer(playerName, raceId, classId),
    currentCityId: startCity.id,
    daysElapsed: 0,
    market: createMarket(cities, goods),
    reputation: createInitialReputation(raceReputationStart(raceId)),
    completedQuests: [],
    achievedEnding: null,
  };
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasSavedGame() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
}
