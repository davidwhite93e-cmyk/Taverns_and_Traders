const NODE_RADIUS = 10;
const REGION_COLORS = {
  verdant_reach: '#5c8a4a',
  ashen_steppe: '#b06a3a',
  saltmere_coast: '#3a7ca5',
  ironspire_highlands: '#7a6a5f',
  fenlands: '#4a7a6a',
};

export function drawWorldMap(ctx, canvas, { cities, routes, currentCityId, reachableCityIds = [] }) {
  ctx.save();
  ctx.fillStyle = '#12161c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cityById = Object.fromEntries(cities.map((c) => [c.id, c]));

  ctx.strokeStyle = 'rgba(200, 200, 200, 0.25)';
  ctx.lineWidth = 1.5;
  for (const route of routes) {
    const from = cityById[route.from];
    const to = cityById[route.to];
    if (!from || !to) continue;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  for (const city of cities) {
    const isCurrent = city.id === currentCityId;
    const isReachable = reachableCityIds.includes(city.id);
    ctx.beginPath();
    ctx.arc(city.x, city.y, isCurrent ? NODE_RADIUS + 3 : NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = REGION_COLORS[city.region] || '#888';
    ctx.globalAlpha = isReachable || isCurrent ? 1 : 0.45;
    ctx.fill();
    ctx.lineWidth = isCurrent ? 3 : 1;
    ctx.strokeStyle = isCurrent ? '#f4d35e' : 'rgba(255,255,255,0.5)';
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#e8e8e8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(city.name, city.x, city.y - NODE_RADIUS - 6);
  }

  ctx.restore();
}

export function hitTestCity(cities, x, y) {
  return cities.find((city) => {
    const dx = city.x - x;
    const dy = city.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS + 4;
  });
}
