# Alcovia — Offline-First Learning Application

An offline-first study-tracking demo with focus sessions, rewards, syllabus progress, multi-client event synchronization, and n8n notification automation.

**Project maintainer:** Anurag Kumar ([AnuragZ7](https://github.com/AnuragZ7))

## Architecture

Device A (React + IndexedDB) <--> Express + MongoDB <--> n8n  
Device B (React + IndexedDB) <--> Express + MongoDB

## Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, IndexedDB via idb |
| Backend | Express, TypeScript, MongoDB, Mongoose |
| Automation | n8n webhook workflow |
| CI | GitHub Actions: backend build/tests and frontend build |

## Features

- Focus sessions from 25–120 minutes, with success rewards and explicit give-up/app-switch failure reasons.
- Subject, chapter, and task progress tracking.
- Offline local writes and per-device IndexedDB storage.
- Event sync with stable IDs, version vectors, duplicate event handling, and deterministic status conflict priority.
- Atomic per-session reward ledger in StudentState to prevent double rewards on replay.
- Durable notification outbox with retries, backoff, and stale-job recovery.
- n8n notification workflow with sessionId deduplication.
- Developer panel for simulated device connectivity, state inspection, and logs.

## Run locally

Prerequisites: Node.js 22 recommended and MongoDB.

### Backend

    cd backend
    cp .env.example .env
    npm ci
    npm run dev

Configure MONGODB_URI and N8N_WEBHOOK_URL in backend/.env. Never commit secrets.

### Frontend

In another terminal:

    cd frontend
    npm ci
    npm run dev

Open the Vite URL in two isolated browser sessions and select different device labels in the developer panel.

### n8n

1. Start n8n and import n8n/focus-success-workflow.json.
2. Configure the MongoDB credential to use the same database as the backend.
3. Activate the workflow and set N8N_WEBHOOK_URL in backend/.env to the production webhook URL.
4. Create/verify a unique index on notificationssents.sessionId; see n8n/SETUP.md.

## Automated checks

    cd backend
    npm test
    npm run build

    cd ../frontend
    npm run build

GitHub Actions runs these checks on pushes and pull requests to main.

## Verification

Use DEMO_CHECKLIST.md for the two-client offline demo. Test duplicate sync, conflicting task edits, delete/edit races, focus failures, notification retries, and replay after a restart before claiming those scenarios pass.

## Limitations

This is not yet a production-grade sync engine. Notification delivery is at-least-once with receiver-side deduplication; delete-before-create needs stronger tombstone persistence; and full event-order convergence requires more end-to-end tests. See DECISIONS.md.
