# Installation Guide

## 1. Prerequisites

- A supported Node.js LTS release and npm.
- Git (optional, for cloning/version control).
- A Google account and Google Cloud project only if Google integration is needed.

Use the Node.js version supported by the Next.js version resolved in `package-lock.json`. Keep `package-lock.json` so installations use the repository's resolved dependency versions.

## 2. Install and run locally

From the repository root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Task features can be used without Google credentials. For a production build, run `npm run build`; to serve a built app, run `npm run start`.

## 3. Configure Google integration (optional)

1. In Google Cloud Console, create or select a project and enable Google Drive API, Google Calendar API, Google Docs API, and Google Sheets API.
2. Configure the OAuth consent screen. If the app is in Testing status, add the intended Google account as a test user. Google's current consent and verification rules apply to the requested scopes.
3. Create an OAuth client ID of type **Web application**. Add this local authorized redirect URI:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

4. Copy `.env.example` to `.env.local` and set:

   ```dotenv
   AUTH_URL=http://localhost:3000
   AUTH_SECRET=<generated-secret>
   GOOGLE_CLIENT_ID=<oauth-client-id>
   GOOGLE_CLIENT_SECRET=<oauth-client-secret>
   ```

   Generate a secret with `npx auth secret`. Keep `.env.local` private; it is excluded by `.gitignore`. Do not put real credentials in source files or documentation.

5. Restart the development server and choose **Continue with Google** in The Signal view. Review and grant the requested read-only permissions.

The requested scopes allow reading Drive metadata, Calendar events, Docs content, and Sheets values. Gmail is not requested. OAuth applications in testing can have refresh tokens expire after seven days; if access stops working, sign out/in or reconnect the grant.

## 4. Deployment

Deploy to a host that supports the installed Next.js runtime. Configure `AUTH_URL` to the deployed public origin and set `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` in the host's secret/environment-variable settings. Add the matching callback URI, for example `https://your-domain.example/api/auth/callback/google`, to the OAuth client. Use HTTPS in production. Restart/redeploy after changing environment variables.

## 5. Troubleshooting

| Symptom | Check |
| --- | --- |
| Sign-in reports authentication is not configured | Set `AUTH_SECRET`, then restart the app. |
| Google redirects to a URI error | Ensure the OAuth client has the exact callback URI for the current origin. |
| Consent screen blocks sign-in | Check OAuth audience/publishing state and add the account as a test user when in Testing. |
| Drive, Calendar, Docs, or Sheets returns an API error | Confirm that the corresponding API is enabled and the signed-in account has access to the resource. |
| Authorization expired or cannot refresh | Reconnect Google; verify client credentials and consent configuration. |
| Tasks appear missing on another device/browser | Tasks are stored only in the original browser's local storage and are not cloud-synced. |

## 6. Removal

Stop the server with Ctrl+C. To revoke Google access, remove the application from the Google Account's third-party connections. Removing browser site data also removes locally stored tasks and sidebar preference.
