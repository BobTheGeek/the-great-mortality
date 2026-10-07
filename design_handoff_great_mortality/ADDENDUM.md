# Addendum: The Great Mortality — build spec for Claude Code

Read this after `README.md`. **Where this addendum and the README disagree, this addendum wins.** The README remains the source of truth for visual design: layout, tokens, components, motion, and screen anatomy. This document adds what the design handoff couldn't specify: the simulation, the mystery logic, all content, copy corrections, and the PWA build requirements.

## What's new in this bundle

| Path | What it is |
|---|---|
| `ADDENDUM.md` | This file. |
| `content/sim-spec.json` | **All game content and tuning.** Towns, routes, decrees, advisors, the four questions, theories, clues, solve rules, 24 Codex entries, 5 Chronicles with quizzes, 8 Myth-Buster Cards, epithets, scripted events, endings, and every simulation parameter. |
| `reference/engine.js` | Reference simulation engine (plain JS, no DOM, ~300 lines). Behavior and numbers are the contract. Port it or use it as-is. |
| `reference/harness.js` | Headless balance check. `node reference/harness.js content/sim-spec.json 300` plays seven strategies × 300 seeds and reports survival, epithets, clue discovery, and how many games it takes to solve the mystery. |

---

## 1. Architecture: content is data, the engine is generic

This is the first of a planned series of curriculum sims, so keep three layers separate:

1. **Engine:** the network-spread simulation and game rules. It knows nothing about the plague by name; everything comes from `sim-spec.json`.
2. **Shell:** the frame, leaves, tabs, sheets, Evidence Board, Codex, Chronicles, Cards, end screen, and persistence. It renders whatever the spec contains.
3. **Skin:** Mortality visuals (map SVG, emblems, palette) per the README.

Rules for Claude Code:

- **No game copy in components.** Every player-facing string that's in the spec must come from the spec. UI chrome labels from the README (such as "Decrees of the Steward · tap one to issue") can live in the shell.
- **Load the spec at startup** and validate it (ids resolve, `[[term]]` links resolve, exactly one correct theory per question). Fail loudly in dev mode.
- **Keep `reference/harness.js` passing** against whatever engine ships. Add it to the test suite. If the engine is ported, keep a headless entry point the harness can drive.

### Inline Codex markup

Copy in the spec uses `[[term-id]]` or `[[term-id|display text]]`. Render it as the README's inline Codex term (bold and underlined, tap opens the popover).

- Rendering a term on screen marks it **seen**. The Codex index shows seen terms; unseen terms stay silhouetted.
- **Never put Codex markup inside a decree row.** Tapping the row issues the decree, so a nested tap target would conflict. Decree descriptions in the spec contain none.
- The Codex has **24 terms**; use `codex.length` for counts ("9 of 24 terms seen"), never a hard-coded number. All 24 are reachable through normal play (verified).

---

## 2. Turn flow

```
New game → opening (5 narration lines) → title card + name → map (November 1347, month 0)
Each month:
  Player issues 0–2 decrees (lifting a toggle is free and uses no slot)
  End month → engine.endMonth()
    → Month report sheet (always)
    → Clue and unlock moments (verdict-style toasts or report rows)
    → Scripted event sheet (if one fired, e.g. Fear and Blame)
    → Advisor sheet (see schedule below)
    → Map (darkening crossfade)
  Run ends when: month 18 completes (normal), unrest hits 100 (overthrown), or Flee (fled)
After any ending: the engine auto-plays remaining months with no new decrees (for the reckoning numbers), then the end screen.
```

Months are 0-indexed: month 0 = November 1347, month 17 = April 1349. `sim.startCalendarMonth` is 10 (November, 0-based).

**Save after every decree and every month end**, so closing the app mid-game loses nothing.

### Advisor schedule

