import { TYPES, score, LocalStore, FirebaseStore, decodePath, encodePath } from "./store.js";
import CONFIG from "./firebase-config.js";
import { EXERCISES, MEDALS, e1rm, percentile, medalFor, nextMedal, bests, fmtLift, unitOf } from "./strength.js";

/* ===================== helpers ===================== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const DAY = 864e5;
const dayStart = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return +d; };
const weekStart = (t = Date.now()) => { const d = new Date(dayStart(t)); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return +d; };
const monthStart = (t = Date.now()) => { const d = new Date(t); return +new Date(d.getFullYear(), d.getMonth(), 1); };
const fmtDur = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
const fmtMin = s => { const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
const km = m => (m / 1000).toFixed(m >= 10000 ? 1 : 2);
const pace = (sec, m, type) => !m ? "–" : type === "ride" ? `${(m / 1000 / (sec / 3600)).toFixed(1)} km/h` : (() => { const p = sec / (m / 1000); return `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")} /km`; })();
const ago = t => { const m = Math.round((Date.now() - t) / 6e4); if (m < 1) return "just now"; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; const d = Math.round(h / 24); return d === 1 ? "yesterday" : d < 7 ? `${d} days ago` : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
const initials = n => (n || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const hue = s => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const avatar = (p, cls = "") => `<span class="avatar ${cls}" style="background:${p?.photo ? "var(--soft)" : `linear-gradient(135deg,hsl(${hue(p?.uid || p?.name)} 80% 60%),hsl(${(hue(p?.uid || p?.name) + 40) % 360} 75% 52%))`}">${p?.photo ? `<img src="${esc(p.photo)}" alt="" referrerpolicy="no-referrer">` : esc(initials(p?.name))}</span>`;
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function sheet(html, mount) {
  const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  const close = () => bg.remove(); bg.addEventListener("click", e => { if (e.target === bg || e.target.closest("[data-close]")) close(); });
  document.body.appendChild(bg); mount && mount(bg.querySelector(".sheet"), close); return close;
}
const titleFor = a => a.title || `${new Date(a.start).getHours() < 12 ? "Morning" : new Date(a.start).getHours() < 18 ? "Afternoon" : "Evening"} ${TYPES[a.type]?.n || "Workout"}`;

/* ===================== state ===================== */
let store, me;
const S = { mine: [], groups: [], gid: localStorage.getItem("fs-gid") || "", gActs: [], period: "week", metric: "points", type: localStorage.getItem("fs-type") || "run" };
let unGroup = null;

/* ===================== boot & welcome ===================== */
async function boot() {
  store = CONFIG ? new FirebaseStore(CONFIG) : new LocalStore();
  try { me = await store.init(); }
  catch (e) { console.error(e); toast("Could not reach Firebase, using demo mode"); store = new LocalStore(); me = await store.init(); }
  if (!me || (store.mode === "demo" && !me.name)) return welcome();
  start();
}
function welcome() {
  const w = $("#welcome"); w.hidden = false; $("#app").hidden = true;
  const real = store.mode === "firebase";
  w.innerHTML = `<div class="welcome">
    <img src="logo.svg" alt="">
    <h1>Move<br><span class="grad-text">smarter.</span></h1>
    <p class="muted" style="font-size:17px">Close your rings, record runs and rides with GPS, and race your friends on a weekly leaderboard.</p>
    ${real ? `<button class="pill primary block" id="gBtn" type="button"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</button>
      <div class="or">or with email</div>
      <form id="eForm" style="display:flex;flex-direction:column;gap:10px">
        <div class="field"><label for="eMail">Email</label><input id="eMail" type="email" autocomplete="email" required></div>
        <div class="field"><label for="ePass">Password</label><input id="ePass" type="password" autocomplete="current-password" minlength="6" required></div>
        <div class="row"><button class="pill ghost" style="flex:1" type="submit" data-m="in">Sign in</button><button class="pill grad" style="flex:1" type="submit" data-m="up">Create account</button></div>
      </form>`
    : `<form id="dForm" style="display:flex;flex-direction:column;gap:12px">
        <div class="field"><label for="dName">Your name</label><input id="dName" maxlength="40" autocomplete="given-name" required placeholder="e.g. Paolo"></div>
        <button class="pill grad block" type="submit">Start in demo mode</button>
        <p class="muted" style="font-size:13px">Demo mode includes four sample friends so you can try everything. Data stays on this device.</p>
      </form>`}
  </div>`;
  if (real) {
    $("#gBtn").onclick = async () => { try { me = await store.signInGoogle(); if (me) { w.hidden = true; start(); } } catch (e) { toast(e.code === "auth/popup-closed-by-user" ? "Sign-in cancelled" : "Google sign-in failed"); } };
    let mode = "in"; $("#eForm").querySelectorAll("[data-m]").forEach(b => b.onclick = () => mode = b.dataset.m);
    $("#eForm").onsubmit = async e => { e.preventDefault(); try { me = await store.signInEmail($("#eMail").value, $("#ePass").value, mode === "up"); w.hidden = true; start(); } catch (err) { toast({ "auth/invalid-credential": "Wrong email or password", "auth/email-already-in-use": "That email already has an account", "auth/weak-password": "Use at least 6 characters" }[err.code] || "Sign-in failed"); } };
  } else $("#dForm").onsubmit = async e => { e.preventDefault(); await store.saveProfile({ name: $("#dName").value.trim() }); me = store.user; w.hidden = true; start(); };
}

/* ===================== app ===================== */
function start() {
  $("#app").hidden = false; $("#welcome").hidden = true;
  $("#demoBanner").hidden = store.mode !== "demo";
  store.myActivities(a => { S.mine = a; renderToday(); renderMe(); });
  store.groups(gs => {
    S.groups = gs;
    if (!gs.find(g => g.id === S.gid)) S.gid = gs[0]?.id || "";
    subscribeGroup(); renderGroupChips(); renderCompete(); renderFeed(); renderToday();
  });
  renderTypes(); renderMe(); route();
  addEventListener("hashchange", route);
  const j = new URLSearchParams(location.search).get("join");
  if (j) { history.replaceState(null, "", location.pathname + location.hash); askJoin(j); }
  restoreSession();
  if (!localStorage.getItem("fs-tour") && !sess) setTimeout(startTour, 900);
}
function subscribeGroup() {
  unGroup && unGroup(); unGroup = null; S.gActs = [];
  if (!S.gid) return;
  localStorage.setItem("fs-gid", S.gid);
  const since = Math.min(monthStart(), Date.now() - 14 * DAY);
  unGroup = store.groupActivities(S.gid, since, a => { S.gActs = a; renderFeed(); renderCompete(); renderToday(); });
}
function route() {
  const v = (location.hash || "#today").slice(1);
  const ok = ["today", "feed", "record", "compete", "me"].includes(v) ? v : "today";
  document.querySelectorAll(".view").forEach(x => x.classList.toggle("on", x.id === "v-" + ok));
  document.querySelectorAll(".tabs a").forEach(a => a.classList.toggle("on", a.dataset.v === ok));
  scrollTo(0, 0);
}

