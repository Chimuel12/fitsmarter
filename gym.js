// Strength UI: body hub, exercise picker and the set logger (Set · Previous · kg · Reps · ✓).
import { EX, exOf, EQUIP, MUSCLES, TIERS, tierFor, tierIndex, setPct, setValue, isReps, fmtSet, topTxt, nextTier, muscleMap, overall, bestByExercise } from "./strength.js";
import { bodySvg, gem, exMedia } from "./body.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const tierChip = pct => { const t = tierFor(pct); return `<span class="tchip" style="--tc:${t.c};--tc2:${t.c2}">${gem(t, 16)}${t.n} · Top ${topTxt(pct)}%</span>`; };
const musNames = x => [...x.mus, ...x.sec].slice(0, 3).map(m => MUSCLES[m]).join(", ");

/* ---------- saved lifts ---------- */
// keep checked sets (or every filled set when logging afterwards) and store the rating
export function finalizeLifts(lifts, prof, all = false) {
  return lifts.map(l => {
    const sets = l.sets.filter(s => (all || s.done) && +s.r > 0 && (isReps(l.ex) || +s.w > 0)).map(s => ({ w: +s.w || 0, r: Math.round(+s.r) }));
    if (!sets.length) return null;
    const pct = Math.max(...sets.map(s => setPct(l.ex, s, prof)));
    return { ex: l.ex, sets, pct: Math.round(pct * 10) / 10, tier: tierFor(pct).id };
  }).filter(Boolean);
}
export function liftList(lifts, prof) {
  return `<div class="lifts">${lifts.map(l => { const x = exOf(l.ex); if (!x) return "";
    const pct = l.pct ?? Math.max(...l.sets.map(s => setPct(l.ex, s, prof)));
    return `<div class="lift"><div class="lift-h">${exMedia(l.ex, "thumb")}<div><b>${esc(x.n)}</b><small>${esc(x.line)}</small></div>${tierChip(pct)}</div>
      <div class="sets">${l.sets.map(s => `<span>${fmtSet(l.ex, s)}</span>`).join("")}</div></div>`; }).join("")}</div>`;
}

/* ---------- exercise picker ---------- */
const GROUPS = { all: ["All", null], chest: ["Chest", ["chest"]], back: ["Back", ["lats", "traps", "lowerback"]], shoulders: ["Shoulders", ["shoulders"]], arms: ["Arms", ["biceps", "triceps", "forearms"]], legs: ["Legs", ["quads", "hamstrings", "adductors", "calves"]], glutes: ["Glutes", ["glutes"]], core: ["Core", ["abs"]] };
const EQG = { all: "All", tg: "Technogym", fw: "Free weights", mc: "Machines", cab: "Cable", bw: "Bodyweight" };
const eqMatch = (e, x) => e === "all" || (e === "tg" ? /Technogym/.test(x.line) : e === "fw" ? ["bb", "db", "kb"].includes(x.eq) : x.eq === e);
const MAXROWS = 100;
export function pickExercise(sheet, onPick, preset = {}) {
  let q = "", g = preset.group || "all", e = "all";
  sheet(`<h2>Add exercise</h2>
    <div class="field"><input type="search" id="exQ" placeholder="Search ${Object.keys(EX).length} exercises" autocomplete="off"></div>
    <div class="seg" id="exG">${Object.entries(GROUPS).map(([k, [n]]) => `<button data-g="${k}" aria-pressed="${k === g}">${n}</button>`).join("")}</div>
    <div class="seg" id="exE">${Object.entries(EQG).map(([k, n]) => `<button data-e="${k}" aria-pressed="${k === e}">${n}</button>`).join("")}</div>
    <div class="list exlist" id="exL"></div>`, (el, close) => {
    const draw = () => {
      const ql = q.toLowerCase(), mg = GROUPS[g][1];
      const words = ql.split(/\s+/).filter(Boolean);
      // curated (incl. Technogym) first, then the rest of the library
      const items = Object.entries(EX).filter(([, x]) => (!mg || x.mus.some(m => mg.includes(m))) && eqMatch(e, x) && words.every(w => (x.n + " " + x.line + " " + musNames(x)).toLowerCase().includes(w)))
        .sort((a, b) => (a[1].est || 0) - (b[1].est || 0));
      el.querySelector("#exL").innerHTML = items.slice(0, MAXROWS).map(([id, x]) => `<button class="li exrow" data-pick="${id}" type="button">${exMedia(id, "thumb")}<div><b>${esc(x.n)}</b><small>${esc(x.line)} · ${esc(musNames(x))}</small></div><span class="eqtag">${EQUIP[x.eq]}</span></button>`).join("")
        + (items.length > MAXROWS ? `<p class="muted" style="text-align:center;padding:10px">${items.length - MAXROWS} more · search to narrow down</p>` : "") || `<div class="empty">No exercise matches.</div>`;
    };
    el.querySelector("#exQ").oninput = ev => { q = ev.target.value; draw(); };
    el.querySelector("#exG").onclick = ev => { const b = ev.target.closest("[data-g]"); if (!b) return; g = b.dataset.g; el.querySelectorAll("#exG button").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); };
    el.querySelector("#exE").onclick = ev => { const b = ev.target.closest("[data-e]"); if (!b) return; e = b.dataset.e; el.querySelectorAll("#exE button").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); };
    el.querySelector("#exL").onclick = ev => { const b = ev.target.closest("[data-pick]"); if (b) { close(); onPick(b.dataset.pick); } };
    draw();
  });
}

