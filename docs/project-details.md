I'm Syncing! — Project Details

> Status note: This file began as brainstorming. The implementation has since narrowed the scope. The `docs/requirements.md`, `docs/technical-documentation.md`, `docs/installation-guide.md`, and `docs/srs.md` documents describe the current repository. Ideas below that are not reflected in those current documents are future possibilities, not implemented features.

Motto: Sync or Sink? Don't let your files drown (even if your academic life is.)

Current purpose: A personal browser workspace for managing locally stored tasks and viewing selected Google Workspace data through read-only integrations. It provides an Overview, task list (The Tide), Calendar, Drive file view (Cargo Hold), completed tasks (The Deep), and Google connection settings (The Signal).

Original vision: A centralized personal workspace that organizes academic and professional activities while integrating Google Workspace services into one convenient interface. This wider vision remains a possible direction, not a description of all current capabilities.

Instead of constantly switching between Google Drive, Docs, Sheets, Calendar, and Gmail, you can manage the important parts of your workflow through one application.

Technology stack:
- Frontend: Next.js + React + TypeScript
- Backend: Next.js server-side functionality
- Authentication: Google OAuth 2.0
- External integrations: Google APIs
- Database: None in current implementation. Task data is stored in browser local storage. PostgreSQL/SQLite was an unmade brainstorm decision.
- Development tools: Node.js, npm, Git, VS Code
Google Apps Script is not part of the current architecture.

## Current implementation summary

- Tasks can be created, edited, completed, deleted, searched, filtered, and viewed in the completed-work archive. Task records are local to the browser.
- The workload score combines each active dated task's weight with a due-date urgency multiplier. Undated tasks are unscored.
- Calendar displays local task due dates and, after Google sign-in, read-only events from the primary Google Calendar.
- Google Drive listing is metadata-only and bounded to 50 records. Google Docs and Sheets can be previewed read-only; the sheet preview reads A1:Z20 from the first sheet.
- The app requests Google identity, Drive metadata, Calendar read, Docs read, and Sheets read scopes. It does not request Gmail access.
- No application database, server-side task sync, Google file mutation, Docs/Sheets editing, or Calendar event writing is implemented.

## Future ideas from the initial concept

The following remain possible future scope and should not be presented as existing behavior: database-backed task sync, categories and project hierarchy, task-to-calendar synchronization, Drive create/rename/move/delete operations, Docs/Sheets creation or editing, Gmail, reminders, and progress tracking.

1. The five main modules
Module 1 — Authentication / Login

Purpose: Secure access to your personal workspace.

Main features:
- Sign in with Google.
- Sign out.
- Maintain an authenticated session.
- Protect private application pages.


Since this is a personal application, you don't need a complicated registration system with multiple user roles.

Google OAuth 2.0 will handle the authentication and authorization process.
Module 2 — Dashboard

Purpose: Your central overview of everything happening across your work and personal life.

Main features:
- Upcoming deadlines.
- Pending and completed tasks.
- Calendar overview.
- Recently accessed files.
- Quick access to Google services.
- Project progress overview.


This is the first page you see after logging in.

Think of it as your command center. You shouldn't have to open five different modules just to know what you need to accomplish today.
Module 3 — Task & Deadline Management (To-do)

Purpose: Manage your responsibilities, activities, and deadlines.

Main features:
- Create, edit, and delete tasks.
- Assign tasks to subjects or projects.
- Set deadlines and priorities.
- Track task status.
- Filter tasks by date, subject, and status.
- Connect deadlines to Google Calendar.


Example task organization:
Projects
 └── Project A
      ├── Research task
      └── Reading task
 └── Project B
      └── Website task


You could eventually expand this to support freelance and personal projects.
Module 4 — File Management

Purpose: Organize and manage your Google Drive files through your own interface.

Main features:
- Browse Drive files and folders.
- Create folders.
- Rename and move files.
- Delete files.
- Search and filter files.
- Organize files by category, project, and topic.
- Open documents directly in Google Docs or Sheets.


Proposed folder structure:
Workspace/
├── Category A/
│   ├── Project A/
│   │   ├── Notes/
│   │   ├── Tasks/
│   │   ├── Deliverables/
│   │   └── References/
│   ├── Project B/
│   └── ...
└── Category B/


An important design decision: your files remain in Google Drive. Your application manages them through the Drive API rather than storing duplicate copies.

You can also add quick actions to create Google Docs and Sheets inside the currently selected subject folder.

Module 5 — Google Workspace Integration (Sync)

Purpose: Connect your application with Google's ecosystem.

Main integrations:
- Google Drive API.
- Google Docs API.
- Google Sheets API.
- Google Calendar API.
- Gmail API.


This is the module that makes the whole project interesting.
Integration	What you'll implement
Drive	Browse and manage files
Docs	Create documents and open/edit them in Google Docs
Sheets	Create and access spreadsheets
Calendar	View and synchronize deadlines and events
Gmail	Eventually compose, send, search, and manage emails

One important clarification: these aren't necessarily five separate pages. They're integrations that support the other modules.

For example:
- File Management uses Drive.
- To-do uses Calendar.
- Dashboard displays information from multiple services.
- Docs and Sheets creation can be available from File Management.

Visual Identity:

You're navigating an ocean of academic responsibilities. I'm Syncing helps you stay afloat.

Design style: Calm, flowing, modern, slightly playful.
- Deep navy for structure and contrast.
- Ocean blue for primary interface elements.
- Muted teal for active and positive states.
- Pale blue backgrounds for breathing room.
- White or slightly tinted cards for content.
- Subtle gradients and wave shapes for personality.

The Helm — Dashboard

Your central control panel. Everything important is visible here.

Also magine a water-level indicator that rises as your workload increases.

Possible states:
Level	Status	Message
0–25%	Calm Waters	Smooth sailing!
26–50%	Rising Tide	Things are picking up.
51–75%	High Tide	Better start prioritizing.
76–100%	Taking on Water	Time to navigate those deadlines!

I'd call this the Sink Meter or the Water Level

The Tide — Tasks & Deadlines

Incoming responsibilities, approaching deadlines, and completed tasks.

"The tide waits for no one."

The Cargo Hold — File Management

Your organized collection of documents, folders, projects, and academic materials.

The Deep — Archives

Old semesters, completed projects, previous documents, and archived records.

"Everything eventually sinks into the archives."


The Signal — Google Integration

Connection status, synchronization, Google services, and account settings.

"Keeping everything connected."


My recommended UI principles
To prevent this from becoming cluttered, I'd follow five rules:
1. Information hierarchy: Deadlines and tasks first, secondary statistics afterward.
2. Progressive disclosure: Show summaries on the dashboard; show details inside individual modules.
3. Consistent colors: Use blue for the general interface, teal for positive actions, and warmer accent colors for warnings.
4. Subtle water effects: Use flowing gradients, curves, and wave motifs instead of constantly displaying ocean illustrations.
5. Personality through microcopy: Let the jokes appear in messages, empty states, tooltips, and module subtitles.

Note:
make it feel like a productivity application first and a nautical-themed application second.

The nautical theme is not the focus, it's the tasks.