- Months 0–3 introduce each advisor once, in the order Merchant (after month 0), Physician, Priest, Astrologer. The astrologer's first appearance earns the "Everyone blamed God's punishment" card.
- From month 4 on, an advisor appears after about 40% of month reports. Never show the same advisor twice in a row.
- Choose the line from the advisor's `lines` pool by context: `winter` in December–February, `spreading` once any town has burials, otherwise `early`. Don't repeat a line within a run if alternatives exist.
- An advisor's offered decree, if accepted, is issued at the start of the next month and uses one of that month's two slots, as the README says. The Merchant's offers are **lifts** (`lift:hold-ships`, `lift:close-port`), which are free and use no slot. Only show an offer that's currently valid; if none is, show only "Thank him, and no."

---

## 3. The simulation (supersedes README "Simulation hooks")

The README's "author's model" was a placeholder and contradicts the game design in several places. **Discard it.** The real model lives in `reference/engine.js` with parameters in `sim-spec.json → sim`. In plain terms:

- **Each town** has people (healthy, sick with bubonic, sick with pneumonic, dead, recovered) and a rat colony (healthy, infected, dead). The player never sees the rats until the Physician's Lens is unsealed.
- **Rats get sick first.** Plague sweeps through a rat colony; as rats die, their fleas jump to people. That's why the "dead rats in the granary" clue appears before a town's first burial.
- **Human fleas and lice** spread bubonic plague between people at a lower rate. This supports the "Rats spread it: Partly True" card.
- **Pneumonic plague** is a share of bubonic cases (higher in winter). It spreads by coughing and ignores the season. It's sub-critical on its own and only flares in winter or with crowding.
- **Season** scales the flea-driven spread (strong in summer, weak in December–February), which produces the winter lull clue.
- **Ships** arrive monthly. Early on they're very likely infected. Some are grain ships with healthy crews but rats and fleas in the hold, which is the grain-ship clue.
- **Overland arrivals** reach Santa Lucia from outside the region starting in month 3. Holding the port alone is never a complete solution.
- **Roads** carry infection in proportion to trade. Fontenera's footpath carries almost none.
- **The ragman's cart** moves infected cloth from a ravaged town to a healthy neighbor.
- Simulation runs in 4 weekly ticks per month.

### What each decree really does

This is never shown to the player. It's in each decree's `truth` field in the spec, for you and for dev mode.

| Decree | Real effect |
|---|---|
| Hold ships offshore | **Works.** Blocks infected ships (8% leak). Lower tolls. Unrest +3, then +2/month. |
| Close the port | **Works best on the sea route,** but no tolls and hunger: unrest +6, then +8/month. Usually ends in being overthrown unless unrest is managed. |
| Seal a town's roads | **Works.** Closes every route touching the town, including the footpath. Halves its tithes. Unrest +3, then +3/month per sealed town. |
| Clean streets and granaries | **Helps, for the wrong reason.** Fewer rats near people: kills 15% of that town's rats now, dampens rat spread 10% for the rest of the run. |
| Burn herbs | **Nothing.** Unrest −2. Can trigger the herb-fires clue. |
| Hire physicians | **Nothing** to deaths. Unrest −5. Earns the beaked-mask card. |
| Procession | **Backfires.** Unrest −8, but person-to-person spread ×1.8 in that town that month. |
| Close bathhouses | **Nothing.** Unrest +4. Earns the bathing card. |
| Flee | Ends the run ("the Fled"). |

### Balance targets (tested: 300 seeds per strategy, on the shipped spec)

| Strategy | Avg survival | What it should teach |
|---|---|---|
| Do nothing | 58% | Roughly matches history's ~60%. |
| Herbs + physicians every month | 58% | Medieval medicine changed nothing. |
| Processions every month | 38% | Sincere, comforting, and deadly. |
| Hold ships only | 64% | Quarantine helps, but the plague finds other routes. |
| Close the port all game | 69% | Effective, but 75% of these runs end overthrown. A real tradeoff. |
| Careful (hold ships + clean port and market) | 73% | |
| Smart (hold ships, clean, seal outbreaks as they appear) | 83% | Best play beats history clearly. |

