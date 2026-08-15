import { getVessel, loadVessels, purchaseVessel } from '../world/vessels.js';
import { findGood } from '../economy/goods.js';
import { cargoTotal } from '../economy/trade.js';
import { saveGame } from '../state/GameState.js';
import { MapScreen } from './MapScreen.js';

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

    const cargoRows = Object.entries(state.player.cargo).length
      ? Object.entries(state.player.cargo)
          .map(([goodId, qty]) => `<tr><td>${findGood(goodId).name}</td><td>${qty}</td></tr>`)
          .join('')
      : '<tr><td colspan="2" class="subtle">Cargo hold is empty.</td></tr>';

    const vesselRows = loadVessels()
      .map((v) => {
        const owned = v.id === vessel.id;
        const affordable = state.player.gold >= v.cost;
        return `
          <tr>
            <td>${v.name} ${owned ? '<span class="badge">current</span>' : ''}</td>
            <td>${v.cost}g</td>
            <td>${v.cargoCapacity}</td>
            <td>${v.speed}</td>
            <td>${v.allowedRouteTypes.join(', ')}</td>
            <td><button data-vessel="${v.id}" ${owned || !affordable ? 'disabled' : ''}>${owned ? 'Owned' : 'Buy'}</button></td>
          </tr>`;
      })
      .join('');

    uiRoot.innerHTML = `
      <div class="panel">
        <h2>Cargo Hold</h2>
        <p class="subtle">${load}/${vessel.cargoCapacity} carried aboard the ${vessel.name}</p>
        <table><thead><tr><th>Good</th><th>Quantity</th></tr></thead><tbody>${cargoRows}</tbody></table>
      </div>
      <div class="panel">
        <h2>Vessels</h2>
        ${this.message ? `<p class="subtle">${this.message}</p>` : ''}
        <p class="subtle">${vessel.description}</p>
        <table>
          <thead><tr><th>Vessel</th><th>Cost</th><th>Cargo</th><th>Speed</th><th>Routes</th><th></th></tr></thead>
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

  unmount() {},
};
