const MIN_PRICE = 1;
const PRODUCER_MODIFIER = 0.6;
const CONSUMER_MODIFIER = 1.6;
const REVERSION_RATE = 0.08;
const NOISE_SCALE = 0.15;
const SHOCK_CHANCE = 0.03;

export function roundPrice(price) {
  return Math.max(MIN_PRICE, Math.round(price * 100) / 100);
}

export function cityPriceModifier(city, goodId) {
  if (city.produces.includes(goodId)) return PRODUCER_MODIFIER;
  if (city.demands.includes(goodId)) return CONSUMER_MODIFIER;
  return 1;
}

export function targetPrice(city, good) {
  return roundPrice(good.basePrice * cityPriceModifier(city, good.id));
}

export function createMarket(cities, goods) {
  const market = {};
  for (const city of cities) {
    market[city.id] = {};
    for (const good of goods) {
      market[city.id][good.id] = targetPrice(city, good);
    }
  }
  return market;
}

export function getPrice(market, cityId, goodId) {
  const cityPrices = market[cityId];
  if (!cityPrices || !(goodId in cityPrices)) {
    throw new Error(`No price for good "${goodId}" in city "${cityId}"`);
  }
  return cityPrices[goodId];
}

/**
 * Mean-reverting random walk with an occasional shock. `rng` is injectable
 * (defaults to Math.random) so price drift stays deterministic in tests.
 */
export function driftMarket(market, cities, goods, rng = Math.random) {
  for (const city of cities) {
    for (const good of goods) {
      const target = targetPrice(city, good);
      const current = getPrice(market, city.id, good.id);
      const reversion = (target - current) * REVERSION_RATE;
      const noise = (rng() - 0.5) * 2 * good.volatility * target * NOISE_SCALE;
      let next = current + reversion + noise;
      if (rng() < SHOCK_CHANCE) {
        next *= rng() < 0.5 ? 0.7 : 1.4;
      }
      market[city.id][good.id] = roundPrice(next);
    }
  }
  return market;
}
