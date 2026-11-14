// Strength standards and medals.
// A lift's one-rep max (estimated from weight × reps) is compared with population standards
// for the lifter's sex, body weight, age and height, giving a percentile and a medal.
// Standards are bodyweight multiples at the 5th, 20th, 50th, 80th and 95th percentile of
// gym-goers (beginner → elite), approximated from public strength-standard tables.

const P = [5, 20, 50, 80, 95];
const Z = [-1.645, -0.842, 0, 0.842, 1.645];

// kind: "w" = barbell/machine load (kg), "d" = dumbbell load per hand, "r" = bodyweight reps
// lever: how height changes leverage (+ favours tall lifters, − favours short ones)
export const EXERCISES = {
  bench:    { n: "Bench press",       e: "🏋️", kind: "w", lever: -0.25, m: [0.50, 0.75, 1.10, 1.45, 1.85], f: [0.25, 0.45, 0.70, 0.95, 1.25] },
  squat:    { n: "Squat",             e: "🦵", kind: "w", lever: -0.15, m: [0.70, 1.05, 1.45, 1.90, 2.40], f: [0.45, 0.70, 1.00, 1.35, 1.75] },
  deadlift: { n: "Deadlift",          e: "🏗️", kind: "w", lever: 0.20,  m: [0.90, 1.25, 1.70, 2.20, 2.75], f: [0.55, 0.85, 1.20, 1.60, 2.05] },
  ohp:      { n: "Overhead press",    e: "🙌", kind: "w", lever: -0.25, m: [0.35, 0.50, 0.70, 0.95, 1.20], f: [0.20, 0.30, 0.45, 0.62, 0.82] },
  row:      { n: "Barbell row",       e: "🚣", kind: "w", lever: 0,     m: [0.45, 0.65, 0.95, 1.25, 1.60], f: [0.25, 0.40, 0.60, 0.80, 1.05] },
  hipthrust:{ n: "Hip thrust",        e: "🍑", kind: "w", lever: 0,     m: [0.60, 1.00, 1.60, 2.30, 3.00], f: [0.50, 0.90, 1.40, 2.00, 2.70] },
  legpress: { n: "Leg press",         e: "🦿", kind: "w", lever: 0,     m: [1.00, 1.60, 2.50, 3.50, 4.60], f: [0.60, 1.10, 1.80, 2.60, 3.50] },
  pulldown: { n: "Lat pulldown",      e: "⬇️", kind: "w", lever: 0,     m: [0.45, 0.65, 0.90, 1.15, 1.45], f: [0.30, 0.45, 0.62, 0.80, 1.00] },
  dbbench:  { n: "Dumbbell bench",    e: "💪", kind: "d", lever: -0.25, m: [0.18, 0.30, 0.45, 0.62, 0.80], f: [0.08, 0.15, 0.25, 0.36, 0.48] },
  curl:     { n: "Dumbbell curl",     e: "💪", kind: "d", lever: 0,     m: [0.10, 0.18, 0.28, 0.40, 0.52], f: [0.05, 0.10, 0.17, 0.25, 0.34] },
  pullup:   { n: "Pull-ups",          e: "🧗", kind: "r", lever: -0.3,  m: [1, 5, 11, 18, 26], f: [0, 1, 4, 9, 15] },
  pushup:   { n: "Push-ups",          e: "🤸", kind: "r", lever: -0.2,  m: [5, 15, 30, 45, 60], f: [1, 6, 16, 27, 40] },
};

export const MEDALS = [
  { id: "diamond",  n: "Diamond",  top: 1,  e: "💎", c: "#5AD8FF", pts: 5 },
  { id: "platinum", n: "Platinum", top: 5,  e: "🏆", c: "#9FB4C7", pts: 4 },
  { id: "gold",     n: "Gold",     top: 15, e: "🥇", c: "#F5B70A", pts: 3 },
  { id: "silver",   n: "Silver",   top: 30, e: "🥈", c: "#A7AEB8", pts: 2 },
  { id: "bronze",   n: "Bronze",   top: 50, e: "🥉", c: "#D0844B", pts: 1 },
];

// Epley; very high-rep sets are capped because the estimate gets unreliable
export const e1rm = (w, r) => r <= 1 ? w : w * (1 + Math.min(r, 15) / 30);

const ageFactor = a => !a ? 1 : a < 14 ? 0.7 : a < 23 ? 0.86 + (a - 14) * 0.0156 : a <= 40 ? 1 : Math.max(0.6, 1 - (a - 40) * 0.009);
const yearsOld = by => by ? new Date().getFullYear() - by : 0;

// kg (or reps) needed for each standard percentile, for this person
export function standards(ex, prof) {
  const X = EXERCISES[ex], fem = prof.sex === "f", ref = fem ? 62 : 80, refH = fem ? 164 : 178;
  const bw = prof.weight || ref, h = prof.height || refH, age = ageFactor(yearsOld(prof.birthYear));
  const lev = Math.pow(h / refH, X.lever);
  const base = fem ? X.f : X.m;
  if (X.kind === "r") {
    // reps get harder with body weight above the reference
    const k = Math.pow(ref / bw, 0.6) * age * lev;
    return base.map(v => v * k);
  }
  const k = ref * Math.pow(bw / ref, 0.67) * age * lev; // allometric: lighter lifters are relatively stronger
  return base.map(v => v * k);
}

const phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };

// percentile (0–100) of a performance against the standards (log-linear between points)
export function percentile(ex, value, prof) {
  if (!(value > 0)) return 0;
  const s = standards(ex, prof).map(v => Math.max(v, 0.5)), L = s.map(Math.log), x = Math.log(value);
  let i = 0; while (i < 3 && x > L[i + 1]) i++;
  const z = Z[i] + (x - L[i]) * (Z[i + 1] - Z[i]) / ((L[i + 1] - L[i]) || 1e-6);
  return Math.max(0.5, Math.min(99.9, phi(z) * 100));
}

export const medalFor = pct => MEDALS.find(m => 100 - pct <= m.top) || null;

// what you need for the next medal
export function nextMedal(ex, pct, prof) {
  const cur = medalFor(pct), i = cur ? MEDALS.indexOf(cur) - 1 : MEDALS.length - 1;
  if (i < 0) return null;
  const target = MEDALS[i], want = 100 - target.top, s = standards(ex, prof).map(v => Math.max(v, 0.5)), L = s.map(Math.log);
  // invert the percentile curve numerically
  let lo = Math.log(0.5), hi = L[4] + 2;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; percentile(ex, Math.exp(mid), prof) < want ? lo = mid : hi = mid; }
  return { medal: target, value: Math.exp(hi) };
}

// best performance per exercise in a set of activities
export function bests(acts, prof) {
  const out = {};
  for (const a of acts) for (const l of a.lifts || []) {
    const X = EXERCISES[l.ex]; if (!X) continue;
    for (const s of l.sets || []) {
      const v = X.kind === "r" ? s.r : e1rm(s.w, s.r);
      if (!out[l.ex] || v > out[l.ex].v) out[l.ex] = { ex: l.ex, v, w: s.w, r: s.r, start: a.start };
    }
  }
  for (const b of Object.values(out)) { b.pct = percentile(b.ex, b.v, prof); b.medal = medalFor(b.pct); }
  return out;
}

export const fmtLift = (ex, s) => EXERCISES[ex].kind === "r" ? `${s.r} reps` : `${+s.w.toFixed(1)} kg × ${s.r}`;
export const unitOf = ex => EXERCISES[ex].kind === "r" ? "reps" : EXERCISES[ex].kind === "d" ? "kg/hand" : "kg";
