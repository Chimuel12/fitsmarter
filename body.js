// Body hub (front/back muscle map) and the animated exercise figures. Original drawings.
import { TIERS } from "./strength.js";

/* ===================== muscle map ===================== */
// left half of the body (x < 100); the right half is mirrored
const FRONT = {
  traps: ["M90 62 Q78 66 66 72 L90 70 Z"],
  shoulders: ["M66 72 Q50 74 46 92 Q46 104 52 110 Q58 96 68 84 Q70 76 66 72 Z"],
  chest: ["M70 78 Q84 72 98 76 L98 106 Q84 112 72 106 Q64 96 70 78 Z"],
  biceps: ["M50 112 Q44 126 45 142 Q50 150 56 146 Q60 130 60 114 Q56 108 50 112 Z"],
  forearms: ["M45 150 Q38 168 38 188 Q42 196 48 194 Q54 174 57 152 Z"],
  abs: ["M86 110 h12 v14 h-12 Z", "M86 127 h12 v14 h-12 Z", "M86 144 h12 v15 h-12 Z", "M86 162 L98 162 L98 188 Q90 184 86 172 Z"],
  obliques: ["M72 110 Q78 134 76 168 L83 172 L83 112 Z"],
  quads: ["M74 190 Q63 224 67 264 Q76 274 88 268 Q94 232 92 198 Q84 188 74 190 Z"],
  adductors: ["M93 198 Q99 216 98 238 Q94 246 90 238 Q90 216 93 198 Z"],
  calves: ["M70 284 Q65 312 71 344 L82 344 Q86 314 84 284 Q77 278 70 284 Z"],
};
const BACK = {
  traps: ["M100 54 L100 112 Q90 94 68 74 Q84 62 100 54 Z"],
  shoulders: ["M66 72 Q50 74 46 92 Q46 104 52 110 Q58 96 68 84 Q70 76 66 72 Z"],
  lats: ["M72 86 Q67 114 80 150 Q90 156 98 150 L98 116 Q86 100 72 86 Z"],
  lowerback: ["M86 152 Q93 158 98 160 L98 184 Q89 182 84 174 Z"],
  triceps: ["M50 112 Q44 128 46 146 Q52 150 57 144 Q60 128 59 114 Z"],
  forearms: ["M45 150 Q38 168 38 188 Q42 196 48 194 Q54 174 57 152 Z"],
  glutes: ["M76 182 Q69 198 75 216 Q90 224 99 216 L99 186 Q88 178 76 182 Z"],
  hamstrings: ["M74 220 Q65 244 69 270 Q78 278 88 272 Q94 246 96 224 Q86 222 74 220 Z"],
  calves: ["M70 282 Q62 302 68 324 Q74 334 81 328 Q87 302 84 282 Q77 276 70 282 Z"],
};
const ALIAS = { obliques: "abs" };
const SKIN = (back) => `<ellipse cx="100" cy="34" rx="17" ry="21"/><path d="M92 52 L108 52 L110 66 L90 66 Z"/>
  ${[0, 1].map(m => `<g ${m ? 'transform="translate(200 0) scale(-1 1)"' : ""}><ellipse cx="42" cy="205" rx="6" ry="10"/><ellipse cx="76" cy="356" rx="9" ry="6"/>${back ? '<path d="M72 328 L81 328 L80 348 L73 348 Z"/>' : ""}<path d="M72 270 Q70 278 71 284 L84 284 Q86 278 88 270 Z"/></g>`).join("")}`;

export function gradDefs() {
  return TIERS.map(t => `<linearGradient id="tg-${t.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient>`).join("") +
    `<radialGradient id="tg-orb" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#9CC2FF"/><stop offset="1" stop-color="#2F5BFF"/></radialGradient>`;
}
// one shared, always-rendered <defs> block: gradients inside hidden SVGs would not paint elsewhere
export function mountDefs() {
  if (document.getElementById("fs-defs")) return;
  document.body.insertAdjacentHTML("afterbegin", `<svg id="fs-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${gradDefs()}</defs></svg>`);
}
// map: muscle → { tier } ; returns the SVG for one side
export function bodySvg(map, back = false) {
  const M = back ? BACK : FRONT, fill = m => { const r = map[ALIAS[m] || m]; return r ? `url(#tg-${r.tier.id})` : "var(--bodyoff)"; };
  const part = (m, d) => `<path d="${d}" data-m="${ALIAS[m] || m}" fill="${fill(m)}"/>`;
  return `<svg viewBox="0 0 200 372" class="bodysvg" role="img" aria-label="${back ? "Back" : "Front"} muscle map">
    <g class="skin">${SKIN(back)}</g>
    <g class="mus">${Object.entries(M).map(([m, ds]) => ds.map(d => part(m, d) + `<g transform="translate(200 0) scale(-1 1)">${part(m, d)}</g>`).join("")).join("")}</g></svg>`;
}

