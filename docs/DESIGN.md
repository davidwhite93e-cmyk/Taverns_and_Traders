# Wayfarer's Ledger — Design Document

This is the source of truth for the game's design. Update it as systems are
added or changed so it never drifts from what's actually implemented.

## Pitch

An original browser-based trading RPG in the spirit of classic point-and-click
caravan/trading games, built fresh with HTML5 Canvas + vanilla JS. Travel a
frontier of original cities, buy low and sell high, upgrade your vessel, earn
standing with one of two rival factions (or neither), survive the road, and
reach one of several endings.

## Status

| System | Status |
| --- | --- |
| World map & cities | Implemented (17 cities, 5 regions, route graph) |
| Economy (pricing, buy/sell, drift) | Implemented + unit tested |
| Travel & vessels | Implemented (5 vessel tiers, route-type gating) |
| Factions & reputation | Implemented (2 factions + neutral path) |
| Quests | Implemented (basic threshold-gated quest hooks) |
| Combat | Implemented (auto-resolve turn-based, flee option) |
| Endings | Implemented (4 endings) |
| Save/load | Implemented (localStorage) |
| Art/audio | Not started — placeholder canvas shapes only |

## World

Five regions, each with a distinct economic character:

- **Verdant Reach** — temperate farmland and forest. Grain, wool, hides.
  Strongest Concord presence.
- **Ashen Steppe** — arid badlands and mining camps. Iron ore, whetstone.
  Strongest Free Caravans presence.
- **Saltmere Coast** — the neutral trade hub. Salt, fish, pearls. Courted by
  both factions.
- **Ironspire Highlands** — mountain mining country. Iron ore, copper.
  Concord-leaning.
- **The Fenlands** — wetlands and river channels. Peat, resin, barley.
  Free Caravans-leaning.

17 cities connect via a route graph (`src/data/routes.json`) of `land`,
`river`, and `coastal` edges. Not every vessel can use every route — a river
barge is useless inland, and an ox wagon can't cross open water. Travel uses
Dijkstra's algorithm over the graph, restricted to the routes the player's
current vessel is allowed to take (`src/world/world.js#findPath`).

## Economy

Each good has a base price (`src/data/goods.json`). A city's actual price for
a good is the base price times a modifier:

- **0.6x** if the city *produces* that good (cheap to buy there)
- **1.6x** if the city *demands* that good (sells high there)
- **1.0x** otherwise

Prices drift daily via a mean-reverting random walk toward that target, with
per-good volatility and a small chance of a price shock (`src/economy/market.js`).
Buying and selling also nudge the local price up/down slightly, so dumping a
huge quantity of one good in one city measurably moves its price.

This is the system most prone to silent bugs, so it has the most thorough
unit test coverage (`tests/economy.test.js`).

## Vessels

Five tiers, gated by cost and by which route types they can travel
(`src/data/vessels.json`):

1. **Worn Boots** — on foot, free, land only
2. **Handcart** — more cargo, land only
3. **Ox Wagon** — real cargo capacity, land only
4. **River Barge** — fast, big hold, river/coastal only
5. **The Ledgerwind Caravan** — endgame vessel, all route types

## Factions

Two rivals, plus a neutral path:

- **The Ledgerbound Concord** — regulated trade, tariffs, order.
- **The Free Caravans** — independent, anti-tariff, self-reliant.
- **Unaligned Wayfarer** — not a faction; the reward for currying favor with
  neither.

Reputation is tracked per faction from -100 to 100. Quests
(`src/data/quests.json`) unlock at reputation thresholds and, on completion,
grant gold and reputation with their faction (usually at the rival faction's
expense) — see `src/factions/quests.js`.

## Combat

Simple auto-resolve turn-based combat against bandits or rival caravan
guards, triggered with a per-day chance while traveling
(`src/combat/combat.js`). Player attack/defense scale with hired escorts.
Losing costs gold, not the game — there is no permadeath, only a costlier
road.

## Endings

Resolved from final gold + faction standing (`src/factions/endings.js`):

- **The Chartered Magnate** — high wealth, strong Concord standing
- **The Unbroken Wheel** — high wealth, strong Free Caravans standing
- **The Ledger of No House** — high wealth, no strong allegiance
- **The Long Road Back** — insufficient wealth, regardless of reputation

## Save/Load

Game state is a single JSON-serializable object (player, market, reputation,
current city, elapsed days, completed quests) persisted to `localStorage`
after every meaningful action (`src/state/GameState.js`).

## Content policy

No names, text, city lists, item names, or art are copied from any existing
commercial trading game. Same genre conventions, original IP throughout.
