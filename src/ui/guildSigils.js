/**
 * Small original procedural sigils, one per guild, matching the `sigil`
 * flavor text in src/data/guilds.json. Plain inline SVG (no image assets)
 * so they scale cleanly and cost nothing to ship.
 */
const SIGILS = {
  // "a bronze roadmark within a broken chain"
  enforcers: (size) => `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#8a6a3f" stroke-width="6" stroke-dasharray="16 8" />
      <circle cx="50" cy="50" r="24" fill="#a8791f" stroke="#2b1d10" stroke-width="3" />
    </svg>`,

  // "a black lantern with no flame"
  outlaws: (size) => `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      <path d="M40 35 L60 35 L50 18 Z" fill="#2b1d10" />
      <circle cx="50" cy="16" r="5" fill="none" stroke="#2b1d10" stroke-width="3" />
      <rect x="30" y="35" width="40" height="45" rx="4" fill="#2b1d10" />
      <rect x="36" y="41" width="28" height="33" rx="2" fill="#0f0a06" />
      <line x1="28" y1="80" x2="72" y2="80" stroke="#2b1d10" stroke-width="4" />
    </svg>`,

  // "two crossed spears over a coin"
  mercenaries: (size) => `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="50" cy="50" r="30" fill="#a8791f" stroke="#2b1d10" stroke-width="3" />
      <line x1="20" y1="20" x2="80" y2="80" stroke="#2b1d10" stroke-width="5" />
      <line x1="80" y1="20" x2="20" y2="80" stroke="#2b1d10" stroke-width="5" />
      <path d="M80 80 L90 84 L84 90 L76 84 Z" fill="#2b1d10" />
      <path d="M20 80 L10 84 L16 90 L24 84 Z" fill="#2b1d10" />
    </svg>`,

  // "an open eye inside a spiral of stars"
  arcane_order: (size) => `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      <path d="M50 12 A38 38 0 1 1 12.5 50" fill="none" stroke="#a8791f" stroke-width="2" opacity="0.7" />
      <ellipse cx="50" cy="50" rx="26" ry="14" fill="#ecdfc0" stroke="#2b1d10" stroke-width="3" />
      <circle cx="50" cy="50" r="8" fill="#2b1d10" />
      <circle cx="20" cy="30" r="2" fill="#a8791f" />
      <circle cx="78" cy="24" r="2" fill="#a8791f" />
      <circle cx="85" cy="60" r="2" fill="#a8791f" />
      <circle cx="16" cy="66" r="2" fill="#a8791f" />
    </svg>`,
};

export function guildSigilSvg(guildId, size = 28) {
  const draw = SIGILS[guildId];
  return draw ? draw(size) : '';
}
