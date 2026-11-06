# I'm Syncing!

A personal-workspace UI preview built with Next.js, React, and TypeScript.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current scope

- Tasks can be added, completed, deleted, filtered, and searched.
- Task data is stored in this browser's local storage. It is not synced to an account or server.
- Tasks have an effort preset and adjustable weight (0.5–20 points). Active, dated tasks contribute `weight × urgency` to the dashboard workload score; tasks without a due date are excluded until scheduled.
- The Tide shows urgency multipliers and score bands: 0–4 Calm, 5–9 Rising, 10–17 High, and 18+ Turbulent Waters.
- The dashboard has controls to add one or five temporary `TEST 01`-style mock tasks and clear mock tasks without removing your own tasks.
- Cargo Hold and Calendar include explicitly labeled mock preview rows/events. They are not real Drive files or Calendar events.
- The sidebar can be collapsed on desktop; that preference is stored in this browser.
- Drive, Calendar, Docs, Sheets, Gmail, and Google sign-in are not connected. The app makes no Google API calls.

Google authentication and service integrations are planned for a later phase.