/* ---------- tier gems ---------- */
const SHAPES = {
  iron: "M12 2 L21 6 L21 14 Q21 20 12 23 Q3 20 3 14 L3 6 Z", bronze: "M12 2 L21 6 L21 14 Q21 20 12 23 Q3 20 3 14 L3 6 Z",
  silver: "M12 1.5 L22.5 12 L12 22.5 L1.5 12 Z", gold: "M12 1.5 L22.5 9 L18.5 22 L5.5 22 L1.5 9 Z", ruby: "M12 1.5 L20 5 L22.5 13 L17 21.5 L7 21.5 L1.5 13 L4 5 Z",
  emerald: "M7 1.5 L17 1.5 L22.5 7 L22.5 17 L17 22.5 L7 22.5 L1.5 17 L1.5 7 Z", diamond: "M5 4 L19 4 L23 9 L12 22.5 L1 9 Z",
  champion: "M2 6 L7 10 L12 2 L17 10 L22 6 L20 21 L4 21 Z",
};
export function gem(t, size = 24) {
  if (t.id === "symmetric") return `<svg class="gem" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="url(#tg-orb)"/><path d="M12 7 l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4z" fill="#fff" opacity=".9"/></svg>`;
  return `<svg class="gem" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${SHAPES[t.id]}" fill="url(#tg-${t.id})" stroke="rgba(255,255,255,.35)" stroke-width=".8"/><path d="M12 8 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1z" fill="#fff" opacity=".85"/></svg>`;
}

