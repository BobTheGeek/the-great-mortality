# Handoff: The Great Mortality — Black Death mystery game (iPad PWA)

> **Read `ADDENDUM.md` next.** It adds the simulation, mystery logic, full content (`content/sim-spec.json`), copy corrections, and PWA requirements. Where the two disagree, the addendum wins.

## Overview
An educational strategy game for a 12-year-old (Tennessee 7th-grade World History, standards 7.27–7.39). The player is the steward of a fictional six-town Italian coastal region, November 1347 to April 1349 (18 monthly turns). Each month: up to 2 decrees, End month, plague spreads. The real goal is solving a four-question mystery on an Evidence Board; that progress persists across playthroughs. The design is also a **reusable shell** (frame, two leaves, tab row, sheets, meters, stamps) with a **Mortality skin**; future sims reskin the shell.

Working title "The Great Mortality" (the 1348 name for the plague).

## About the Design Files
The files in this bundle are **design references created in HTML** — static hi-fi artboards showing the intended look and behavior. They are not production code. Recreate them in the target environment (recommended: a vanilla or lightweight-framework PWA with inline SVG; no build-time dependency on remote assets). If a codebase exists, follow its patterns.

`The Great Mortality.dc.html` opens in a browser as a zoomable canvas. Each artboard has an id (1a–1c, 2a–2y, 3a–3f) referenced below. Turn 1 (1a, 1c) are rejected directions and are kept only for history; **1b is the approved direction** and everything in turns 2 and 3 is built on it.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy and states are final unless noted. Exceptions, which are placeholders: advisor portraits, myth-card woodcuts, and the galley silhouettes in the opening. Hatched boxes labeled in monospace mark where art goes. The map, town emblems, and icon are real SVG assets (see Assets).

## Platform constraints (from the brief)
- PWA installed to iPad home screen, standalone, fullscreen. Touch only: no hover, keyboard shortcuts, or right-click. Min target 44×44pt.
- Landscape primary (design at 1180×820). Portrait must work (820×1180).
- Respect safe areas (`env(safe-area-inset-*)`) and the home indicator: the walnut frame (16pt + inset) absorbs them.
- Fully offline. Fonts: Iowan Old Style → Palatino → Georgia; Avenir Next → Avenir → system. No remote fonts or images. Art is SVG/CSS.
- Body text ≥17pt. Contrast ≥4.5:1 (ratios listed under Tokens). `prefers-reduced-motion` respected (fallback per motion row below). Never color alone: every state has a shape and a word.
- Age-appropriate: loss is shown via map darkening, shuttered discs, numbers. No bodies or disease imagery.

---

## Shell anatomy (all screens)
- **Frame**: `#3a2a1c` walnut, radius 18, padding 16 (+ safe-area insets). Late game lerps to `#1f150c`.
- **Leaves**: two parchment pages. Landscape: hero leaf 760 wide (left), spine 14, ledger leaf flex (right). Portrait: hero leaf 600 tall (top), spine 14 horizontal, ledger leaf below. Leaf radius 10 on the outer corners only, 2 on the spine side. Parchment: `radial-gradient(ellipse at 40% 40%, #efe3c9 0%, #e3d2ad 65%, #cdb686 100%)`. Inner shadow toward the spine: `inset -12px 0 18px -12px rgba(0,0,0,.5)` (mirrored on the other leaf; vertical in portrait).
- **Spine**: `linear-gradient(to right, #2a1c10, #5a4028 50%, #2a1c10)` (to bottom in portrait).
- **Tab row** (reference screens only): height 48 above the leaves. Inactive tab: height 40, `#5a4028` bg, `#efe3c9` text 15px, 1.5 border `#7a5a3a` (no bottom), radius 6 6 0 0. Active tab: height 48, `#efe3c9` bg, ink text 17px 700, `inset 0 3px 0 #8b2e2e`. Leftmost tab "← Map". Rightmost: a dashed sealed tab "● Act II" at 60% opacity (reserved for Act II; non-interactive). Right-aligned italic status text 14px on-dark at 75%.
- **Sheet** (all modals): a loose page over the dimmed spread (`filter: brightness(.5–.6)` on both leaves, or a scrim). Background `radial-gradient(ellipse at 50% 20%, #f7ecd6, #e3d2ad)`, triple rule border `inset 0 0 0 1.5px #4a2f1d, inset 0 0 0 4px #f7ecd6, inset 0 0 0 5px #b8902e`, shadow `0 24px 60px rgba(0,0,0,.6)`, radius 3. Widths: advisor 720, report 880×740, verdict 380, popover 520, event 640 (plain `#f3eadb`, single 1.5 ink rule, no gold). Portrait: full width minus 60–92, centered across the horizontal spine.
- **Drop cap**: first letter of month/page headings in `#8b2e2e`, ~1.45× the heading size, `line-height:0; vertical-align:-6px`.

