# Requirements Documentation

## 1. Purpose

I'm Syncing! is a personal productivity workspace for tracking tasks and viewing selected Google Workspace data. This document describes the implemented application as it exists in this repository. Ideas in `project_details` are not requirements unless identified below as current behavior.

## 2. Users and operating assumptions

- The current interface is designed for one person using a modern browser.
- A user can use task management without signing in to Google.
- Google features require a Google account, configured OAuth credentials, and the relevant Google APIs and permissions.
- Task records and the collapsed-sidebar preference are saved in the browser's local storage. They are not synced between browsers or devices and are not stored in an application database.

## 3. Functional requirements

### FR-1 — Workspace navigation

The application shall provide Overview, The Tide (tasks), Calendar, Cargo Hold (Drive files), The Deep (completed tasks), and The Signal (Google connection) views. The desktop sidebar may be collapsed, with its preference stored in the current browser.

### FR-2 — Task management

The user shall be able to create and edit tasks with a title, optional subject, optional due date, effort preset, and numeric weight from 0.5 through 20 points. A new task is active by default. The user shall be able to mark a task complete or active and delete it.

The interface shall support filtering tasks by all, active, or completed state and searching by task title or subject. Completed tasks shall be listed in The Deep. Task changes shall be persisted in local storage in the current browser.

### FR-3 — Workload summary

The Overview shall summarize active tasks and calculate a workload score from dated active tasks. Each task contributes `weight × urgency multiplier`. Multipliers are: overdue 2.5; due today 2; due tomorrow 1.5; due in 2–3 days 1; due in 4–7 days 0.75; and due in 8 or more days 0.5. Tasks without due dates and completed tasks are excluded.

The displayed score bands shall be Calm (0–4), Rising (5–9), High (10–17), and Turbulent (18 or more). The progress display is capped at 100 percent.

### FR-4 — Google sign-in

The user shall be able to sign in and sign out using Google through Auth.js. The requested Google scopes shall include identity (openid, email, profile), Drive metadata read access, Calendar read access, Docs read access, and Sheets read access. The application shall not request Gmail access.

### FR-5 — Drive listing and previews

When signed in, Cargo Hold shall list up to 50 non-trashed Drive file metadata records, ordered by most recently modified, and support client-side search of the loaded list. Google Docs and Sheets may be previewed as read-only content. The Docs preview extracts text from document paragraphs and tables. The Sheets preview shows values in the first sheet, limited to cells A1:Z20.

When signed out, Cargo Hold shall show clearly labeled sample/mock rows instead of representing them as the user's Drive data. Sign-in is required for actual Google data.

### FR-6 — Calendar

The Calendar view shall display the selected month and allow day selection. It shall show local task due dates and, when signed in, events from the user's primary Google Calendar for that month. The Google events endpoint requests at most 100 events, ordered by start time. Google event data is read-only.

### FR-7 — Errors and connection state

The interface shall indicate loading and errors for Google requests and show whether Google services are connected. A missing or expired authorization shall produce an actionable connection/reauthorization error rather than presenting Google data as available.

## 4. Non-functional requirements

- **Security:** Google access tokens shall be handled server-side for Google API requests and stored in the Auth.js encrypted, HttpOnly session cookie; raw tokens shall not be sent to client code.
- **Privacy:** Google data is fetched on demand and is not persisted in an application database. Task data is stored only in browser local storage by the current implementation.
- **Usability:** The interface shall prioritize task information, provide empty/loading/error states, and use nautical styling as a secondary visual theme.
- **Compatibility:** The application shall run in a browser supported by the installed Next.js/React runtime and on a compatible Node.js runtime.
- **Maintainability:** TypeScript source and route handlers shall remain organized under the existing `app/` structure.

## 5. Out of scope / not currently implemented

The current system does not provide database-backed accounts or cross-device task synchronization, Gmail, Google Calendar event creation/synchronization from tasks, Drive file/folder mutations (create, rename, move, delete), editing Google Docs/Sheets, subject/project hierarchies, academic progress tracking, notifications, or multi-user roles. These appear in the brainstorming document as possible future ideas and must not be assumed available.

## 6. Acceptance summary

The current system meets this document when a user can manage locally stored tasks and their completion state, see the workload summary and calendar view, and optionally connect Google to list Drive metadata, view primary-calendar events, and read Docs/Sheets previews without write operations.
