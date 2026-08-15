import { loadCities } from '../world/world.js';
import { startingVessel } from '../world/vessels.js';
import { loadGoods } from '../economy/goods.js';
import { createMarket } from '../economy/market.js';
import { createInitialReputation } from '../factions/reputation.js';

const SAVE_KEY = 'wayfarers-ledger-save';
const STARTING_GOLD = 150;

export function createNewGame(playerName) {
  const cities = loadCities();
  const goods = loadGoods();
  const startCity = cities.find((c) => c.isStartCity) || cities[0];

  return {
    player: {
      name: playerName || 'Wayfarer',
      gold: STARTING_GOLD,
      cargo: {},
      vesselId: startingVessel().id,
      combat: { baseAttack: 6, baseDefense: 4, hp: 30, maxHp: 30, escorts: 0 },
    },
    currentCityId: startCity.id,
    daysElapsed: 0,
    market: createMarket(cities, goods),
    reputation: createInitialReputation(),
    completedQuests: [],
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