---

## Screens

### 2a Opening scene (night)
Background `radial-gradient(ellipse at 50% 85%, #3b3a3a 0%, #1f2129 45%, #101218 100%)`. Full-bleed SVG: moon (two circles), skyline silhouette `#0b0c10` at y 330–470, horizon line, hatched sea (`#efe3c9` lines, .18 α, step 12, rotate −10°), three galley silhouettes (hull path + mast + 6 oar strokes), three gold `#b8902e` window dots.
- Top-left label `MESSINA · OCTOBER 1347` 12px Avenir 600 tracking 2, 70% on-dark. Top-right: 4 progress dots (8px; filled = past lines) + `TAP TO CONTINUE · SKIP`.
- Narration: centered, 34px italic on-dark, `text-shadow 0 2px 12px #000`. Lines appear one at a time on tap (line 4 shown at 55% as "next"). Copy: "Twelve galleys from the Black Sea." / "Half the crews are dead at their oars." / "The harbor master will not let them land." / "By morning, they have landed anyway."
- Title card (bottom, inset 220 each side, bottom 36): parchment sheet with the triple rule. `THE GREAT MORTALITY` 12px tracking 3; title 36px 700 centered, drop cap S: "Something is killing your people. Find out what."; 17px italic: "You are the steward of six towns on the Italian coast. Choose your name."; four name buttons 150×56, 2px ink border, `#f7ecd6`, 22px 700 (Lorenzo, Matteo, Giovanni, Isabella) + 56px round dashed reroll button "↻". Reroll swaps all four names from a pool of medieval Italian names.

### 2b Opening, return visit
Same night ground at 60%. Title block top 96: `THE GREAT MORTALITY` 13px tracking 4; 56px 700 "Something is killing your people."; 30px italic "Find out what."
- Continue: 84px tall parchment sheet (triple rule), 26px 700 "Continue" + 15px italic save summary ("Lorenzo · March 1348 · 4 towns healthy") + 44px seal-red disc on the right.
- New game: 64px, 1.5 on-dark border, 22px 700.
- Mystery row: `THE MYSTERY` label, 22px "2 of 4 questions solved", 15px italic "Progress carries across every stewardship." Four 52px discs I–IV: solved = seal red with gold border; open = dashed on-dark 60%.
- Footer 15px 70%: "Epithets earned: 3 · Cards: 5 of 8 · Chronicles: 3 of 5 · Settings".

### 2c Main map, early (approved layout = 1b)
**Hero leaf (map)**: inline SVG of `assets/map-region.svg`, `viewBox="130 0 1100 820"`, `preserveAspectRatio="xMidYMid slice"` (so Fontenera clears the right edge). Top-left: month heading 30px 700 with drop cap ("December 1347") + 15px italic "Christmastide · month 2 of 18". Top-right: 44px round "☰" pause button. Bottom-left: advisor peek card 340 max, `#f1e6cf`, 1.5 ink, radius 4, 44px round portrait placeholder, 11px tracking label `THE MERCHANT`, 16px speech. Season glyph + italic 13px label bottom-right of the map ("Winter · first snow").
**Ledger leaf**: padding 20 22 18, column gap 10.
- HUD grid 2 cols, bottom rule 1.5 ink: `TREASURY` (24px Avenir 600 + italic "fl."), `DECREES LEFT` (two 20px dots: filled seal red / dashed; "1 of 2" 16px Avenir), `UNREST` full-row meter (see Components; word + "21 of 100").
- Italic 13px "Decrees of the Steward · tap one to issue".
- Nine decree rows, gap 4 (see Components). Order: Hold ships offshore forty days (port, toggle, 400) · Close the port (port, toggle, 900) · Seal a town's roads (town, toggle, 600) · Clean the streets and granaries (town, one-time, 300) · Burn herbs to cleanse the air (town, 150) · Hire physicians (town, 500) · Hold a procession (town, 100) · Close the bathhouses (region, 200) · Flee to the countryside (ends run). Descriptions (verbatim): "Let no galley touch the quay till the moon turns." / "Chain the harbor. The merchants will howl." / "Set guards on every road. None in, none out." / "Sweep the filth and burn the spoiled grain." / "Rosemary and juniper against the foul vapors." / "Learned men of Salerno, with vinegar and lancets." / "Carry the relics through the streets and pray." / "Open pores let the sickness in, the doctors say." / "Ends your stewardship. Asks you twice." **Never reveal whether a decree works.**
- Bottom row: 5 nav tiles (flex 1, 54 tall, 1.5 ink, radius 5, `#f7ecd6`, 11px label; Lens tile dashed at 55% with a seal dot) + End month 150 wide seal-red button. Badges: 20px seal-red disc, white 12px Avenir 700, 1.5 ink border, top-right −7.

