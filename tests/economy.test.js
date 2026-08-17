import { describe, it, expect, beforeEach } from 'vitest';
import { createMarket, driftMarket, getPrice, targetPrice, cityPriceModifier } from '../src/economy/market.js';
import { buyGood, sellGood, cargoTotal } from '../src/economy/trade.js';
import { loadGoods, findGood } from '../src/economy/goods.js';
import citiesData from '../src/data/cities.json';

const cities = citiesData;
const goods = loadGoods();

describe('market pricing', () => {
  it('discounts goods a city produces', () => {
    const millhaven = cities.find((c) => c.id === 'millhaven');
    const grain = findGood('grain');
    expect(cityPriceModifier(millhaven, 'grain')).toBeCloseTo(0.6);
    expect(targetPrice(millhaven, grain)).toBeCloseTo(grain.basePrice * 0.6, 2);
  });

  it('marks up goods a city demands', () => {
    const millhaven = cities.find((c) => c.id === 'millhaven');
    const ironOre = findGood('iron_ore');
    expect(cityPriceModifier(millhaven, 'iron_ore')).toBeCloseTo(1.6);
    expect(targetPrice(millhaven, ironOre)).toBeCloseTo(ironOre.basePrice * 1.6, 2);
  });

  it('leaves neutral goods at base price', () => {
    const millhaven = cities.find((c) => c.id === 'millhaven');
    // millhaven neither produces nor demands amber_resin
    expect(cityPriceModifier(millhaven, 'amber_resin')).toBe(1);
  });

  it('creates a full market grid for every city/good pair', () => {
    const market = createMarket(cities, goods);
    for (const city of cities) {
      for (const good of goods) {
        expect(getPrice(market, city.id, good.id)).toBeGreaterThan(0);
      }
    }
  });

  it('drift is deterministic given a fixed rng and never goes below 1', () => {
    const market = createMarket(cities, goods);
    const rng = () => 0.5; // no noise, no shocks (0.5 >= SHOCK_CHANCE)
    const before = getPrice(market, 'millhaven', 'grain');
    driftMarket(market, cities, goods, rng);
    const after = getPrice(market, 'millhaven', 'grain');
    // with rng always 0.5, noise term is 0 and price should hold at target (already at target)
    expect(after).toBeCloseTo(before, 2);
    expect(after).toBeGreaterThanOrEqual(1);
  });

  it('drift pulls a displaced price back toward its target over repeated ticks', () => {
    const market = createMarket(cities, goods);
    const rng = () => 0.5; // neutral rng: no noise, no shocks
    market.millhaven.grain = 100; // displace far from target
    const target = targetPrice(
      cities.find((c) => c.id === 'millhaven'),
      findGood('grain')
    );
    for (let i = 0; i < 100; i++) {
      driftMarket(market, cities, goods, rng);
    }
    expect(Math.abs(market.millhaven.grain - target)).toBeLessThan(1);
  });
});

describe('trading math', () => {
  let state;

  beforeEach(() => {
    state = {
      market: createMarket(cities, goods),
      player: { gold: 100, cargo: {} },
      vessel: { cargoCapacity: 10 },
    };
  });

  it('charges price times quantity when buying and reduces gold', () => {
    const price = getPrice(state.market, 'millhaven', 'grain');
    const cost = buyGood(state, 'millhaven', 'grain', 4);
    expect(cost).toBeCloseTo(price * 4, 2);
    expect(state.player.gold).toBeCloseTo(100 - cost, 2);
    expect(state.player.cargo.grain).toBe(4);
  });

  it('pays price times quantity when selling and increases gold', () => {
    buyGood(state, 'millhaven', 'grain', 4);
    const goldAfterBuy = state.player.gold;
    const price = getPrice(state.market, 'millhaven', 'grain');
    const revenue = sellGood(state, 'millhaven', 'grain', 4);
    expect(revenue).toBeCloseTo(price * 4, 2);
    expect(state.player.gold).toBeCloseTo(goldAfterBuy + revenue, 2);
    expect(state.player.cargo.grain).toBeUndefined();
  });

  it('refuses to buy more than cargo capacity allows', () => {
    expect(() => buyGood(state, 'millhaven', 'grain', 999)).toThrow(/cargo space/);
  });

  it('refuses to buy without enough gold', () => {
    state.player.gold = 1;
    expect(() => buyGood(state, 'millhaven', 'amber_resin', 5)).toThrow(/gold/);
  });

  it('refuses to sell goods not held in cargo', () => {
    expect(() => sellGood(state, 'millhaven', 'grain', 1)).toThrow(/cargo/);
  });

  it('nudges price up after buying and down after selling', () => {
    const before = getPrice(state.market, 'millhaven', 'grain');
    buyGood(state, 'millhaven', 'grain', 5);
    const afterBuy = getPrice(state.market, 'millhaven', 'grain');
    expect(afterBuy).toBeGreaterThan(before);

    sellGood(state, 'millhaven', 'grain', 5);
    const afterSell = getPrice(state.market, 'millhaven', 'grain');
    expect(afterSell).toBeLessThan(afterBuy);
  });

  it('tracks total cargo load across multiple goods', () => {
    buyGood(state, 'millhaven', 'grain', 3);
    buyGood(state, 'millhaven', 'tanned_hide', 2);
    expect(cargoTotal(state.player.cargo)).toBe(5);
  });

  it('rejects non-positive or non-integer quantities', () => {
    expect(() => buyGood(state, 'millhaven', 'grain', 0)).toThrow();
    expect(() => buyGood(state, 'millhaven', 'grain', -2)).toThrow();
    expect(() => buyGood(state, 'millhaven', 'grain', 1.5)).toThrow();
  });
});
