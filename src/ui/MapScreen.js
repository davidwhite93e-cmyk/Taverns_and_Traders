import { loadCities, loadRoutes, getCity, findPath, travelTimeDays } from '../world/world.js';
import { drawWorldMap, hitTestCity, pathSegments, pointAlongPath } from '../world/map.js';
import { drawVessel } from '../world/vesselSprites.js';
import { getVessel } from '../world/vessels.js';
import { driftMarket } from '../economy/market.js';
import { loadGoods } from '../economy/goods.js';
import { saveGame } from '../state/GameState.js';
import { createEncounter, rollAmbush } from '../combat/combat.js';
import { formatCoin } from './format.js';
import { CityScreen } from './CityScreen.js';
import { InventoryScreen } from './InventoryScreen.js';
import { GuildScreen } from './GuildScreen.js';
import { EndingScreen } from './EndingScreen.js';
import { CombatScreen } from './CombatScreen.js';

const ENCOUNTER_CHANCE_PER_DAY = 0.12;
const TRAVEL_ANIM_BASE_MS = 900;
const TRAVEL_ANIM_PER_HOP_MS = 400;
const TRAVEL_ANIM_MAX_MS = 2600;

const cities = loadCities();
const routes = loadRoutes();
const goods = loadGoods();

function reachableCityIds(state) {
  const vessel = getVessel(state.player.vesselId);
  return cities
    .filter((c) => c.id !== state.currentCityId)
    .filter((c) => findPath(state.currentCityId, c.id, vessel.allowedRouteTypes) !== null)
    .map((c) => c.id);
}

export const MapScreen = {
  mount({ uiRoot, screenManager, context }) {
    context.canvas.style.display = 'block';
    this.screenManager = screenManager;
    this.context = context;
    this.uiRoot = uiRoot;
    this.travel = null;
    this.renderPanel();
  },

  renderPanel() {
    const { uiRoot, context } = this;
    const state = context.state;
    const city = getCity(state.currentCityId);
    const vessel = getVessel(state.player.vesselId);
    const reachable = reachableCityIds(state);

    const cityButtons = reachable
      .map((id) => {
        const target = getCity(id);
        const path = findPath(state.currentCityId, id, vessel.allowedRouteTypes);
        const days = travelTimeDays(path.distance, vessel.speed);
        return `<button data-city="${id}">${target.name} <span class="subtle">(${days}d)</span></button>`;
      })
      .join('');

    uiRoot.innerHTML = `
      <div class="panel">
        <div class="row spread">
          <h2>${city.name}</h2>
          <span class="subtle">Lv.${state.player.level} ${state.player.name} &middot; Day ${state.daysElapsed} &middot; ${formatCoin(state.player.gold)} &middot; ${vessel.name}</span>
        </div>
        <p>${city.description}</p>
        <div class="row">
          <button id="enter-city-btn">Enter the Market</button>
          <button id="guild-btn">Guild Hall</button>
          <button id="inventory-btn">Cargo &amp; Caravan</button>
          <button id="retire-btn">Retire &amp; Settle the Ledger</button>
        </div>
      </div>
      <div class="panel">
        <h3>Travel</h3>
        <div class="city-list">${cityButtons || '<span class="subtle">No routes reachable with your current vessel.</span>'}</div>
      </div>
    `;

    uiRoot.querySelectorAll('button[data-city]').forEach((btn) => {
      btn.addEventListener('click', () => this.travelTo(btn.dataset.city));
    });
    uiRoot.querySelector('#enter-city-btn').addEventListener('click', () => {
      this.screenManager.goTo(CityScreen);
    });
    uiRoot.querySelector('#guild-btn').addEventListener('click', () => {
      this.screenManager.goTo(GuildScreen);
    });
    uiRoot.querySelector('#inventory-btn').addEventListener('click', () => {
      this.screenManager.goTo(InventoryScreen);
    });
    uiRoot.querySelector('#retire-btn').addEventListener('click', () => {
      this.screenManager.goTo(EndingScreen);
    });
  },

  travelTo(destCityId) {
    if (this.travel) return; // already on the road
    const state = this.context.state;
    const vessel = getVessel(state.player.vesselId);
    const path = findPath(state.currentCityId, destCityId, vessel.allowedRouteTypes);
    if (!path) return;

    const waypoints = path.path.map((id) => getCity(id));
    const { segmentLengths, total } = pathSegments(waypoints);
    const durationMs = Math.min(
      TRAVEL_ANIM_MAX_MS,
      TRAVEL_ANIM_BASE_MS + (waypoints.length - 1) * TRAVEL_ANIM_PER_HOP_MS
    );

    this.travel = {
      destCityId,
      path,
      vessel,
      waypoints,
      segmentLengths,
      total,
      elapsedMs: 0,
      durationMs,
    };
    this.renderTravelingPanel(destCityId);
  },

  renderTravelingPanel(destCityId) {
    const dest = getCity(destCityId);
    this.uiRoot.innerHTML = `
      <div class="panel">
        <h2>On the Road</h2>
        <p class="subtle">Traveling to ${dest.name}...</p>
      </div>
    `;
  },

  update(dt) {
    if (!this.travel) return;
    this.travel.elapsedMs += dt * 1000;
    if (this.travel.elapsedMs >= this.travel.durationMs) {
      const { path, destCityId, vessel } = this.travel;
      this.travel = null;
      this.finishTravel(path, destCityId, vessel);
    }
  },

  finishTravel(path, destCityId) {
    const state = this.context.state;
    const days = travelTimeDays(path.distance, getVessel(state.player.vesselId).speed);
    for (let i = 0; i < days; i++) {
      driftMarket(state.market, cities, goods);
    }
    state.daysElapsed += days;
    state.currentCityId = destCityId;

    let encounter = null;
    let isAmbush = false;
    const encounterRoll = 1 - Math.pow(1 - ENCOUNTER_CHANCE_PER_DAY, days);
    if (Math.random() < encounterRoll) {
      encounter = createEncounter();
      isAmbush = rollAmbush(state.player.ambushAvoidance);
    }

    saveGame(state);

    if (encounter) {
      this.screenManager.goTo(CombatScreen, { encounter, isAmbush });
    } else {
      this.screenManager.goTo(CityScreen);
    }
  },

  unmount() {},

  draw(ctx, canvas) {
    const state = this.context?.state;
    if (!state) return;
    drawWorldMap(ctx, canvas, {
      cities,
      routes,
      currentCityId: state.currentCityId,
      reachableCityIds: this.travel ? [] : reachableCityIds(state),
    });

    if (this.travel) {
      const t = this.travel.elapsedMs / this.travel.durationMs;
      const point = pointAlongPath(this.travel.waypoints, this.travel.segmentLengths, this.travel.total, t);

      ctx.save();
      ctx.beginPath();
      ctx.arc(point.x, point.y - 10, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(168, 121, 31, 0.25)';
      ctx.fill();
      ctx.restore();

      drawVessel(ctx, this.travel.vessel.id, point.x, point.y, {
        animTimeSec: this.travel.elapsedMs / 1000,
        facingLeft: point.facingLeft,
        scale: 1.1,
      });
    }
  },

  onCanvasClick(x, y) {
    if (this.travel) return;
    const state = this.context?.state;
    if (!state) return;
    const city = hitTestCity(cities, x, y);
    if (!city) return;
    if (reachableCityIds(state).includes(city.id)) {
      this.travelTo(city.id);
    }
  },
};