### 2d Main map, late (August 1348)
Same layout. Frame `#1f150c`; hero leaf `radial-gradient(ellipse at 70% 30%, #d9c69b 0%, #a08a5e 50%, #5a4630 85%, #3a2a1c 100%)`; ledger leaf `#c9b68e → #e3d2ad`; ink `#2a1c10`; headings on the map in on-dark `#f1e6cf` with drop cap `#c96b5e`. Death-shadow radials under ravaged towns; roads get a `#d9c69b` inner line at 70%; seal-red road crosses on sealed roads. Three active rows at top. Unrest word turns seal red at ≥60 ("stones thrown at the palazzo · 67 of 100").

### 2e Town detail
Hero leaf: map at 55% opacity, tapped town drawn full with a gold `#b8902e` 4px ring r64 outside the state ring. Ledger leaf swaps to: label `PORT · FOUNDED 1091`, 34px 700 name, 17px italic status in seal red ("Plague spreading · worse than last month"), 44px round ✕. Stats grid 3 cols between 1.5 rules: `LIVING / SICK ABED / BURIED` 28px Avenir 600. `BURIALS BY MONTH` bars (70 tall, hatch fill when > baseline, month labels). `DECREES IN FORCE HERE` chips (36 tall, radius 18; active = ink bg + seal dot; past one-time = dashed italic). `LATELY` list: 12px month tag + 16px text, inline Codex terms bold+underline. Footer: "Issue a decree here" (flex, 54, 700) + "Back to ledger" (150). Vocabulary is medieval: Living / Sick abed / Buried, never clinical.

### 2f Advisor moment
Sheet 720 wide, rotated −0.6°, at left 230 / top 170. Left: 150×190 portrait placeholder (2px ink + inner `#f7ecd6` 4 + gold 6 rules), label `THE ASTROLOGER` 12px tracking 2. Right: speech 22px/1.4 with drop cap, 15px italic footnote "He offers a decree. Taking it costs a decree slot, as any other would.", then offered decree (60 tall ink bg, 18px 700 + cost) and "Thank him, and no" (170 wide, 1.5 ink). Caption below the sheet 14px italic on-dark: "Advisors speak sincerely. Whether they are right is for you to find out."
Four advisors and stances: Physician (miasma / bad air), Priest (divine punishment; always respectful, never a joke), Astrologer (1345 conjunction), Merchant (keep the port open). 1–3 sentences each. Their theories become the red herrings on the Evidence Board.

### 2g Month report
Sheet 880×740 centered. Header rule 2px: `THE CHRONICLE OF THE REGION · MONTH 4 OF 18`, 40px heading with drop cap "February, the year of our Lord 1348"; right `BURIED THIS MONTH` 36px Avenir. Two columns gap 28. Left: `BURIALS BY TOWN` bars (18 tall, 1px ink, hatch fill; small counts solid ink; "—" for zero) + `IT IS WRITTEN THAT` 17px/1.45 paragraphs. Right: `PINNED TO THE EVIDENCE BOARD` box (seal-red tag), `NEWLY UNLOCKED` rows with glyph (Codex book / Chronicle page / Card tilted −6°). Footer: 15px italic summary ("Unrest rose 9. Treasury took 1,200 florins in tolls and tithes.") + "On to March" 260×58 primary.

