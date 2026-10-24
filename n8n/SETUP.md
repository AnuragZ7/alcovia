# n8n Setup — Alcovia Focus Success Notifications

## Overview

When the backend confirms a successful focus session, it POSTs to n8n. The workflow deduplicates via `NotificationsSent` and writes a `NotificationLog`.

## Prerequisites

- n8n running locally (`npx n8n` or Docker)
- MongoDB running (same database as backend: `study-app`)
- Backend running with `N8N_WEBHOOK_URL` set

## Step 1 — Start n8n

```bash
npx n8n
```

Open http://localhost:5678

## Step 2 — Create MongoDB Credential

1. Go to **Credentials** → **Add credential** → **MongoDB**
2. Name: `Alcovia MongoDB`
3. Connection string: `mongodb://127.0.0.1:27017/study-app` (same as backend)
4. Save

## Step 3 — Import Workflow

1. **Workflows** → **Import from File**
2. Select `n8n/focus-success-workflow.json`
3. Open each **MongoDB** node → select the `Alcovia MongoDB` credential
4. **Activate** the workflow

Webhook URL: `http://localhost:5678/webhook/focus-success`

## Step 4 — Configure Backend

`backend/.env`:

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/focus-success
N8N_WEBHOOK_TIMEOUT_MS=10000
```

## Workflow Steps

```
Webhook (POST /webhook/focus-success)
    ↓
Normalize Payload { sessionId, studentId, coins, streak }
    ↓
Validate sessionId present
    ↓
MongoDB FIND notificationssents WHERE sessionId = ?
    ↓
Dedup Decision (Code)
    ↓
sessionId exists?
    YES → Respond { notified: false, reason: "duplicate" }
    NO  → Insert NotificationsSent
        → Insert NotificationLog ("🔥 Streak now N days, +50 coins")
        → Respond { notified: true }
```

## Webhook Payload

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "studentId": "demo-student-1",
  "coins": 50,
  "streak": 4
}
```

## Test Manually

```bash
curl -X POST http://localhost:5678/webhook/focus-success \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"manual-test-1","studentId":"demo-student-1","coins":50,"streak":4}'
```

First call → `{ "ok": true, "notified": true }`  
Second call (same sessionId) → `{ "ok": true, "notified": false, "reason": "duplicate" }`

Verify in MongoDB:

```bash
mongosh mongodb://127.0.0.1:27017/study-app

db.notificationssents.find()
db.notificationlogs.find()
```

Or via API:

```bash
curl http://localhost:3001/notifications/logs
```

## Exactly-Once Summary

| Layer | Collection | Who writes | Prevents |
|-------|------------|------------|----------|
| Backend | `processedsessions` | Express | Double coins/streak |
| n8n | `notificationssents` | n8n workflow | Double notifications |
| n8n | `notificationlogs` | n8n workflow | Audit trail |


## Durable backend outbox and MongoDB indexes

The backend now queues focus-success notifications in the `notificationoutbox` collection. A worker drains pending jobs every five seconds and retries failures with exponential backoff. If the process crashes during delivery, a stale `SENDING` job is returned to `PENDING`. Delivery is at-least-once; the workflow must deduplicate by sessionId.

Create/verify the unique index used by the n8n dedupe workflow:

```javascript
use study-app
db.notificationssents.createIndex({ sessionId: 1 }, { unique: true })
db.notificationoutbox.createIndex({ sessionId: 1 }, { unique: true })
```

If `notificationssents` already contains duplicate session IDs, clean those duplicates before creating the unique index. The unique index is necessary because a check-then-insert workflow alone is not safe under concurrent webhook executions.
