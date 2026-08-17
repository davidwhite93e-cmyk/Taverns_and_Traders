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
  ctx.fillStyle = '#1c130c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cityById = Object.fromEntries(cities.map((c) => [c.id, c]));

  ctx.strokeStyle = 'rgba(216, 199, 154, 0.3)';
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
    ctx.strokeStyle = isCurrent ? '#a8791f' : 'rgba(216, 199, 154, 0.6)';
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ecdfc0';
    ctx.font = '12px Georgia, serif';
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

/** Total length of a polyline through the given {x,y} waypoints, and each segment's length. */
export function pathSegments(waypoints) {
  const segmentLengths = [];
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dy = waypoints[i + 1].y - waypoints[i].y;
    const length = Math.hypot(dx, dy);
    segmentLengths.push(length);
    total += length;
  }
  return { segmentLengths, total };
}

/**
 * Position (and facing) at fraction `t` (0..1) along a polyline, walked by
 * arc length so travel speed reads as constant across segments of very
 * different length.
 */
export function pointAlongPath(waypoints, segmentLengths, total, t) {
  if (waypoints.length === 1 || total === 0) {
    const only = waypoints[0];
    return { x: only.x, y: only.y, facingLeft: false };
  }
  let remaining = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segmentLengths.length; i++) {
    const length = segmentLengths[i];
    if (remaining <= length || i === segmentLengths.length - 1) {
      const segmentT = length === 0 ? 0 : Math.min(1, remaining / length);
      const from = waypoints[i];
      const to = waypoints[i + 1];
      return {
        x: from.x + (to.x - from.x) * segmentT,
        y: from.y + (to.y - from.y) * segmentT,
        facingLeft: to.x < from.x,
      };
    }
    remaining -= length;
  }
  const last = waypoints[waypoints.length - 1];
  return { x: last.x, y: last.y, facingLeft: false };
}
