/* The Great Mortality — reference simulation engine (network-spread archetype).
 * Pure logic, no DOM. All tuning lives in spec.sim (content/sim-spec.json).
 * Claude Code may port this or use it directly; behavior and numbers are the contract.
 */
(function (root) {
  'use strict';

  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createRun(spec, opts) {
    opts = opts || {};
    const sim = spec.sim;
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31);
    const towns = {};
    spec.towns.forEach(t => {
      towns[t.id] = {
        id: t.id, type: t.type, pop: t.pop,
        S: t.pop, I: 0, P: 0, D: 0, R: 0,
        ratS: sim.ratDensity[t.type], ratI: 0, ratDeadTotal: 0,
        firstHumanCase: null, deadRatsSeen: false,
        clean: false, sealed: false, procession: false,
        decreesHistory: [], monthlyDeaths: [], monthlyCases: []
      };
    });
    return {
      seed, rand: rng(seed), spec,
      steward: opts.stewardName || 'Lorenzo',
      month: 0, treasury: sim.economy.startTreasury, unrest: sim.unrest.start,
      decreesLeft: sim.decreesPerMonth,
      shipsHeld: false, portClosed: false, bathhousesClosed: false,
      towns, ended: null, maxUnrest: sim.unrest.start,
      counters: { portClosedMonths: 0, shipsHeldMonths: 0, processions: 0, physicians: 0, herbs: 0, cleans: 0, sealMonths: 0, effectiveDecrees: 0 },
      assist: new Set(opts.assistClues || []), // clues the shell wants surfaced more readily (see addendum: assist rule)
      pending: [], // delayed clue checks
      flags: {}, startTreasury: sim.economy.startTreasury
    };
  }

  const decree = (s, id) => s.spec.decrees.find(d => d.id === id);

  function issueDecree(s, id, townId) {
    const d = decree(s, id);
    if (!d) throw new Error('unknown decree ' + id);
    if (s.ended) return { ok: false, reason: 'ended' };
    if (id === 'flee') { s.ended = 'fled'; return { ok: true, ended: 'fled' }; }
    if (s.decreesLeft <= 0) return { ok: false, reason: 'no-slots' };
    if (s.treasury < d.cost) return { ok: false, reason: 'unaffordable' };
    if (d.target === 'town' && !s.towns[townId]) return { ok: false, reason: 'needs-town' };
    const t = townId ? s.towns[townId] : null;
    const fx = s.spec.sim.decreeEffects[id] || {};
    switch (id) {
      case 'hold-ships': if (s.shipsHeld) return { ok: false, reason: 'active' }; s.shipsHeld = true; break;
      case 'close-port': if (s.portClosed) return { ok: false, reason: 'active' }; s.portClosed = true; break;
      case 'seal-roads': if (t.sealed) return { ok: false, reason: 'active' }; t.sealed = true; break;
      case 'clean-streets': if (t.clean) return { ok: false, reason: 'done' }; t.clean = true; t.ratS *= fx.ratKill; t.ratI *= fx.ratKill; s.counters.cleans++; break;
      case 'burn-herbs': s.counters.herbs++; s.pending.push({ clue: 'c-herb-fires', town: townId, month: s.month, casesBefore: lastCases(t) }); break;
      case 'hire-physicians': s.counters.physicians++; break;
      case 'procession': t.procession = true; s.counters.processions++; break;
      case 'close-bathhouses': if (s.bathhousesClosed) return { ok: false, reason: 'active' }; s.bathhousesClosed = true; break;
    }
    if (['hold-ships', 'close-port', 'seal-roads', 'clean-streets'].includes(id)) s.counters.effectiveDecrees++;
    s.treasury -= d.cost;
    s.decreesLeft--;
    bumpUnrest(s, fx.unrestOnIssue || 0);
    if (t) t.decreesHistory.push({ month: s.month, id });
    return { ok: true, unlocks: (s.spec.unlockOnDecree[id] || []) };
  }

  // Lifting a toggle is free and costs no decree slot; no refund.
  function liftDecree(s, id, townId) {
    if (id === 'hold-ships') s.shipsHeld = false;
    else if (id === 'close-port') s.portClosed = false;
    else if (id === 'seal-roads') s.towns[townId].sealed = false;
    else if (id === 'close-bathhouses') s.bathhousesClosed = false;
    return { ok: true };
  }

  function lastCases(t) { return t.monthlyCases.length ? t.monthlyCases[t.monthlyCases.length - 1] : 0; }
  function bumpUnrest(s, n) { s.unrest = Math.max(0, Math.min(100, s.unrest + n)); s.maxUnrest = Math.max(s.maxUnrest, s.unrest); }
  function living(t) { return t.S + t.I + t.P + t.R; }
  function calMonth(s) { return (s.spec.sim.startCalendarMonth + s.month) % 12; } // 0 = Jan
  function isWinter(s) { return [11, 0, 1].includes(calMonth(s)); }

  function roadOpen(s, r) { return !s.towns[r.a].sealed && !s.towns[r.b].sealed; }

  function seedTown(s, t, ratAmt, people) {
    t.ratI += Math.min(t.ratS, ratAmt); t.ratS = Math.max(0, t.ratS - ratAmt);
    const p = Math.min(t.S, people); t.S -= p; t.I += p;
  }

  function endMonth(s) {
    const sim = s.spec.sim, r = s.rand, report = { month: s.month, events: [], clues: [], deathsByTown: {}, casesByTown: {} };
    if (s.ended) return report;
    const season = sim.season[calMonth(s)];
    const winter = isWinter(s);
    const port = s.towns[sim.portTown];
    const startDead = {}; const startCases = {};
    Object.values(s.towns).forEach(t => { startDead[t.id] = t.D; startCases[t.id] = 0; });

    // --- ships (once per month) ---
    const shipP = s.month < sim.ships.earlyMonths ? sim.ships.infectedEarly : sim.ships.infectedLate;
    const shipInfected = r() < shipP;
    if (shipInfected) {
      if (s.portClosed) { /* no ships enter */ }
      else if (s.shipsHeld) {
        if (r() < sim.ships.heldLeak) { seedTown(s, port, sim.ships.ratSeed * 0.5, 1); report.events.push('held-ship-leak'); }
        else if (!s.flags.quarantineClueArmed) { s.flags.quarantineClueArmed = true; s.pending.push({ clue: 'c-quarantined-galley', month: s.month }); }
      } else {
        // grain ship carries rats/fleas with no visibly sick crew half the time
        if (r() < sim.ships.grainShipShare) { seedTown(s, port, sim.ships.ratSeed, 0); s.pending.push({ clue: 'c-grain-ship', town: port.id, month: s.month }); }
        else seedTown(s, port, sim.ships.ratSeed, sim.ships.sickSailors);
      }
    }
    // --- overland arrivals from outside the region (keeps holding the port from being a total solution) ---
    if (s.month >= sim.overland.fromMonth) {
      const entry = s.towns[sim.overland.entryTown];
      if (!entry.sealed && r() < sim.overland.monthlyChance) { seedTown(s, entry, sim.overland.ratSeed, sim.overland.people); report.events.push('overland-arrival'); }
    }

    // --- weekly ticks ---
    for (let w = 0; w < sim.ticksPerMonth; w++) {
      const newCases = {};
      Object.values(s.towns).forEach(t => {
        const N = Math.max(1, living(t));
        const cleanF = t.clean ? sim.decreeEffects['clean-streets'].ongoing : 1;
        const crowd = t.procession ? sim.decreeEffects.procession.crowdMultiplier : 1;
        const monk = t.type === 'monastery' ? sim.monasteryCrowding : 1;
        // rat epizootic
        const ratNew = Math.min(t.ratS, sim.rats.beta * t.ratI * t.ratS * season * cleanF);
        t.ratS -= ratNew; t.ratI += ratNew;
        const ratDie = t.ratI * sim.rats.deathRate; t.ratI -= ratDie; t.ratDeadTotal += ratDie;
        const ratAssist = s.assist.has('c-dead-rats');
        if (!t.deadRatsSeen && t.ratDeadTotal > (ratAssist ? sim.assist.deadRatsDieOff : sim.rats.visibleDieOff) && t.D < (ratAssist ? t.pop * sim.assist.deadRatsMaxBuriedShare : 1)) {
          t.deadRatsSeen = true; report.clues.push({ id: 'c-dead-rats', town: t.id });
        }
        // human infection: fleas leaving dying rats + human fleas/lice + pneumonic
        const forceB = (sim.humans.ratFleaForce * ratDie * cleanF + sim.humans.humanFleaForce * (t.I / N) * crowd * monk) * season;
        const newB = t.S * (1 - Math.exp(-forceB));
        const forceP = sim.humans.pneumonicForce * (t.P / N) * crowd * monk;
        const newP2 = (t.S - newB) * (1 - Math.exp(-forceP));
        const toPneu = newB * (winter ? sim.humans.pneumonicShareWinter : sim.humans.pneumonicShare);
        // resolve last week's sick
        const dieB = t.I * sim.humans.bubonicFatality, recB = t.I - dieB, dieP = t.P;
        t.D += dieB + dieP; t.R += recB;
        t.S -= newB + newP2; t.I = newB - toPneu; t.P = toPneu + newP2;
        if (t.firstHumanCase === null && newB + newP2 > 0.5) t.firstHumanCase = s.month;
        newCases[t.id] = newB + newP2; startCases[t.id] += newB + newP2;
        if (winter && t.P > (s.assist.has('c-coughing') ? sim.assist.coughingVisible : sim.humans.coughingVisible)) report.clues.push({ id: 'c-coughing', town: t.id });
      });
      // road seeding
      s.spec.routes.forEach(rt => {
        if (!roadOpen(s, rt)) return;
        [[rt.a, rt.b], [rt.b, rt.a]].forEach(([from, to]) => {
          const A = s.towns[from], B = s.towns[to];
          const pressure = A.ratI + sim.roads.peopleWeight * ((A.I + A.P) / Math.max(1, living(A)));
          if (r() < rt.trade * pressure * sim.roads.seedChance) seedTown(s, B, sim.roads.ratSeed, r() < 0.5 ? 1 : 0);
        });
      });
    }

    // --- ragman's cart event: ravaged town, open road, healthy neighbor ---
    s.spec.routes.forEach(rt => {
      if (!roadOpen(s, rt) || rt.kind === 'footpath') return;
      [[rt.a, rt.b], [rt.b, rt.a]].forEach(([from, to]) => {
        const A = s.towns[from], B = s.towns[to];
        if (A.D / A.pop > 0.15 && B.D === 0 && B.I < 1 && r() < (s.assist.has('c-ragman') ? sim.assist.ragmanChance : sim.events.ragmanChance)) {
          seedTown(s, B, sim.roads.ratSeed * 2, 1); s.pending.push({ clue: 'c-ragman', town: B.id, month: s.month });
          report.events.push({ id: 'ragman', from, to });
        }
      });
    });

    // --- tally month ---
    let monthDeaths = 0, regionPop = 0;
    Object.values(s.towns).forEach(t => {
      const d = t.D - startDead[t.id]; monthDeaths += d; regionPop += t.pop;
      t.monthlyDeaths.push(Math.round(d)); t.monthlyCases.push(Math.round(startCases[t.id]));
      report.deathsByTown[t.id] = Math.round(d); report.casesByTown[t.id] = Math.round(startCases[t.id]);
      t.procession = false;
    });

    // --- delayed clue checks ---
    s.pending = s.pending.filter(p => {
      const age = s.month - p.month;
      if (p.clue === 'c-quarantined-galley') { if (port.monthlyCases[s.month] === 0) { report.clues.push({ id: p.clue }); } return false; }
      if (p.clue === 'c-herb-fires') { if (age >= 1) { const t = s.towns[p.town]; if (lastCases(t) >= Math.max(1, p.casesBefore)) report.clues.push({ id: p.clue, town: p.town }); return false; } return true; }
      if (p.clue === 'c-ragman' || p.clue === 'c-grain-ship') { const t = s.towns[p.town]; if (lastCases(t) > 0) { report.clues.push({ id: p.clue, town: p.town }); return false; } return age < 2; }
      return false;
    });
    // village with no road
    const infectedTowns = Object.values(s.towns).filter(t => t.D > 0).length;
    const f = s.towns[sim.isolatedTown];
    if (s.month >= sim.isolatedClue.fromMonth && f.D === 0 && f.I < 1 && infectedTowns >= sim.isolatedClue.minInfectedTowns) report.clues.push({ id: 'c-no-road' });
    // winter lull: regional cases fell vs the autumn peak
    if (winter) {
      const regional = m => Object.values(s.towns).reduce((a, t) => a + (t.monthlyCases[m] || 0), 0);
      const now = regional(s.month); let peak = 0;
      for (let m = Math.max(0, s.month - 4); m < s.month; m++) peak = Math.max(peak, regional(m));
      if (peak > sim.winterLull.minPeak && now <= peak * (1 - sim.winterLull.drop)) report.clues.push({ id: 'c-winter-lull' });
    }
    report.clues = dedupe(report.clues);

    // --- economy ---
    const e = sim.economy;
    let income = 0;
    Object.values(s.towns).forEach(t => { income += living(t) * e.tithePerPerson * (t.sealed ? e.sealedTitheShare : 1); });
    income += s.portClosed ? 0 : s.shipsHeld ? e.tollsHeld : e.tollsOpen;
    income = Math.round(income);
    s.treasury += income; report.income = income;

    // --- unrest ---
    const u = sim.unrest; const before = s.unrest;
    let du = -u.decayPerMonth + Math.min(u.deathCapPerMonth, u.perDeathRate * (monthDeaths / regionPop) * 100);
    if (s.portClosed) du += u.portClosedPerMonth;
    if (s.shipsHeld) du += u.shipsHeldPerMonth;
    du += u.sealedPerTownPerMonth * Object.values(s.towns).filter(t => t.sealed).length;
    bumpUnrest(s, Math.round(du));
    report.unrestDelta = s.unrest - before;

    // --- counters ---
    if (s.portClosed) s.counters.portClosedMonths++;
    if (s.shipsHeld) s.counters.shipsHeldMonths++;
    s.counters.sealMonths += Object.values(s.towns).filter(t => t.sealed).length;

    // --- scripted events by month (content-driven) ---
    // fires once, in the first month >= fromMonth (and <= untilMonth) where its town has burials
    (s.spec.scriptedEvents || []).forEach(ev => {
      if (s.flags['ev:' + ev.id]) return;
      const inWindow = s.month >= ev.fromMonth && s.month <= (ev.untilMonth != null ? ev.untilMonth : 99);
      if (inWindow && (!ev.requiresTownInfected || s.towns[ev.requiresTownInfected].D > 0)) {
        s.flags['ev:' + ev.id] = true; report.events.push({ id: ev.id }); if (ev.unrest) bumpUnrest(s, ev.unrest);
      }
    });

    report.deaths = Math.round(monthDeaths);
    s.month++;
    s.decreesLeft = sim.decreesPerMonth;
    if (s.unrest >= 100) s.ended = 'overthrown';
    else if (s.month >= sim.months) s.ended = 'normal';
    report.ended = s.ended;
    return report;
  }

  function dedupe(list) { const seen = new Set(); return list.filter(c => !seen.has(c.id) && seen.add(c.id)); }

  // After 'fled', the region plays out to the end with no steward.
  function autoplayToEnd(s) { const was = s.ended; s.ended = null; while (s.month < s.spec.sim.months) { const rep = endMonth(s); if (rep.ended === 'overthrown') s.ended = null; } s.ended = was; }

  function survival(s) {
    let pop = 0, dead = 0; Object.values(s.towns).forEach(t => { pop += t.pop; dead += t.D; });
    return 1 - dead / pop;
  }

  function epithet(s, solvedThisRun) {
    if (s.ended === 'fled') return 'the-fled';
    if (s.ended === 'overthrown') return 'the-overthrown';
    const sv = survival(s), c = s.counters, rules = s.spec.epithetRules;
    if (c.portClosedMonths >= rules.ironGateMonths) return 'the-iron-gate';
    if (c.portClosedMonths === 0 && c.shipsHeldMonths === 0 && s.treasury >= s.startTreasury && sv >= rules.benchmarkSurvival) return 'the-merchant-prince';
    if (c.processions >= rules.devoutProcessions) return 'the-devout';
    if (sv >= rules.wiseSurvival && (c.shipsHeldMonths + c.portClosedMonths + c.sealMonths) >= rules.wiseMinQuarantineMonths) return 'the-wise';
    if (s.maxUnrest <= rules.steadyMaxUnrest && sv >= rules.benchmarkSurvival) return 'the-steady';
    if (sv < rules.benchmarkSurvival && c.effectiveDecrees >= rules.unluckyMinEffective) return 'the-unlucky';
    return sv >= rules.benchmarkSurvival ? 'the-steady' : 'the-unlucky';
  }

  const api = { createRun, issueDecree, liftDecree, endMonth, autoplayToEnd, survival, epithet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MortalityEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