### 2h Evidence Board
Tab row + two leaves (left 560). Left: 28px heading "What is killing them?", italic 14px hint, four question rows (min 92, 2px ink): solved = `#f7ecd6` with 62px wax seal (gradient `radial-gradient(circle at 40% 35%, #b04444, #8b2e2e 60%, #5e1d1d)`, rotated −10°, numeral 22px on-dark) and italic answer; selected = ink bg, dashed gold 62px numeral disc; open = dashed ink disc at 70%. Labels: `QUESTION I · SOLVED`, `QUESTION II · OPEN · 3 CLUES`, `· NO CLUES YET`. Footer italic "Solve all four to unseal the Physician's Lens."
Questions (verbatim): 1 "Where does it come from?" 2 "How does it travel?" 3 "What carries it to people?" 4 "Why does it slow down in winter, but not always?"
Right: 22px "Theories for Question II" + "clues below · 3 of 9 found"; theory grid 2×2, 56 tall, 17px 700; selected = ink bg + `ARGUE →`. Theories for Q2: Through corrupted air / With people and their goods / As a judgment, wherever it wills / From the planets' alignment. Below: clue scraps (see Components) at slight rotations, gold pins, red thread `#8b2e2e` 2px bezier between related scraps, and a dashed placeholder "6 more scraps yet to find".
Clues (title — text — markers): Galleys from the East — the sick crews came from Caffa on the Black Sea · The quarantined galley — the crew died aboard, and the town stayed healthy (FOR goods; AGAINST judgment) · The village with no road — Fontenera is untouched under the same sky and the same air (FOR goods; AGAINST air, planets) · The herb fires failed — burning herbs did nothing (AGAINST air) · Dead rats in the granary — the rats died before the first human case (FOR rats; AGAINST air) · The ragman's cart — clothes from a dead household reached a new town, and the sickness followed (FOR goods; AGAINST air) · The physician who never fell ill — he tended the sick daily and stayed well · The winter lull — deaths slowed in the cold · The coughing sickness — in winter, a lung form spread fast person to person.

### 2i Verdict sheets (380 wide)
- **Solved**: 110px wax seal stamp (`SOLVED` 14px tracking 3 + numeral 30px), 16px summary, primary "Pin it to the board".
- **Not enough proof**: 110px dashed ink circle `NOT YET / ?`, italic "You may be right, but an investigator needs more proof.", hint line, secondary "Keep looking".
- **Wrong**: 110px solid-ring circle `THE CLUES / SAY NO`, text then the contradicting clue scrap inline (rotated −1°). Religious theory copy: "Many people believed this sincerely. Your evidence shows how it spread:". Button "Back to the board".

### 2j Lens reveal
Full-dark ground `radial-gradient(#2a1c10 → #140d07)` + gold bloom `rgba(184,144,46,.35)` at center. Sheet 760 wide, ink 2 + gold 8 + ink 10 outer rules. `ALL FOUR QUESTIONS SOLVED` 12px tracking 4; 140px lens glyph (parchment disc, gold+ink inner rings, seal-red center, ink handle at −45°); 46px 700 "The Physician's Lens" with drop cap; 20px italic "You have found what no one in 1348 could see. / Now look at your region as it truly was."; four 15px chips (Rat colonies · Flea spread · Bubonic vs. pneumonic · New chronicle: Yersin & Simond); primary 62 "Look through the Lens"; 14px italic "The Lens stays unsealed in every game from now on."

### 2k Lens overlay
Map with base at reduced opacity; `layer-lens` from the SVG visible: rat stipple circles (dashed 4/4 ring), flea arcs (`#8b2e2e` 2.5, dash 1/7), pneumonic breath marks (`#2b2a33`), gold ring r60 at Fontenera, seal-red ring at the galley landing. Ledger leaf = legend: 28px heading "What was really happening" + four rows (46px glyph + 18px 700 title + 15px text), layer toggles (3 × 48, active = ink bg "Rats · on"), "Close the Lens" 54.

### 2l Codex popover
Page dimmed to 60%; tapped term highlighted gold. Popover 520 wide anchored with a 16px ink triangle. Header `CODEX · NOUN`, 36px term with drop cap, 44px ✕. Sections with 11px tracking labels: `WHAT IT MEANS HERE` 18px/1.4; `WHY IT MATTERS` 17px italic; `THEN · 1348 / NOW` two-cell table (1.5 ink, `#f7ecd6`, 15px) — only for terms that have it. Footer 14px italic "Added to your Codex · 9 of 24 terms seen" + "Open the Codex →".

