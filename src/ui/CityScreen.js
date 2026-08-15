import { getCity } from '../world/world.js';
import { getVessel } from '../world/vessels.js';
import { loadGoods } from '../economy/goods.js';
import { getPrice } from '../economy/market.js';
import { buyGood, sellGood, cargoTotal } from '../economy/trade.js';
import { saveGame } from '../state/GameState.js';
import { getAvailableQuests, completeQuest } from '../factions/quests.js';
import { loadFactions } from '../factions/reputation.js';
import { MapScreen } from './MapScreen.js';

const goods = loadGoods();
const factions = loadFactions();

export const CityScreen = {
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
    const city = getCity(state.currentCityId);
    const vessel = getVessel(state.player.vesselId);
    const load = cargoTotal(state.player.cargo);

    const goodsRows = goods
      .map((good) => {
        const price = getPrice(state.market, city.id, good.id);
        const owned = state.player.cargo[good.id] || 0;
        const tag = city.produces.includes(good.id)
          ? '<span class="badge produce">produces</span>'
          : city.demands.includes(good.id)
            ? '<span class="badge demand">wants</span>'
            : '';
        return `
          <tr>
            <td>${good.name} ${tag}</td>
            <td>${price}g</td>
            <td>${owned}</td>
            <td>
              <div class="row">
                <input type="number" min="1" value="1" style="width:64px" id="qty-${good.id}" />
                <button data-buy="${good.id}">Buy</button>
                <button data-sell="${good.id}" ${owned === 0 ? 'disabled' : ''}>Sell</button>
              </div>
            </td>
          </tr>`;
      })
      .join('');

    const availableQuests = getAvailableQuests(state);
    const questRows = availableQuests.length
      ? availableQuests
          .map((quest) => {
            const faction = factions.find((f) => f.id === quest.factionId);
            return `
              <div class="panel" style="padding:10px;">
                <div class="row spread">
                  <strong>${quest.title}</strong>
                  <span class="subtle">${faction.name}</span>
                </div>
                <p class="subtle">${quest.description}</p>
                <div class="row spread">
                  <span class="subtle">Reward: ${quest.rewardGold}g, +${quest.reputationDelta} reputation</span>
                  <button data-quest="${quest.id}">Undertake</button>
                </div>
              </div>`;
          })
          .join('')
      : '<p class="subtle">No contacts have work for you here right now.</p>';

    uiRoot.innerHTML = `
      <div class="panel">
        <div class="row spread">
          <h2>${city.name} Market</h2>
          <span class="subtle">${load}/${vessel.cargoCapacity} cargo &middot; ${state.player.gold}g</span>
        </div>
        ${this.message ? `<p class="subtle">${this.message}</p>` : ''}
        <table>
          <thead><tr><th>Good</th><th>Price</th><th>Held</th><th>Trade</th></tr></thead>
          <tbody>${goodsRows}</tbody>
        </table>
      </div>
      <div class="panel">
        <h3>Faction Contacts</h3>
        ${questRows}
      </div>
      <div class="row">
        <button id="back-btn">Back to Map</button>
      </div>
    `;

    uiRoot.querySelectorAll('button[data-buy]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleBuy(btn.dataset.buy));
    });
    uiRoot.querySelectorAll('button[data-sell]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleSell(btn.dataset.sell));
    });
    uiRoot.querySelectorAll('button[data-quest]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleQuest(btn.dataset.quest));
    });
    uiRoot.querySelector('#back-btn').addEventListener('click', () => {
      this.screenManager.goTo(MapScreen);
    });
  },

  handleBuy(goodId) {
    const state = this.context.state;
    const qtyInput = this.uiRoot.querySelector(`#qty-${goodId}`);
    const quantity = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    const vessel = getVessel(state.player.vesselId);
    try {
      buyGood({ market: state.market, player: state.player, vessel }, state.currentCityId, goodId, quantity);
      this.message = `Bought ${quantity} ${goodId.replace('_', ' ')}.`;
      saveGame(state);
    } catch (err) {
      this.message = err.message;
    }
    this.renderPanel();
  },

  handleSell(goodId) {
    const state = this.context.state;
    const qtyInput = this.uiRoot.querySelector(`#qty-${goodId}`);
    const quantity = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    try {
      sellGood(state, state.currentCityId, goodId, quantity);
      this.message = `Sold ${quantity} ${goodId.replace('_', ' ')}.`;
      saveGame(state);
    } catch (err) {
      this.message = err.message;
    }
    this.renderPanel();
  },

  handleQuest(questId) {
    const state = this.context.state;
    try {
      const quest = completeQuest(state, questId);
      this.message = `Completed "${quest.title}".`;
      saveGame(state);
    } catch (err) {
      this.message = err.message;
    }
    this.renderPanel();
  },

  unmount() {},
};