/* ---------- leaderboard maths ---------- */
const METRICS = { points: { n: "Points", f: a => a.points || 0, u: "pts" }, minutes: { n: "Minutes", f: a => a.durationS / 60, u: "min" }, km: { n: "Km", f: a => (a.distanceM || 0) / 1000, u: "km" }, workouts: { n: "Workouts", f: () => 1, u: "" }, medals: { n: "Medals", f: () => 0, u: "pts" } };
function board(period = S.period, metric = S.metric) {
  const since = period === "week" ? weekStart() : monthStart(), m = METRICS[metric], tot = {};
  store.members(S.gid).forEach(p => tot[p.uid] = { p, v: 0, n: 0 });
  S.gActs.filter(a => a.start >= since).forEach(a => { const t = tot[a.uid] || (tot[a.uid] = { p: { uid: a.uid, name: a.name, photo: a.photo }, v: 0, n: 0 }); t.v += m.f(a); t.n++; });
  if (metric === "medals") { // medal points of each member's best lift per exercise in the period
    const best = {};
    S.gActs.filter(a => a.start >= since).forEach(a => (a.lifts || []).forEach(l => { const k = a.uid + "|" + l.ex; best[k] = Math.max(best[k] || 0, l.pct || 0); }));
    Object.values(tot).forEach(t => t.v = 0);
    Object.entries(best).forEach(([k, pct]) => { const t = tot[k.split("|")[0]]; if (t) t.v += medalFor(pct)?.pts || 0; });
  }
  return Object.values(tot).sort((a, b) => b.v - a.v || a.p.name.localeCompare(b.p.name));
}
const fmtV = (v, metric) => metric === "km" ? v.toFixed(1) : Math.round(v).toLocaleString("en");

/* ---------- today ---------- */
function ring(r, w, pct, c1, c2, id) {
  const C = 2 * Math.PI * r, off = C * (1 - Math.min(pct, 1));
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <circle class="bgc" cx="75" cy="75" r="${r}" stroke="${c1}" stroke-width="${w}"/>
    <circle class="fg" cx="75" cy="75" r="${r}" stroke="url(#${id})" stroke-width="${w}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${off}"/>
    ${pct > 1 ? `<circle cx="75" cy="75" r="${r}" stroke="url(#${id})" stroke-width="${w}" stroke-dasharray="${C}" stroke-dashoffset="${C * (2 - Math.min(pct, 2))}" opacity=".55"/>` : ""}`;
}
function renderToday() {
  if (!me) return;
  $("#todayDate").textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  $("#topAvatar").outerHTML = avatar(me).replace("<span", '<a href="#me" id="topAvatar" aria-label="Profile"').replace(/<\/span>$/, "</a>");
  const g = me.goals || { move: 500, exercise: 30, km: 5 }, t0 = dayStart(), today = S.mine.filter(a => a.start >= t0);
  const kcal = today.reduce((s, a) => s + (a.kcal || 0), 0), min = today.reduce((s, a) => s + a.durationS / 60, 0), dist = today.reduce((s, a) => s + (a.distanceM || 0), 0) / 1000;
  $("#rings").innerHTML = `<svg viewBox="0 0 150 150" role="img" aria-label="Activity rings">${ring(64, 15, kcal / g.move, "#FA2D55", "#FF6B8A", "rgM")}${ring(46, 15, min / g.exercise, "#38D16A", "#9BF06B", "rgE")}${ring(28, 15, dist / g.km, "#2EC5F5", "#7AE8FF", "rgK")}</svg>
    <div class="rlist"><div><small style="color:var(--move)">Move</small><b>${Math.round(kcal)}<i>/${g.move} kcal</i></b></div><div><small style="color:var(--ex)">Exercise</small><b>${Math.round(min)}<i>/${g.exercise} min</i></b></div><div><small style="color:var(--km)">Distance</small><b>${dist.toFixed(1)}<i>/${g.km} km</i></b></div></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll("#rings .fg").forEach(c => c.style.strokeDashoffset = c.dataset.off)));
  // week bars
  const ws = weekStart(), pts = Array.from({ length: 7 }, (_, i) => S.mine.filter(a => a.start >= ws + i * DAY && a.start < ws + (i + 1) * DAY).reduce((s, a) => s + (a.points || 0), 0)), mx = Math.max(10, ...pts), todayIdx = Math.floor((t0 - ws) / DAY);
  $("#bars").innerHTML = pts.map((p, i) => `<div class="${i === todayIdx ? "today" : ""}" title="${p} points"><i class="${p ? "on" : ""}" style="height:${Math.max(6, p / mx * 92)}px"></i><span>${"MTWTFSS"[i]}</span></div>`).join("");
  $("#weekPts").textContent = `${pts.reduce((a, b) => a + b, 0)} pts`;
  // tiles
  const days = new Set(S.mine.map(a => dayStart(a.start))); let streak = 0;
  for (let d = days.has(t0) ? t0 : t0 - DAY; days.has(d); d -= DAY) streak++;
  const wk = S.mine.filter(a => a.start >= ws);
  $("#tiles").innerHTML = `<div class="tile"><small>Streak</small><b>${streak} ${streak === 1 ? "day" : "days"}</b></div><div class="tile"><small>Workouts this week</small><b>${wk.length}</b></div><div class="tile"><small>Active this week</small><b>${fmtMin(wk.reduce((s, a) => s + a.durationS, 0))}</b></div>`;
  // rank
  const g0 = S.groups.find(x => x.id === S.gid);
  if (!g0) $("#rankCard").innerHTML = `<h3>Compete with friends</h3><p class="muted" style="margin-bottom:12px">Create a group and share the code, or join one with a friend's code.</p><div class="row"><a class="pill primary sm" href="#compete">Get started</a></div>`;
  else {
    const b = board("week", "points"), i = b.findIndex(x => x.p.uid === me.uid), mine = b[i]?.v || 0;
    const msg = i === 0 ? (b[1] ? `You lead by <b>${Math.round(mine - b[1].v)} pts</b> over ${esc(b[1].p.name.split(" ")[0])}` : "You're the only one here. Invite friends!") : `<b>${Math.round(b[i - 1].v - mine)} pts</b> behind ${esc(b[i - 1].p.name.split(" ")[0])}`;
    $("#rankCard").innerHTML = `<h3>${esc(g0.name)} · this week <a class="r" href="#compete" style="text-decoration:none;color:var(--accent)">Leaderboard</a></h3>
      <div class="row" style="gap:14px"><b class="grad-text" style="font:800 46px/1 var(--f);letter-spacing:-.05em">#${i + 1}</b><div><div>of ${b.length} · ${msg}</div><div class="prog"><i style="width:${b[0]?.v ? Math.round(mine / b[0].v * 100) : 0}%"></i></div></div></div>`;
  }
  $("#recent").innerHTML = S.mine.slice(0, 5).map(liAct).join("") || `<div class="empty"><span>🏁</span>No workouts yet. Tap + to record your first.</div>`;
}
const liAct = a => `<div class="li"><span class="em">${TYPES[a.type]?.e || "💪"}</span><div><b>${esc(titleFor(a))}</b><small>${ago(a.start)} · ${fmtMin(a.durationS)}${a.distanceM ? ` · ${km(a.distanceM)} km` : ""}</small></div><span class="v">${a.points}<small class="muted">pts</small></span></div>`;

