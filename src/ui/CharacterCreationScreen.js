import { createNewGame, saveGame, loadGame, hasSavedGame } from '../state/GameState.js';
import { MapScreen } from './MapScreen.js';

export const CharacterCreationScreen = {
  mount({ uiRoot, screenManager, context }) {
    context.canvas.style.display = 'none';

    const continueAvailable = hasSavedGame();

    uiRoot.innerHTML = `
      <div class="panel">
        <h1>Wayfarer's Ledger</h1>
        <p>Somewhere between the granaries of Millhaven and the smelters of the Ironspire, a fortune is
        waiting for someone willing to walk the road for it. Buy low, sell high, choose your allies
        carefully, and see how your ledger reads when the journey ends.</p>
        <label class="subtle" for="player-name">Your name</label>
        <input id="player-name" type="text" placeholder="Wayfarer" maxlength="24" />
        <div class="row" style="margin-top: 12px;">
          <button id="start-btn">Set Out</button>
          <button id="continue-btn" ${continueAvailable ? '' : 'disabled'}>Continue Journey</button>
        </div>
      </div>
    `;

    uiRoot.querySelector('#start-btn').addEventListener('click', () => {
      const name = uiRoot.querySelector('#player-name').value.trim();
      const state = createNewGame(name);
      saveGame(state);
      context.state = state;
      screenManager.goTo(MapScreen);
    });

    if (continueAvailable) {
      uiRoot.querySelector('#continue-btn').addEventListener('click', () => {
        context.state = loadGame();
        screenManager.goTo(MapScreen);
      });
    }
  },

  unmount() {},
};
