import { getVessel, loadVessels, purchaseVessel, isVesselUnlocked, vesselCost } from '../world/vessels.js';
import { findGood } from '../economy/goods.js';
import { cargoTotal, effectiveCargoCapacity } from '../economy/trade.js';
import { saveGame } from '../state/GameState.js';
import { MapScreen } from './MapScreen.js';

const ESCORT_BASE_COST = 60;
const MAX_ESCORTS = 5;

export const InventoryScreen = {
  mount({ uiRoot, screenManager, context }) {
    context.canvas.style.display = 'none';
    this.uiRoot = uiRoot;
    this.screenManager = screenManager;
    this.context = context;
    this.message = '';
    this.renderPanel();
  },

  renderPanel() {
    const { uiRoot, context } = this;
    const state = context.state;
    const vessel = getVessel(state.player.vesselId);
    const load = cargoTotal(state.player.cargo);
    const capacity = effectiveCargoCapacity(vessel, state.player);
    const ownedVesselIds = state.player.ownedVesselIds || [state.player.vesselId];

    const cargoRows = Object.entries(state.player.cargo).length
      ? Object.entries(state.player.cargo)
          .map(([goodId, qty]) => `<tr><td>${findGood(goodId).name}</td><td>${qty}</td></tr>`)
          .join('')
      : '<tr><td colspan="2" class="subtle">Cargo hold is empty.</td></tr>';

    const vesselRows = loadVessels()
      .map((v) => {
        const owned = v.id === vessel.id;
        const unlocked = isVesselUnlocked(v, ownedVesselIds);
        const cost = vesselCost(v, state.player.armoredVesselDiscount || 0);
        const affordable = state.player.gold >= cost;
        let action;
        if (owned) action = '<span class="badge produce">current</span>';
        else if (!unlocked) action = '<span class="subtle">locked</span>';
        else action = `<button data-vessel="${v.id}" ${affordable ? '' : 'disabled'}>Buy (${cost}g)</button>`;
        return `
          <tr>
            <td>${v.name}</td>
            <td>${cost}g</td>
            <td>${v.cargoCapacity}</td>
            <td>${v.speed}</td>
            <td>${v.defenseRating}</td>
            <td>${v.allowedRouteTypes.join(', ')}</td>
            <td>${action}</td>
          </tr>`;
      })
      .join('');

    const escortCost = ESCORT_BASE_COST * (state.player.combat.escorts + 1);
    const escortsMaxed = state.player.combat.escorts >= MAX_ESCORTS;
    const escortAffordable = state.player.gold >= escortCost;

    uiRoot.innerHTML = `
      <div class="panel">
        <h2>Cargo Hold</h2>
        <p class="subtle">${load}/${capacity} carried aboard the ${vessel.name}</p>
        <table><thead><tr><th>Good</th><th>Quantity</th></tr></thead><tbody>${cargoRows}</tbody></table>
      </div>
      <div class="panel">
        <h2>Escorts</h2>
        <p class="subtle">${state.player.combat.escorts}/${MAX_ESCORTS} hired swords, boosting your attack and defense in a fight.</p>
        <button id="hire-btn" ${escortsMaxed || !escortAffordable ? 'disabled' : ''}>
          ${escortsMaxed ? 'Escort roster full' : `Hire an Escort (${escortCost}g)`}
        </button>
      </div>
      <div class="panel">
        <h2>Vessels</h2>
        ${this.message ? `<p class="subtle">${this.message}</p>` : ''}
        <p class="subtle">${vessel.description}</p>
        <table>
          <thead><tr><th>Vessel</th><th>Cost</th><th>Cargo</th><th>Speed</th><th>Defense</th><th>Routes</th><th></th></tr></thead>
          <tbody>${vesselRows}</tbody>
        </table>
      </div>
      <div class="row">
        <button id="back-btn">Back to Map</button>
      </div>
    `;

    uiRoot.querySelectorAll('button[data-vessel]').forEach((btn) => {
      btn.addEventListener('click', () => this.handlePurchase(btn.dataset.vessel));
    });
    uiRoot.querySelector('#hire-btn').addEventListener('click', () => this.handleHireEscort());
    uiRoot.querySelector('#back-btn').addEventListener('click', () => {
      this.screenManager.goTo(MapScreen);
    });
  },

  handlePurchase(vesselId) {
    const state = this.context.state;
    try {
      const vessel = purchaseVessel(state, vesselId);
      this.message = `Purchased the ${vessel.name}.`;
      saveGame(state);
    } catch (err) {
      this.message = err.message;
    }
    this.renderPanel();
  },

  handleHireEscort() {
    const state = this.context.state;
    const cost = ESCORT_BASE_COST * (state.player.combat.escorts + 1);
    if (state.player.combat.escorts >= MAX_ESCORTS) return;
    if (state.player.gold < cost) return;
    state.player.gold -= cost;
    state.player.combat.escorts += 1;
    this.message = 'Hired a new escort.';
    saveGame(state);
    this.renderPanel();
  },

  unmount() {},
};
