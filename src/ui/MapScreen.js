import { loadCities, loadRoutes, getCity, findPath, travelTimeDays } from '../world/world.js';
import { drawWorldMap, hitTestCity } from '../world/map.js';
import { getVessel } from '../world/vessels.js';
import { driftMarket } from '../economy/market.js';
import { loadGoods } from '../economy/goods.js';
import { saveGame } from '../state/GameState.js';
import { createEncounter } from '../combat/combat.js';
import { CityScreen } from './CityScreen.js';
import { InventoryScreen } from './InventoryScreen.js';
import { EndingScreen } from './EndingScreen.js';
import { CombatScreen } from './CombatScreen.js';

const ENCOUNTER_CHANCE_PER_DAY = 0.12;

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
          <span class="subtle">Day ${state.daysElapsed} &middot; ${state.player.gold}g &middot; ${vessel.name}</span>
        </div>
        <p>${city.description}</p>
        <div class="row">
          <button id="enter-city-btn">Trade Here</button>
          <button id="inventory-btn">Inventory &amp; Vessel</button>
          <button id="retire-btn">Retire &amp; Settle Accounts</button>
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
    uiRoot.querySelector('#inventory-btn').addEventListener('click', () => {
      this.screenManager.goTo(InventoryScreen);
    });
    uiRoot.querySelector('#retire-btn').addEventListener('click', () => {
      this.screenManager.goTo(EndingScreen);
    });
  },

  travelTo(destCityId) {
    const state = this.context.state;
    const vessel = getVessel(state.player.vesselId);
    const path = findPath(state.currentCityId, destCityId, vessel.allowedRouteTypes);
    if (!path) return;

    const days = travelTimeDays(path.distance, vessel.speed);
    for (let i = 0; i < days; i++) {
      driftMarket(state.market, cities, goods);
    }
    state.daysElapsed += days;
    state.currentCityId = destCityId;

    let encounter = null;
    const encounterRoll = 1 - Math.pow(1 - ENCOUNTER_CHANCE_PER_DAY, days);
    if (Math.random() < encounterRoll) {
      encounter = createEncounter();
    }

    saveGame(state);

    if (encounter) {
      this.screenManager.goTo(CombatScreen, { encounter });
    } else {
      this.screenManager.goTo(CityScreen);
    }
  },

  unmount() {},

  render(ctx, canvas) {
    const state = this.context?.state;
    if (!state) return;
    drawWorldMap(ctx, canvas, {
      cities,
      routes,
      currentCityId: state.currentCityId,
      reachableCityIds: reachableCityIds(state),
    });
  },

  onCanvasClick(x, y) {
    const state = this.context?.state;
    if (!state) return;
    const city = hitTestCity(cities, x, y);
    if (!city) return;
    if (reachableCityIds(state).includes(city.id)) {
      this.travelTo(city.id);
    }
  },
};