/* ===================== exercise animation engine ===================== */
// angles in degrees: limbs 0 = straight down, 90 = forward (right), 180 = up; torso 0 = up, 90 = forward
const LEN = { torso: 50, ua: 26, fa: 24, th: 36, sh: 34 };
const v = (a, l) => [Math.sin(a * Math.PI / 180) * l, Math.cos(a * Math.PI / 180) * l];
const S = (h, t, ua, fa, th, sh, extra = {}) => ({ h, t, ua, fa, th, sh, ...extra });
// pose A, pose B, props drawn behind the figure, what the hands hold
export const ANIMS = {
  bench:        { A: S([120, 118], -90, 180, 180, 62, 0), B: S([120, 118], -90, 28, 180, 62, 0), props: "bench", hold: "bar" },
  inclinebench: { A: S([122, 126], -58, 158, 158, 80, 0), B: S([122, 126], -58, 40, 172, 80, 0), props: "incline", hold: "bar" },
  fly:          { A: S([120, 118], -90, 178, 178, 62, 0), B: S([120, 118], -90, 85, 95, 62, 0), props: "bench", hold: "db" },
  pullover:     { A: S([120, 118], -90, 178, 178, 62, 0), B: S([120, 118], -90, -110, -110, 62, 0), props: "bench", hold: "db" },
  skull:        { A: S([120, 118], -90, 172, 172, 62, 0), B: S([120, 118], -90, 172, -95, 62, 0), props: "bench", hold: "bar" },
  chestpress:   { A: S([88, 150], -4, 90, 90, 90, 0), B: S([88, 150], -4, -40, 92, 90, 0), props: "seat", hold: "handle" },
  pecdeck:      { A: S([88, 150], -4, 88, 92, 90, 0), B: S([88, 150], -4, 35, 125, 90, 0), props: "seat", hold: "handle" },
  ohp:          { A: S([100, 160], 0, 180, 180, 0, 0), B: S([100, 160], 0, 38, 172, 0, 0), props: "floor", hold: "bar" },
  row:          { A: S([96, 160], 66, 0, 0, 16, -12), B: S([96, 160], 66, -58, 16, 16, -12), props: "floor", hold: "bar" },
  seatedrow:    { A: S([78, 156], 4, 92, 90, 84, 84), B: S([78, 156], -6, -52, 90, 84, 84), props: "rowseat", hold: "cable" },
  pulldown:     { A: S([100, 162], -10, 170, 176, 90, 0), B: S([100, 162], -14, -22, 158, 90, 0), props: "seat", hold: "cableup" },
  pullup:       { A: S([100, 178], 0, 180, 180, 2, -18), B: S([100, 148], 2, -12, 168, 2, -18), props: "pullbar", hold: "none" },
  legraise:     { A: S([100, 178], 0, 180, 180, 0, 0), B: S([100, 178], -8, 180, 180, 96, 96), props: "pullbar", hold: "none" },
  pushup:       { A: S([82, 192], 76, 2, 2, -80, -80), B: S([82, 206], 86, -52, 34, -84, -84), props: "floor", hold: "none" },
  dip:          { A: S([100, 150], 4, 4, 4, 8, -40), B: S([100, 168], 10, -58, 18, 8, -40), props: "dipbars", hold: "none" },
  deadlift:     { A: S([100, 160], 4, 0, 0, 0, 0), B: S([86, 180], 64, 0, 0, 58, -14), props: "floor", hold: "bar" },
  shrug:        { A: S([100, 160], 0, 0, 0, 0, 0), B: S([100, 154], 0, 0, 0, 0, 0), props: "floor", hold: "bar" },
  backext:      { A: S([96, 160], 34, 40, 150, 90, 0), B: S([96, 160], -8, 40, 150, 90, 0), props: "seat", hold: "none" },
  raise:        { A: S([100, 160], 0, 2, 2, 0, 0), B: S([100, 160], 0, 90, 90, 0, 0), props: "floor", hold: "db" },
  curl:         { A: S([100, 160], 0, 4, 4, 0, 0), B: S([100, 160], 0, 4, 150, 0, 0), props: "floor", hold: "bar" },
  pushdown:     { A: S([100, 160], 8, -8, 112, 0, 0), B: S([100, 160], 8, -8, 4, 0, 0), props: "floor", hold: "cableup" },
  squat:        { A: S([100, 160], 6, -40, 150, 0, 0), B: S([84, 196], 40, -40, 150, 96, -24), props: "floor", hold: "backbar" },
  lunge:        { A: S([100, 160], 0, 2, 2, 8, 0, { th2: -8, sh2: -8 }), B: S([100, 190], 0, 2, 2, 80, 0, { th2: -22, sh2: -92 }), props: "floor", hold: "db" },
  hipthrust:    { A: S([112, 182], -78, 150, 30, 70, 0), B: S([112, 160], -92, 150, 30, 95, 0), props: "thrustbench", hold: "hipbar" },
  legpress:     { A: S([80, 168], -58, 50, 120, 128, 128), B: S([80, 168], -58, 50, 120, 168, 92), props: "legpress", hold: "none" },
  legext:       { A: S([90, 160], -4, 30, 120, 90, 0), B: S([90, 160], -4, 30, 120, 90, 86), props: "seat", hold: "none" },
  legcurl:      { A: S([90, 160], -4, 30, 120, 90, 84), B: S([90, 160], -4, 30, 120, 90, -14), props: "seat", hold: "none" },
  standcurl:    { A: S([100, 160], 10, 30, 90, 0, 0, { th2: 4, sh2: 4 }), B: S([100, 160], 10, 30, 90, 0, 0, { th2: 6, sh2: -125 }), props: "floor", hold: "none" },
  abduct:       { A: S([90, 160], -4, 30, 120, 90, 0), B: S([90, 160], -4, 30, 120, 78, -8), props: "seat", hold: "none" },
  rearkick:     { A: S([100, 160], 52, 60, 60, 0, 0, { th2: 8, sh2: 8 }), B: S([100, 160], 52, 60, 60, 0, 0, { th2: -82, sh2: -82 }), props: "floor", hold: "none" },
  calf:         { A: S([100, 160], 0, 0, 0, 0, 0), B: S([100, 150], 0, 0, 0, 0, 0), props: "floor", hold: "none" },
  seatcalf:     { A: S([90, 160], -4, 30, 120, 90, 0), B: S([90, 152], -4, 30, 120, 90, 0), props: "seat", hold: "none" },
  crunch:       { A: S([90, 160], -8, 40, 150, 90, 0), B: S([90, 160], 42, 40, 150, 90, 0), props: "seat", hold: "none" },
};
// which body segment glows for each muscle
const SEG = { chest: "torsoTop", shoulders: "shoulder", lats: "torso", traps: "torsoTop", lowerback: "torsoLow", abs: "torsoLow", biceps: "ua", triceps: "ua", forearms: "fa", quads: "th", hamstrings: "th", glutes: "hip", adductors: "th", calves: "sh" };

