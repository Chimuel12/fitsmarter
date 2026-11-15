// Data layer. Two interchangeable stores with the same interface:
//  - LocalStore: demo mode, everything in localStorage with simulated friends
//  - FirebaseStore: real accounts (Google or email) and shared groups in Firestore
// Activities are written to the user's own collection and copied into the feed of every group
// they belong to, so a group's feed and leaderboard are a single query.

import { EX, standards, setPct, tierFor, isReps } from "./strength.js";

export const TYPES = {
  run:   { n: "Run",        e: "🏃", met: 9.8, gps: true },
  walk:  { n: "Walk",       e: "🚶", met: 3.8, gps: true },
  ride:  { n: "Ride",       e: "🚴", met: 7.5, gps: true },
  hike:  { n: "Hike",       e: "🥾", met: 6.0, gps: true },
  gym:   { n: "Strength",   e: "🏋️", met: 5.0 },
  hiit:  { n: "HIIT",       e: "🔥", met: 8.0 },
  yoga:  { n: "Yoga",       e: "🧘", met: 2.8 },
  swim:  { n: "Swim",       e: "🏊", met: 7.0 },
  snow:  { n: "Snowboard",  e: "🏂", met: 5.3 },
  ski:   { n: "Ski",        e: "⛷️", met: 6.3 },
  ball:  { n: "Football",   e: "⚽", met: 7.0 },
  other: { n: "Workout",    e: "💪", met: 5.0 },
};

// kcal from MET; points are comparable across sports (1 point per 10 kcal)
export function score(a, weightKg = 70) {
  const kcal = Math.round((TYPES[a.type]?.met || 5) * weightKg * a.durationS / 3600);
  return { kcal, points: Math.max(1, Math.round(kcal / 10)) };
}

export const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

