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

export function isVesselUnlocked(vessel, ownedVesselIds) {
  return vessel.requiresAnyOf.length === 0 || vessel.requiresAnyOf.some((id) => ownedVesselIds.includes(id));
}

export function vesselCost(vessel, armoredVesselDiscount = 0) {
  const armoredTiers = ['covered_wagon', 'armored_wagon', 'land_ship'];
  const discount = armoredTiers.includes(vessel.id) ? armoredVesselDiscount : 0;
  return Math.round(vessel.cost * (1 - discount));
}

export function purchaseVessel(state, vesselId) {
  const vessel = getVessel(vesselId);
  const ownedVesselIds = state.player.ownedVesselIds || [state.player.vesselId];

  if (vessel.id === state.player.vesselId) {
    throw new Error('Already own this vessel');
  }
  if (!isVesselUnlocked(vessel, ownedVesselIds)) {
    throw new Error('This vessel is not yet available to you');
  }
  const cost = vesselCost(vessel, state.player.armoredVesselDiscount || 0);
  if (state.player.gold < cost) {
    throw new Error('Not enough gold for this vessel');
  }

  state.player.gold -= cost;
  state.player.vesselId = vessel.id;
  state.player.ownedVesselIds = [...new Set([...ownedVesselIds, vessel.id])];
  return vessel;
}