function joints(P) {
  const [hx, hy] = P.h, tv = [Math.sin(P.t * Math.PI / 180) * LEN.torso, -Math.cos(P.t * Math.PI / 180) * LEN.torso];
  const sh = [hx + tv[0], hy + tv[1]], head = [hx + tv[0] * 1.3, hy + tv[1] * 1.3];
  const el = [sh[0] + v(P.ua, LEN.ua)[0], sh[1] + v(P.ua, LEN.ua)[1]], ha = [el[0] + v(P.fa, LEN.fa)[0], el[1] + v(P.fa, LEN.fa)[1]];
  const kn = [hx + v(P.th, LEN.th)[0], hy + v(P.th, LEN.th)[1]], an = [kn[0] + v(P.sh, LEN.sh)[0], kn[1] + v(P.sh, LEN.sh)[1]];
  const th2 = P.th2 ?? P.th, sh2 = P.sh2 ?? P.sh;
  const kn2 = [hx + v(th2, LEN.th)[0], hy + v(th2, LEN.th)[1]], an2 = [kn2[0] + v(sh2, LEN.sh)[0], kn2[1] + v(sh2, LEN.sh)[1]];
  return { hip: [hx, hy], sh, head, el, ha, kn, an, kn2, an2, mid: [(hx + sh[0]) / 2, (hy + sh[1]) / 2] };
}
const lerp = (a, b, k) => typeof a === "number" ? a + (b - a) * k : a.map((x, i) => x + (b[i] - x) * k);
function pose(A, B, k) { const o = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) o[key] = lerp(A[key] ?? B[key], B[key] ?? A[key], k); return o; }
const ln = (a, b, w, c, extra = "") => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;

