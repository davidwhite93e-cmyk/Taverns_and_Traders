import { describe, it, expect, beforeEach } from 'vitest';
import { getVessel, isVesselUnlocked, vesselCost, purchaseVessel } from '../src/world/vessels.js';
import { createNewGame } from '../src/state/GameState.js';

describe('vessel tree gating', () => {
  it('horse and hand cart both unlock directly from worn boots', () => {
    const owned = ['worn_boots'];
    expect(isVesselUnlocked(getVessel('horse'), owned)).toBe(true);
    expect(isVesselUnlocked(getVessel('hand_cart'), owned)).toBe(true);
  });

  it('horse cart is locked until either horse or hand cart is owned', () => {
    expect(isVesselUnlocked(getVessel('horse_cart'), ['worn_boots'])).toBe(false);
    expect(isVesselUnlocked(getVessel('horse_cart'), ['worn_boots', 'horse'])).toBe(true);
    expect(isVesselUnlocked(getVessel('horse_cart'), ['worn_boots', 'hand_cart'])).toBe(true);
  });

  it('later tiers require the immediately preceding tier', () => {
    expect(isVesselUnlocked(getVessel('land_ship'), ['worn_boots', 'horse', 'horse_cart', 'covered_wagon'])).toBe(
      false
    );
    expect(
      isVesselUnlocked(getVessel('land_ship'), ['worn_boots', 'horse', 'horse_cart', 'covered_wagon', 'armored_wagon'])
    ).toBe(true);
  });
});

describe('vessel cost', () => {
  it('applies the armored-vessel discount only to armored tiers', () => {
    const horseCart = getVessel('horse_cart');
    const armoredWagon = getVessel('armored_wagon');
    expect(vesselCost(horseCart, 0.15)).toBe(horseCart.cost); // not an armored tier, no discount
    expect(vesselCost(armoredWagon, 0.15)).toBe(Math.round(armoredWagon.cost * 0.85));
  });
});

describe('purchaseVessel', () => {
  let state;

  beforeEach(() => {
    state = createNewGame('Test', 'human', 'merchant');
    state.player.gold = 10000;
  });

  it('refuses to buy a vessel whose prerequisite is not yet owned', () => {
    expect(() => purchaseVessel(state, 'horse_cart')).toThrow(/not yet available/);
  });

  it('refuses to buy without enough gold', () => {
    state.player.gold = 1;
    expect(() => purchaseVessel(state, 'horse')).toThrow(/gold/);
  });

  it('updates the current vessel and the owned-vessel history on purchase', () => {
    purchaseVessel(state, 'horse');
    expect(state.player.vesselId).toBe('horse');
    expect(state.player.ownedVesselIds).toEqual(['worn_boots', 'horse']);

    purchaseVessel(state, 'horse_cart');
    expect(state.player.vesselId).toBe('horse_cart');
    expect(state.player.ownedVesselIds).toEqual(['worn_boots', 'horse', 'horse_cart']);
  });
});
