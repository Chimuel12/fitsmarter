# FitSmarter

Track workouts, close your rings and compete with friends. It is an installable web app (PWA) in the same style as [SnowSmarter](https://chimuel12.github.io/snowboard-season/).

**Live:** <https://chimuel12.github.io/fitsmarter/>

- **Today:** Move, Exercise and Distance rings, a weekly points chart, your streak, and your rank in your group.
- **Record:** GPS tracking for runs, walks, rides and hikes, with a live map, pace and distance. Timers for gym, HIIT, yoga, swim, snowboard and more. Workouts can also be logged by hand.
- **Feed:** your friends' workouts with route maps and kudos.
- **Compete:** groups joined by invite code or link. Leaderboards with a podium, by week or month, ranked by points, minutes, km or workouts.
- **Body hub:** a front and back muscle map in which each muscle shows its tier, from Bronze (top 90%) to Symmetric (top 5%). Tiers come from your best set as a 10-rep equivalent, compared with reference weights for gym-goers and adjusted for body weight, sex, age and height.
- **Exercise library:** 80 exercises with original animated figures. It covers free weights, bodyweight moves, Technogym Selection and Pure Strength machines, and cable-station exercises. The set logger has Set · Previous · kg · Reps · ✓ columns.
- **You:** totals, the body hub, daily goals and body data.

A quick guide is in [GUIDE.md](GUIDE.md). In the app, tap **?** to start it.

Points are 1 point per 10 kcal, estimated from MET values per sport, duration and body weight. This keeps a yoga session and a run comparable.

## Run it

It is a static site with no build step. Serve the folder with any web server, for example `python3 -m http.server`.
Without a Firebase config it runs in demo mode with four sample friends.
To compete for real, follow [SETUP.md](SETUP.md).

## Files

- `index.html`, `styles.css`, `app.js`: the user interface.
- `strength.js`: tier engine and exercise library. `body.js`: muscle map and animations. `gym.js`: hub, picker and set logger.
- `store.js`: the data layer. `LocalStore` serves demo mode and `FirebaseStore` handles Auth and Firestore.
- `firebase-config.js`: your Firebase web config, or `null` for demo mode.
- `firestore.rules`: the database security rules.
- `sw.js`, `manifest.webmanifest`, the icons and `logo.svg`: the installable offline app. Regenerate the icons with `node tools/icons.cjs`.

Maps © OpenStreetMap contributors, via Leaflet. Firebase JS SDK 10.14.