/* ---------- feed ---------- */
function routeSvg(enc) {
  const p = decodePath(enc); if (p.length < 2) return "";
  const la = p.map(x => x[0]), lo = p.map(x => x[1]), k = Math.cos(la[0] * Math.PI / 180);
  const x0 = Math.min(...lo), x1 = Math.max(...lo), y0 = Math.min(...la), y1 = Math.max(...la), W = 600, H = 220, pad = 22;
  const s = Math.min((W - 2 * pad) / (((x1 - x0) * k) || 1e-6), (H - 2 * pad) / ((y1 - y0) || 1e-6)), ox = (W - (x1 - x0) * k * s) / 2, oy = (H - (y1 - y0) * s) / 2;
  const pt = q => [ox + (q[1] - x0) * k * s, H - oy - (q[0] - y0) * s].map(v => v.toFixed(1));
  const d = "M" + p.map(q => pt(q).join(",")).join("L"), a = pt(p[0]), b = pt(p.at(-1)), id = "r" + Math.random().toString(36).slice(2, 7);
  return `<svg class="route" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><linearGradient id="${id}"><stop offset="0" stop-color="#4C8DFF"/><stop offset="1" stop-color="#7B4DFF"/></linearGradient></defs>
    <path d="${d}" fill="none" stroke="var(--panel)" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="url(#${id})" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${a[0]}" cy="${a[1]}" r="7" fill="#38D16A" stroke="#fff" stroke-width="3"/><circle cx="${b[0]}" cy="${b[1]}" r="7" fill="#FA2D55" stroke="#fff" stroke-width="3"/></svg>`;
}
function card(a) {
  const mine = (a.kudos || []).includes(me.uid), n = (a.kudos || []).length;
  return `<article class="card act" data-id="${esc(a.id)}">
    <div class="act-h">${avatar({ uid: a.uid, name: a.name, photo: a.photo })}<div><b>${esc(a.uid === me.uid ? me.name : a.name)}</b><small>${ago(a.start)} · ${TYPES[a.type]?.n || "Workout"}</small></div><span class="tag">${TYPES[a.type]?.e || "💪"}</span></div>
    <h4>${esc(titleFor(a))}</h4>
    <div class="st">${a.distanceM ? `<div><small>Distance</small><b>${km(a.distanceM)} km</b></div>` : ""}<div><small>Time</small><b>${fmtDur(a.durationS)}</b></div>${a.distanceM ? `<div><small>${a.type === "ride" ? "Speed" : "Pace"}</small><b>${pace(a.durationS, a.distanceM, a.type)}</b></div>` : `<div><small>Calories</small><b>${a.kcal} kcal</b></div>`}<div><small>Points</small><b class="grad-text">${a.points}</b></div></div>
    ${a.route ? routeSvg(a.route) : ""}
    ${a.lifts?.length ? liftList(a.lifts) : ""}
    <div class="act-f"><button class="kudo" data-kudo="${esc(a.id)}" aria-pressed="${mine}" ${a.uid === me.uid ? "disabled" : ""}>👏 ${n || ""}<span>${a.uid === me.uid ? (n === 1 ? "kudo" : "kudos") : mine ? "Given" : "Kudos"}</span></button><small>${new Date(a.start).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</small></div>
  </article>`;
}
function renderGroupChips() {
  const html = S.groups.map(g => `<button data-g="${esc(g.id)}" aria-pressed="${g.id === S.gid}">${esc(g.name)}</button>`).join("");
  $("#feedGroups").innerHTML = S.groups.length > 1 ? html : ""; $("#compGroups").innerHTML = S.groups.length > 1 ? html : "";
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-g]"); if (g) { S.gid = g.dataset.g; subscribeGroup(); renderGroupChips(); renderFeed(); renderCompete(); renderToday(); return; }
  const k = e.target.closest("[data-kudo]");
  if (k && !k.disabled) { const a = S.gActs.find(x => x.id === k.dataset.kudo); if (!a) return; const on = !(a.kudos || []).includes(me.uid);
    a.kudos = on ? [...(a.kudos || []), me.uid] : a.kudos.filter(u => u !== me.uid); renderFeed(); const nb = $(`[data-kudo="${CSS.escape(a.id)}"]`); nb && nb.classList.add("pop");
    store.kudos(S.gid, a, on).catch(() => toast("Could not save kudos")); }
});
function renderFeed() {
  if (!me) return;
  if (!S.groups.length) { $("#feed").innerHTML = `<div class="card empty"><span>👋</span><b style="color:var(--fg)">Your feed is empty</b>Join or create a group to see your friends' workouts.<a class="pill primary sm" href="#compete">Find friends</a></div>`; return; }
  $("#feed").innerHTML = S.gActs.slice(0, 40).map(card).join("") || `<div class="card empty"><span>🏁</span>No workouts in this group in the last two weeks.</div>`;
}

