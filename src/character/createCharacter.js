import { getRace } from './races.js';
import { getClass } from './classes.js';

const BASE_ATTACK = 6;
const BASE_DEFENSE = 4;
const BASE_MAX_HP = 30;

export function buildPlayer(name, raceId, classId) {
  const race = getRace(raceId);
  const cls = getClass(classId);
  const kit = cls.startingKit;
  const mods = race.modifiers;

  return {
    name: name || 'Wayfarer',
    raceId,
    classId,
    level: 1,
    xp: 0,
    gold: cls.startingGold,
    cargo: {},
    vesselId: 'worn_boots',
    ownedVesselIds: ['worn_boots'],
    combat: {
      baseAttack: BASE_ATTACK + kit.attackBonus + mods.attackBonus,
      baseDefense: BASE_DEFENSE + kit.defenseBonus + mods.defenseBonus,
      hp: BASE_MAX_HP,
      maxHp: BASE_MAX_HP,
      escorts: 0,
      escortEffectiveness: kit.escortEffectiveness,
    },
    speedMultiplier: mods.speedMultiplier * kit.speedMultiplier,
    ambushAvoidance: Math.min(0.6, mods.ambushAvoidance + kit.ambushAvoidance),
    cargoBonus: mods.cargoBonus + kit.cargoBonus,
    tradeDiscount: Math.min(0.35, mods.tradeDiscount + kit.tradeDiscount),
    armoredVesselDiscount: mods.armoredVesselDiscount || 0,
    mana: kit.maxMana,
    maxMana: kit.maxMana,
    spells: [...kit.startingSpells],
  };
}

export function raceReputationStart(raceId) {
  return getRace(raceId).guildReputationStart || {};
}
