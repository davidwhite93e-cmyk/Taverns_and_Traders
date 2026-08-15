# Wayfarer's Ledger — Design Document

This is the source of truth for the game's design. Update it as systems are
added or changed so it never drifts from what's actually implemented.

## Pitch

An original browser-based, open-world trading RPG in the spirit of classic
point-and-click caravan/trading games, built fresh with HTML5 Canvas +
vanilla JS. This is a sandbox, not a linear story: trade, fight, or take up
a guild's cause in any order, and find your own way to one of five endings.
Intended to eventually ship to Android via Capacitor (Part 4 of the project
brief) — not yet started; see Status below.

## Project phases

The brief this game is built from is split into four parts, meant to be
worked in order:

1. **Repo setup** — done.
2. **Core game design spec** — the sandbox loop: world, economy, vessels,
   races/classes, guilds/quests/bosses, combat, endings. **This phase is
   the current focus and what this document describes.**
3. **Polish pass** — medieval tone/naming pass, felt combat (damage
   numbers, hit sounds, pacing), sprite art and animation (caravan travel
   motion, NPC walk cycles, combat sprite states). **Not started.** Gated
   behind Part 2 being fully playable end to end, per the brief.
4. **Android shipping** — Capacitor wrap, touch/mobile hardening, IAP,
   signing, Play Console listing. **Not started.** Gated behind Part 3.

Some touch-first groundwork from Part 4 was pulled forward into Part 2's UI
work since it's cheap to do as screens are built (44px+ tap targets,
disabled pinch-zoom/overscroll/long-press, viewport meta lock) — see
`src/ui/style.css` and `index.html`. That is *not* the same as Part 4 being
started; no Capacitor wrapping, native builds, or IAP work exists yet.

## Status

| System | Status |
| --- | --- |
| World map & cities | Implemented (17 cities, 5 regions, route graph) |
| Economy (pricing, buy/sell, drift) | Implemented + unit tested |
| Travel & vessels | Implemented (6-tier tree incl. Horse/Hand Cart branch) |
| Races & classes | Implemented (5 races, 4 classes, stat modifiers) |
| Leveling | Implemented (XP curve, HP scales with level) |
| Guilds & reputation | Implemented (4 guilds + rival drift) |
| Quests (early/mid) | Implemented (auto-resolve on "Undertake") |
| Guild final questlines & bosses | Implemented (telegraphed, not random) |
| Combat | Implemented (round-by-round, spells, potions, ambush) |
| Endings | Implemented (5 endings: 4 guild + wealth) |
| Save/load | Implemented (localStorage) |
| Medieval tone/naming pass | Not started (Part 3) |
| Sprite art / animation | Not started (Part 3) — currently DOM/canvas-shape UI only |
| Android/Capacitor build | Not started (Part 4) |
| Guild-reputation trade perks (toll discounts, black-market prices, etc.) | **Documented, not mechanically implemented.** Reputation currently gates quest access only; the flavor perks each guild's design describes (safer routes, black-market pricing, better escorts/spells) are not yet wired into the economy or combat systems. Flagged here rather than silently skipped. |

## World

Five regions, each with a distinct economic character:

- **Verdant Reach** — temperate farmland and forest. Grain, wool, hides.
  Strongest Enforcer presence.
- **Ashen Steppe** — arid badlands and mining camps. Iron ore, whetstone.
  Strongest Outlaw presence.
- **Saltmere Coast** — the neutral trade hub, courted by every guild. Salt,
  fish, pearls.
- **Ironspire Highlands** — mountain mining country. Iron ore, copper.
  Enforcer-leaning.
- **The Fenlands** — wetlands and river channels. Peat, resin, barley.
  Outlaw-leaning, with old ruins that draw the Order of the Arcane.

17 cities connect via a route graph (`src/data/routes.json`) of `land` and
`coastal` edges. Not every vessel can use every route — early tiers are
land-only, so the Saltmere Coast region is only reachable once a vessel
capable of coastal roads is bought. Travel uses Dijkstra's algorithm over
the graph, restricted to the routes the player's current vessel is allowed
to take (`src/world/world.js#findPath`).

## Economy

Each good has a base price (`src/data/goods.json`). A city's actual price
for a good is the base price times a modifier: **0.6x** if the city
produces it, **1.6x** if the city demands it, **1.0x** otherwise. Prices
drift daily via a mean-reverting random walk toward that target, with
per-good volatility and a small chance of a price shock
(`src/economy/market.js`). Buying/selling also nudge the local price.

