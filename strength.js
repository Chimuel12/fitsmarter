// Strength tiers and the exercise library.
// Every set (weight × reps) is turned into a 10-rep equivalent and compared with reference
// 10-rep weights for active gym-goers. The anchors are an 80 kg man at the top 90/80/50/20/5 %,
// scaled to the lifter's body weight, sex, age and height. Machines and variations are rated
// against a base lift with a ratio, so they are estimates.

/* ---------- tiers (top % of gym-goers), boundaries from the reference table:
   top 90 % Iron→Bronze, 80 % Silver, 50 % Gold→Ruby, 20 % Emerald→Diamond, 5 % Champion→Symmetric ---------- */
export const TIERS = [
  { id: "iron",      n: "Iron",      top: 100, c: "#7B828C", c2: "#4A5058" },
  { id: "bronze",    n: "Bronze",    top: 90,  c: "#C98B5B", c2: "#7A4A2A" },
  { id: "silver",    n: "Silver",    top: 80,  c: "#D9DEE5", c2: "#8B95A3" },
  { id: "gold",      n: "Gold",      top: 65,  c: "#F7CF4A", c2: "#B8860B" },
  { id: "ruby",      n: "Ruby",      top: 50,  c: "#F25C6B", c2: "#A3162B" },
  { id: "emerald",   n: "Emerald",   top: 35,  c: "#43D689", c2: "#127A45" },
  { id: "diamond",   n: "Diamond",   top: 20,  c: "#BFEFFF", c2: "#4FB3E8" },
  { id: "champion",  n: "Champion",  top: 10,  c: "#C9A6FF", c2: "#7B4DFF" },
  { id: "symmetric", n: "Symmetric", top: 5,   c: "#7FB2FF", c2: "#2F5BFF" },
];
export const tierFor = pct => [...TIERS].reverse().find(t => 100 - pct <= t.top + 0.05) || TIERS[0];
export const tierIndex = id => Math.max(0, TIERS.findIndex(t => t.id === id));

/* ---------- reference 10-rep weights, 80 kg man (top 90 / 80 / 50 / 20 / 5 %) ---------- */
const P = [10, 20, 50, 80, 95], Z = [-1.2816, -0.8416, 0, 0.8416, 1.645];
const BASE = {
  bench:    { m: [37.5, 49, 67.5, 90, 116],  fem: 0.55, lever: -0.25 },
  squat:    { m: [49, 71, 94, 124, 154],     fem: 0.68, lever: -0.15 },
  deadlift: { m: [60, 86, 112.5, 146, 180],  fem: 0.68, lever: 0.2 },
  ohp:      { m: [24, 34, 43.5, 56, 71],     fem: 0.55, lever: -0.25 },
  row:      { m: [34, 45, 60, 79, 101],      fem: 0.58, lever: 0 },
  curl:     { m: [16.5, 22.5, 31.5, 41, 52.5], fem: 0.55, lever: 0 },
  // bodyweight: reps
  pullup:   { m: [1, 3, 8, 14, 20],   fem: 0.3,  reps: true, lever: -0.3 },
  pushup:   { m: [8, 15, 28, 42, 55], fem: 0.45, reps: true, lever: -0.2 },
  dip:      { m: [3, 8, 15, 24, 32],  fem: 0.4,  reps: true, lever: -0.2 },
  legraise: { m: [3, 6, 12, 18, 25],  fem: 0.7,  reps: true, lever: 0 },
};
// body-weight scaling from the bench-press reference table (65–100 kg), smooth power law outside
const BW = [[65, 0.83], [75, 0.948], [80, 1], [90, 1.089], [100, 1.17]];
function bwFactor(bw) {
  if (bw <= 65) return 0.83 * Math.pow(bw / 65, 0.9);
  if (bw >= 100) return 1.17 * Math.pow(bw / 100, 0.7);
  for (let i = 0; i < BW.length - 1; i++) { const [a, fa] = BW[i], [b, fb] = BW[i + 1]; if (bw <= b) return fa + (fb - fa) * (bw - a) / (b - a); }
  return 1;
}
const ageFactor = a => !a ? 1 : a < 14 ? 0.7 : a < 23 ? 0.86 + (a - 14) * 0.0156 : a <= 40 ? 1 : Math.max(0.6, 1 - (a - 40) * 0.009);

