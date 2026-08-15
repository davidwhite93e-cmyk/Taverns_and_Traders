# Wayfarer's Ledger

An original browser-based trading RPG inspired by classic point-and-click
caravan/trading games. Travel between the frontier cities of a hand-built
world, buy low and sell high, upgrade your vessel, earn standing with one of
two rival factions (or neither), and see how your ledger reads when the
journey ends. Built fresh with HTML5 Canvas and vanilla JavaScript — original
world, cities, goods, factions, and story throughout.

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
- HTML5 Canvas for the world map and rendering
- [Vite](https://vitejs.dev/) for dev server and bundling
- [Vitest](https://vitest.dev/) for unit tests, focused on the economy math
- Game data (cities, goods, factions, vessels, quests) is plain JSON in
  `src/data/`, kept separate from game logic so balancing doesn't require
  code changes

## Project status

Core loop is playable end-to-end: character creation → travel the world map
→ trade in cities → upgrade your vessel → take on faction quests → survive
random road encounters → retire into one of four endings. See
[`docs/DESIGN.md`](docs/DESIGN.md) for the full design spec and current
system status, and open issues/PRs for the roadmap.