/* ---------- set logger ---------- */
// state = { lifts: [{ ex, sets: [{ w, r, done }] }], cur }
export function gymEditor(el, state, ctx) {
  const { prof, history = [], toast, sheet, onChange = () => {}, manual = false } = ctx;
  const prev = (ex, i) => { for (const a of history) { const l = (a.lifts || []).find(x => x.ex === ex); if (l) return l.sets[i] || l.sets.at(-1); } return null; };
  const add = id => { state.lifts.push({ ex: id, sets: [{ w: prev(id, 0)?.w || "", r: prev(id, 0)?.r || "", done: false }] }); state.cur = state.lifts.length - 1; onChange(); draw(); };
  function draw() {
    const L = state.lifts[state.cur];
    if (!L) {
      el.innerHTML = `<div class="gx"><div class="gx-stage empty"><p>Pick an exercise to start logging sets.</p><button class="pill grad" type="button" data-add>+ Add exercise</button></div></div>`;
      return;
    }
    const x = exOf(L.ex), reps = isReps(L.ex);
    const done = L.sets.filter(s => s.done || (manual && +s.r > 0)), best = done.length ? Math.max(...done.map(s => setPct(L.ex, s, prof))) : 0, nx = best ? nextTier(L.ex, best, prof) : null;
    el.innerHTML = `<div class="gx">
      <div class="gx-stage">${exMedia(L.ex, "big")}<span class="gx-line">${esc(x.line)}</span></div>
      <div class="gx-chips">${state.lifts.map((l, i) => { const y = exOf(l.ex), ok = l.sets.some(s => s.done); return `<button type="button" class="gx-chip${i === state.cur ? " on" : ""}" data-cur="${i}" aria-label="${esc(y.n)}">${exMedia(l.ex, "thumb")}${ok ? "<i>✓</i>" : ""}</button>`; }).join("")}<button type="button" class="gx-chip plus" data-add aria-label="Add exercise">+</button></div>
      <div class="gx-head"><div><h3>${esc(x.n)}</h3><small>${esc(musNames(x))}</small></div>${best ? tierChip(best) : ""}<button type="button" class="gx-x" data-rm aria-label="Remove exercise">✕</button></div>
      ${x.ins?.length ? `<details class="gx-how"><summary>How to do it</summary><ol>${x.ins.map(s => `<li>${esc(s)}</li>`).join("")}</ol></details>` : ""}
      <table class="gx-sets"><thead><tr><th>Set</th><th>Previous</th>${reps ? "" : `<th>${x.hand ? "kg/hand" : "kg"}</th>`}<th>Reps</th><th></th></tr></thead><tbody>
      ${L.sets.map((s, i) => { const p = prev(L.ex, i); return `<tr class="${s.done ? "done" : ""}"><td>${i + 1}</td><td class="pv">${p ? fmtSet(L.ex, p) : "–"}</td>${reps ? "" : `<td><input inputmode="decimal" type="number" step="0.5" min="0" data-w="${i}" value="${s.w}" placeholder="${p?.w ?? "kg"}"></td>`}<td><input inputmode="numeric" type="number" min="1" max="200" data-r="${i}" value="${s.r}" placeholder="${p?.r ?? "reps"}"></td><td><button type="button" class="chk" data-done="${i}" aria-pressed="${!!s.done}" aria-label="Set done">✓</button></td></tr>`; }).join("")}
      </tbody></table>
      <div class="row"><button type="button" class="pill ghost block" data-addset>+ Add set</button></div>
      ${nx ? `<p class="gx-next">${gem(nx.tier, 18)} <b>${nx.tier.n}</b> at ${reps ? `${Math.ceil(nx.value)} reps` : `${Math.ceil(nx.value * 2) / 2} kg × 10${x.hand ? " per hand" : ""}`}</p>` : `<p class="gx-next muted">Tier is calculated from the 10-rep equivalent of your best set.</p>`}
    </div>`;
  }
  el.addEventListener("input", ev => { const L = state.lifts[state.cur], w = ev.target.dataset.w, r = ev.target.dataset.r; if (w != null) L.sets[w].w = ev.target.value; if (r != null) L.sets[r].r = ev.target.value; onChange(); });
  el.addEventListener("click", ev => {
    const t = ev.target.closest("button"); if (!t) return; const L = state.lifts[state.cur];
    if (t.dataset.cur != null) { state.cur = +t.dataset.cur; draw(); }
    else if (t.hasAttribute("data-add")) pickExercise(sheet, add);
    else if (t.hasAttribute("data-addset")) { const last = L.sets.at(-1) || {}; L.sets.push({ w: last.w || "", r: last.r || "", done: false }); onChange(); draw(); }
    else if (t.hasAttribute("data-rm")) { state.lifts.splice(state.cur, 1); state.cur = Math.max(0, state.cur - 1); onChange(); draw(); }
    else if (t.dataset.done != null) {
      const s = L.sets[t.dataset.done];
      if (!s.done) {
        if (!+s.r || (!isReps(L.ex) && !+s.w)) { toast(isReps(L.ex) ? "Enter reps first" : "Enter kg and reps first"); return; }
        const before = L.sets.filter(y => y.done).reduce((m, y) => Math.max(m, setPct(L.ex, y, prof)), 0), pct = setPct(L.ex, s, prof);
        s.done = true;
        if (tierFor(pct).id !== tierFor(before).id && pct > before) toast(`${tierFor(pct).n} · top ${topTxt(pct)}% on ${exOf(L.ex).n.toLowerCase()}`);
      } else s.done = false;
      onChange(); draw();
    }
  });
  draw();
}

