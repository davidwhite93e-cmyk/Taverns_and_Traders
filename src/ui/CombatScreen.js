import { playerCombatStats, resolveCombat, attemptFlee, applyCombatOutcome } from '../combat/combat.js';
import { saveGame } from '../state/GameState.js';
import { CityScreen } from './CityScreen.js';

export const CombatScreen = {
  mount({ uiRoot, screenManager, context, params }) {
    context.canvas.style.display = 'none';
    this.uiRoot = uiRoot;
    this.screenManager = screenManager;
    this.context = context;
    this.encounter = params.encounter;
    this.result = null;
    this.fled = false;
    this.renderPanel();
  },

  renderPanel() {
    const { uiRoot, context, encounter, result } = this;
    const state = context.state;
    const player = playerCombatStats(state);

    let body;
    if (this.fled) {
      body = `<p>You slip off the road and lose the encounter in the brush. Your caravan presses on.</p>
              <button id="continue-btn">Continue to City</button>`;
    } else if (result) {
      const logLines = result.log
        .map(
          (entry) =>
            `Round ${entry.round}: ${entry.actor === 'player' ? 'You' : encounter.name} deal ${entry.damage} damage.`
        )
        .join('<br/>');
      body = `
        <p><strong>${result.outcome === 'victory' ? 'Victory!' : 'Defeat.'}</strong>
        ${result.outcome === 'victory' ? `You drive them off and recover ${encounter.loot}g in salvage.` : 'You are forced to retreat, losing some gold in the scramble.'}</p>
        <div class="log">${logLines}</div>
        <button id="continue-btn">Continue to City</button>
      `;
    } else {
      body = `
        <p>${encounter.name} block the road ahead.</p>
        <div class="row spread">
          <div>
            <div class="subtle">You (${player.hp}/${player.maxHp} HP)</div>
            <div class="hp-bar"><div class="hp-bar-fill" style="width:${(player.hp / player.maxHp) * 100}%"></div></div>
          </div>
          <div>
            <div class="subtle">${encounter.name} (${encounter.currentHp}/${encounter.hp} HP)</div>
            <div class="hp-bar"><div class="hp-bar-fill enemy" style="width:${(encounter.currentHp / encounter.hp) * 100}%"></div></div>
          </div>
        </div>
        <div class="row" style="margin-top:12px;">
          <button id="fight-btn">Stand and Fight</button>
          <button id="flee-btn">Attempt to Flee</button>
        </div>
      `;
    }

    uiRoot.innerHTML = `<div class="panel"><h2>Trouble on the Road</h2>${body}</div>`;

    const fightBtn = uiRoot.querySelector('#fight-btn');
    if (fightBtn) fightBtn.addEventListener('click', () => this.fight());
    const fleeBtn = uiRoot.querySelector('#flee-btn');
    if (fleeBtn) fleeBtn.addEventListener('click', () => this.flee());
    const continueBtn = uiRoot.querySelector('#continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.screenManager.goTo(CityScreen);
      });
    }
  },

  fight() {
    const state = this.context.state;
    const player = playerCombatStats(state);
    this.result = resolveCombat(player, this.encounter);
    applyCombatOutcome(state, this.encounter, this.result);
    saveGame(state);
    this.renderPanel();
  },

  flee() {
    if (attemptFlee()) {
      this.fled = true;
    } else {
      this.fight();
      return;
    }
    this.renderPanel();
  },

  unmount() {},
};
