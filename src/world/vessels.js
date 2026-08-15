import vesselsData from '../data/vessels.json';

export function loadVessels() {
  return vesselsData;
}

export function getVessel(vesselId) {
  const vessel = vesselsData.find((v) => v.id === vesselId);
  if (!vessel) throw new Error(`Unknown vessel: ${vesselId}`);
  return vessel;
}

export function startingVessel() {
  return vesselsData[0];
}

/** Vessels a player can currently afford and doesn't already own, in catalog order. */
export function availableUpgrades(gold, currentVesselId) {
  return vesselsData.filter((v) => v.id !== currentVesselId && v.cost <= gold);
}

export function purchaseVessel(state, vesselId) {
  const vessel = getVessel(vesselId);
  if (vessel.id === state.player.vesselId) {
    throw new Error('Already own this vessel');
  }
  if (state.player.gold < vessel.cost) {
    throw new Error('Not enough gold for this vessel');
  }
  state.player.gold -= vessel.cost;
  state.player.vesselId = vessel.id;
  return vessel;
}
