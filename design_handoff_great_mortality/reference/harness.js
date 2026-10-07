// Headless balance check: node reference/harness.js [content/sim-spec.json] [runs]
const fs = require('fs'), path = require('path');
const E = require('./engine.js');
const specPath = process.argv[2] || path.join(__dirname, '../content/sim-spec.json');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const RUNS = +(process.argv[3] || 300);

const strategies = {
  'do nothing': () => {},
  'smart (hold ships, clean port + market, seal ravaged towns)': (s, rep) => {
    if (s.month === 0) { E.issueDecree(s, 'hold-ships'); E.issueDecree(s, 'clean-streets', 'portoreale'); }
    else if (s.month === 1) E.issueDecree(s, 'clean-streets', 'santa-lucia');
    else if (rep) Object.entries(rep.casesByTown).forEach(([id, c]) => { if (c > 20 && !s.towns[id].sealed && s.decreesLeft) E.issueDecree(s, 'seal-roads', id); });
    if (s.unrest > 80) Object.values(s.towns).forEach(t => t.sealed && E.liftDecree(s, 'seal-roads', t.id));
  },
  'careful (hold ships + clean port and market, nothing else)': (s) => {
    if (s.month === 0) { E.issueDecree(s, 'hold-ships'); E.issueDecree(s, 'clean-streets', 'portoreale'); }
    if (s.month === 1) E.issueDecree(s, 'clean-streets', 'santa-lucia');
  },
  'hold ships only': (s) => { if (s.month === 0) E.issueDecree(s, 'hold-ships'); },
  'close the port all game': (s) => { if (s.month === 0) E.issueDecree(s, 'close-port'); },
  'processions everywhere': (s, rep) => { if (rep) Object.entries(rep.casesByTown).sort((a,b)=>b[1]-a[1]).slice(0,2).forEach(([id,c]) => c>0 && E.issueDecree(s,'procession',id)); },
  'herbs + physicians (medieval medicine)': (s, rep) => { if (rep) { const top = Object.entries(rep.casesByTown).sort((a,b)=>b[1]-a[1])[0]; if (top[1]>0){E.issueDecree(s,'burn-herbs',top[0]);E.issueDecree(s,'hire-physicians',top[0]);} } },
};

function pct(a, p) { const b = [...a].sort((x, y) => x - y); return b[Math.floor(p * (b.length - 1))]; }
for (const [name, play] of Object.entries(strategies)) {
  const surv = [], ends = {}, eps = {}, clues = {}, fontenera = []; let overthrown = 0;
  for (let i = 0; i < RUNS; i++) {
    const s = E.createRun(spec, { seed: 1000 + i }); let rep = null;
    while (!s.ended) { play(s, rep); rep = E.endMonth(s); rep.clues.forEach(c => { if (!s._c) s._c = new Set(); if (!s._c.has(c.id)) { s._c.add(c.id); clues[c.id] = (clues[c.id] || 0) + 1; } }); }
    if (s.ended === 'overthrown') { overthrown++; E.autoplayToEnd(s); }
    surv.push(E.survival(s)); const ep = E.epithet(s); eps[ep] = (eps[ep] || 0) + 1;
    fontenera.push(s.towns.fontenera.D === 0 ? 1 : 0);
  }
  const avg = surv.reduce((a, b) => a + b, 0) / RUNS;
  console.log(`\n${name}\n  survival avg ${(avg*100).toFixed(1)}%  p10 ${(pct(surv,.1)*100).toFixed(0)}%  p90 ${(pct(surv,.9)*100).toFixed(0)}%  overthrown ${(overthrown/RUNS*100).toFixed(0)}%  Fontenera spared ${(fontenera.reduce((a,b)=>a+b,0)/RUNS*100).toFixed(0)}%`);
  console.log('  clue rates', Object.entries(clues).map(([k,v])=>`${k} ${(v/RUNS*100).toFixed(0)}%`).join(', '));
  console.log('  epithets', Object.entries(eps).map(([k,v])=>`${k} ${(v/RUNS*100).toFixed(0)}%`).join(', '));
}

// How many stewardships to solve all four questions, varying strategy each game?
const req = spec.mystery ? spec.mystery.questions.map(q => q.solveRule) : [
  { all: ['c-galleys'], anyOf: ['c-quarantined-galley', 'c-no-road'], need: 1 },
  { anyOf: ['c-quarantined-galley', 'c-no-road', 'c-ragman', 'c-grain-ship'], need: 2 },
  { all: ['c-dead-rats'], anyOf: ['c-ragman', 'c-grain-ship'], need: 1 },
  { all: ['c-winter-lull', 'c-coughing'], anyOf: [], need: 0 }];
const solved = (found, r) => (r.all || []).every(c => found.has(c)) && (r.anyOf || []).filter(c => found.has(c)).length >= (r.need || 0);
const ASSIST_AFTER = (spec.sim.assist && spec.sim.assist.afterStewardships) || 3;
const names = Object.keys(strategies); const runsNeeded = [];
for (let k = 0; k < 300; k++) {
  const found = new Set(['c-galleys']); let n = 0;
  while (!req.every(r => solved(found, r)) && n < 20) {
    const play = strategies[names[(k + n) % names.length]];
    const missing = n >= ASSIST_AFTER ? ['c-dead-rats','c-coughing','c-ragman'].filter(c => !found.has(c)) : [];
    const s = E.createRun(spec, { seed: 50000 + k * 31 + n, assistClues: missing }); let rep = null;
    while (!s.ended) { play(s, rep); rep = E.endMonth(s); rep.clues.forEach(c => found.add(c.id)); }
    n++;
  }
  runsNeeded.push(n);
}
runsNeeded.sort((a, b) => a - b);
console.log(`\nStewardships to solve the whole mystery (varied play): median ${runsNeeded[150]}, p90 ${runsNeeded[270]}, max ${runsNeeded[299]}`);
