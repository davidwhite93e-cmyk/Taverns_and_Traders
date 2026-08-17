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
import { playSound } from '../combat/sfx.js';
import { findGood } from '../economy/goods.js';
import { saveGame } from '../state/GameState.js';
import { completeFinalQuest } from '../guilds/quests.js';
import { formatCoin } from './format.js';
import { CityScreen } from './CityScreen.js';
import { EndingScreen } from './EndingScreen.js';

const ENTRY_DELAY_MS = 500;
const FINAL_DELAY_MS = 250;
const DAMAGE_NUMBER_LIFETIME_MS = 900;
const CRIT_FLASH_LIFETIME_MS = 400;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    this.animating = false;
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
    } else if (this.phase === 'resolved') {
      const logLines = session.log
        .slice(-8)
        .map((entry) => `<div>${entry.text}</div>`)
        .join('');
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
      body = this.renderActivePhase();
    }

    uiRoot.innerHTML = `
      <div class="panel combat-panel">
        <h2>${isBoss ? 'A Guild Commission' : 'Trouble on the Road'} &mdash; ${encounter.name}</h2>
        ${body}
      </div>
    `;

    this.attachHandlers();
  },

  renderActivePhase() {
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

    const logLines = session.log
      .slice(-8)
      .map((entry) => `<div>${entry.text}</div>`)
      .join('');

    return `
      <div class="row spread">
        <div id="player-box" class="combat-box">
          <div class="subtle" id="player-hp-label">You (${session.playerHp}/${session.playerMaxHp} Health)${player.maxMana ? ` &middot; ${player.mana}/${player.maxMana} Mana` : ''}</div>
          <div class="hp-bar"><div id="player-hp-fill" class="hp-bar-fill" style="width:${(session.playerHp / session.playerMaxHp) * 100}%"></div></div>
        </div>
        <div id="enemy-box" class="combat-box">
          <div class="subtle" id="enemy-hp-label">${session.enemy.name} (${session.enemyHp}/${session.enemy.hp} Health)</div>
          <div class="hp-bar"><div id="enemy-hp-fill" class="hp-bar-fill enemy" style="width:${(session.enemyHp / session.enemy.hp) * 100}%"></div></div>
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
    if (previewFlee) previewFlee.addEventListener('click', () => this.handlePreviewFlee());

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
      if (this.session.outcome === 'victory') playSound('victory');
      else if (this.session.outcome === 'defeat') playSound('defeat');
    }
  },

  /** Runs a synchronous combat action, then replays the log entries it produced with feedback before refreshing the panel. */
  async runAction(actionFn) {
    if (this.animating) return;
    this.animating = true;
    this.setActionButtonsDisabled(true);
    const startLength = this.session.log.length;
    actionFn();
    await this.replayEntries(startLength);
    this.animating = false;
    this.finishIfEnded();
    this.renderPanel();
  },

  async replayEntries(startLength) {
    const entries = this.session.log.slice(startLength);
    for (let i = 0; i < entries.length; i++) {
      this.applyEntryFeedback(entries[i]);
      await delay(i < entries.length - 1 ? ENTRY_DELAY_MS : FINAL_DELAY_MS);
    }
  },

  applyEntryFeedback(entry) {
    const { session, uiRoot } = this;
    const playerFill = uiRoot.querySelector('#player-hp-fill');
    const enemyFill = uiRoot.querySelector('#enemy-hp-fill');
    if (playerFill) playerFill.style.width = `${(entry.playerHpAfter / session.playerMaxHp) * 100}%`;
    if (enemyFill) enemyFill.style.width = `${(entry.enemyHpAfter / session.enemy.hp) * 100}%`;

    const logEl = uiRoot.querySelector('.log');
    if (logEl) {
      const line = document.createElement('div');
      line.textContent = entry.text;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    }

    const dealsDamageToEnemy = entry.actor === 'player' && entry.amount > 0 && (entry.type === 'attack' || entry.type === 'spell');
    const dealsDamageToPlayer = entry.actor === 'enemy' && entry.amount > 0;

    if (dealsDamageToEnemy) {
      this.spawnDamageNumber('enemy', entry.amount, entry.isCrit, 'dmg');
      this.shakeScreen(entry.isCrit);
      playSound(entry.isCrit ? 'crit' : 'hit');
      if (entry.isCrit) this.critFlash();
    } else if (dealsDamageToPlayer) {
      this.spawnDamageNumber('player', entry.amount, entry.isCrit, 'dmg');
      this.shakeScreen(entry.isCrit);
      playSound(entry.type === 'ambush' ? 'ambush' : entry.isCrit ? 'crit' : 'hit');
      if (entry.isCrit) this.critFlash();
    } else if (entry.type === 'heal' && entry.amount > 0) {
      this.spawnDamageNumber('player', entry.amount, false, 'heal');
      playSound('heal');
    } else if (entry.type === 'buff' || entry.type === 'shield') {
      playSound('buff');
    } else if (entry.type === 'flee') {
      playSound('fleeSuccess');
    } else if (entry.type === 'flee-fail') {
      playSound('fleeFail');
    }
  },

  spawnDamageNumber(side, amount, isCrit, kind) {
    const box = this.uiRoot.querySelector(`#${side}-box`);
    if (!box) return;
    const el = document.createElement('div');
    el.className = `dmg-number ${kind === 'heal' ? 'heal' : ''} ${isCrit ? 'crit' : ''}`.trim();
    el.textContent = kind === 'heal' ? `+${amount}` : `-${amount}`;
    box.appendChild(el);
    setTimeout(() => el.remove(), DAMAGE_NUMBER_LIFETIME_MS);
  },

  shakeScreen(isCrit) {
    const panel = this.uiRoot.querySelector('.combat-panel');
    if (!panel) return;
    panel.classList.remove('shake', 'shake-strong');
    void panel.offsetWidth; // restart the CSS animation even if it's already applied
    panel.classList.add(isCrit ? 'shake-strong' : 'shake');
  },

  critFlash() {
    const panel = this.uiRoot.querySelector('.combat-panel');
    if (!panel) return;
    const flash = document.createElement('div');
    flash.className = 'crit-flash-overlay';
    panel.appendChild(flash);
    setTimeout(() => flash.remove(), CRIT_FLASH_LIFETIME_MS);
  },

  setActionButtonsDisabled(disabled) {
    this.uiRoot.querySelectorAll('#attack-btn, #flee-btn, button[data-spell], button[data-potion]').forEach((btn) => {
      btn.disabled = disabled;
    });
  },

  handleBrace() {
    this.phase = 'active';
    this.renderPanel();
    this.runAction(() => applyAmbushStrike(this.session));
  },

  setPhaseActive() {
    this.phase = 'active';
    this.renderPanel();
  },

  handlePreviewFlee() {
    this.phase = 'active';
    this.renderPanel();
    this.runAction(() => attemptFlee(this.session));
  },

  handleAttack() {
    this.runAction(() => playerAttack(this.session));
  },

  handleCastSpell(spellId) {
    const spell = getSpell(spellId);
    const player = this.context.state.player;
    if (player.mana < spell.manaCost) return;
    this.runAction(() => {
      player.mana -= spell.manaCost;
      castSpell(this.session, spell);
    });
  },

  handleUsePotion(goodId) {
    const state = this.context.state;
    const good = findGood(goodId);
    const owned = state.player.cargo[goodId] || 0;
    if (owned <= 0) return;
    this.runAction(() => {
      const remaining = owned - 1;
      if (remaining > 0) state.player.cargo[goodId] = remaining;
      else delete state.player.cargo[goodId];
      usePotionEffect(this.session, good.effect);
    });
  },

  handleFlee() {
    this.runAction(() => attemptFlee(this.session));
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