### 2m Codex index
Tab row; left leaf 2-col grid of 52px term tiles (seen = `#f7ecd6` 17px 700; new = ink bg + seal `NEW` tag; unseen = dashed 1.5 at 50% with an ink pill silhouette). Italic footer "Silhouetted terms appear as you meet them in play. 15 remain." Right leaf = full entry (44px term, sections as in 2l, footer links "Read the chronicle: Forty Days" / "See it on the Evidence Board"). Starter terms: steward, galley, pestilence, miasma, quarantine, bubonic plague, pneumonic plague, scapegoat (+ granary, conjunction, Pope Clement VI, Yersinia pestis appear in copy).

### 2n Chronicles
Tab row; one spread. Timeline band 96 tall across the top: 2px ink line at y54, pins 22px (opened = seal red + 2 ink; current = + gold halo; sealed = dashed ink on parchment); year labels 12px Avenir below; titles 13px above (italic; current bold). Pins at 1346, 1348, 1351 (sealed), 1377, 1665 (sealed), 1894–98 (sealed, "opens with the Lens"). Centered italic 12px "· · · the sickness returns every ten or twenty years for three centuries · · ·". The spine is drawn **below** the band only.
Left leaf: page list rows (min 76; glyph 44×56 lined; open = ink bg with gold-bordered glyph; sealed = dashed 65% with seal dot + "Opens at the end of a stewardship." / "Opens with the Physician's Lens."). Right leaf: page: `A CHRONICLE · 1348`, 36px title with drop cap, ~150 words 16.5px/1.45, `REMEMBER THIS` box (ink tag, 2–3 bullets 15.5px), footer "Two questions to check what you read" + "Next page →". Starter chronicles: Ships from Caffa (1346–47) · Forty Days (1377) · Fear and Blame (1348) · The Great Mortality (1348–51) · The Answer: Yersin and Simond (1894–98).

### 2o Myth-Buster Cards
Tab row; one leaf; 30px heading "Myth-Buster Cards" + italic hint. Grid 4 cols gap 18; card: 2px ink, `#f7ecd6`, pad 14, shadow scrap; `MYTH · VII` 10px label; woodcut placeholder (flex); 17px 700 myth; verdict tag rotated −4° (`BUSTED` seal-red double border 2 / `PARTLY TRUE` ink); `NEW` seal tag top-right. Locked: dashed 2 at 60% with 40px seal + "Sealed · earned in play".
Earned moment: card 260×380 at −3°, gold 6 + ink 8 outer rule, caption "Earned in February 1348, for holding a galley forty days." Back: `MYTH · VII · VERDICT`, 120px double-ring stamp at −12°, 15px story, `HOW DO WE KNOW?` 13.5px. Flip 400ms rotateY; reduced motion crossfade.
Set: Plague doctors wore beaked masks in 1348 (Busted, costume is 1600s) · People called it "the Black Death" (Busted) · "Ring Around the Rosie" is about the plague (Busted) · Medieval people never bathed (Busted) · Rats spread the Black Death (Partly true) · Everyone blamed God's punishment (Busted) · Quarantine is a modern idea (Busted) · The plague is extinct (Busted).

### 2p Fear and Blame (sensitive event)
Leaves dimmed to 40%. Plain sheet 640 wide, `#f3eadb`, single 1.5 ink rule, no gold, no imagery. `SANTA LUCIA · MAY 1348` 11px tracking 3; 34px 700 "A crowd at the well"; two 19px/1.5 paragraphs; italic 18px block between 1.5 rules describing the steward's action (not a choice); footer 15px "Unrest rises a little. A chronicle has been added: Fear and Blame. A word has been added to your Codex: scapegoat." + single button "Read the chronicle" 200×56 ink. Copy is in the HTML; keep it verbatim. Never a player choice; no villain imagery; dignified tone.

