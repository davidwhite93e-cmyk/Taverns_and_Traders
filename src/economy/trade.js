import { getPrice, roundPrice } from './market.js';

const BUY_PRICE_IMPACT = 0.01;
const SELL_PRICE_IMPACT = 0.01;

export function cargoTotal(cargo) {
  return Object.values(cargo).reduce((sum, qty) => sum + qty, 0);
}

export function buyGood({ market, player, vessel }, cityId, goodId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer');
  }
  const price = getPrice(market, cityId, goodId);
  const cost = roundPrice(price * quantity);
  const projectedLoad = cargoTotal(player.cargo) + quantity;
  if (projectedLoad > vessel.cargoCapacity) {
    throw new Error('Not enough cargo space');
  }
  if (player.gold < cost) {
    throw new Error('Not enough gold');
  }

  player.gold = roundPrice(player.gold - cost);
  player.cargo[goodId] = (player.cargo[goodId] || 0) + quantity;
  market[cityId][goodId] = roundPrice(price * (1 + BUY_PRICE_IMPACT * quantity));

  return cost;
}

export function sellGood({ market, player }, cityId, goodId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer');
  }
  const owned = player.cargo[goodId] || 0;
  if (owned < quantity) {
    throw new Error('Not enough goods in cargo to sell');
  }
  const price = getPrice(market, cityId, goodId);
  const revenue = roundPrice(price * quantity);

  player.gold = roundPrice(player.gold + revenue);
  const remaining = owned - quantity;
  if (remaining > 0) {
    player.cargo[goodId] = remaining;
  } else {
    delete player.cargo[goodId];
  }
  market[cityId][goodId] = roundPrice(price * (1 - SELL_PRICE_IMPACT * quantity));

  return revenue;
}
