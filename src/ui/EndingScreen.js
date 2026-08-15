import { computeEnding } from '../factions/endings.js';
import { getReputation } from '../factions/reputation.js';
import { clearSavedGame } from '../state/GameState.js';
import { CharacterCreationScreen } from './CharacterCreationScreen.js';

export const EndingScreen = {
  mount({ uiRoot, screenManager, context }) {
    context.canvas.style.display = 'none';
    const state = context.state;
    const ending = computeEnding(state);
    const concordRep = getReputation(state, 'concord');
    const freeCaravansRep = getReputation(state, 'free_caravans');

    uiRoot.innerHTML = `
      <div class="panel">
        <h1>${ending.title}</h1>
        <p>${ending.summary}</p>
        <p class="subtle">Final ledger: ${state.player.gold}g &middot; ${state.daysElapsed} days on the road
        &middot; Concord standing ${concordRep} &middot; Free Caravans standing ${freeCaravansRep}</p>
        <button id="new-game-btn">Begin a New Journey</button>
      </div>
    `;

    uiRoot.querySelector('#new-game-btn').addEventListener('click', () => {
      clearSavedGame();
      context.state = null;
      screenManager.goTo(CharacterCreationScreen);
    });
  },

  unmount() {},
};