/* ---------- muscles shown on the body hub ---------- */
export const MUSCLES = {
  chest: "Chest", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps", forearms: "Forearms", abs: "Abs",
  traps: "Traps", lats: "Back", lowerback: "Lower back", glutes: "Glutes", quads: "Quads", hamstrings: "Hamstrings", adductors: "Adductors", calves: "Calves",
};

/* ---------- exercise library ----------
   id: [name, equipment, line, base lift, ratio, primary muscles, secondary muscles, animation, per-hand]
   equipment: bb barbell · db dumbbell · sel selectorized machine · pl plate-loaded · cab cable · bw bodyweight
   lines: Technogym Selection (700/900), Technogym Pure Strength, Technogym Kinesis / cable stations, free weights */
const L = { fw: "Free weights", sel: "Technogym Selection", ps: "Technogym Pure Strength", cab: "Technogym cable station", bw: "Bodyweight" };
const X = (n, eq, line, base, k, mus, sec, anim, hand = false) => ({ n, eq, line: L[line], base, k, mus, sec, anim, hand });
export const EX = {
  // chest
  bench:        X("Flat bench press", "bb", "fw", "bench", 1, ["chest"], ["triceps", "shoulders"], "bench"),
  inclinebench: X("Incline bench press", "bb", "fw", "bench", 0.84, ["chest"], ["shoulders", "triceps"], "inclinebench"),
  dbbench:      X("Dumbbell bench press", "db", "fw", "bench", 0.37, ["chest"], ["triceps", "shoulders"], "bench", true),
  inclinedb:    X("Incline dumbbell press", "db", "fw", "bench", 0.33, ["chest"], ["shoulders", "triceps"], "inclinebench", true),
  dbfly:        X("Dumbbell fly", "db", "fw", "bench", 0.16, ["chest"], ["shoulders"], "fly", true),
  selchest:     X("Chest Press", "sel", "sel", "bench", 1.0, ["chest"], ["triceps", "shoulders"], "chestpress"),
  selpec:       X("Pectoral (pec deck)", "sel", "sel", "bench", 0.62, ["chest"], ["shoulders"], "pecdeck"),
  pschest:      X("Chest Press", "pl", "ps", "bench", 1.05, ["chest"], ["triceps", "shoulders"], "chestpress"),
  psincline:    X("Incline Chest Press", "pl", "ps", "bench", 0.9, ["chest"], ["shoulders", "triceps"], "chestpress"),
  pswide:       X("Wide Chest Press", "pl", "ps", "bench", 1.0, ["chest"], ["shoulders"], "chestpress"),
  cablecross:   X("Cable crossover", "cab", "cab", "bench", 0.22, ["chest"], ["shoulders"], "pecdeck", true),
  pushup:       X("Push-ups", "bw", "bw", "pushup", 1, ["chest"], ["triceps", "shoulders"], "pushup"),
  dip:          X("Dips", "bw", "bw", "dip", 1, ["triceps", "chest"], ["shoulders"], "dip"),
  // back
  deadlift:     X("Deadlift", "bb", "fw", "deadlift", 1, ["lowerback", "glutes", "hamstrings"], ["traps", "quads", "forearms"], "deadlift"),
  sumodl:       X("Sumo deadlift", "bb", "fw", "deadlift", 1, ["glutes", "adductors", "lowerback"], ["quads", "traps"], "deadlift"),
  row:          X("Barbell row", "bb", "fw", "row", 1, ["lats"], ["biceps", "traps", "lowerback"], "row"),
  dbrow:        X("One-arm dumbbell row", "db", "fw", "row", 0.48, ["lats"], ["biceps", "traps"], "row", true),
  pullup:       X("Pull-ups", "bw", "bw", "pullup", 1, ["lats"], ["biceps", "forearms"], "pullup"),
  chinup:       X("Chin-ups", "bw", "bw", "pullup", 1.15, ["lats", "biceps"], ["forearms"], "pullup"),
  pulldown:     X("Lat Machine (pulldown)", "sel", "sel", "row", 1.0, ["lats"], ["biceps"], "pulldown"),
  selvt:        X("Vertical Traction", "sel", "sel", "row", 0.95, ["lats"], ["biceps"], "pulldown"),
  sellowrow:    X("Low Row", "sel", "sel", "row", 1.05, ["lats"], ["traps", "biceps"], "seatedrow"),
  selupper:     X("Upper Back", "sel", "sel", "row", 0.9, ["traps", "lats"], ["shoulders"], "seatedrow"),
  psrow:        X("Row", "pl", "ps", "row", 1.1, ["lats"], ["traps", "biceps"], "seatedrow"),
  pslowrow:     X("Low Row", "pl", "ps", "row", 1.1, ["lats"], ["traps", "biceps"], "seatedrow"),
  pstbar:       X("T-Bar Row", "pl", "ps", "row", 1.0, ["lats", "traps"], ["biceps", "lowerback"], "row"),
  pspulldown:   X("Pulldown", "pl", "ps", "row", 1.05, ["lats"], ["biceps"], "pulldown"),
  pspullover:   X("Pullover", "pl", "ps", "row", 0.7, ["lats"], ["chest"], "pullover"),
  psdeadlift:   X("Deadlift", "pl", "ps", "deadlift", 1.0, ["lowerback", "glutes", "hamstrings"], ["traps", "quads"], "deadlift"),
  cablerow:     X("Seated cable row", "cab", "cab", "row", 1.0, ["lats"], ["biceps", "traps"], "seatedrow"),
  facepull:     X("Face pull", "cab", "cab", "curl", 0.8, ["shoulders", "traps"], [], "seatedrow"),
  shrug:        X("Barbell shrug", "bb", "fw", "deadlift", 0.8, ["traps"], ["forearms"], "shrug"),
  selback:      X("Lower Back", "sel", "sel", "deadlift", 0.45, ["lowerback"], ["glutes"], "backext"),
  // shoulders
  ohp:          X("Overhead press", "bb", "fw", "ohp", 1, ["shoulders"], ["triceps"], "ohp"),
  dbohp:        X("Seated dumbbell press", "db", "fw", "ohp", 0.42, ["shoulders"], ["triceps"], "ohp", true),
  lateral:      X("Lateral raise", "db", "fw", "curl", 0.3, ["shoulders"], [], "raise", true),
  selshoulder:  X("Shoulder Press", "sel", "sel", "ohp", 1.15, ["shoulders"], ["triceps"], "ohp"),
  selrear:      X("Rear Delt", "sel", "sel", "curl", 0.75, ["shoulders"], ["traps"], "seatedrow"),
  psshoulder:   X("Shoulder Press", "pl", "ps", "ohp", 1.2, ["shoulders"], ["triceps"], "ohp"),
  cablelateral: X("Cable lateral raise", "cab", "cab", "curl", 0.2, ["shoulders"], [], "raise", true),
  // arms
  curl:         X("Barbell curl", "bb", "fw", "curl", 1, ["biceps"], ["forearms"], "curl"),
  dbcurl:       X("Dumbbell curl", "db", "fw", "curl", 0.45, ["biceps"], ["forearms"], "curl", true),
  hammer:       X("Hammer curl", "db", "fw", "curl", 0.48, ["biceps", "forearms"], [], "curl", true),
  selcurl:      X("Arm Curl", "sel", "sel", "curl", 1.1, ["biceps"], [], "curl"),
  psbiceps:     X("Biceps", "pl", "ps", "curl", 1.15, ["biceps"], [], "curl"),
  cablecurl:    X("Cable curl", "cab", "cab", "curl", 0.9, ["biceps"], ["forearms"], "curl"),
  skull:        X("Skull crusher", "bb", "fw", "curl", 0.95, ["triceps"], [], "skull"),
  pushdown:     X("Triceps pushdown", "cab", "cab", "curl", 1.0, ["triceps"], [], "pushdown"),
  selext:       X("Arm Extension", "sel", "sel", "curl", 1.2, ["triceps"], [], "pushdown"),
  psdip:        X("Seated Dip", "pl", "ps", "bench", 1.2, ["triceps"], ["chest"], "pushdown"),
  // legs
  squat:        X("Back squat", "bb", "fw", "squat", 1, ["quads", "glutes"], ["adductors", "lowerback"], "squat"),
  frontsquat:   X("Front squat", "bb", "fw", "squat", 0.8, ["quads"], ["glutes", "abs"], "squat"),
  lunge:        X("Dumbbell lunge", "db", "fw", "squat", 0.25, ["quads", "glutes"], ["hamstrings"], "lunge", true),
  bulgarian:    X("Bulgarian split squat", "db", "fw", "squat", 0.24, ["quads", "glutes"], [], "lunge", true),
  rdl:          X("Romanian deadlift", "bb", "fw", "deadlift", 0.75, ["hamstrings", "glutes"], ["lowerback"], "deadlift"),
  hipthrust:    X("Barbell hip thrust", "bb", "fw", "squat", 1.1, ["glutes"], ["hamstrings"], "hipthrust"),
  legpress:     X("Leg Press", "sel", "sel", "squat", 1.9, ["quads", "glutes"], ["hamstrings"], "legpress"),
  legext:       X("Leg Extension", "sel", "sel", "squat", 0.6, ["quads"], [], "legext"),
  legcurl:      X("Leg Curl (seated)", "sel", "sel", "squat", 0.5, ["hamstrings"], ["calves"], "legcurl"),
  pronecurl:    X("Prone Leg Curl", "sel", "sel", "squat", 0.4, ["hamstrings"], [], "legcurl"),
  abductor:     X("Abductor", "sel", "sel", "squat", 0.75, ["glutes"], [], "abduct"),
  adductor:     X("Adductor", "sel", "sel", "squat", 0.7, ["adductors"], [], "abduct"),
  selglute:     X("Glute", "sel", "sel", "squat", 0.5, ["glutes"], ["hamstrings"], "rearkick"),
  selcalf:      X("Calf", "sel", "sel", "squat", 0.9, ["calves"], [], "calf"),
  pslegpress:   X("Leg Press", "pl", "ps", "squat", 2.2, ["quads", "glutes"], ["hamstrings"], "legpress"),
  pslinear:     X("Linear Leg Press", "pl", "ps", "squat", 2.0, ["quads", "glutes"], ["hamstrings"], "legpress"),
  pshack:       X("Hack Squat", "pl", "ps", "squat", 1.0, ["quads"], ["glutes"], "squat"),
  psbelt:       X("Belt Squat", "pl", "ps", "squat", 1.0, ["quads", "glutes"], ["adductors"], "squat"),
  pship:        X("Hip Thrust", "pl", "ps", "squat", 1.2, ["glutes"], ["hamstrings"], "hipthrust"),
  pslegext:     X("Leg Extension", "pl", "ps", "squat", 0.6, ["quads"], [], "legext"),
  pslegcurl:    X("Standing Leg Curl", "pl", "ps", "squat", 0.3, ["hamstrings"], [], "standcurl"),
  psabduct:     X("Standing Abductor", "pl", "ps", "squat", 0.5, ["glutes"], [], "abduct"),
  pskick:       X("Rear Kick", "pl", "ps", "squat", 0.4, ["glutes"], ["hamstrings"], "rearkick"),
  pscalf:       X("Calf", "pl", "ps", "squat", 1.0, ["calves"], [], "calf"),
  psseatcalf:   X("Seated Calf", "pl", "ps", "squat", 0.7, ["calves"], [], "seatcalf"),
  calfraise:    X("Standing calf raise", "bb", "fw", "squat", 1.0, ["calves"], [], "calf"),
  // core
  selcrunch:    X("Abdominal Crunch", "sel", "sel", "bench", 0.55, ["abs"], [], "crunch"),
  selrotary:    X("Rotary Torso", "sel", "sel", "bench", 0.45, ["abs"], [], "crunch"),
  cablecrunch:  X("Cable crunch", "cab", "cab", "bench", 0.7, ["abs"], [], "crunch"),
  legraise:     X("Hanging leg raise", "bw", "bw", "legraise", 1, ["abs"], ["forearms"], "legraise"),
};
// older activity ids keep working
const ALIAS = { ohpress: "ohp", hipthrusts: "hipthrust" };
export const exOf = id => EX[id] || EX[ALIAS[id]] || null;
export const EQUIP = { bb: "Barbell", db: "Dumbbell", sel: "Selection", pl: "Pure Strength", cab: "Cable", bw: "Bodyweight" };

