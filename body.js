// Body hub drawing, tier gems and exercise media.
// Body geometry: data/bodymap.json, converted from react-native-body-highlighter (MIT, © Hicham ELABBASSI),
// the same artwork MuscleMap (MIT, © Melih Colpan) and openGym use. Exercise photos: free-exercise-db (public domain).
import { TIERS, tierIndex, imgUrl } from "./strength.js";

let BODY = null;
export async function loadBody(fetchJson = u => fetch(u).then(r => r.json())) { if (!BODY) BODY = await fetchJson("data/bodymap.json"); return BODY; }

/* ---------- gradients: one shared, always-rendered <defs> (gradients inside hidden SVGs don't paint elsewhere) ---------- */
export function gradDefs() {
  return TIERS.map(t => `<linearGradient id="tg-${t.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient>`).join("") +
    `<radialGradient id="tg-orb" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#9CC2FF"/><stop offset="1" stop-color="#2F5BFF"/></radialGradient>`;
}
export function mountDefs() {
  if (document.getElementById("fs-defs")) return;
  document.body.insertAdjacentHTML("afterbegin", `<svg id="fs-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${gradDefs()}</defs></svg>`);
}

/* ---------- body map ---------- */
const SLUG = { chest: "chest", obliques: "abs", abs: "abs", biceps: "biceps", triceps: "triceps", trapezius: "traps", deltoids: "shoulders", adductors: "adductors",
  quadriceps: "quads", tibialis: "calves", calves: "calves", forearm: "forearms", "upper-back": "lats", "lower-back": "lowerback", gluteal: "glutes", hamstring: "hamstrings" };
// untrained muscles look small; every tier adds size, Symmetric is clearly bulked
export const growth = r => !r ? 0.82 : 0.86 + tierIndex(r.tier.id) * 0.045;

// map: muscle → { tier }; sex "f" uses the female model
export function bodySvg(map, back = false, sex = "m") {
  if (!BODY) return "";
  const side = BODY[sex === "f" ? "female" : "male"][back ? "back" : "front"];
  const trained = Object.values(map).filter(Boolean), avg = trained.length ? trained.reduce((a, r) => a + tierIndex(r.tier.id), 0) / 14 : 0;
  const [x, , w] = side.vb.split(" ").map(Number), cx = x + w / 2, bulk = 1 + Math.min(avg, 8) * 0.014;
  const parts = side.parts.map(p => {
    const m = SLUG[p.slug], r = m && map[m], ds = [...p.left, ...p.right, ...p.common];
    if (!m) return ds.map(d => `<path d="${d}" class="${p.slug === "hair" ? "hair" : "skin"}"/>`).join("");
    const s = growth(r), fill = r ? `url(#tg-${r.tier.id})` : "var(--bodyoff)";
    return ds.map(d => `<path d="${d}" data-m="${m}" fill="${fill}" class="mus${r ? " on" : ""}" style="transform:scale(${s.toFixed(3)})"/>`).join("");
  }).join("");
  return `<svg viewBox="${side.vb}" class="bodysvg" role="img" aria-label="${back ? "Back" : "Front"} muscle map">
    <g transform="translate(${cx} 0) scale(${bulk.toFixed(3)} 1) translate(${-cx} 0)">
      <path d="${side.outline}" class="outline"/>${parts}</g></svg>`;
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

/* ---------- exercise media: start and end photos, cross-faded in a loop ---------- */
export const exMedia = (id, cls = "") => cls.includes("thumb")
  ? `<span class="exm ${cls}"><img src="${imgUrl(id, 0)}" alt="" loading="lazy" decoding="async"></span>`
  : `<span class="exm play ${cls}"><img src="${imgUrl(id, 0)}" alt="" decoding="async"><img src="${imgUrl(id, 1)}" alt="" decoding="async"></span>`;