/* ---------- polyline encoding (routes are stored as short strings) ---------- */
export function encodePath(pts) {
  let out = "", plat = 0, plng = 0;
  const enc = v => { v = v < 0 ? ~(v << 1) : v << 1; let s = ""; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
  for (const [la, lo] of pts) { const a = Math.round(la * 1e5), b = Math.round(lo * 1e5); out += enc(a - plat) + enc(b - plng); plat = a; plng = b; }
  return out;
}
export function decodePath(s) {
  const pts = []; let i = 0, la = 0, lo = 0;
  const dec = () => { let r = 0, sh = 0, b; do { b = s.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20); return r & 1 ? ~(r >> 1) : r >> 1; };
  while (s && i < s.length) { la += dec(); lo += dec(); pts.push([la / 1e5, lo / 1e5]); }
  return pts;
}

/* ===================== demo store ===================== */
const LS = "fitsmarter-demo-v3";
const DEMO_FRIENDS = [
  { uid: "f-ana", name: "Ana Weber", w: 60, sex: "f", height: 168, birthYear: 2000, str: 1.15, types: ["run", "gym", "yoga"] },
  { uid: "f-luca", name: "Luca Rossi", w: 78, sex: "m", height: 182, birthYear: 1999, str: 1.0, types: ["ride", "gym", "run"] },
  { uid: "f-mia", name: "Mia Fischer", w: 58, sex: "f", height: 162, birthYear: 2002, str: 0.8, types: ["swim", "gym", "yoga"] },
  { uid: "f-jonas", name: "Jonas Klein", w: 82, sex: "m", height: 179, birthYear: 1998, str: 1.35, types: ["gym", "ball", "hiit"] },
];
function demoRoute(seed, km) {
  // a loop around Stuttgart's Schlossgarten, slightly different per activity
  const c = [48.7840 + (seed % 7) * 0.002, 9.1880 + (seed % 5) * 0.003], n = 40, r = 0.004 * Math.sqrt(km);
  return encodePath(Array.from({ length: n + 1 }, (_, i) => { const t = i / n * Math.PI * 2; return [c[0] + Math.sin(t) * r * (1 + 0.15 * Math.sin(t * 3 + seed)), c[1] + Math.cos(t) * r * 1.5]; }));
}

// a few realistic lifts per gym session, scaled by each friend's strength level
function demoLifts(f, seed) {
  const prof = { sex: f.sex, weight: f.w, height: f.height, birthYear: f.birthYear };
  const plan = [["bench", "selchest", "row", "pulldown"], ["deadlift", "ohp", "pullup", "curl"], ["squat", "legpress", "legcurl", "selcalf"], ["inclinedb", "pslowrow", "lateral", "pushdown"]][seed % 4];
  return plan.map((ex, i) => {
    const mid = standards(ex, prof)[2] * f.str * (1 + ((seed + i) % 5) * 0.03);
    const sets = isReps(ex) ? [{ w: 0, r: Math.max(1, Math.round(mid)) }, { w: 0, r: Math.max(1, Math.round(mid * 0.8)) }]
      : [10, 10, 8].map(r => ({ w: Math.max(2.5, Math.round(mid * (r === 8 ? 1.05 : 1) / 2.5) * 2.5), r }));
    const pct = Math.max(...sets.map(s => setPct(ex, s, prof)));
    return { ex, sets, pct: Math.round(pct * 10) / 10, tier: tierFor(pct).id };
  });
}

export class LocalStore {
  constructor() {
    this.mode = "demo";
    this.subs = new Set();
    try { this.db = JSON.parse(localStorage.getItem(LS)); } catch { this.db = null; }
    if (!this.db) this.db = this.seed();
  }
  seed() {
    const now = Date.now(), db = { me: { uid: "me", name: "", weight: 70, goals: { move: 500, exercise: 30, km: 5 } }, activities: [], groups: {} };
    const g = { id: "DEMO42", name: "Demo Crew", owner: "f-ana", members: ["me", ...DEMO_FRIENDS.map(f => f.uid)], createdAt: now - 20 * 864e5 };
    db.groups[g.id] = g;
    db.people = Object.fromEntries(DEMO_FRIENDS.map(f => [f.uid, { uid: f.uid, name: f.name }]));
    let k = 0;
    for (const f of DEMO_FRIENDS) for (let d = 0; d < 21; d++) {
      if ((d * 7 + k) % 3 === 0) continue;
      const type = f.types[(d + k) % f.types.length], gps = TYPES[type].gps;
      const start = now - d * 864e5 - (6 + ((d * 5 + k) % 12)) * 36e5;
      const durationS = (25 + ((d * 13 + k * 7) % 50)) * 60, km = gps ? +(durationS / 60 / (type === "ride" ? 2.4 : type === "walk" ? 11 : 5.6)).toFixed(2) : 0;
      const a = { id: `d${k}-${d}`, uid: f.uid, name: f.name, type, start, durationS, distanceM: Math.round(km * 1000), route: gps ? demoRoute(k * 31 + d, km) : "", title: "", kudos: d % 2 ? ["me"] : [] };
      Object.assign(a, score(a, f.w));
      if (type === "gym") a.lifts = demoLifts(f, d + k);
      db.activities.push(a);
      k++;
    }
    return db;
  }
  save() { try { localStorage.setItem(LS, JSON.stringify(this.db)); } catch {} this.subs.forEach(f => f()); }
  watch(fn) { this.subs.add(fn); fn(); return () => this.subs.delete(fn); }

  async init() { return this.db.me; }
  get user() { return this.db.me; }
  async saveProfile(p) { Object.assign(this.db.me, p); this.save(); }
  async signOut() { localStorage.removeItem(LS); location.reload(); }

  myActivities(cb) { return this.watch(() => cb(this.db.activities.filter(a => a.uid === "me").sort((a, b) => b.start - a.start))); }
  async addActivity(a) {
    const rec = { ...a, id: "a" + Date.now(), uid: "me", name: this.db.me.name || "You", kudos: [] };
    Object.assign(rec, score(rec, this.db.me.weight));
    this.db.activities.push(rec); this.save(); return rec;
  }
  async deleteActivity(id) { this.db.activities = this.db.activities.filter(a => a.id !== id); this.save(); }

  groups(cb) { return this.watch(() => cb(Object.values(this.db.groups).filter(g => g.members.includes("me")))); }
  async createGroup(name) { const id = randomCode(); this.db.groups[id] = { id, name, owner: "me", members: ["me"], createdAt: Date.now() }; this.save(); return id; }
  async joinGroup(code) { const g = this.db.groups[code.toUpperCase()]; if (!g) throw new Error("No group with that code. In demo mode only DEMO42 exists."); if (!g.members.includes("me")) g.members.push("me"); this.save(); return g.id; }
  async leaveGroup(id) { const g = this.db.groups[id]; if (g) g.members = g.members.filter(m => m !== "me"); this.save(); }

  // feed and leaderboard of a group: activities of its members since a date
  groupActivities(id, since, cb) {
    return this.watch(() => { const g = this.db.groups[id]; if (!g) return cb([]);
      cb(this.db.activities.filter(a => g.members.includes(a.uid) && a.start >= since).map(a => a.uid === "me" ? { ...a, name: this.db.me.name || "You" } : a).sort((a, b) => b.start - a.start)); });
  }
  members(id) { const g = this.db.groups[id]; return (g?.members || []).map(u => u === "me" ? { uid: "me", name: this.db.me.name || "You" } : this.db.people[u]).filter(Boolean); }
  async kudos(gid, a, on) { const x = this.db.activities.find(y => y.id === a.id); if (!x) return; x.kudos = on ? [...new Set([...(x.kudos || []), "me"])] : (x.kudos || []).filter(u => u !== "me"); this.save(); }
}

/* ===================== Firebase store ===================== */
const V = "10.14.1", CDN = `https://www.gstatic.com/firebasejs/${V}`;
export class FirebaseStore {
  constructor(config) { this.config = config; this.mode = "firebase"; this.people = {}; this.groupCache = {}; }
  async init() {
    const [{ initializeApp }, A, F] = await Promise.all([import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`)]);
    this.A = A; this.F = F;
    const app = initializeApp(this.config);
    this.auth = A.getAuth(app);
    try { this.fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
    catch { this.fs = F.getFirestore(app); }
    try { await A.getRedirectResult(this.auth); } catch {}
    const u = await new Promise(r => { const off = A.onAuthStateChanged(this.auth, x => { off(); r(x); }); });
    if (!u) return null;
    return this.loadMe(u);
  }
  async loadMe(u) {
    const { doc, getDoc, setDoc } = this.F, ref = doc(this.fs, "users", u.uid), snap = await getDoc(ref);
    this.me = snap.exists() ? snap.data() : { uid: u.uid, name: u.displayName || (u.email || "").split("@")[0], photo: u.photoURL || "", weight: 70, goals: { move: 500, exercise: 30, km: 5 }, createdAt: Date.now() };
    if (!snap.exists()) await setDoc(ref, this.me);
    return this.me;
  }
  get user() { return this.me; }
  async signInGoogle() {
    const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = this.A, p = new GoogleAuthProvider();
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (standalone) return signInWithRedirect(this.auth, p);
    const r = await signInWithPopup(this.auth, p); return this.loadMe(r.user);
  }
  async signInEmail(email, pass, create) {
    const A = this.A, r = create ? await A.createUserWithEmailAndPassword(this.auth, email, pass) : await A.signInWithEmailAndPassword(this.auth, email, pass);
    return this.loadMe(r.user);
  }
  async signOut() { await this.A.signOut(this.auth); location.reload(); }
  async saveProfile(p) { Object.assign(this.me, p); await this.F.setDoc(this.F.doc(this.fs, "users", this.me.uid), this.me, { merge: true }); }

  myActivities(cb) {
    const { collection, query, orderBy, limit, onSnapshot } = this.F;
    return onSnapshot(query(collection(this.fs, "users", this.me.uid, "activities"), orderBy("start", "desc"), limit(400)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }
  async addActivity(a) {
    const { doc, collection, writeBatch } = this.F, b = writeBatch(this.fs);
    const ref = doc(collection(this.fs, "users", this.me.uid, "activities"));
    const rec = { ...a, uid: this.me.uid, name: this.me.name, photo: this.me.photo || "", kudos: [] };
    Object.assign(rec, score(rec, this.me.weight));
    b.set(ref, rec);
    for (const g of this.myGroups || []) b.set(doc(this.fs, "groups", g.id, "feed", ref.id), rec);
    await b.commit(); return { id: ref.id, ...rec };
  }
  async deleteActivity(id) {
    const { doc, writeBatch } = this.F, b = writeBatch(this.fs);
    b.delete(doc(this.fs, "users", this.me.uid, "activities", id));
    for (const g of this.myGroups || []) b.delete(doc(this.fs, "groups", g.id, "feed", id));
    await b.commit();
  }

  groups(cb) {
    const { collection, query, where, onSnapshot } = this.F;
    return onSnapshot(query(collection(this.fs, "groups"), where("members", "array-contains", this.me.uid)), s => {
      this.myGroups = s.docs.map(d => ({ id: d.id, ...d.data() })); this.myGroups.forEach(g => this.groupCache[g.id] = g); cb(this.myGroups); this.loadPeople();
    });
  }
  async loadPeople() {
    const { doc, getDoc } = this.F, ids = new Set((this.myGroups || []).flatMap(g => g.members));
    await Promise.all([...ids].filter(u => !this.people[u]).map(async u => { const s = await getDoc(doc(this.fs, "users", u)); if (s.exists()) this.people[u] = s.data(); }));
  }
  members(id) { const g = this.groupCache[id]; return (g?.members || []).map(u => this.people[u] || { uid: u, name: "…" }); }
  async createGroup(name) {
    const { doc, setDoc } = this.F, id = randomCode();
    await setDoc(doc(this.fs, "groups", id), { id, name, owner: this.me.uid, members: [this.me.uid], createdAt: Date.now() });
    return id;
  }
  async joinGroup(code) {
    const { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, writeBatch } = this.F, id = code.trim().toUpperCase(), ref = doc(this.fs, "groups", id);
    const s = await getDoc(ref); if (!s.exists()) throw new Error("No group with that code.");
    await updateDoc(ref, { members: arrayUnion(this.me.uid) });
    // bring your last 30 days into the new group's feed so the leaderboard is fair
    const since = Date.now() - 30 * 864e5, mine = await getDocs(query(collection(this.fs, "users", this.me.uid, "activities"), where("start", ">=", since)));
    const b = writeBatch(this.fs); mine.docs.forEach(d => b.set(doc(this.fs, "groups", id, "feed", d.id), d.data())); await b.commit();
    return id;
  }
  async leaveGroup(id) { const { doc, updateDoc, arrayRemove } = this.F; await updateDoc(doc(this.fs, "groups", id), { members: arrayRemove(this.me.uid) }); }
  groupActivities(id, since, cb) {
    const { collection, query, where, orderBy, onSnapshot } = this.F;
    return onSnapshot(query(collection(this.fs, "groups", id, "feed"), where("start", ">=", since), orderBy("start", "desc")), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => cb([]));
  }
  async kudos(gid, a, on) {
    const { doc, updateDoc, arrayUnion, arrayRemove } = this.F;
    await updateDoc(doc(this.fs, "groups", gid, "feed", a.id), { kudos: on ? arrayUnion(this.me.uid) : arrayRemove(this.me.uid) });
  }
}
