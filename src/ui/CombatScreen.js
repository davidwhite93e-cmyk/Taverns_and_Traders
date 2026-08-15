import {
  createCombatSession,
  applyAmbushStrike,
  playerAttack,
  castSpell,
  usePotionEffect,
  attemptFlee,
  applyCombatOutcome,
} from '../combat/combat.js';
import { getSpell } from '../combat/spells.js';
import { findGood } from '../economy/goods.js';
import { saveGame } from '../state/GameState.js';
import { completeFinalQuest } from '../guilds/quests.js';
import { formatCoin } from './format.js';
import { CityScreen } from './CityScreen.js';
import { EndingScreen } from './EndingScreen.js';

export const CombatScreen = {
  mount({ uiRoot, screenManager, context, params }) {
    context.canvas.style.display = 'none';
    this.uiRoot = uiRoot;
    this.screenManager = screenManager;
    this.context = context;
    this.encounter = params.encounter;
    this.isAmbush = !!params.isAmbush;
    this.questId = params.questId || null;
    this.phase = 'preview';
    this.outcomeApplied = false;
    this.session = createCombatSession(context.state, this.encounter);
    this.renderPanel();
  },

  renderPanel() {
    const { uiRoot, encounter, session } = this;
    const isBoss = encounter.tier === 'boss';

    let body;
    if (this.phase === 'preview') {
      body = `
        <p>${encounter.composition}</p>
        ${isBoss ? `<p><em>${encounter.telegraph}</em></p>` : ''}
        <div class="row" style="margin-top:12px;">
          ${
            this.isAmbush
              ? '<button id="brace-btn">Brace Yourself &mdash; You\'ve Been Ambushed!</button>'
              : '<button id="engage-btn">Engage</button><button id="preview-flee-btn">Attempt to Slip Away</button>'
          }
        </div>
      `;
    } else {
      const logLines = session.log
        .slice(-8)
        .map((entry) => entry.text)
        .join('<br/>');

      if (this.phase === 'resolved') {
        const outcomeText =
          session.outcome === 'victory'
            ? `Victory! You drive them off${isBoss ? '' : ` and recover ${formatCoin(encounter.loot, { long: true })} in salvage`}.`
            : session.outcome === 'fled'
              ? 'You break off and put distance behind you.'
              : 'You are forced to retreat, losing some gold in the scramble.';
        body = `
          <p><strong>${outcomeText}</strong></p>
          <div class="log">${logLines}</div>
          <button id="continue-btn">Continue</button>
        `;
      } else {
        body = this.renderActivePhase(logLines);
      }
    }

    uiRoot.innerHTML = `
      <div class="panel">
        <h2>${isBoss ? 'A Guild Commission' : 'Trouble on the Road'} &mdash; ${encounter.name}</h2>
        ${body}
      </div>
    `;

    this.attachHandlers();
  },

  renderActivePhase(logLines) {
    const { context, session } = this;
    const state = context.state;
    const player = state.player;

    const spellButtons = (player.spells || [])
      .map(getSpell)
      .map(
        (spell) => `
        <button data-spell="${spell.id}" ${player.mana < spell.manaCost ? 'disabled' : ''}>
          ${spell.name} (${spell.manaCost} mana)
        </button>`
      )
      .join('');

    const potionButtons = Object.entries(player.cargo)
      .map(([goodId, qty]) => ({ good: findGood(goodId), qty }))
      .filter(({ good, qty }) => good.category === 'potion' && qty > 0)
      .map(({ good, qty }) => `<button data-potion="${good.id}">Use ${good.name} (${qty})</button>`)
      .join('');

    return `
      <div class="row spread">
        <div>
          <div class="subtle">You (${session.playerHp}/${session.playerMaxHp} Health)${player.maxMana ? ` &middot; ${player.mana}/${player.maxMana} Mana` : ''}</div>
          <div class="hp-bar"><div class="hp-bar-fill" style="width:${(session.playerHp / session.playerMaxHp) * 100}%"></div></div>
        </div>
        <div>
          <div class="subtle">${session.enemy.name} (${session.enemyHp}/${session.enemy.hp} Health)</div>
          <div class="hp-bar"><div class="hp-bar-fill enemy" style="width:${(session.enemyHp / session.enemy.hp) * 100}%"></div></div>
        </div>
      </div>
      <div class="log" style="margin-top:10px;">${logLines}</div>
      <div class="row" style="margin-top:12px;">
        <button id="attack-btn">Strike</button>
        ${spellButtons}
        ${potionButtons}
        <button id="flee-btn">Attempt to Flee</button>
      </div>
    `;
  },

  attachHandlers() {
    const { uiRoot } = this;

    const brace = uiRoot.querySelector('#brace-btn');
    if (brace) brace.addEventListener('click', () => this.handleBrace());

    const engage = uiRoot.querySelector('#engage-btn');
    if (engage) engage.addEventListener('click', () => this.setPhaseActive());

    const previewFlee = uiRoot.querySelector('#preview-flee-btn');
    if (previewFlee) previewFlee.addEventListener('click', () => this.handleFlee());

    const attack = uiRoot.querySelector('#attack-btn');
    if (attack) attack.addEventListener('click', () => this.handleAttack());

    uiRoot.querySelectorAll('button[data-spell]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleCastSpell(btn.dataset.spell));
    });
    uiRoot.querySelectorAll('button[data-potion]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleUsePotion(btn.dataset.potion));
    });

    const flee = uiRoot.querySelector('#flee-btn');
    if (flee) flee.addEventListener('click', () => this.handleFlee());

    const cont = uiRoot.querySelector('#continue-btn');
    if (cont) cont.addEventListener('click', () => this.handleContinue());
  },

  finishIfEnded() {
    if (this.session.ended && !this.outcomeApplied) {
      this.outcomeApplied = true;
      applyCombatOutcome(this.context.state, this.session);
      if (this.session.outcome === 'victory' && this.questId) {
        completeFinalQuest(this.context.state, this.questId);
      }
      saveGame(this.context.state);
      this.phase = 'resolved';
    }
  },

  handleBrace() {
    applyAmbushStrike(this.session);
    this.finishIfEnded();
    if (this.phase !== 'resolved') this.phase = 'active';
    this.renderPanel();
  },

  setPhaseActive() {
    this.phase = 'active';
    this.renderPanel();
  },

  handleAttack() {
    playerAttack(this.session);
    this.finishIfEnded();
    this.renderPanel();
  },

  handleCastSpell(spellId) {
    const spell = getSpell(spellId);
    const player = this.context.state.player;
    if (player.mana < spell.manaCost) return;
    player.mana -= spell.manaCost;
    castSpell(this.session, spell);
    this.finishIfEnded();
    this.renderPanel();
  },

  handleUsePotion(goodId) {
    const state = this.context.state;
    const good = findGood(goodId);
    const owned = state.player.cargo[goodId] || 0;
    if (owned <= 0) return;
    const remaining = owned - 1;
    if (remaining > 0) state.player.cargo[goodId] = remaining;
    else delete state.player.cargo[goodId];
    usePotionEffect(this.session, good.effect);
    this.finishIfEnded();
    this.renderPanel();
  },

  handleFlee() {
    attemptFlee(this.session);
    this.finishIfEnded();
    if (this.phase === 'preview' && this.session.outcome !== 'fled' && !this.session.ended) {
      this.phase = 'active';
    }
    this.renderPanel();
  },

  handleContinue() {
    if (this.session.outcome === 'victory' && this.questId) {
      this.screenManager.goTo(EndingScreen);
    } else {
      this.screenManager.goTo(CityScreen);
    }
  },

  unmount() {},
};
