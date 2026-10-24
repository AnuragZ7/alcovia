# Alcovia — Offline-First Learning Application

A learning app demonstrating offline-first study tracking, focus sessions, rewards, syllabus progress, and event-based synchronization between devices.

**Project maintainer:** Anurag Kumar ([AnuragZ7](https://github.com/AnuragZ7))

## Architecture

Device A (React + IndexedDB) <--> Express + MongoDB <--> n8n  
Device B (React + IndexedDB) <--> Express + MongoDB

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, IndexedDB via idb |
| Backend | Express.js, TypeScript, MongoDB, Mongoose |
| Automation | n8n webhook workflow |

## Features

- Focus sessions: start, complete, or fail sessions; successful sessions award coins and update streak and focus time.
- Syllabus tracking: subjects, chapters, tasks, and completion progress.
- Offline-first local writes using per-device IndexedDB databases.
- Event-based synchronization and event-ID deduplication.
- Version-vector-based task conflict handling and deletion tombstones.
- Developer panel for two-client connectivity toggles, state inspection, and logs.
- Exported n8n workflow for focus-success notifications.

## Project structure

- backend/ — Express API, MongoDB models, routes, and services
- frontend/ — React web client, IndexedDB storage, and synchronization services
- n8n/ — exported workflow and setup instructions
- DECISIONS.md — data model, merge strategy, idempotency, and known limitations
- DEMO_CHECKLIST.md — manual end-to-end verification and video checklist

## Run locally

Prerequisites: Node.js 18+ and a running MongoDB instance.

### 1. Backend

    cd backend
    cp .env.example .env
    npm install
    npm run dev

Set the MongoDB connection string and optional n8n webhook URL in backend/.env. Do not commit secrets.

### 2. Frontend

In a second terminal:

    cd frontend
    npm install
    npm run dev

Open the Vite URL. Use two isolated browser sessions and choose different device labels in the developer panel to test independent local stores.

### 3. n8n

1. Start or open an n8n instance.
2. Import n8n/focus-success-workflow.json.
3. Configure the MongoDB credential referenced by the workflow.
4. Set N8N_WEBHOOK_URL in the backend to the workflow's production webhook URL.
5. Activate the workflow and verify the URL matches the backend configuration.

The workflow uses sessionId for deduplication. For concurrency-safe behavior, ensure the notificationssents collection has a unique index on sessionId. See n8n/SETUP.md.

## Verification

Use DEMO_CHECKLIST.md to test offline sessions on both devices, conflicting task edits, deletion versus edit, duplicate sync, and n8n notification deduplication.

## Known limitations

This is a take-home demonstration, not a production-grade sync engine. Server-side reward updates are not transactional, notification delivery does not yet use a durable outbox, and all event-order permutations need automated convergence tests. Read DECISIONS.md before describing guarantees in an interview.