/* ---------- compete ---------- */
function endsIn(period) { const d = new Date(period === "week" ? weekStart() + 7 * DAY : +new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)) - Date.now(), dd = Math.floor(d / DAY), h = Math.floor(d % DAY / 36e5); return dd ? `${dd}d ${h}h` : `${h}h ${Math.floor(d % 36e5 / 6e4)}m`; }
function renderCompete() {
  if (!me) return;
  const g = S.groups.find(x => x.id === S.gid);
  if (!g) { $("#compete").innerHTML = `<div class="card empty"><span>🏆</span><b style="color:var(--fg)">Race your friends</b>Create a group, share its code, and climb the weekly leaderboard. Points come from calories burned, so every sport counts.<div class="row"><button class="pill ghost sm" data-act="join">Join with code</button><button class="pill primary sm" data-act="new">New group</button></div></div>`; return; }
  const b = board(), m = METRICS[S.metric], top = b.slice(0, 3), C = ["--gold", "--silver", "--bronze"];
  const pod = top.length ? `<div class="podium">${[1, 0, 2].map(i => top[i] ? `<div class="p${i + 1}" style="--c:var(${C[i]})">${avatar(top[i].p)}<b>${esc(top[i].p.uid === me.uid ? "You" : top[i].p.name.split(" ")[0])}</b><em>${fmtV(top[i].v, S.metric)} <small class="muted">${m.u}</small></em><div class="blk">${i + 1}</div></div>` : "<div></div>").join("")}</div>` : "";
  $("#compete").innerHTML = `
    <div class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div class="seg" role="group" aria-label="Period">${["week", "month"].map(p => `<button data-period="${p}" aria-pressed="${S.period === p}">This ${p}</button>`).join("")}</div>
      <small class="muted">Ends in ${endsIn(S.period)}</small></div>
      <div class="seg" role="group" aria-label="Metric" style="margin-top:10px">${Object.entries(METRICS).map(([k, v]) => `<button data-metric="${k}" aria-pressed="${S.metric === k}">${v.n}</button>`).join("")}</div>
      ${pod}
      <div class="list" style="margin-top:12px">${b.map((x, i) => `<div class="li${x.p.uid === me.uid ? " me" : ""}"><span class="rank">${i + 1}</span>${avatar(x.p)}<div><b>${esc(x.p.uid === me.uid ? `${me.name} (you)` : x.p.name)}</b><small>${x.n} ${x.n === 1 ? "workout" : "workouts"}</small><div class="prog"><i style="width:${b[0].v ? Math.round(x.v / b[0].v * 100) : 0}%"></i></div></div><span class="v">${fmtV(x.v, S.metric)}<small class="muted">${m.u}</small></span></div>`).join("")}</div>
    </div>
    <div class="card"><h3>${esc(g.name)} <span class="r">${g.members.length} ${g.members.length === 1 ? "member" : "members"}</span></h3>
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:12px"><div><small class="muted">Invite code</small><div class="code">${esc(g.id)}</div></div><button class="pill grad sm" data-act="share">Invite friends</button></div>
      <p class="muted" style="font-size:12px;margin-top:12px">1 point per 10 kcal burned, estimated from activity type, duration and weight. Weeks start on Monday.</p>
      <button class="pill danger sm" data-act="leave" style="margin-top:12px">Leave group</button></div>`;
}
$("#v-compete").addEventListener("click", async e => {
  const p = e.target.closest("[data-period]"), m = e.target.closest("[data-metric]"), a = e.target.closest("[data-act]");
  if (p) { S.period = p.dataset.period; renderCompete(); } else if (m) { S.metric = m.dataset.metric; renderCompete(); }
  else if (a) ({ join: () => askJoin(""), new: newGroup, share: shareGroup, leave: leaveGroup })[a.dataset.act]();
});
$("#joinBtn").onclick = () => askJoin(""); $("#newGroupBtn").onclick = newGroup;
function newGroup() {
  sheet(`<h2>New group</h2><form id="ngF" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="ngN">Group name</label><input id="ngN" maxlength="40" required placeholder="e.g. Uni Crew"></div><button class="pill grad block" type="submit">Create</button></form>`, (el, close) => {
    el.querySelector("input").focus();
    el.querySelector("form").onsubmit = async e => { e.preventDefault(); try { S.gid = await store.createGroup(el.querySelector("input").value.trim()); close(); subscribeGroup(); toast("Group created. Share the code!"); location.hash = "#compete"; } catch { toast("Could not create the group"); } };
  });
}
function askJoin(code) {
  sheet(`<h2>Join a group</h2><form style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="jC">Invite code</label><input id="jC" maxlength="6" required autocapitalize="characters" style="font:700 22px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase" value="${esc(code)}"></div><button class="pill grad block" type="submit">Join</button></form>`, (el, close) => {
    el.querySelector("input").focus();
    el.querySelector("form").onsubmit = async e => { e.preventDefault(); try { S.gid = await store.joinGroup(el.querySelector("input").value); close(); subscribeGroup(); toast("You're in! 🎉"); location.hash = "#compete"; } catch (err) { toast(err.message || "Could not join"); } };
  });
}
async function shareGroup() {
  const g = S.groups.find(x => x.id === S.gid), url = `${location.origin}${location.pathname}?join=${g.id}`, text = `Join "${g.name}" on FitSmarter and let's compete! Code: ${g.id}`;
  if (navigator.share) { try { await navigator.share({ title: "FitSmarter", text, url }); } catch {} }
  else { try { await navigator.clipboard.writeText(`${text}\n${url}`); toast("Invite link copied"); } catch { toast(url); } }
}
async function leaveGroup() { const g = S.groups.find(x => x.id === S.gid); if (!g || !confirm(`Leave "${g.name}"?`)) return; await store.leaveGroup(g.id); toast("You left the group"); }

/* ---------- record ---------- */
function renderTypes() {
  $("#types").innerHTML = Object.entries(TYPES).map(([k, t]) => `<button data-type="${k}" aria-pressed="${S.type === k}"><span>${t.e}</span>${t.n}</button>`).join("");
  $("#recHint").innerHTML = TYPES[S.type].gps ? `<span class="gpsdot ok"></span>GPS records your route, distance and pace. Keep the app open while you move.` : `A timer tracks your ${TYPES[S.type].n.toLowerCase()} session. Calories are estimated from your weight.`;
}
$("#types").addEventListener("click", e => { const b = e.target.closest("[data-type]"); if (!b) return; S.type = b.dataset.type; localStorage.setItem("fs-type", S.type); renderTypes(); });
$("#manualBtn").onclick = () => manual();
$("#startBtn").onclick = () => startSession();