Race and class can grant a `tradeDiscount` (better buy price, better sell
price, applied symmetrically) and a `cargoBonus` (flat extra capacity on
top of the vessel's own hold) — see `src/economy/trade.js`.

Potions are a special good category (`category: "potion"` in
`goods.json`) rather than a separate system — tradeable like anything
else, but carrying a combat `effect` payload (heal / combat buff / speed
buff) that `src/combat/combat.js` and `src/ui/CombatScreen.js` know how to
apply. Currently three: Healing Draught, Vigor Tonic, Wayfarer's Brew.

This is the system most prone to silent bugs, so it has the heaviest unit
test coverage (`tests/economy.test.js`).

## Vessels

Six tiers with a real branch point (`src/data/vessels.json`,
`src/world/vessels.js`):

```
Worn Boots (start)
  ├── Horse        ──┐
  └── Hand Cart    ──┴── Horse Cart ── Covered Wagon ── Armored Wagon ── Land-Ship
```

Horse is fast with modest cargo; Hand Cart is slow with much more cargo —
both feed into Horse Cart once affordable, so an early speed-vs-cargo
choice never locks a player out of the other branch's benefits later.
Each vessel has cost, cargo capacity, speed, a `defenseRating` (reduces
damage taken, especially from ambush strikes — see Combat), and which
route types it can travel. `requiresAnyOf` on each vessel gates purchase
until a prerequisite tier has been owned (`isVesselUnlocked`); a Dwarf's
`armoredVesselDiscount` reduces the cost of the Covered Wagon/Armored
Wagon/Land-Ship tiers specifically.

## Races & classes

5 races, 4 classes (`src/data/races.json`, `src/data/classes.json`,
`src/character/`), combined at character creation
(`src/character/createCharacter.js`) into derived combat/trade/travel
stats:

- **Races:** Human (balanced trade bonus), Dwarf (defense/combat, armored
  vessel discount), Elf (speed, ambush avoidance, starts liked by the
  Order), Half-Orc (combat bonus, starts disliked by the Enforcers, liked
  by Outlaws/Mercenaries), Halfling (cargo bonus, ambush avoidance, weaker
  in a straight fight).
- **Classes:** Merchant (better prices, more starting gold), Scout (speed,
  ambush avoidance), Warrior (combat stats, escort effectiveness), Mage
  (starting mana pool and spellbook, weaker physical attack).

## Leveling

XP curve is a mean-reverting-free simple power curve
(`src/character/level.js`): `xpForLevel(n) = 40 * (n-1)^1.6`. Leveling up
also grows max HP (+12/level) and fully heals — bosses are tuned assuming
a leveled-up character, so HP has to scale with level or late-game fights
become unwinnable regardless of gear (this was caught and fixed during
testing; see `tests/character.test.js`).

## Guilds

Four guilds, each with a difficulty tag, a philosophy, and one designated
rival whose reputation drifts down as you complete quests for the other
(`src/data/guilds.json`, `src/guilds/`):

| Guild | Difficulty | Rival | Rewards |
| --- | --- | --- | --- |
| The Enforcers | Hard | The Outlaws | Warrior/Merchant builds |
| The Outlaws | Easy | The Enforcers | Ranger/Scout builds |
| The Mercenaries | Medium | The Order of the Arcane | Pure combat builds |
| The Order of the Arcane | Medium-Hard | The Mercenaries | Mage/spell builds |

Guild membership isn't exclusive — you can quest for more than one — but
completing a quest for one guild always dings its rival's reputation, so
specialization emerges naturally.

### Quests

Three tiers per guild (`src/data/quests.json`): early (rep 0), mid
(rep 20–35 depending on guild difficulty), and one final commission (rep
45–70, level 4–7) that's gated behind both reputation *and* level so it
can't be walked up to early. Early/mid quests resolve immediately from a
city's Guild Contacts panel (`CityScreen`) — there's no real quest content
behind them yet, just gated reward/reputation transactions
(`src/guilds/quests.js#completeQuest`). The Guild Hall screen
(`src/ui/GuildScreen.js`) is the single place to see reputation, tier
status, and unlock progress across all four guilds at once.

### Final questlines & bosses

Each guild's final quest is resolved through a **telegraphed** boss fight,
not a random encounter — accessed via a "Confront" button on the Guild
Hall once unlocked (`GuildScreen#confrontBoss` →
`combat.js#createBossEncounter`). Bosses live in `src/data/enemies.json`
alongside the common encounter roster, distinguished by `tier: "boss"`:

- **Enforcers →** Vrakthar the Unbound (orc warlord uniting the wildland
  tribes)
- **Outlaws →** The Brazen Warden (a war construct, not yet fully
  empowered)
- **Mercenaries →** Kestra Vane, the Unbeaten (rival company's champion, a
  straight duel)
- **Order of the Arcane →** Threnval, the Ashen Wyrm (an ancient dragon,
  roused by treasure hunters)

Defeating a boss immediately calls
`src/guilds/quests.js#completeFinalQuest`, which records
`state.achievedEnding` and routes straight to the Ending screen — per the
brief, a boss victory *is* the ending trigger, not a separate step.

## Combat

Round-by-round and interactive, not a single auto-resolve tick
(`src/combat/combat.js`, `src/ui/CombatScreen.js`):

1. **Preview phase** — shows enemy composition text (and, for bosses, a
   telegraph line). Non-ambush encounters offer Engage or a pre-emptive
   flee attempt; ambushes skip straight to a forced first strike from the
   enemy (`rollAmbush`, reduced by the player's `ambushAvoidance` stat;
   `applyAmbushStrike`, blunted by the vessel's `defenseRating`).
2. **Active phase** — Attack, cast a known spell (mana-gated, Mage only),
   drink a carried potion (consumes it from cargo), or attempt to flee
   (50/50 normally, guaranteed after the utility spell). Each action
   resolves exactly one round and appends to a combat log.
3. **Resolved phase** — victory grants the enemy's loot gold and XP;
   defeat costs 20% of current gold. A won boss fight also completes its
   final quest and routes to the Ending screen; anything else routes back
   to the city you arrived in.

Escorts (hired in `InventoryScreen`, up to 5, cost scales per hire) add to
both attack and defense, scaled by the class's `escortEffectiveness`
(Warriors get the most out of them). Common encounters
(`tier: "common"` in `enemies.json`) are bandits, fen raiders, rival
caravan guards, and orc raiders, rolled with a per-travel-day chance.

## Endings

Five endings, resolved by `src/guilds/endings.js#computeEndingId`
(`src/data/endings.json`):

- **The Roads Held** (Enforcers) — defeat Vrakthar the Unbound
- **Before It Woke** (Outlaws) — destroy the Brazen Warden
- **The Unbeaten, Beaten** (Mercenaries) — defeat Kestra Vane
- **What Stays Asleep** (Order of the Arcane) — contain Threnval
- **The Ledger of No House** (Wealth) — reach 100,000 gold through trade
  alone, no combat or guild reputation required

Priority: a completed guild final commission always wins over the wealth
threshold, since it's a definitive story conclusion set at the moment the
boss falls (`state.achievedEnding`), not re-derived from current stats
each time. If neither condition is met yet, retiring shows a progress
screen (reputation/level toward each guild's final quest, gold toward
100,000) rather than forcing a premature or "failure" ending — there is no
failure ending in this design, only "not yet."

## Save/Load

Game state is a single JSON-serializable object (player — including race,
class, level, XP, mana, spells, combat stats, cargo, owned vessels — plus
market, reputation, completed quests, and `achievedEnding`), persisted to
`localStorage` after every meaningful action (`src/state/GameState.js`).

## A bug worth remembering

Twice during development, a screen's DOM-rebuild method was named
`render()`, which collided with the engine's per-frame canvas hook of the
same name — the whole panel and every event listener got rebuilt ~60
times a second, and browser-only symptoms (detached-element errors) showed
up that neither lint nor the unit tests could catch. Fixed structurally,
not just by renaming: the per-frame hook is now called `draw(ctx, canvas)`
(`ScreenManager#draw`), which can't collide with a screen's own
`renderPanel()` convention. If you add a new screen, give its DOM-rebuild
method a name other than `render` regardless — but the point is this
class of bug is now structurally impossible, not just avoided by
convention.

## Content policy

No names, text, city lists, item names, class/race names, or art are
copied from any existing commercial game. Same genre and D&D-style
conventions, original IP throughout.