/* ---------- maths ---------- */
export const e1rm = (w, r) => r <= 1 ? w : w * (1 + Math.min(r, 20) / 30);
export const to10 = (w, r) => e1rm(w, r) / (1 + 10 / 30);              // 10-rep equivalent
export const isReps = id => !!BASE[exOf(id)?.base]?.reps;
const yearsOld = by => by ? new Date().getFullYear() - by : 0;

// reference weights (or reps) at the top 90/80/50/20/5 % for this person and exercise
export function standards(id, prof = {}) {
  const x = exOf(id), b = BASE[x.base], fem = prof.sex === "f";
  const bw = prof.weight || (fem ? 62 : 80), refH = fem ? 164 : 178, h = prof.height || refH;
  const adj = (fem ? b.fem : 1) * ageFactor(yearsOld(prof.birthYear)) * Math.pow(h / refH, b.lever);
  if (b.reps) return b.m.map(v => v * adj * Math.pow(80 / bw, 0.6) * x.k);
  return b.m.map(v => v * adj * bwFactor(bw) * x.k);
}
const phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
// percentile of a 10-rep-equivalent weight (or a rep count) — log-linear between the anchors
export function percentileOf(id, value, prof) {
  if (!(value > 0)) return 0;
  const s = standards(id, prof).map(v => Math.max(v, 0.4)), L = s.map(Math.log), x = Math.log(value);
  let i = 0; while (i < 3 && x > L[i + 1]) i++;
  const z = Z[i] + (x - L[i]) * (Z[i + 1] - Z[i]) / ((L[i + 1] - L[i]) || 1e-6);
  return Math.max(0.5, Math.min(99.9, phi(z) * 100));
}
export const setValue = (id, s) => isReps(id) ? s.r : to10(s.w, s.r);
export const setPct = (id, s, prof) => percentileOf(id, setValue(id, s), prof);