function propsSvg(kind, J0) {
  const g = "var(--eq)", f = "var(--eqdark)";
  const floor = `<line x1="20" y1="232" x2="180" y2="232" stroke="${f}" stroke-width="2"/>`;
  return ({
    floor,
    bench: floor + `<rect x="58" y="124" width="96" height="8" rx="3" fill="${g}"/><line x1="70" y1="132" x2="70" y2="232" stroke="${g}" stroke-width="5"/><line x1="142" y1="132" x2="142" y2="232" stroke="${g}" stroke-width="5"/><line x1="72" y1="40" x2="72" y2="124" stroke="${f}" stroke-width="4"/>`,
    incline: floor + `<line x1="128" y1="134" x2="80" y2="84" stroke="${g}" stroke-width="9" stroke-linecap="round"/><rect x="112" y="132" width="40" height="8" rx="3" fill="${g}"/><line x1="132" y1="140" x2="132" y2="232" stroke="${g}" stroke-width="5"/>`,
    seat: floor + `<rect x="66" y="156" width="52" height="8" rx="3" fill="${g}"/><line x1="76" y1="164" x2="76" y2="232" stroke="${g}" stroke-width="5"/><line x1="78" y1="160" x2="70" y2="96" stroke="${g}" stroke-width="8" stroke-linecap="round"/><rect x="150" y="40" width="10" height="192" rx="4" fill="${f}"/>`,
    rowseat: floor + `<rect x="54" y="160" width="48" height="8" rx="3" fill="${g}"/><line x1="64" y1="168" x2="64" y2="232" stroke="${g}" stroke-width="5"/><rect x="164" y="80" width="10" height="152" rx="4" fill="${f}"/><rect x="150" y="196" width="10" height="36" rx="3" fill="${g}"/>`,
    pullbar: `<line x1="30" y1="66" x2="170" y2="66" stroke="${g}" stroke-width="5" stroke-linecap="round"/>`,
    dipbars: floor + `<line x1="70" y1="${J0.ha[1] + 3}" x2="140" y2="${J0.ha[1] + 3}" stroke="${g}" stroke-width="5" stroke-linecap="round"/><line x1="76" y1="${J0.ha[1] + 3}" x2="76" y2="232" stroke="${g}" stroke-width="4"/><line x1="134" y1="${J0.ha[1] + 3}" x2="134" y2="232" stroke="${g}" stroke-width="4"/>`,
    thrustbench: floor + `<rect x="34" y="166" width="40" height="8" rx="3" fill="${g}"/><line x1="54" y1="174" x2="54" y2="232" stroke="${g}" stroke-width="5"/>`,
    legpress: floor + `<line x1="94" y1="172" x2="42" y2="120" stroke="${g}" stroke-width="9" stroke-linecap="round"/><rect x="60" y="168" width="44" height="8" rx="3" fill="${g}"/><line x1="40" y1="232" x2="176" y2="62" stroke="${f}" stroke-width="3"/>`,
  })[kind] || floor;
}
function holdSvg(kind, J, J0) {
  const bar = (p, half = 0) => `<rect x="${(p[0] - 3).toFixed(1)}" y="${(p[1] - 15).toFixed(1)}" width="6" height="30" rx="2" fill="var(--plate)"/>${half ? "" : `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="var(--eq)"/>`}`;
  const db = p => `<rect x="${(p[0] - 9).toFixed(1)}" y="${(p[1] - 3).toFixed(1)}" width="18" height="6" rx="2" fill="var(--eq)"/><rect x="${(p[0] - 11).toFixed(1)}" y="${(p[1] - 6).toFixed(1)}" width="5" height="12" rx="1.5" fill="var(--plate)"/><rect x="${(p[0] + 6).toFixed(1)}" y="${(p[1] - 6).toFixed(1)}" width="5" height="12" rx="1.5" fill="var(--plate)"/>`;
  return ({
    bar: bar(J.ha), backbar: bar([J.sh[0] - 3, J.sh[1] + 2]), hipbar: bar([J.hip[0] + 4, J.hip[1] - 8]), db: db(J.ha),
    handle: `<circle cx="${J.ha[0].toFixed(1)}" cy="${J.ha[1].toFixed(1)}" r="5" fill="var(--eq)"/>`,
    cable: ln(J.ha, [168, 200], 1.5, "var(--eq)") + `<circle cx="${J.ha[0].toFixed(1)}" cy="${J.ha[1].toFixed(1)}" r="4" fill="var(--eq)"/>`,
    cableup: ln(J.ha, [J0.sh[0] + 10, 40], 1.5, "var(--eq)") + `<rect x="${(J.ha[0] - 10).toFixed(1)}" y="${(J.ha[1] - 2).toFixed(1)}" width="20" height="4" rx="2" fill="var(--eq)"/>`,
  })[kind] || "";
}
// one frame of an exercise as SVG inner markup
export function frame(key, k, muscles = []) {
  const A = ANIMS[key] || ANIMS.curl, P = pose(A.A, A.B, k), J = joints(P), J0 = joints(A.A);
  const segs = new Set(muscles.map(m => SEG[m]));
  const body = "var(--fig)", hi = "var(--figHi)", c = s => segs.has(s) ? hi : body;
  const torsoC = segs.has("torso") ? hi : body;
  let s = propsSvg(A.props, J0);
  // far limbs a bit darker for depth
  s += ln(J.hip, J.kn2, 11, "var(--figFar)") + ln(J.kn2, J.an2, 9, "var(--figFar)") + ln(J.an2, [J.an2[0] + 9, J.an2[1]], 6, "var(--figFar)");
  s += ln(J.hip, J.sh, 15, torsoC);
  if (segs.has("torsoTop")) s += ln(J.mid, J.sh, 15, hi);
  if (segs.has("torsoLow")) s += ln(J.hip, J.mid, 14, hi);
  if (segs.has("hip")) s += `<circle cx="${J.hip[0].toFixed(1)}" cy="${J.hip[1].toFixed(1)}" r="8.5" fill="${hi}"/>`;
  s += ln(J.hip, J.kn, 11, c("th")) + ln(J.kn, J.an, 9, c("sh")) + ln(J.an, [J.an[0] + 9, J.an[1]], 6, body);
  s += `<circle cx="${J.head[0].toFixed(1)}" cy="${J.head[1].toFixed(1)}" r="9" fill="${body}"/>`;
  s += ln(J.sh, J.el, 8, c("ua")) + ln(J.el, J.ha, 7, c("fa"));
  if (segs.has("shoulder")) s += `<circle cx="${J.sh[0].toFixed(1)}" cy="${J.sh[1].toFixed(1)}" r="7" fill="${hi}"/>`;
  s += holdSvg(A.hold, J, J0);
  return s;
}
export const animSvg = (key, muscles, cls = "") => `<svg viewBox="20 30 160 210" class="exanim ${cls}" data-anim="${key}" data-mus="${muscles.join(",")}" aria-hidden="true">${frame(key, 0.5, muscles)}</svg>`;

// animate every visible .exanim.play
let raf = 0;
export function startAnims() {
  if (raf) return;
  const tick = now => {
    document.querySelectorAll("svg.exanim.play").forEach(el => { const k = (1 - Math.cos(now / 1400 * Math.PI)) / 2; el.innerHTML = frame(el.dataset.anim, k, el.dataset.mus ? el.dataset.mus.split(",") : []); });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
