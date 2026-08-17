# Wayfarer's Ledger

An original browser-based, open-world trading RPG inspired by classic
point-and-click caravan/trading games. Create a character, pick a race and
class, and set out on a sandbox: trade, fight, or take up a guild's cause in
whatever order you like. Travel a hand-built world of 17 cities buying low
and selling high, upgrade your vessel from Worn Boots up to a Land-Ship,
earn (or spend) standing with four rival guilds, and find your own way to
one of five endings — including a wealth path that needs no combat or
guild reputation at all. Built fresh with HTML5 Canvas and vanilla
JavaScript — original world, cities, goods, guilds, races, classes, and
story throughout. Eventually intended to ship to Android; see Roadmap.

![Screenshot placeholder](docs/screenshot-placeholder.png)

## Local development

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

Other scripts:

```bash
npm run build     # production build
npm run preview   # preview the production build
npm test          # run the unit test suite (Vitest)
npm run lint      # lint the codebase (ESLint)
```

## Tech stack

- Vanilla JavaScript (ES modules), no framework
- HTML5 Canvas for the world map
- [Vite](https://vitejs.dev/) for dev server and bundling
- [Vitest](https://vitest.dev/) for unit tests (56 tests across economy,
  combat, guilds/endings, character/leveling, and vessel progression)
- Game data (cities, goods, guilds, races, classes, spells, vessels,
  quests, enemies, endings) is plain JSON in `src/data/`, kept separate
  from game logic so balancing doesn't require code changes
- Built touch-first from the start (44px+ tap targets, no hover-dependent
  UI, disabled pinch-zoom/overscroll) since Android is the eventual target

## Project status

The core sandbox loop is playable end-to-end: character creation (race +
class) → travel the world map → trade in cities (goods and potions) →
upgrade your vessel through a branching tree → take on guild quests → fight
common road encounters with round-by-round combat (attack, spells,
potions, flee) → confront a guild's telegraphed final boss → retire into
one of five endings, or keep going and try for a different one.

This is Part 2 of a four-part build (see
[`docs/DESIGN.md`](docs/DESIGN.md) for the full spec and per-system
status):

1. **Repo setup** — done
2. **Core game design** — the sandbox loop described above — **done,
   playable end to end**
3. **Polish pass** — **in progress**: medieval tone/naming pass (parchment
   UI, "crowns"/"renown"/"standing" copy), animation/sprite groundwork
   (procedural vessel sprites, an animated caravan that travels the map in
   real time), and combat hit feedback (damage numbers, screen shake,
   synthesized hit/crit/heal/flee sounds, punchier log lines) are all
   landed; background NPC loops, on-screen combat sprites, and ambient
   audio are **not started**
4. **Android shipping** — Capacitor wrap, IAP, Play Store listing — **not
   started**

`docs/DESIGN.md` also tracks known gaps honestly rather than glossing over
them — e.g. guild-reputation trade perks (toll discounts, black-market
pricing) are designed but not yet mechanically wired up.
