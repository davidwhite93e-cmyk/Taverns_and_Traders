import { createNewGame, saveGame, loadGame, hasSavedGame } from '../state/GameState.js';
import { loadRaces } from '../character/races.js';
import { loadClasses } from '../character/classes.js';
import { MapScreen } from './MapScreen.js';

const races = loadRaces();
const classes = loadClasses();

export const CharacterCreationScreen = {
  mount({ uiRoot, screenManager, context }) {
    context.canvas.style.display = 'none';
    this.uiRoot = uiRoot;
    this.screenManager = screenManager;
    this.context = context;
    this.selectedRaceId = races[0].id;
    this.selectedClassId = classes[0].id;
    this.continueAvailable = hasSavedGame();
    this.renderPanel();
  },

  renderPanel() {
    const { uiRoot } = this;

    const raceCards = races
      .map(
        (race) => `
        <button class="pick-card ${race.id === this.selectedRaceId ? 'selected' : ''}" data-race="${race.id}">
          <strong>${race.name}</strong>
          <span class="subtle">${race.description}</span>
        </button>`
      )
      .join('');

    const classCards = classes
      .map(
        (cls) => `
        <button class="pick-card ${cls.id === this.selectedClassId ? 'selected' : ''}" data-class="${cls.id}">
          <strong>${cls.name}</strong>
          <span class="subtle">${cls.description}</span>
        </button>`
      )
      .join('');

    uiRoot.innerHTML = `
      <div class="panel">
        <h1>Wayfarer's Ledger</h1>
        <p>Somewhere between the granaries of Millhaven and the smelters of the Ironspire, a fortune is
        waiting for someone willing to walk the road for it. Trade, fight, or take up a guild's cause in
        whatever order suits you — there's no one path through this sandbox, only the one you carve.</p>
        <label class="subtle" for="player-name">Your name</label>
        <input id="player-name" type="text" placeholder="Wayfarer" maxlength="24" />
      </div>
      <div class="panel">
        <h3>Race</h3>
        <div class="pick-grid">${raceCards}</div>
      </div>
      <div class="panel">
        <h3>Class</h3>
        <div class="pick-grid">${classCards}</div>
      </div>
      <div class="panel">
        <div class="row">
          <button id="start-btn">Set Out</button>
          <button id="continue-btn" ${this.continueAvailable ? '' : 'disabled'}>Continue Journey</button>
        </div>
      </div>
    `;

    uiRoot.querySelectorAll('button[data-race]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedRaceId = btn.dataset.race;
        this.renderPanel();
      });
    });
    uiRoot.querySelectorAll('button[data-class]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedClassId = btn.dataset.class;
        this.renderPanel();
      });
    });

    uiRoot.querySelector('#start-btn').addEventListener('click', () => {
      const name = uiRoot.querySelector('#player-name').value.trim();
      const state = createNewGame(name, this.selectedRaceId, this.selectedClassId);
      saveGame(state);
      this.context.state = state;
      this.screenManager.goTo(MapScreen);
    });

    if (this.continueAvailable) {
      uiRoot.querySelector('#continue-btn').addEventListener('click', () => {
        this.context.state = loadGame();
        this.screenManager.goTo(MapScreen);
      });
    }
  },

  unmount() {},
};
