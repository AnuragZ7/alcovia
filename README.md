# Alcovia — Offline-First Learning Application

A learning app demonstrating offline-first study tracking, focus sessions, rewards, syllabus progress, and event-based synchronization between devices.

**Project maintainer:** Anurag Kumar ([AnuragZ7](https://github.com/AnuragZ7))

## Architecture

```
Device A (React + IndexedDB) <--> Express + MongoDB <--> n8n
Device B (React + IndexedDB) <--> Express + MongoDB
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, IndexedDB via `idb` |
| Backend | Express.js, TypeScript, MongoDB, Mongoose |
| Automation | n8n webhooks |

## Features

- **Focus sessions:** Start, complete, or fail sessions; successful sessions award coins and update streaks and focus time.
- **Syllabus tracking:** Organize subjects, chapters, and tasks; track completion status and progress.
- **Offline-first operation:** Store changes locally while offline.
- **Event-based synchronization:** Exchange unsynced events when devices reconnect.
- **Conflict handling:** Resolve duplicate events and competing updates.
- **Developer panel:** Simulate two devices, toggle connectivity, trigger synchronization, and inspect logs.
- **Notifications:** Integrate n8n workflows through webhooks.

## Project Structure

- `backend/` — Express API, MongoDB models, routes, and services
- `frontend/` — React application, IndexedDB storage, and synchronization services
- `n8n/` — Workflow JSON and setup instructions

## Run Locally

Prerequisites: Node.js 18+ and MongoDB.

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Documentation

- [n8n integration](backend/docs/N8N_INTEGRATION.md)
- [n8n setup](n8n/SETUP.md)
