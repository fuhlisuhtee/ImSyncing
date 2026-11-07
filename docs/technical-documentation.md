# Technical Documentation

## 1. System overview

I'm Syncing! is a single-page personal workspace implemented with the Next.js App Router, React, and TypeScript. The browser renders the main interface in `app/page.tsx`. Server route handlers under `app/api/` provide Auth.js endpoints and proxy selected Google API requests. There is no application database or separate backend service.

## 2. Main components

| Component | Location | Responsibility |
| --- | --- | --- |
| Workspace UI | `app/page.tsx` | Navigation, task CRUD, local persistence, workload calculation, calendar, Drive list and previews |
| Root layout | `app/layout.tsx` | HTML shell, page metadata, global styles, and providers |
| Session provider | `app/providers.tsx` | Makes the Auth.js session available to client components |
| Auth configuration | `auth.ts` | Google provider, OAuth scopes, JWT session and Google token fields |
| Auth route | `app/api/auth/[...nextauth]/route.ts` | Exposes Auth.js GET and POST handlers |
| Google API helpers | `app/lib/google.ts` | Reads session token, refreshes expired Google authorization, and formats Google API errors |
| Google routes | `app/api/google/**/route.ts` | Performs read-only server-side requests to Google Drive, Calendar, Docs, and Sheets |

## 3. Data and persistence

### Task record

Tasks use this conceptual shape: `id`, `title`, `subject`, `dueDate`, `effort`, `weight`, `completed`, and optional `mock`. Effort is Light, Medium, Heavy, or Intensive. Default effort weights are 1, 2, 3, and 4 points. A user can override the weight from 0.5 to 20 in increments of 0.5. Task state is serialized as JSON under local-storage key `im-syncing-tasks`.

The application normalizes saved task objects when reading them and supports legacy saved `priority` values as a fallback for effort. The sidebar preference is stored under `im-syncing-sidebar-collapsed`. Browser storage is scoped to the browser profile and origin; clearing site data or using another browser/device may remove or omit these records.

### Google data

Google content is fetched on demand through server routes and held in UI state for display. The app does not save it to a database. Drive listing is capped at 50 results and includes metadata such as ID, name, MIME type, modified time, view link, and size. The Docs endpoint flattens paragraph and table text. The Sheets endpoint reads the first sheet's A1:Z20 range. The Calendar endpoint queries the primary calendar for a supplied time range, with a maximum of 100 events.

## 4. Authentication and security flow

1. The browser starts Google sign-in through Auth.js.
2. Google returns an OAuth authorization to `/api/auth/callback/google`.
3. `auth.ts` stores access-token metadata in the Auth.js JWT session. Auth.js protects the session cookie using `AUTH_SECRET`.
4. A Google route calls `getGoogleAccessToken()` using the request cookie. The helper returns a valid access token or attempts a refresh using the refresh token and OAuth client credentials.
5. The route makes a server-side request to Google with a bearer token and returns only the requested data to the browser.

The configured scopes are `drive.metadata.readonly`, `calendar.readonly`, `documents.readonly`, and `spreadsheets.readonly`, plus `openid email profile`. Routes currently use GET for Google data and do not implement Google write operations. Never commit `.env.local` or publish OAuth secrets.

## 5. HTTP endpoints

All Google routes require an authenticated Google session with a usable authorization. They return JSON. Errors use an `error` message and appropriate HTTP status where handled.

| Method and path | Behavior |
| --- | --- |
| `GET /api/auth/*` | Auth.js authentication/session endpoints |
| `POST /api/auth/*` | Auth.js sign-in/sign-out/callback actions |
| `GET /api/google/drive` | Lists up to 50 non-trashed Drive file metadata records |
| `GET /api/google/calendar?timeMin=...&timeMax=...` | Lists primary-calendar events in a valid, increasing date-time range |
| `GET /api/google/docs/{documentId}` | Returns document title and extracted text |
| `GET /api/google/sheets/{spreadsheetId}` | Returns spreadsheet title and first-sheet values from A1:Z20 |

The Docs and Sheets IDs are URL-encoded before upstream requests. The Calendar route rejects missing/invalid dates and ranges where `timeMin` is not earlier than `timeMax`.

## 6. Workload calculation

For every active task with a due date, calculate `task weight × urgency multiplier`; sum those values. Undated tasks are counted as unscored, and completed tasks do not contribute. Urgency is determined from the local calendar date in the browser. The visual score bands are 0–4, 5–9, 10–17, and 18+.

## 7. Development and build

The npm scripts are `npm run dev`, `npm run build`, and `npm run start`. Dependencies and exact resolved package versions are recorded in `package-lock.json`. Tailwind or a database package is not part of the declared dependency list; styling is in `app/globals.css`.

## 8. Known limitations

- Task data is local to a browser; there is no server persistence or account sync.
- Drive listing returns a bounded first page and does not implement pagination or folder traversal.
- Docs/Sheets are previews only; the app does not edit or create them.
- Calendar events are read-only; tasks are not written to Google Calendar.
- Google OAuth consent/testing and verification status are managed in Google Cloud, outside this repository.
- Google API quotas, user permissions, expired/revoked grants, network errors, or consent-screen configuration can prevent integrations from loading.