### 2q End of run (normal)
Left leaf 574: `THE STEWARDSHIP OF LORENZO · NOVEMBER 1347 – APRIL 1349`, 32px "The reckoning"; two stat boxes (`YOUR REGION SURVIVED` 44px Avenir "71%" + souls; `WHAT HISTORY SAW` dashed, "~60%", "about 4 in 10 died across Europe"); `TOWN BY TOWN · SURVIVING` bars with a seal-red 2px historical line at 60%; Fontenera row outlined gold if spared; italic footnote; `THE MYSTERY` discs + "3 of 4 solved · +1 this run" + "New this run: …". Right leaf: `THUS THE CHRONICLE NAMES HIM`; epithet plaque 420 wide (ink 2 / parchment 6 / gold 8 rules): name 22px italic, epithet 50px 700 seal red, 16px citation; `EPITHETS EARNED · 4 OF 8` chips (earned = ink bg for current, 1.5 ink for others; unearned dashed 50%); primary "Play again" 62; secondary "Read the chronicle: The Great Mortality".
Epithets: the Wise, the Iron Gate, the Merchant Prince, the Devout, the Steady, the Unlucky, the Fled, the Overthrown.

### 2r Overthrown / 2s Fled
2r: dark ground, torn parchment leaf silhouette at 25% rotated −7°; `SEPTEMBER 1348 · MONTH 11 OF 18`; 56px "Lorenzo the Overthrown" (epithet `#c96b5e`); 20px/1.5 paragraph; stats row (UNREST 100 / SURVIVING SO FAR / THE MYSTERY); italic "What you learned stays learned. The Evidence Board remembers."; "Begin again" (seal red, gold border) + "See the reckoning". 2s: light parchment ground with hill lines; "Lorenzo the Fled" (seal red); paragraph referencing Boccaccio; stats; "A new chronicle has opened: The Great Mortality."; same buttons.

### 2t, 2u, 3b–3f Portrait
Leaves stack: hero 600 (map) / 440 (town) / 500 (end) tall; spine horizontal 14; ledger below. Decrees 2-up grid, Flee full-width; End month full-width 64. Evidence: questions 2×2 on upper leaf, theories + scraps below. Chronicles: timeline (74 tall) + 2×2 page list on upper leaf, page below. Sheets center across the horizontal spine (report inset 46; advisor inset 60 from top 300). End: epithet upper, reckoning lower.

### 2y Small states
- Splash: parchment ground, 96px wax seal, `THE GREAT MORTALITY` 12px tracking 4, italic "Opening the ledger…", 120×4 progress bar.
- Add to Home Screen hint (first run in Safari): parchment callout above the share position: "Put the ledger on your shelf" 19px 700; 15px "To play fullscreen and offline: tap Share ⍐ then Add to Home Screen."; "Show me" (ink) / "Later". Down-pointing 12px triangle.
- Settings sheet ("Paused"): Sound row with 46×26 toggle (ink track, gold knob) + `ON/OFF` text; "Reset all progress" dashed seal red → confirm "Are you certain?"; Credits row.
- Empty states: Board ("The board is bare." + "Clues are pinned here as the months pass. The four questions are already waiting on the left."), Codex ("One word so far: yours."), Cards ("Eight myths, all sealed.").

---

