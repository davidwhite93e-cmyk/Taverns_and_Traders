import { computeEnding, WEALTH_ENDING_GOLD } from '../guilds/endings.js';
import { loadGuilds, getReputation } from '../guilds/reputation.js';
import { getQuestsForGuild } from '../guilds/quests.js';
import { clearSavedGame } from '../state/GameState.js';
import { formatCoin } from './format.js';
import { CharacterCreationScreen } from './CharacterCreationScreen.js';
import { MapScreen } from './MapScreen.js';

const guilds = loadGuilds();

export const EndingScreen = {
  mount({ uiRoot, screenManager, context }) {
    context.canvas.style.display = 'none';
    this.uiRoot = uiRoot;
    this.screenManager = screenManager;
    this.context = context;
    this.renderPanel();
  },

  renderPanel() {
    const { uiRoot, context } = this;
    const state = context.state;
    const ending = computeEnding(state);

    if (ending) {
      uiRoot.innerHTML = `
        <div class="panel">
          <h1>${ending.title}</h1>
          <p>${ending.summary}</p>
          <p class="subtle">Final ledger: ${formatCoin(state.player.gold, { long: true })} &middot; Level ${state.player.level} &middot;
          ${state.daysElapsed} days on the road</p>
          <button id="new-game-btn">Begin a New Ledger</button>
        </div>
      `;
      uiRoot.querySelector('#new-game-btn').addEventListener('click', () => {
        clearSavedGame();
        context.state = null;
        this.screenManager.goTo(CharacterCreationScreen);
      });
      return;
    }

    const progressRows = guilds
      .map((guild) => {
        const rep = getReputation(state, guild.id);
        const final = getQuestsForGuild(guild.id).find((q) => q.isFinal);
        const completed = (state.completedQuests || []).includes(final.id);
        const status = completed
          ? 'Complete'
          : rep >= final.requiredReputation && state.player.level >= final.requiredLevel
            ? 'Ready — confront the boss at the Guild Hall'
            : `Needs ${guild.name} standing ${final.requiredReputation} (at ${rep}) and level ${final.requiredLevel}`;
        return `<li><strong>${guild.name}:</strong> ${status}</li>`;
      })
      .join('');

    uiRoot.innerHTML = `
      <div class="panel">
        <h2>The Journey Continues</h2>
        <p>You haven't yet reached one of the five endings. Every path is still open:</p>
        <ul>
          ${progressRows}
          <li><strong>Wealth:</strong> ${formatCoin(state.player.gold, { long: true })} / ${formatCoin(WEALTH_ENDING_GOLD, { long: true })}, through trade alone</li>
        </ul>
        <button id="back-btn">Back to the Road</button>
      </div>
    `;
    uiRoot.querySelector('#back-btn').addEventListener('click', () => {
      this.screenManager.goTo(MapScreen);
    });
  },

  unmount() {},
};
