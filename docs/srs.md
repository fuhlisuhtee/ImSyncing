# Software Requirements Specification (Simple)

## 1. Introduction

### 1.1 Purpose

This SRS states the current requirements for I'm Syncing!, a personal task and Google Workspace overview. It is intentionally brief and reflects the implementation in the repository, not every idea in `project_details`.

### 1.2 Product scope

The product is a browser-based workspace with task management, workload summaries, a calendar view, and optional read-only access to Google Drive, Calendar, Docs, and Sheets. Task information is stored in browser local storage.

### 1.3 Definitions

- **Task:** A locally stored responsibility with a title, optional subject/date, effort, weight, and completion state.
- **Google-connected:** The user has an authenticated Auth.js session with Google.
- **Read-only integration:** Google data can be retrieved and displayed, but this app does not change the source data.

## 2. Overall description

### 2.1 Product perspective

The product runs as a Next.js web application. The client presents the interface and manages local task state. Next.js route handlers perform OAuth handling and server-side requests to Google APIs. No app database is currently configured.

### 2.2 User characteristics

The intended user is an individual who can use a modern web browser. Google integration requires a Google account and authorization; basic task use does not.

### 2.3 Constraints

- Tasks and the sidebar preference are specific to browser local storage.
- Google APIs and OAuth credentials must be configured for integrations.
- Requested Google data access is read-only; Gmail is not connected.
- Access to the internet is required for Google sign-in and Google data retrieval.

## 3. Specific requirements

### 3.1 Functional requirements

1. The system shall show Overview, Tasks, Calendar, Drive files, completed tasks, and Google connection views.
2. The system shall allow users to add, edit, complete/uncomplete, delete, filter, and search tasks.
3. The system shall save tasks in local storage and restore them when the app is reopened in the same browser profile and origin.
4. The system shall calculate a workload score using the weight and due-date urgency of active, dated tasks; completed and undated tasks shall not contribute.
5. The system shall allow optional Google sign-in and sign-out.
6. When connected, the system shall list Drive metadata, display primary-calendar events for the viewed month, and preview Docs text and a bounded portion of Sheets data.
7. The system shall show mock Drive sample data when disconnected and identify it as mock content.
8. The system shall display loading and error information when Google requests are pending or fail.

### 3.2 External interface requirements

- **User interface:** Responsive browser interface with workspace navigation, forms, task lists, calendar, file list, preview area, and connection status.
- **Software interface:** Auth.js with Google OAuth; Google Drive API, Calendar API, Docs API, and Sheets API.
- **API interface:** Next.js route handlers under `/api/auth` and `/api/google` mediate authentication and Google reads.

### 3.3 Non-functional requirements

- Google tokens shall be used for upstream requests on the server and shall not be exposed as raw client-side values.
- The interface shall remain usable for task management when Google is not configured or connected.
- Local task updates shall be persisted in the current browser without requiring a server database.
- External service failures shall be communicated in the interface.

## 4. Exclusions

The current release does not provide multi-device task synchronization, database persistence, Gmail, Google file editing or management, Calendar writes, reminders, or multi-user access control. These are possible future ideas only.

## 5. Verification overview

Requirements can be checked by using the browser interface: manage tasks and reload to confirm local persistence; inspect workload behavior for dated/undated and completed tasks; use Google sign-in to view the configured read-only data; and confirm disconnected sample rows are labeled as mock data. This document does not claim that those checks were run during its preparation.