## Components (2v)
- **Town marker** (SVG, in `assets/map-region.svg`): disc r30 (1.5 ink), emblem symbol, state ring, wash, overlays, name 20px 700, status 13px Avenir `TYPE · POP · Word`. States: Healthy (no ring, `#efe3c9`), Rumors (r46 dotted 3/6), Spreading (r46 dashed 8/6 2.5w, fill `#c9b48a`), Ravaged (r52 solid 3w + plague-wash fill, disc `#2a1c10`, emblem on-dark, labels on-dark), Burned out (disc `#6b5a40` + two shutter bars). Overlays: decree flag (seal red 22×12 at −40,−46), road cross (seal red 4w ×), galley marker offshore, chain across sea lane.
- **Decree row**: min-height 44, padding 5 10, gap 12, radius 4. Idle: 1.5 ink, `#f7ecd6`, 17px 700 name + 12.5px italic description, cost 15px Avenir 700 "400 ƒ". Selected (awaiting a town): 2px gold + outer 2px ink ring, description in seal red "Now tap a town on the map." Active toggle: 2px ink, ink bg, on-dark text, 26px seal disc with gold border, right text `ACTIVE` 11px tracking (or `2 ACTIVE`), description "In force · tap to lift". Unaffordable: dashed 1.5, 50% opacity, cost struck through, description "Not enough florins · needs 900". Destructive (Flee): dashed seal red, seal-red text, no cost.
- **Unrest meter**: label row (`UNREST` + italic word and number right), 10px track 1.5 ink radius 2 `#f7ecd6`, fill `repeating-linear-gradient(135deg, #8b2e2e 0 3px, #a85a5a 3px 6px)`, quarter ticks 1px ink 50% overhanging 3px. Words by band: 0–24 "quiet streets", 25–49 "grumbling at the quay", 50–74 "stones thrown at the palazzo", 75–99 "the council whispers" (word turns seal red ≥60). At 100 → Overthrown.
- **Decree slots**: 20px discs; used = seal red 1.5 ink; free = dashed ink. Text "1 of 2".
- **Buttons**: primary 56–64 tall, `#8b2e2e`, 2px ink, radius 6, on-dark 20–22px 700, shadow `2px 3px 0 #4a2f1d`; secondary ink-filled (sheets); quiet 1.5 ink on `#f7ecd6`; disabled dashed 50%. Pressed: translateY 2px, shadow 0, 80ms. Round icon buttons 44, 1.5 ink.
- **Stamps**: wax seal (gradient above, inset ring `rgba(247,236,214,.3)` 3–4px, rotate −8 to −10°); NOT YET dashed 3 ink ring; THE CLUES SAY NO solid 3 ring; BUSTED double 4 seal red at −12°; PARTLY TRUE double 4 ink; sealed/locked = 40px seal disc.
- **Clue scrap**: 240–260 wide, `#f7ecd6`, 1.5 ink, pad 14 14 12, rotate −2 to +1.5°, shadow `3px 4px 0 rgba(74,47,29,.3)`, gold pin 14px (1.5 ink) at top center; 17px 700 title, 14px text, marker chips 10px Avenir tracking 1: FOR = ink bg on-dark; AGAINST = 1px seal-red border, seal-red text.
- **Badge**: 20px seal-red disc, 1.5 ink, white 12px Avenir 700, top-right −7. `NEW` tag: seal red bg, 10px tracking 1.
- **Chip**: 36 tall radius 18; active ink bg + seal dot; past dashed italic.
- **Inline Codex term**: 700 + underline; pressed = gold `#b8902e` highlight behind, ink.deep text.
- **Placeholder (art)**: `repeating-linear-gradient(45deg, #e3d2ad 0 4px, #d4c09a 4px 8px)`, 1.5 ink border, centered 10–11px monospace description.

## Interactions & Behavior
See 3a for the full table. Summary:
- Region decree: tap → Active/consumed. Town decree: tap → selected state, towns pulse → tap town → confirm sheet → Issue; tap outside cancels. Toggle off: tap active row, no refund.
- Flee: tap → sheet "Leave the towns to their fate?" → hold 1.2s to confirm (reduced motion: second tap) → 2s.
- End month: disabled only mid-selection → month report (always) → advisor (~40% of months) → scripted event sheets → map. Map darkening crossfades 900ms on End month.
- Town tap → ledger leaf content swaps; Back restores scroll.
- Evidence: tap question → theories; tap theory → Argue → verdict sheet. Solved questions lock and persist.
- Lens: tile sealed until 4/4 solved → 2j reveal → 2k overlay with layer toggles; stays unlocked forever.
- Codex term tap → popover anchored to the word; scrim tap closes.
- Card tap → flip (400ms rotateY / crossfade).
- Sheets: 280ms rise 24px + fade / 120ms fade. Stamps: 160ms scale 1.3→1 / appear. Thread: stroke-dash 500ms / appear. Lens reveal: 1.2s bloom / 200ms fade. Opening galleys: 12s drift / static. Town pulse: ring α .4↔1 1.4s / static gold ring.
- No hover, long-press, or multi-touch gestures.

