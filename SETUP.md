# Connect FitSmarter to Firebase (free, ~5 minutes)

Until this is done the app runs in **demo mode**: sample friends, data only on your device.
After it, everyone signs in with Google (or email) and groups, feeds and leaderboards are shared live.

1. **Create the project.** Go to <https://console.firebase.google.com>, click **Create a project**, name it `fitsmarter`, and skip Google Analytics. The free **Spark** plan is enough.
2. **Add a web app.** On the project page, click the **`</>`** (Web) icon, name it `FitSmarter`, and leave "Firebase Hosting" unchecked. Firebase shows a `firebaseConfig = { … }` block. Copy it.
3. **Paste the config** into [`firebase-config.js`](firebase-config.js), replacing `export default null;`:
   ```js
   export default {
     apiKey: "…",
     authDomain: "fitsmarter-xxxx.firebaseapp.com",
     projectId: "fitsmarter-xxxx",
     storageBucket: "fitsmarter-xxxx.appspot.com",
     messagingSenderId: "…",
     appId: "…"
   };
   ```
   These values are public identifiers, not passwords. The security rules below protect the data.
4. **Turn on sign-in.** Go to **Build → Authentication → Get started**, then:
   - Enable **Google**: pick a support email and save.
   - Enable **Email/Password** as well. On some phones, sign-in from the installed app works better with email.
   - Under **Settings → Authorized domains**, add `chimuel12.github.io`.
5. **Create the database.** Go to **Build → Firestore Database → Create database**, choose a location in Europe (for example `eur3`), and start in **production mode**.
6. **Paste the security rules.** In **Firestore → Rules**, replace everything with the contents of [`firestore.rules`](firestore.rules) and click **Publish**.
7. **Push.** Commit `firebase-config.js` to `main`. GitHub Pages redeploys in about a minute.

Then open the app, sign in, create a group under **Compete**, and tap **Invite friends** to share the link.

## What the rules allow

- Profiles (name and photo) can be read by any signed-in user. Only you can edit yours.
- Your own activity history is private to you.
- A group can be joined by anyone who knows its 6-letter code. Members can only add or remove **themselves**.
- Only group members can read a group's feed. You can only post your own workouts. Others can only give or take back kudos.

## Free-tier limits

Spark allows 50,000 reads and 20,000 writes per day. That is plenty for a group of friends.
