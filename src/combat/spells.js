import spellsData from '../data/spells.json';

export function loadSpells() {
  return spellsData;
}

export function getSpell(spellId) {
  const spell = spellsData.find((s) => s.id === spellId);
  if (!spell) throw new Error(`Unknown spell: ${spellId}`);
  return spell;
}