let sess = null;
const SKEY = "fs-session";
function persist() { if (sess) try { localStorage.setItem(SKEY, JSON.stringify({ type: sess.type, t0: sess.t0, paused: sess.paused, pauseAt: sess.pauseAt, pts: sess.pts, dist: sess.dist, lifts: sess.lifts })); } catch {} }
function restoreSession() { try { const s = JSON.parse(localStorage.getItem(SKEY)); if (s && Date.now() - s.t0 < 12 * 36e5) { toast("Resuming your workout"); startSession(s); } else localStorage.removeItem(SKEY); } catch {} }
const hav = (a, b) => { const R = 6371e3, r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
async function loadLeaflet() {
  if (window.L) return;
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
  await new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
}
async function startSession(restore) {
  const type = restore?.type || S.type, gps = TYPES[type].gps;
  sess = { type, t0: restore?.t0 || Date.now(), paused: restore?.paused || 0, pauseAt: restore?.pauseAt || 0, pts: restore?.pts || [], dist: restore?.dist || 0, lifts: restore?.lifts || [], watch: null, wake: null, map: null, line: null, dot: null, acc: null };
  const el = document.createElement("div"); el.className = "live"; el.id = "live";
  el.innerHTML = `${gps ? `<div id="lmap"></div>` : type === "gym" ? `<div id="gymlog" class="gymlog"></div>` : `<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:110px;background:var(--grad)">${TYPES[type].e}</div>`}
    <div class="lpanel"><div class="row" style="justify-content:space-between"><b>${TYPES[type].e} ${TYPES[type].n}</b><small class="muted" id="lgps">${gps ? `<span class="gpsdot"></span>Searching GPS…` : ""}</small></div>
      <div class="big" id="ltime">0:00</div>
      <div class="lst">${gps ? `<div><small>Distance</small><b id="ldist">0.00</b><small>km</small></div><div><small>${type === "ride" ? "Speed" : "Pace"}</small><b id="lpace">–</b></div>` : `<div></div><div></div>`}<div><small>Calories</small><b id="lkcal">0</b></div></div>
      <div class="lbtns"><button class="round pause" id="lpause" type="button">Pause</button><button class="round stop" id="lstop" type="button">Finish</button></div></div>`;
  document.body.appendChild(el);
  if (type === "gym") { el.classList.add("gym"); liftEditor($("#gymlog"), sess.lifts, persist); }
  try { sess.wake = await navigator.wakeLock?.request("screen"); } catch {}
  if (gps) {
    try {
      await loadLeaflet();
      sess.map = L.map("lmap", { zoomControl: false, attributionControl: true }).setView(sess.pts.at(-1) || [48.78, 9.18], 16);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(sess.map);
      sess.line = L.polyline(sess.pts, { color: "#5B5BFF", weight: 6, opacity: .9 }).addTo(sess.map);
    } catch { $("#lmap").innerHTML = `<div class="empty" style="height:100%;justify-content:center">Map unavailable offline. Distance still records.</div>`; }
    if (!navigator.geolocation) $("#lgps").textContent = "GPS not available";
    else sess.watch = navigator.geolocation.watchPosition(onPos, err => { $("#lgps").innerHTML = `<span class="gpsdot"></span>${err.code === 1 ? "Location permission denied" : "No GPS signal"}`; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }
  $("#lpause").onclick = togglePause; $("#lstop").onclick = finish;
  sess.tick = setInterval(liveTick, 500); liveTick(); updatePauseBtn();
}
const elapsed = () => ((sess.pauseAt || Date.now()) - sess.t0 - sess.paused) / 1000;
function liveTick() {
  if (!sess) return; const t = elapsed(), k = score({ type: sess.type, durationS: t }, me.weight).kcal;
  $("#ltime").textContent = fmtDur(t); $("#lkcal").textContent = k;
  if ($("#ldist")) { $("#ldist").textContent = km(sess.dist); $("#lpace").textContent = sess.dist > 50 ? pace(t, sess.dist, sess.type).replace(" /km", "") : "–"; }
  if (Math.round(t) % 5 === 0) persist();
}
function onPos(p) {
  if (!sess) return; const { latitude: la, longitude: lo, accuracy: acc } = p.coords, pt = [+la.toFixed(6), +lo.toFixed(6)];
  $("#lgps").innerHTML = `<span class="gpsdot ${acc < 25 ? "ok" : ""}"></span>GPS ±${Math.round(acc)} m`;
  if (sess.map) { sess.dot ? sess.dot.setLatLng(pt) : (sess.dot = L.circleMarker(pt, { radius: 8, color: "#fff", weight: 3, fillColor: "#5B5BFF", fillOpacity: 1 }).addTo(sess.map)); sess.map.panTo(pt, { animate: true }); }
  if (sess.pauseAt || acc > 35) return;
  const last = sess.pts.at(-1), d = last ? hav(last, pt) : 0;
  if (last && d < Math.max(4, acc / 3)) return;
  if (last && d > 200) { sess.pts.push(pt); return; } // jump after a gap: keep the route but don't count it
  sess.dist += d; sess.pts.push(pt); sess.line && sess.line.addLatLng(pt);
}
function togglePause() { if (sess.pauseAt) { sess.paused += Date.now() - sess.pauseAt; sess.pauseAt = 0; } else sess.pauseAt = Date.now(); updatePauseBtn(); persist(); }
function updatePauseBtn() { const b = $("#lpause"); b.textContent = sess.pauseAt ? "Resume" : "Pause"; b.className = "round " + (sess.pauseAt ? "go" : "pause"); }
function endSession() {
  clearInterval(sess.tick); sess.watch != null && navigator.geolocation.clearWatch(sess.watch); try { sess.wake && sess.wake.release(); } catch {}
  $("#live")?.remove(); localStorage.removeItem(SKEY); const s = sess; sess = null; return s;
}
function finish() {
  const t = Math.round(elapsed());
  if (t < 30 && !confirm("That was under 30 seconds. Finish anyway?")) return;
  const s = endSession();
  // keep at most ~400 points so a route stays small
  const step = Math.max(1, Math.ceil(s.pts.length / 400)), pts = s.pts.filter((_, i) => i % step === 0 || i === s.pts.length - 1);
  saveSheet({ type: s.type, start: s.t0, durationS: t, distanceM: Math.round(s.dist), route: pts.length > 1 ? encodePath(pts) : "", lifts: s.lifts });
}
function saveSheet(a) {
  const sc = score(a, me.weight);
  sheet(`<h2>${TYPES[a.type].e} Nice work!</h2>
    <div class="tiles"><div class="tile"><small>Time</small><b>${fmtDur(a.durationS)}</b></div><div class="tile"><small>${a.distanceM ? "Distance" : "Calories"}</small><b>${a.distanceM ? km(a.distanceM) + " km" : sc.kcal + " kcal"}</b></div><div class="tile"><small>Points</small><b class="grad-text">${sc.points}</b></div></div>
    ${a.route ? routeSvg(a.route) : ""}
    ${a.lifts?.length ? liftList(a.lifts) : ""}
    <div class="field"><label for="sT">Title</label><input id="sT" maxlength="60" placeholder="${esc(titleFor(a))}"></div>
    <div class="row"><button class="pill ghost" style="flex:1" data-close type="button" id="sDiscard">Discard</button><button class="pill grad" style="flex:2" id="sSave" type="button">Save</button></div>`, (el, close) => {
    el.querySelector("#sDiscard").addEventListener("click", () => toast("Workout discarded"));
    el.querySelector("#sSave").onclick = async () => {
      el.querySelector("#sSave").disabled = true;
      try { const lifts = finalizeLifts(a.lifts || []), rec = { ...a, title: el.querySelector("#sT").value.trim() }; delete rec.lifts; if (lifts.length) rec.lifts = lifts; await store.addActivity(rec); close(); toast(`+${sc.points} ${sc.points === 1 ? "point" : "points"} 🔥`); location.hash = "#today"; }
      catch (e) { console.error(e); el.querySelector("#sSave").disabled = false; toast("Could not save. Try again."); }
    };
  });
}
function manual() {
  const t = TYPES[S.type], now = new Date(Date.now() - 36e5), loc = new Date(now - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  sheet(`<h2>${t.e} Log ${t.n.toLowerCase()}</h2><form style="display:flex;flex-direction:column;gap:12px">
    <div class="field"><label for="mT">Type</label><select id="mT">${Object.entries(TYPES).map(([k, x]) => `<option value="${k}" ${k === S.type ? "selected" : ""}>${x.e} ${x.n}</option>`).join("")}</select></div>
    <div class="field"><label for="mS">Start</label><input id="mS" type="datetime-local" value="${loc}" max="${new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16)}" required></div>
    <div class="grid2"><div class="field"><label for="mD">Duration (min)</label><input id="mD" type="number" min="1" max="1440" value="45" inputmode="numeric" required></div>
    <div class="field"><label for="mK">Distance (km, optional)</label><input id="mK" type="number" min="0" max="500" step="0.01" inputmode="decimal"></div></div>
    <div id="mLifts"></div>
    <button class="pill grad block" type="submit" form="mForm">Continue</button></form>`, (el, close) => {
    const f = el.querySelector("form"), lifts = []; f.id = "mForm";
    const sync = () => { const gym = el.querySelector("#mT").value === "gym"; el.querySelector("#mK").closest(".field").style.display = gym ? "none" : ""; el.querySelector("#mLifts").style.display = gym ? "" : "none"; };
    liftEditor(el.querySelector("#mLifts"), lifts); el.querySelector("#mT").onchange = sync; sync();
    f.onsubmit = e => { e.preventDefault(); close();
      saveSheet({ type: el.querySelector("#mT").value, start: +new Date(el.querySelector("#mS").value), durationS: Math.round(+el.querySelector("#mD").value * 60), distanceM: Math.round((+el.querySelector("#mK").value || 0) * 1000), route: "", lifts: el.querySelector("#mT").value === "gym" ? lifts : [] }); };
  });
}

/* ---------- strength & medals ---------- */
let lastEx = localStorage.getItem("fs-ex") || "bench";
const topTxt = pct => { const t = 100 - pct; return t < 1 ? "<1" : Math.round(t); };
const chip = pct => { const m = medalFor(pct); return `<span class="medal${m ? "" : " none"}" style="--mc:${m ? m.c : "var(--muted)"}">${m ? `${m.e} ${m.n}` : "No medal"} · Top ${topTxt(pct)}%</span>`; };
function liftStats(l) {
  const X = EXERCISES[l.ex]; let best = null;
  for (const s of l.sets) { const v = X.kind === "r" ? s.r : e1rm(s.w, s.r); if (!best || v > best.v) best = { v, s }; }
  const pct = l.pct ?? percentile(l.ex, best.v, me);
  return { best, pct, medal: medalFor(pct) };
}
const finalizeLifts = lifts => lifts.filter(l => l.sets.length).map(l => { const st = liftStats(l); return { ex: l.ex, sets: l.sets.map(s => ({ w: +s.w || 0, r: +s.r })), pct: Math.round(st.pct * 10) / 10, medal: st.medal?.id || "" }; });
const liftMedals = acts => Object.values(bests(acts, me));
function liftList(lifts, edit) {
  return `<div class="lifts">${lifts.map((l, i) => { const X = EXERCISES[l.ex], st = liftStats(l);
    return `<div class="lift"><div class="lift-h"><span class="em">${X.e}</span><div><b>${X.n}</b><small>${X.kind === "r" ? `Best ${st.best.v} reps` : `Est. 1RM ${Math.round(st.best.v)} ${X.kind === "d" ? "kg/hand" : "kg"}`}</small></div>${chip(st.pct)}</div>
      <div class="sets">${l.sets.map((s, j) => `<span>${fmtLift(l.ex, s)}${edit ? `<button type="button" data-delset="${i},${j}" aria-label="Remove set">✕</button>` : ""}</span>`).join("")}</div></div>`; }).join("")}</div>`;
}
function liftEditor(el, lifts, onChange) {
  const draw = () => {
    el.innerHTML = (lifts.length ? liftList(lifts, true) : `<p class="muted" style="text-align:center;padding:8px 0">Log each set: exercise, weight and reps. You get a medal per lift.</p>`) +
      `<div class="addset"><select aria-label="Exercise">${Object.entries(EXERCISES).map(([k, x]) => `<option value="${k}" ${k === lastEx ? "selected" : ""}>${x.n}</option>`).join("")}</select>
      <input class="aw" type="number" step="0.5" min="0" max="500" inputmode="decimal" aria-label="Weight"><input class="ar" type="number" min="1" max="200" inputmode="numeric" placeholder="reps" aria-label="Reps"><button class="pill grad sm" type="button">Add set</button></div>`;
    const sel = el.querySelector("select"), w = el.querySelector(".aw"), r = el.querySelector(".ar");
    const upd = () => { const k = EXERCISES[sel.value].kind; w.style.display = k === "r" ? "none" : ""; w.placeholder = k === "d" ? "kg/hand" : "kg"; };
    sel.onchange = () => { lastEx = sel.value; localStorage.setItem("fs-ex", lastEx); upd(); }; upd();
    w.value = el.dataset.w || "";
    el.querySelector(".addset button").onclick = () => {
      const ex = sel.value, X = EXERCISES[ex], kg = +w.value || 0, reps = Math.round(+r.value);
      if (!reps || (X.kind !== "r" && !kg)) { toast(X.kind === "r" ? "Enter reps" : "Enter weight and reps"); return; }
      let l = lifts.find(x => x.ex === ex); const before = l ? liftStats(l).pct : 0;
      if (!l) lifts.push(l = { ex, sets: [] }); l.sets.push({ w: kg, r: reps }); el.dataset.w = kg || "";
      const st = liftStats(l);
      if (!me.sex || !me.height || !me.birthYear) toast("Add sex, height and birth year in You → Goals for exact medals");
      else if (st.pct > before) toast(st.medal ? `${st.medal.e} ${st.medal.n} · top ${topTxt(st.pct)}% for ${X.n.toLowerCase()}` : `Top ${topTxt(st.pct)}% · keep going for bronze`);
      onChange && onChange(); draw();
    };
    el.querySelectorAll("[data-delset]").forEach(b => b.onclick = () => { const [i, j] = b.dataset.delset.split(",").map(Number); lifts[i].sets.splice(j, 1); if (!lifts[i].sets.length) lifts.splice(i, 1); onChange && onChange(); draw(); });
  };
  draw();
}
function renderStrength() {
  const bs = liftMedals(S.mine).sort((a, b) => b.pct - a.pct), miss = !me.sex || !me.height || !me.birthYear;
  const marks = [50, 70, 85, 95, 99];
  $("#strength").innerHTML = (miss ? `<div class="banner" style="margin-bottom:12px"><span>📏</span><div>Add <b>sex, height and birth year</b> below so medals compare you with people like you.</div></div>` : "") +
    (bs.map(b => { const X = EXERCISES[b.ex], nx = nextMedal(b.ex, b.pct, me), u = X.kind === "r" ? "reps" : X.kind === "d" ? "kg/hand" : "kg";
      return `<div class="sbest"><div class="lift-h"><span class="em">${X.e}</span><div><b>${X.n}</b><small>${fmtLift(b.ex, b)} · ${X.kind === "r" ? "" : `1RM ${Math.round(b.v)} ${u} · `}${ago(b.start)}</small></div>${chip(b.pct)}</div>
        <div class="tier" aria-hidden="true">${marks.map(m => `<i style="left:${m}%"></i>`).join("")}<b style="left:${Math.min(99.5, b.pct)}%"></b></div>
        <small class="muted">${nx ? `${nx.medal.e} ${nx.medal.n} at ${X.kind === "r" ? Math.ceil(nx.value) + " reps" : `${Math.ceil(nx.value)} ${u} 1RM (+${Math.max(1, Math.ceil(nx.value - b.v))})`}` : "Top of the charts 💎"}</small></div>`; }).join("")
    || `<div class="empty"><span>🏋️</span>Log a Strength workout with weights and reps to earn your first medal.<button class="pill primary sm" id="firstLift" type="button">Log a lift</button></div>`) +
    `<div class="mlegend">${MEDALS.slice().reverse().map(m => `<span>${m.e} ${m.n} <small>top ${m.top}%</small></span>`).join("")}</div>`;
  $("#firstLift") && ($("#firstLift").onclick = () => { S.type = "gym"; renderTypes(); manual(); });
}

/* ---------- profile ---------- */
const BADGES = [
  ["🏁", "First workout", m => m.length >= 1], ["🔟", "10 workouts", m => m.length >= 10], ["💯", "50 workouts", m => m.length >= 50],
  ["🔥", "3-day streak", m => streakMax(m) >= 3], ["⚡", "7-day streak", m => streakMax(m) >= 7],
  ["🏃", "10 km in one go", m => m.some(a => a.distanceM >= 10000)], ["🏅", "Half marathon", m => m.some(a => a.distanceM >= 21097)],
  ["🌅", "Early bird", m => m.some(a => new Date(a.start).getHours() < 7)], ["🦉", "Night owl", m => m.some(a => new Date(a.start).getHours() >= 21)],
  ["🎨", "5 sports", m => new Set(m.map(a => a.type)).size >= 5], ["🏔️", "Snow day", m => m.some(a => a.type === "snow" || a.type === "ski")],
  ["🥉", "First medal", m => liftMedals(m).some(x => x.medal)], ["🥈", "Silver lifter", m => liftMedals(m).some(x => x.medal && x.medal.pts >= 2)],
  ["🥇", "Gold lifter", m => liftMedals(m).some(x => x.medal && x.medal.pts >= 3)], ["💎", "Diamond", m => liftMedals(m).some(x => x.medal && x.medal.pts >= 5)],
  ["👑", "100 pts in a week", m => { const w = {}; m.forEach(a => { const k = weekStart(a.start); w[k] = (w[k] || 0) + a.points; }); return Object.values(w).some(v => v >= 100); }],
];
function streakMax(m) { const d = [...new Set(m.map(a => dayStart(a.start)))].sort((a, b) => a - b); let best = 0, cur = 0; d.forEach((x, i) => { cur = i && Math.round((x - d[i - 1]) / DAY) === 1 ? cur + 1 : 1; best = Math.max(best, cur); }); return best; }
function renderMe() {
  if (!me) return;
  $("#meAvatar").outerHTML = avatar(me, "lg").replace('class="avatar lg"', 'class="avatar lg" id="meAvatar"');
  $("#t-me").textContent = me.name; $("#meSince").textContent = store.mode === "demo" ? "Demo mode" : `Member since ${new Date(me.createdAt || Date.now()).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
  const m = S.mine;
  $("#meTiles").innerHTML = `<div class="tile"><small>Workouts</small><b>${m.length}</b></div><div class="tile"><small>Total time</small><b>${fmtMin(m.reduce((s, a) => s + a.durationS, 0))}</b></div><div class="tile"><small>Distance</small><b>${(m.reduce((s, a) => s + (a.distanceM || 0), 0) / 1000).toFixed(0)} km</b></div>`;
  const got = BADGES.filter(b => b[2](m)).length;
  renderStrength();
  $("#badgeCount").textContent = `${got}/${BADGES.length}`;
  $("#badges").innerHTML = BADGES.map(([e, n, f]) => `<div class="badge ${f(m) ? "got" : ""}"><span>${e}</span>${n}</div>`).join("");
  $("#history").innerHTML = m.slice(0, 60).map(a => liAct(a).replace('</span></div>', `</span><button class="pill ghost sm" data-del="${esc(a.id)}" aria-label="Delete">✕</button></div>`)).join("") || `<div class="empty"><span>🏁</span>Nothing yet.</div>`;
  const g = me.goals || {}; $("#pName").value = me.name || ""; $("#pMove").value = g.move || 500; $("#pEx").value = g.exercise || 30; $("#pKm").value = g.km || 5; $("#pW").value = me.weight || 70; $("#pSex").value = me.sex || ""; $("#pBY").value = me.birthYear || ""; $("#pH").value = me.height || "";
  $("#accountCard").innerHTML = store.mode === "demo"
    ? `<h3>Compete for real</h3><p class="muted" style="margin-bottom:12px">Connect a free Firebase project to sign in with Google and share groups with friends. Steps are in SETUP.md on GitHub.</p><div class="row"><a class="pill primary sm" href="https://github.com/Chimuel12/fitsmarter/blob/main/SETUP.md" target="_blank" rel="noopener">Setup guide</a><button class="pill danger sm" id="resetBtn">Reset demo</button></div>`
    : `<h3>Account</h3><p class="muted" style="margin-bottom:12px">Signed in. Your workouts sync across devices.</p><button class="pill danger sm" id="outBtn">Sign out</button>`;
  $("#resetBtn") && ($("#resetBtn").onclick = () => confirm("Delete all demo data on this device?") && store.signOut());
  $("#outBtn") && ($("#outBtn").onclick = () => store.signOut());
}
$("#history").addEventListener("click", async e => { const b = e.target.closest("[data-del]"); if (b && confirm("Delete this workout?")) { await store.deleteActivity(b.dataset.del); toast("Workout deleted"); } });
$("#profileForm").onsubmit = async e => {
  e.preventDefault();
  await store.saveProfile({ name: $("#pName").value.trim(), weight: +$("#pW").value, sex: $("#pSex").value, birthYear: +$("#pBY").value || 0, height: +$("#pH").value || 0, goals: { move: +$("#pMove").value, exercise: +$("#pEx").value, km: +$("#pKm").value } });
  me = store.user; renderToday(); renderMe(); renderCompete(); toast("Saved");
};


/* ---------- quick guide (spotlight tour across the tabs) ---------- */
const TOUR = [
  { v: "today", sel: "#rings", t: "Close your rings", d: "Move (calories), Exercise (minutes) and Distance (km). Fill all three every day. Set your goals in You." },
  { v: "today", sel: "#rankCard", t: "Your rank", d: "Where you stand in your group this week, and how many points to catch the person ahead." },
  { v: "record", sel: "#types", t: "Pick a sport", d: "Run, walk, ride and hike use GPS. Strength opens a set logger: exercise, kg and reps." },
  { v: "record", sel: "#startBtn", t: "Hit Start", d: "Live timer, map, pace and calories. Pause or finish anytime, or use Log manually for past workouts." },
  { v: "me", sel: "#strength", t: "Earn medals", d: "Every lift is compared with people of your sex, weight, age and height. Top 50% bronze, 30% silver, 15% gold, 5% platinum, 1% diamond." },
  { v: "feed", sel: "#feed", t: "Cheer your friends", d: "See everyone's workouts, routes and medals. Tap 👏 to give kudos." },
  { v: "compete", sel: "#compete", t: "Compete", d: "Weekly or monthly leaderboards by points, minutes, km, workouts or medals. Invite friends with your group code." },
  { v: "me", sel: "#profileForm", t: "Make it yours", d: "Set your goals, weight, height, sex and birth year so calories and medals are accurate. Replay this guide with ? anytime." },
];
let tour = null;
function startTour() {
  if (tour) return;
  const root = document.createElement("div"); root.className = "tour";
  root.innerHTML = `<div class="scrim"></div><div class="spot"></div><div class="tour-card" role="dialog" aria-live="polite" aria-label="Quick guide">
    <div class="tc-top"><img src="logo.svg" alt="" width="22" height="22"><span class="tc-n"></span><button class="tc-x" aria-label="Close guide">✕</button></div>
    <h3></h3><p></p><div class="tc-bar">${TOUR.map(() => "<i><b></b></i>").join("")}</div>
    <div class="tc-nav"><button class="tc-prev">Back</button><button class="tc-next">Next</button></div></div>`;
  document.body.appendChild(root);
  tour = { root, i: -1, spot: root.querySelector(".spot"), r: null, t0: 0 };
  root.querySelector(".tc-x").onclick = endTour; root.querySelector(".tc-prev").onclick = () => goTour(tour.i - 1); root.querySelector(".tc-next").onclick = () => goTour(tour.i + 1);
  root.querySelector(".scrim").onclick = () => goTour(tour.i + 1);
  goTour(0); tour.raf = requestAnimationFrame(tourTick);
}
function endTour() { if (!tour) return; cancelAnimationFrame(tour.raf); tour.root.remove(); tour = null; localStorage.setItem("fs-tour", "1"); location.hash = "#today"; }
function goTour(i) {
  if (!tour) return; if (i < 0) i = 0; if (i >= TOUR.length) return endTour();
  const s = TOUR[i]; tour.i = i; tour.t0 = performance.now();
  if (location.hash.slice(1) !== s.v) location.hash = "#" + s.v;
  const c = tour.root.querySelector(".tour-card");
  c.querySelector(".tc-n").textContent = `${String(i + 1).padStart(2, "0")} / ${String(TOUR.length).padStart(2, "0")}`;
  c.querySelector("h3").textContent = s.t; c.querySelector("p").textContent = "";
  c.querySelector(".tc-next").textContent = i === TOUR.length - 1 ? "Let's go" : "Next";
  c.querySelectorAll(".tc-bar i").forEach((b, j) => { b.classList.toggle("done", j < i); b.firstChild.style.transform = `scaleX(${j < i ? 1 : 0})`; });
  c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
  setTimeout(() => { const el = $(s.sel); el && el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60);
}
function tourTick(now) {
  if (!tour) return; const s = TOUR[tour.i], el = $(s.sel), card = tour.root.querySelector(".tour-card");
  const p = card.querySelector("p"), n = Math.min(s.d.length, Math.round((now - tour.t0) / 12)); if (p.textContent.length !== n) p.textContent = s.d.slice(0, n);
  if (el) { const r = el.getBoundingClientRect(), pad = 8, top = 60, bottom = innerHeight - card.offsetHeight - 24;
    const g = { x: Math.max(6, r.left - pad), y: Math.max(top, r.top - pad) }; g.w = Math.min(innerWidth - 6, r.right + pad) - g.x; g.h = Math.max(44, Math.min(bottom, r.bottom + pad) - g.y);
    const c = tour.r || g; for (const k of ["x", "y", "w", "h"]) c[k] += (g[k] - c[k]) * 0.18; tour.r = c;
    Object.assign(tour.spot.style, { transform: `translate(${c.x}px,${c.y}px)`, width: c.w + "px", height: c.h + "px" }); }
  const k = Math.min(1, (now - tour.t0) / 9000), bar = tour.root.querySelectorAll(".tc-bar i b")[tour.i]; if (bar) bar.style.transform = `scaleX(${k})`;
  if (k >= 1) { goTour(tour.i + 1); if (!tour) return; }
  tour.raf = requestAnimationFrame(tourTick);
}
document.addEventListener("click", e => { if (e.target.closest("[data-tour]")) startTour(); });
addEventListener("keydown", e => { if (!tour) return; if (e.key === "Escape") endTour(); else if (e.key === "ArrowRight") goTour(tour.i + 1); else if (e.key === "ArrowLeft") goTour(tour.i - 1); });

/* ---------- install ---------- */
let installEv = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEv = e; $("#installBtn").hidden = false; });
$("#installBtn").onclick = async () => { if (!installEv) return; installEv.prompt(); await installEv.userChoice; installEv = null; $("#installBtn").hidden = true; };

boot();