## State Management
Persistent (localStorage/IndexedDB, survives New game): `mystery.solved[4]`, `clues.found[]`, `codex.seen[]`, `chronicles.opened[]`, `cards.earned[]`, `epithets.earned[]`, `lens.unlocked`, `settings.sound`, `a2hs.dismissed`.
Per run: `steward.name`, `month` (0–17), `treasury`, `unrest` (0–100), `decreesLeft` (0–2), per-town `{pop, living, sick, dead, state, decrees[], history[]}`, active region toggles (`shipsHeld`, `portClosed`, `bathhousesClosed`), `sealedRoads[]`, `runEnded: null|'normal'|'overthrown'|'fled'`.
Derived: town state from dead/pop and sick/pop thresholds; regional death ratio drives darkening lerp; unrest word from band; survival % vs. 60% benchmark; epithet from run stats (Iron Gate = port closed most of the run; Merchant Prince = port never closed and treasury high; Devout = most processions; Steady = unrest never >50; Unlucky = low survival despite good decrees; Wise = high survival + ≥1 question solved this run).
Simulation hooks the design assumes (not specified by the brief; author's model): plague enters via ships unless held/closed; spreads along roads unless sealed; Fontenera only via footpath (never, unless a cart event); winter slows bubonic, pneumonic form ignores it; herbs/procession/bathhouses do nothing to spread (procession lowers unrest, bathhouses raise it); cleaning streets delays the rat die-off; physicians reduce deaths slightly; quarantine works.

## Design Tokens
Colors: surface.1 `#efe3c9` · surface.2 `#e3d2ad` · surface.raised `#f7ecd6` · surface.edge `#cdb686` · ink `#4a2f1d` · ink.deep `#2a1c10` · accent `#8b2e2e` (hover none; pressed as above) · accent.soft `#a85a5a` (hatch) · accent.on-dark `#c96b5e` · gold `#b8902e` · frame `#3a2a1c` · frame.dark `#1f150c` · night `#1f2129` · night.deep `#101218` · ink.on-dark `#f1e6cf` · event.sheet `#f3eadb` · spreading.fill `#c9b48a` · burned.fill `#6b5a40`.
Contrast: ink on surface.1 9.6:1; on-dark on frame 11:1; accent on surface.raised 6.1:1; on-dark on accent 5.9:1.
Type: display.xl 56/1.0 700 · display.l 44–46/1.05 · display.m 34–36/1.1 · display.s 30/1.1 (drop cap 44) · title 22–24/1.15 700 · row 17/1.1 700 · body 17/1.45 · quote 19–22/1.4 italic · caption 14–15/1.35 italic · label 11/1 Avenir 600 tracking 1.5–2 uppercase · number.l 44 Avenir 600 · number.m 24 · number.s 15 700.
Spacing: frame 16 · spine 14 · leaf pad 20–26 · row 44/gap 4/pad 5 10 · grid gap 6–18 · sheet pad 26–40.
Radius: frame 18 · leaf 10/2 · button 4–6 · row 4 · chip 18 · tab 6 6 0 0 · seals 50%.
Shadows: sheet `0 24px 60px rgba(0,0,0,.6)` · scrap `3px 4px 0 rgba(74,47,29,.3)` · button `2px 3px 0 #4a2f1d` · leaf inner `inset ∓12px 0 18px -12px rgba(0,0,0,.5)`.
Patterns: meter hatch 135° accent 3 / accent.soft 3 · sea hatch −20° ink .7w step 10 α .35 · plague wash 45° ink.deep 1.6w step 6 α .5 · rat stipple r1.6 step 9 · placeholder 45° surface.2/#d4c09a step 4.

## Assets (in `assets/`)
- `map-region.svg` — 1180×820, named layers: `layer-base` (sea, coast, hills, MARE), `layer-routes` (sea lane, 5 roads with inner line, footpath), `layer-death-shadow` (6 radials, opacity 0), `layer-lens` (rats, fleas, pneumonic, spared ring; opacity 0), `layer-towns` (6 `<g id="town-*" data-state data-type data-pop">` each with `.wash .ring .disc .emblem .overlays .name .status`), `marker-galley-offshore`, `layer-season` (4 glyph groups), `compass`. Emblem `<symbol>`s: port, market, monastery, village, hill-village, galley; overlay symbols: decree-flag, road-cross. Town centers: Portoreale 505,540 · Santa Lucia 680,380 · San Benedetto 560,180 · Collina 880,260 · Pietrabianca 850,520 · Fontenera 990,150.
- `town-emblems.svg` — the six emblems on discs as a sheet.
- `icon-1024.svg/.png`, `icon-512`, `icon-192`, `icon-180` — wax seal with galley mark on parchment; sea hatch only at ≥512. Use PNGs in the web manifest and `apple-touch-icon`.
- Placeholders to commission: 4 advisor portraits (illuminated style, 150×190 and 44px round crop), 8 woodcut myth illustrations, opening galley art (optional; the SVG silhouettes are acceptable).

## Files
- `The Great Mortality.dc.html` — the design canvas (all artboards; 1b approved; 2a–2y screens; 3a spec; 3b–3f portrait).
- `assets/` — SVG/PNG assets listed above.
- `support.js` — runtime for viewing the canvas only; not part of the game.
