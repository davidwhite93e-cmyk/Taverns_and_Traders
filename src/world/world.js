import citiesData from '../data/cities.json';
import routesData from '../data/routes.json';

export function loadCities() {
  return citiesData;
}

export function loadRoutes() {
  return routesData;
}

export function getCity(cityId) {
  const city = citiesData.find((c) => c.id === cityId);
  if (!city) throw new Error(`Unknown city: ${cityId}`);
  return city;
}

export function getRoutesFrom(cityId) {
  return routesData.filter((r) => r.from === cityId || r.to === cityId);
}

function neighborOf(route, cityId) {
  return route.from === cityId ? route.to : route.from;
}

/**
 * Dijkstra shortest path over the route graph, restricted to route types the
 * given vessel is allowed to travel. Returns { path: [cityId...], distance }
 * or null if no eligible route exists.
 */
export function findPath(fromId, toId, allowedRouteTypes) {
  if (fromId === toId) return { path: [fromId], distance: 0 };

  const distances = new Map([[fromId, 0]]);
  const previous = new Map();
  const visited = new Set();
  const queue = new Set([fromId]);

  while (queue.size > 0) {
    let current = null;
    let currentDist = Infinity;
    for (const cityId of queue) {
      const d = distances.get(cityId) ?? Infinity;
      if (d < currentDist) {
        currentDist = d;
        current = cityId;
      }
    }
    if (current === null) break;
    queue.delete(current);
    visited.add(current);

    if (current === toId) break;

    for (const route of getRoutesFrom(current)) {
      if (!allowedRouteTypes.includes(route.type)) continue;
      const neighbor = neighborOf(route, current);
      if (visited.has(neighbor)) continue;
      const candidate = currentDist + route.distance;
      if (candidate < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, candidate);
        previous.set(neighbor, current);
        queue.add(neighbor);
      }
    }
  }

  if (!distances.has(toId)) return null;

  const path = [toId];
  let cursor = toId;
  while (cursor !== fromId) {
    cursor = previous.get(cursor);
    path.unshift(cursor);
  }
  return { path, distance: distances.get(toId) };
}

export function travelTimeDays(distance, vesselSpeed) {
  return Math.max(1, Math.ceil(distance / vesselSpeed));
}