If you change any `sim` parameter, re-run the harness and keep results within about 5 points of these. The ordering must hold: processions < nothing ≈ medicine < hold ships < careful < smart.

### Economy

- Start: **3,000 florins**.
- Monthly income: tithes of 0.04 fl per living person (halved for sealed towns), plus port tolls of 500 if open, 200 if ships are held, 0 if the port is closed.
- Decree costs are charged once, when issued. Toggles cost nothing to keep; their ongoing cost is lost income and unrest. Lifting is free, with no refund.
- Treasury can't go negative. A decree you can't afford shows the README's unaffordable state.

### Unrest

- Starts at 10.
- Each month: −4 natural decay, plus a death term (1.2 × that month's regional death rate in percent, capped at +15), plus each toggle's monthly cost. Then a one-time amount when each decree is issued (see the table above).
- Clamp to 0–100. At 100, the run ends as overthrown.
- Band words come from `unrestBands` in the spec.

### Randomness

The engine uses a seeded generator (mulberry32). Store the seed with the run so a resumed game continues identically. Dev mode can set the seed.

---

## 4. The mystery (supersedes README 2h–2i where they differ)

Everything is in `sim-spec.json → mystery`.

### Questions, theories, and solving

- Four questions, each with four theories. Exactly one is `correct`. Theory text for Question II is the README's verbatim copy; Questions I, III, and IV are new.
- Each question has a `solveRule`: `all` clues required, plus at least `need` clues from `anyOf`.
  - **I:** "Galleys from the East" plus (quarantined galley *or* village with no road).
  - **II:** any 2 of quarantined galley, village with no road, ragman's cart, grain ship.
  - **III:** dead rats plus (ragman's cart *or* grain ship).
  - **IV:** winter lull plus coughing sickness.
- **Verdicts:**
  - Correct theory and rule met → **Solved.** Use the question's `solvedSummary`.
  - Correct theory, rule not met → **Not yet.** Use the question's `notYetHint` as the hint line.
  - Wrong theory → **The clues say no.** Show the first clue the player has found whose `against` list includes that theory. If they've found none, show `verdicts.wrong.noClueText`. For theories flagged `religious`, use `religiousText` as the lead-in. This keeps the tone respectful, as specified.
- Wrong answers have no penalty and no limit. This is how he learns.

### Clues

- Nine clues. **"The physician who never fell ill" is removed:** physicians actually died in large numbers, so the clue taught something false. It's replaced by **"The grain ship."**
- A clue is pinned to every question in its `questions` list. Its `for` and `against` arrays drive the FOR/AGAINST marker chips on the scrap.
- Triggers are described in each clue's `trigger` field and implemented in the engine (`report.clues` from `endMonth`). `{town}` in text comes from the engine's clue payload.
- When a clue is found for the first time, add its `reportText` to the month report's "It is written that" column, and add the scrap to the "Pinned to the Evidence Board" box.
- Found clues **persist across all stewardships.**

### Assist rule (prevents frustration)

Tested pacing without help: median 3 games to solve everything, but some unlucky players needed 13. With the assist, the median is 3, the 90th percentile is 4, and the maximum is 5.

- Track how many completed stewardships each of `c-dead-rats`, `c-coughing`, and `c-ragman` has gone unfound.
- After **3** stewardships without one, pass it in `assistClues` when creating the next run. The engine then surfaces it more readily (thresholds in `sim.assist`).
- Never mention the assist to the player.

### Physician's Lens

- Unseals when all four questions are solved, then shows the README 2j reveal, then the 2k overlay.
- Overlay data comes from engine state: rat colony fraction per town (`ratS + ratI`), recent rat deaths for the flea arcs, pneumonic case counts for the breath marks.
- Legend copy is in `mystery.lensReveal.legend`.
- Draw the gold "spared" ring at Fontenera **only if Fontenera has no burials in this run.**

---

## 5. Unlocks

| Thing | Unlock condition (`unlock` / `earn` in the spec) |
|---|---|
| Chronicle: Ships from Caffa | Opening |
| Chronicle: Fear and Blame | The Fear and Blame event fires |
| Chronicle: Forty Days | First "quarantined galley" clue |
| Chronicle: The Great Mortality | First stewardship ends (any ending) |
| Chronicle: The Answer | Lens unsealed |
| Card I: beaked mask | First Hire physicians |
| Card II: "Black Death" name | First stewardship ends |
| Card III: Ring Around the Rosie | First time any town reaches Burned out |
| Card IV: bathing | First Close the bathhouses |
| Card V: rats (Partly True) | Question III solved |
| Card VI: God's punishment | Astrologer's first appearance |
| Card VII: quarantine | First "quarantined galley" clue |
| Card VIII: plague extinct | Lens unsealed |

Card captions contain `{month}` and `{town}`; fill them in from when and where the card was earned.

**Chronicle quizzes:** two questions each, multiple choice, in the spec. Record per-chronicle results (correct on first try, attempts). Mark a chronicle "needs review" if either question was missed on the first try, and show a small seal-red dot on it in the page list until he answers both correctly. This mirrors Mach Ops' per-concept tracking.

### Timeline (corrects README 2n)

Exactly five pins, one per chronicle, at the years in `chronicles[].pinYear`:

- 1346: Ships from Caffa
- 1348: Fear and Blame
- 1351: The Great Mortality (the end of 1348–51)
- 1377: Forty Days
- 1894: The Answer

**Remove the 1665 pin**; it has no content and falls outside this unit. Keep the italic band note, which is in `timeline.note`.

### Scripted event: Fear and Blame

- Fires once, in the first month from May 1348 (month 6) through November 1348 (month 12) in which Santa Lucia has burials. Unrest +3.
- If Santa Lucia never gets the plague, it doesn't fire that run.
- Copy is in `scriptedEvents[0]`. Render it exactly per README 2p.

---

## 6. Epithets (supersedes README "Derived")

Evaluate in this order; the first match wins:

1. the Fled
2. the Overthrown
3. the Iron Gate
4. the Merchant Prince
5. the Devout
6. the Wise
7. the Steady
8. the Unlucky

Rules are in `epithets.list[].rule` and implemented in `engine.epithet()`.

**Change from the README:** "the Wise" no longer requires solving a question in the current run, because a player who had already solved the mystery could never earn it again. It now requires **at least 75% survival and at least 6 town-months of quarantine measures.**

**Citations are generated, not fixed.** The README's "who held the ships at sea and sealed the roads…" is an example, not static text. Build `{actions}` from the two most-used actions this run, using `epithets.actionPhrases` and the rule in `actionPhraseRule`.

---

## 7. Copy corrections to the design

| Where | Change |
|---|---|
| 2a Opening | Add a **fifth narration line** (in the spec) connecting Messina to the player's port. Progress dots go from 4 to 5. |
| 2a Title card | Body text now contains `[[steward]]`, so his first Codex term arrives on screen one. This matches the empty-state copy "One word so far: yours." |
| 2p Fear and Blame | "the moneylender's family" → **"the bookbinder's family."** Moneylending is the core of a lasting antisemitic stereotype, and this is the moment the game teaches against stereotyping. All other copy is unchanged. |
| 2q End screen | "~60%" under "What history saw" → **"~60% survived"**, so it doesn't read as a death rate. |
| 2q Epithet citation | Generated per run (section 6). |
| 2s Fled | "told stories for a hundred days" → **"told a hundred stories over ten days."** That's the Decameron's actual structure. |
| 2h Clues | "The physician who never fell ill" → **"The grain ship"** (section 4). |
| 2l/2m Codex | Counts come from the spec (24 terms). |
| 2n Timeline | Five pins; remove 1665 (section 5). |
| 2y Settings | **Remove the Sound row.** No sound design is in scope; add it back when there's audio. |
| Flee confirm | Replace the 1.2-second hold with a **second-tap confirm** ("Tap again to leave"). The README forbids long-press elsewhere, and a hold is harder on a tablet. |
| 2b Return visit | "Settings" in the footer still opens the Paused sheet. |

---

## 8. PWA and iPad requirements

### Install and storage (critical)

- **iPadOS keeps Safari-tab storage and home-screen-app storage separate.** Progress made in a Safari tab does not carry over after Add to Home Screen. So in Safari (not standalone), show the README 2y "Add to Home Screen" hint **before the first game starts**, not partway through. Detect standalone with `navigator.standalone` or `matchMedia('(display-mode: standalone)')`. Allow "Later," but warn once that progress won't carry over.
- Call `navigator.storage.persist()` on first launch in standalone mode.
- Use IndexedDB for persistent data, with localStorage as fallback. Wrap every read and write; render correctly if storage is empty.
- **Progress backup:** in the Paused sheet, add "Copy progress code" and "Restore from code." This is a compact base64 encoding of the persistent state, a safety net if storage is ever cleared.

### Manifest and service worker

- `manifest.webmanifest`:
  - `display: "standalone"`, `orientation: "any"`
  - `background_color: "#3a2a1c"`, `theme_color: "#3a2a1c"`
  - icons 192 and 512 PNG from `assets/`
- In HTML: `apple-touch-icon` (180 px), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, and `viewport-fit=cover`.
- Service worker:
  - Cache the app shell and all assets on install, using a **versioned cache name**.
  - Serve cache-first.
  - On a new version, show a small parchment toast, "A new edition of the ledger is ready," with a "Reload" button. Never reload mid-turn without asking.
  - Without this flow, updates you ship will never reach the iPad.
- Fonts: system only (Iowan Old Style → Palatino → Georgia; Avenir Next → Avenir → system). No network requests at runtime.

### Sizing across iPads

The README specifies everything at 1180×820 (11" iPad). Treat that as the **reference size, not a fixed canvas.** The leaves are fluid within the walnut frame. Test at:

| Device | Landscape | Portrait |
|---|---|---|
| iPad mini | 1133×744 | 744×1133 |
| iPad / iPad Air 11" | 1180×820 | 820×1180 |
| iPad Pro 13" | 1366×1024 | 1024×1366 |

The map leaf keeps `preserveAspectRatio="xMidYMid slice"`, and Fontenera must stay fully visible at every size. The decree list scrolls inside the ledger leaf if needed; the page body never scrolls. Touch targets stay at least 44 pt at every size.

Also:
- Disable double-tap zoom (`touch-action: manipulation`).
- Disable overscroll bounce on the frame.
- Disable text selection on UI chrome, but allow it on chronicle body text.

---

## 9. Dev mode (for Bob)

Hidden entry: **tap the compass rose on the map 7 times.** It opens a dev sheet with:

- Seed (view, set, new game with this seed).
- Skip to month N; run to the end.
- A live table per town: S/I/P/D/R, rat colony, rat infection. This is the engine's truth.
- Toggle Lens overlay regardless of unlock status.
- Unlock all (clues, Codex, chronicles, cards, epithets) and reset all.
- Fire any scripted event or clue on demand, to review copy.
- Run the balance harness in-browser and show its summary.

Dev mode must not be reachable by accident, and nothing in it should appear in normal play.

---

## 10. Testing

- Unit-test engine rules against `reference/engine.js` behavior with fixed seeds.
- Keep the balance harness as an automated test. Fail if the strategy ordering in section 3 breaks.
- Use Playwright with WebKit at the three iPad viewports in section 8, in both orientations, covering: opening → first month → Evidence Board verdict states → end screen.
- Validate the spec at startup (section 1).

## Out of scope for v1

- Act II: the sealed tab stays, non-interactive.
- Sound.
- Commissioned art: advisor portraits, woodcuts, galley art. Keep the README placeholders until art exists; the spec doesn't depend on it.
