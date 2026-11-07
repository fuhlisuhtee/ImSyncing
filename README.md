# I'm Syncing!

A personal workspace built with Next.js, React, and TypeScript.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Google integration setup

1. In Google Cloud Console, enable the Google Drive API, Google Calendar API, Google Docs API, and Google Sheets API.
2. Configure the OAuth consent screen and add your Google account as a test user while the app is in testing.
3. Create an OAuth client ID with application type **Web application**. Add this authorized redirect URI:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

4. Copy `.env.example` to `.env.local`, then fill in the OAuth client ID and secret. Generate `AUTH_SECRET` with `npx auth secret`. Keep `.env.local` private; it is ignored by Git.
5. Restart the dev server and select **Continue with Google** from The Signal.

For a deployed site, set `AUTH_URL` to its public origin and add `https://your-domain/api/auth/callback/google` as an authorized redirect URI in Google Cloud Console. Set the same environment variables in the hosting provider's secret settings; never publish the client secret or `AUTH_SECRET`.

The app requests Drive metadata access and read-only access to Calendar, Docs, and Sheets when you sign in. Gmail is not requested. In Google Cloud Console, enable each API above and keep the OAuth consent screen in testing until you're ready for Google's verification process. Google may require verification for these sensitive scopes before allowing general users. OAuth apps in testing can also have refresh tokens expire after seven days.

## Current scope

- Tasks can be added, completed, deleted, filtered, and searched.
- Task data is stored in this browser's local storage. It is not synced to an account or server.
- Tasks have an effort preset and adjustable weight (0.5–20 points). Active, dated tasks contribute `weight × urgency` to the dashboard workload score; tasks without a due date are excluded until scheduled.
- The Tide shows urgency multipliers and score bands: 0–4 Calm, 5–9 Rising, 10–17 High, and 18+ Turbulent Waters.
- The dashboard has controls to add one or five temporary `TEST 01`-style mock tasks and clear mock tasks without removing your own tasks.
- When signed in, Cargo Hold lists Drive files, Calendar shows real events, and Docs/Sheets files can be previewed with read-only access. When signed out, the app continues to show labeled mock Drive preview data.
- The sidebar can be collapsed on desktop; that preference is stored in this browser.
- Gmail is not connected. Google tasks and app account data are not stored on a server; only Google service data is fetched on demand.
