import racesData from '../data/races.json';

export function loadRaces() {
  return racesData;
}

export function getRace(raceId) {
  const race = racesData.find((r) => r.id === raceId);
  if (!race) throw new Error(`Unknown race: ${raceId}`);
  return race;
}
