import { loadGuilds, getReputation } from '../guilds/reputation.js';
import { getQuestsForGuild, getQuestStatus } from '../guilds/quests.js';
import { createBossEncounter } from '../combat/combat.js';
import { MapScreen } from './MapScreen.js';
import { CombatScreen } from './CombatScreen.js';

const guilds = loadGuilds();

function repBar(reputation) {
  const pct = ((reputation + 100) / 200) * 100;
  return `
    <div class="rep-bar">
      <div class="rep-bar-fill" style="width:${pct}%"></div>
      <div class="rep-bar-mid"></div>
    </div>`;
}

export const GuildScreen = {
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

    const guildPanels = guilds
      .map((guild) => {
        const rep = getReputation(state, guild.id);
        const quests = getQuestsForGuild(guild.id);
        const questRows = quests
          .map((quest) => {
            const status = getQuestStatus(state, quest);
            const isFinal = quest.isFinal;
            let actionHtml = '';
            if (isFinal && status === 'available') {
              actionHtml = `<button data-confront="${quest.id}">Confront</button>`;
            } else if (isFinal && status === 'completed') {
              actionHtml = '<span class="badge produce">Commission complete</span>';
            } else if (status === 'locked') {
              actionHtml = `<span class="subtle">Requires ${guild.name} standing ${quest.requiredReputation}, level ${quest.requiredLevel}</span>`;
            } else if (status === 'completed') {
              actionHtml = '<span class="badge produce">Done</span>';
            } else {
              actionHtml = '<span class="subtle">Take this on from a city\'s Guild Contacts</span>';
            }
            return `
              <div class="quest-card ${isFinal ? 'final' : ''} ${status === 'locked' ? 'locked' : ''}">
                <div class="row spread">
                  <strong>${quest.title}${isFinal ? ' &mdash; Final Commission' : ''}</strong>
                  <span class="subtle">${quest.tier}</span>
                </div>
                <p class="subtle">${quest.description}</p>
                <div class="row spread">
                  <span class="subtle">Reward: ${quest.rewardGold}g, ${quest.rewardXp} xp, +${quest.reputationDelta} rep</span>
                  ${actionHtml}
                </div>
              </div>`;
          })
          .join('');

        return `
          <div class="panel">
            <div class="row spread">
              <h3>${guild.name} <span class="subtle">(${guild.difficulty})</span></h3>
              <span class="subtle">${rep}</span>
            </div>
            <p class="subtle">${guild.tagline}</p>
            ${repBar(rep)}
            <p>${guild.description}</p>
            ${questRows}
          </div>`;
      })
      .join('');

    uiRoot.innerHTML = `
      <div class="panel">
        <h2>Guild Hall</h2>
        <p class="subtle">Reputation ranges from -100 to 100. Completing a guild's final commission ends that
        guild's story and resolves the run.</p>
      </div>
      ${guildPanels}
      <div class="row">
        <button id="back-btn">Back to Map</button>
      </div>
    `;

    uiRoot.querySelectorAll('button[data-confront]').forEach((btn) => {
      btn.addEventListener('click', () => this.confrontBoss(btn.dataset.confront));
    });
    uiRoot.querySelector('#back-btn').addEventListener('click', () => {
      this.screenManager.goTo(MapScreen);
    });
  },

  confrontBoss(questId) {
    const quests = guilds.flatMap((g) => getQuestsForGuild(g.id));
    const quest = quests.find((q) => q.id === questId);
    const encounter = createBossEncounter(quest.bossId);
    this.screenManager.goTo(CombatScreen, { encounter, isAmbush: false, questId: quest.id });
  },

  unmount() {},
};