// weight × 10 (or reps) needed for the next tier
export function nextTier(id, pct, prof) {
  const cur = tierFor(pct), i = TIERS.indexOf(cur) + 1; if (i >= TIERS.length) return null;
  const t = TIERS[i], want = 100 - t.top + 0.05; let lo = Math.log(0.4), hi = Math.log(Math.max(...standards(id, prof)) * 4);
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; percentileOf(id, Math.exp(m), prof) < want ? lo = m : hi = m; }
  return { tier: t, value: Math.exp(hi) };
}

// best set per exercise across activities
export function bestByExercise(acts, prof) {
  const out = {};
  for (const a of acts) for (const l of a.lifts || []) {
    if (!exOf(l.ex)) continue;
    for (const s of l.sets || []) { const v = setValue(l.ex, s); if (!out[l.ex] || v > out[l.ex].v) out[l.ex] = { ex: l.ex, v, s, start: a.start }; }
  }
  for (const b of Object.values(out)) { b.pct = percentileOf(b.ex, b.v, prof); b.tier = tierFor(b.pct); }
  return out;
}
// muscle → best rating; primary muscles count fully, secondary ones at 60 % of the percentile
export function muscleMap(acts, prof) {
  const best = bestByExercise(acts, prof), out = {};
  for (const b of Object.values(best)) {
    const x = exOf(b.ex);
    const put = (m, pct, prim) => { if (!out[m] || pct > out[m].pct) out[m] = { pct, ex: b.ex, s: b.s, prim, tier: tierFor(pct) }; };
    x.mus.forEach(m => put(m, b.pct, true)); x.sec.forEach(m => put(m, b.pct * 0.6, false));
  }
  return out;
}
// overall level and balance across the major muscle groups
export function overall(map) {
  const keys = ["chest", "shoulders", "lats", "biceps", "triceps", "quads", "hamstrings", "glutes", "abs", "calves"];
  const v = keys.map(k => map[k]?.pct || 0), trained = v.filter(x => x > 0);
  if (!trained.length) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  return { pct: mean, tier: tierFor(mean), balance: Math.max(0, Math.round(100 - sd * 1.6)), trained: trained.length, total: keys.length };
}
export const fmtSet = (id, s) => isReps(id) ? `${s.r} reps` : `${+(+s.w).toFixed(1)} kg × ${s.r}`;
export const topTxt = pct => { const t = 100 - pct; return t < 1 ? "<1" : Math.round(t); };
