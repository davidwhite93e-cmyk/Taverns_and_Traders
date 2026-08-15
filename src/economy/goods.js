import goodsData from '../data/goods.json';

export function loadGoods() {
  return goodsData;
}

export function findGood(goodId) {
  const good = goodsData.find((g) => g.id === goodId);
  if (!good) throw new Error(`Unknown good: ${goodId}`);
  return good;
}
