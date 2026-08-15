/**
 * Presentation-only currency/reward formatting for the medieval tone pass.
 * The underlying state field stays `gold` (renaming it would be an
 * invasive refactor for a purely cosmetic change) — this only affects what
 * the player reads.
 */
export function formatCoin(amount, { long = false } = {}) {
  const rounded = Math.round(amount * 100) / 100;
  return long ? `${rounded} crowns` : `${rounded}cr`;
}

export function formatQuestReward(quest) {
  return `Reward: ${formatCoin(quest.rewardGold, { long: true })}, ${quest.rewardXp} renown, +${quest.reputationDelta} standing`;
}