/* ---------- body hub ---------- */
export function renderHub(el, acts, prof, ctx) {
  const map = muscleMap(acts, prof), ov = overall(map), back = el.dataset.back === "1";
  const trained = Object.entries(map).filter(([m]) => MUSCLES[m]).sort((a, b) => b[1].pct - a[1].pct);
  const majors = ["chest", "shoulders", "lats", "biceps", "triceps", "quads", "hamstrings", "glutes", "abs", "calves"];
  const weakest = majors.map(m => [m, map[m]?.pct || 0]).sort((a, b) => a[1] - b[1])[0];
  const call = (pos, label, t, sub) => `<div class="hub-call ${pos}">${t ? gem(t, 34) : ""}<b>${label}</b><small>${sub}</small></div>`;
  el.innerHTML = `<div class="hub">
    <div class="hub-tiers">${TIERS.slice(1).map(t => `<div class="${ov && ov.tier.id === t.id ? "on" : ""}">${gem(t, 26)}<small>${t.id === "symmetric" ? "Top 5%" : `${t.top}%`}</small></div>`).join("")}</div>
    <div class="hub-stage">
      ${call("tl", "Overall", ov?.tier, ov ? `${ov.tier.n} · top ${topTxt(ov.pct)}%` : "No lifts yet")}
      ${call("tr", "Balance", null, ov ? `${ov.balance}% · ${ov.trained}/${ov.total} groups` : "Train all groups")}
      ${call("bl", "Strongest", trained[0]?.[1].tier, trained[0] ? MUSCLES[trained[0][0]] : "–")}
      ${call("br", "Train next", null, MUSCLES[weakest[0]])}
      <div class="hub-body">${bodySvg(map, back, prof.sex)}</div>
    </div>
    <div class="row" style="justify-content:center"><div class="seg dark" role="group" aria-label="View"><button data-side="0" aria-pressed="${!back}">Front</button><button data-side="1" aria-pressed="${back}">Back</button></div></div>
    <div class="hub-list">${trained.length ? trained.map(([m, r]) => `<button class="hub-row" data-mus="${m}" type="button">${gem(r.tier, 24)}<div><b>${MUSCLES[m]}</b><small>${esc(exOf(r.ex).n)} · ${fmtSet(r.ex, r.s)}${r.prim ? "" : " (assisting)"}</small></div><span>${r.tier.n}<small>Top ${topTxt(r.pct)}%</small></span></button>`).join("")
      : `<p class="hub-empty">Log a strength workout with kg and reps. Each muscle you train lights up in its tier color, from Bronze (top 90%) to Symmetric (top 5%).</p>`}</div>
  </div>`;
  el.onclick = ev => {
    const s = ev.target.closest("[data-side]"); if (s) { el.dataset.back = s.dataset.side; renderHub(el, acts, prof, ctx); return; }
    const m = ev.target.closest("[data-mus],[data-m]"); if (m) muscleSheet(m.dataset.mus || m.dataset.m, map, prof, ctx);
  };
}
function muscleSheet(m, map, prof, ctx) {
  const r = map[m], x = r && exOf(r.ex), nx = r ? nextTier(r.ex, r.prim ? r.pct : r.pct / 0.6, prof) : null;
  const sug = Object.entries(EX).filter(([, y]) => y.mus.includes(m)).sort((a, b) => (a[1].est || 0) - (b[1].est || 0)).slice(0, 6);
  ctx.sheet(`<h2>${MUSCLES[m]}</h2>
    ${r ? `<div class="row" style="gap:14px">${gem(r.tier, 56)}<div><b style="font-size:22px">${r.tier.n}</b><div class="muted">Top ${topTxt(r.pct)}% of gym-goers like you</div></div></div>
      <div class="lift"><div class="lift-h">${exMedia(r.ex, "thumb")}<div><b>Best: ${esc(x.n)}</b><small>${fmtSet(r.ex, r.s)}${r.prim ? "" : " · counts 60% (assisting muscle)"}</small></div></div></div>
      ${nx ? `<p>${gem(nx.tier, 18)} Next: <b>${nx.tier.n}</b> at ${isReps(r.ex) ? `${Math.ceil(nx.value)} reps` : `${Math.ceil(nx.value * 2) / 2} kg × 10`} on ${esc(x.n)}</p>` : ""}`
      : `<p class="muted">Not trained yet. Log one of these to light it up:</p>`}
    <div class="list">${sug.map(([id, y]) => `<div class="li">${exMedia(id, "thumb")}<div><b>${esc(y.n)}</b><small>${esc(y.line)}</small></div></div>`).join("")}</div>`);
}
export { bestByExercise, tierIndex };
