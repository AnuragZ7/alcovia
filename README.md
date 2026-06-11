# Alcovia — Offline-First Web Application

A production-quality offline-first learning app demonstrating event-based sync between two devices (browser windows), focus sessions with idempotent rewards, syllabus progress tracking, and n8n notifications.

## Architecture

```
┌─────────────┐     events      ┌─────────────┐     webhook    ┌─────┐
│  Device A   │ ──────────────► │   Express   │ ─────────────► │ n8n │
│  (React+IDB)│ ◄────────────── │   + MongoDB │                └─────┘
└─────────────┘     events      └─────────────┘
┌─────────────┐       ▲
│  Device B   │ ──────┘
│  (React+IDB)│
└─────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, IndexedDB (via `idb`) |
| Backend | Express.js, TypeScript, MongoDB (Mongoose) |
| Automation | n8n webhooks |

## Project Structure

```
app/
├── backend/          # Express API + MongoDB
├── frontend/         # React SPA (offline-first)
├── n8n/              # Workflow JSON + setup guide
└── README.md
```

## Documentation

- **[DATABASE.md](DATABASE.md)** — How to connect MongoDB & IndexedDB, data flow, sync, and troubleshooting
- **[backend/docs/N8N_INTEGRATION.md](backend/docs/N8N_INTEGRATION.md)** — n8n webhook flow, idempotency, and API reference
- **[n8n/SETUP.md](n8n/SETUP.md)** — Import workflow and connect MongoDB credentials

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Community Server installed locally (Windows service on port `27017`)

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API: http://localhost:3001

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### 3. n8n (optional)

See [n8n/SETUP.md](n8n/SETUP.md)

## Two-Device Demo

1. Open http://localhost:5173 in **Browser Window A**
2. Open http://localhost:5173 in **Browser Window B**
3. In Window A → Dev Panel → select **Device A**
4. In Window B → Dev Panel → select **Device B**
5. Toggle **OFFLINE** on both windows
6. Make changes independently (tasks, focus sessions)
7. Toggle **ONLINE** and click **Trigger Sync** on each device
8. Both devices converge to identical state

Each device uses a separate IndexedDB (`study-app-device-a` / `study-app-device-b`) via `sessionStorage`.

## Features

### Focus Sessions
- Start / Complete / Fail sessions offline
- SUCCESS → 50 coins, streak++, focus minutes (exactly once via `ProcessedSessions`)
- FAILED → no reward

### Syllabus Progress
- Subjects → Chapters → Tasks
- Task statuses: `NOT_STARTED` | `IN_PROGRESS` | `DONE`
- Chapter % and Subject % computed from completed tasks

### Event-Based Sync
- Every action creates an event in local EventLog
- `POST /sync` exchanges unsynced events
- Server deduplicates by `eventId`, applies merge logic, returns missing events

### Conflict Resolution
| Case | Resolution |
|------|------------|
| DONE vs IN_PROGRESS | DONE wins |
| Edit vs Delete | Delete wins |
| Duplicate eventId | Ignored |
| Older version vector | Ignored |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sync` | Event-based sync |
| POST | `/focus/start` | Start focus session |
| POST | `/focus/complete` | Complete session |
| POST | `/focus/fail` | Fail session |
| GET | `/tasks` | Get tasks grouped by subject |
| PATCH | `/tasks/:id/status` | Update task status |
| POST | `/admin/reset` | Reset and reseed data |

## UI Pages

- **Dashboard** — coins, streak, focus minutes, progress overview
- **Focus Sessions** — start/complete/fail sessions
- **Subjects** — syllabus progress by chapter
- **Tasks** — update task statuses
- **Dev Panel** — device selector, online/offline toggle, sync, conflict generator, logs
