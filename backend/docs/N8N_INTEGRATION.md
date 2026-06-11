# n8n Integration — Event-Driven Notifications

## Architecture

```
Focus Session SUCCESS (sync event)
        ↓
focusRewardService.processSessionReward()
        ↓
┌───────────────────────────────────────┐
│ 1. Check ProcessedSessions (MongoDB)  │
│    sessionId unique index             │
└───────────────────────────────────────┘
        ↓ (new session only)
┌───────────────────────────────────────┐
│ 2. Award coins + streak               │
│ 3. Insert ProcessedSessions           │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│ 4. Axios POST → n8n webhook           │
│    { sessionId, studentId, coins,     │
│      streak }                         │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│ n8n Workflow                          │
│  • Check NotificationsSent            │
│  • If duplicate → stop                │
│  • Insert NotificationsSent           │
│  • Insert NotificationLog             │
└───────────────────────────────────────┘
```

## Folder Structure

```
backend/src/
├── integrations/n8n/
│   ├── n8nClient.ts           # Axios HTTP client
│   ├── focusSuccessWebhook.ts # Trigger workflow
│   └── types.ts
├── models/
│   ├── ProcessedSession.ts    # Reward idempotency
│   ├── NotificationsSent.ts   # Written by n8n
│   └── NotificationLog.ts     # Written by n8n
├── services/
│   ├── focusRewardService.ts  # Rewards + webhook trigger
│   └── notificationService.ts # Read notification logs
└── routes/
    └── notifications.ts       # GET /notifications/logs
```

## MongoDB Collections

### ProcessedSessions (backend)

```json
{
  "sessionId": "uuid",
  "studentId": "demo-student-1",
  "processedAt": "2026-06-11T12:00:00.000Z",
  "coinsAwarded": 50
}
```

Unique index on `sessionId`.

### NotificationsSent (n8n)

```json
{
  "sessionId": "uuid",
  "sentAt": "2026-06-11T12:00:00.000Z"
}
```

Unique index on `sessionId`. Written **only** by n8n.

### NotificationLogs (n8n)

```json
{
  "sessionId": "uuid",
  "studentId": "demo-student-1",
  "message": "🔥 Streak now 4 days, +50 coins",
  "createdAt": "2026-06-11T12:00:00.000Z"
}
```

## Exactly-Once Guarantees

### Rewards (coins, streak)

| Mechanism | Detail |
|-----------|--------|
| **Collection** | `ProcessedSessions` |
| **Key** | `sessionId` (unique index) |
| **Flow** | Before awarding, insert `ProcessedSessions`. Duplicate key (`E11000`) → skip all rewards |
| **Replay safe** | Same sync event replayed from Device A or B → second insert fails → no double coins |

### Notifications (n8n workflow)

| Mechanism | Detail |
|-----------|--------|
| **Collection** | `NotificationsSent` |
| **Key** | `sessionId` (unique index) |
| **Flow** | n8n finds existing `sessionId` → stops. New → insert + create log |
| **Webhook retry safe** | Backend axios retry sends same `sessionId` → n8n responds `duplicate` |
| **Multi-device safe** | Both devices sync same SUCCESS event → backend rewards once (ProcessedSessions), n8n notifies once (NotificationsSent) |

### Separation of concerns

- **Backend** owns reward idempotency (`ProcessedSessions`)
- **n8n** owns notification idempotency (`NotificationsSent`)
- Webhook failures do **not** roll back rewards (rewards already committed). Retrying webhook is safe.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/focus/complete` | Complete session → triggers reward flow |
| POST | `/sync` | Event sync → may trigger reward on SUCCESS events |
| GET | `/notifications/logs` | List `NotificationLogs` from MongoDB |
| POST | `/notifications/test-webhook` | Dev: test idempotent reward + webhook |

## Environment Variables

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/focus-success
N8N_WEBHOOK_TIMEOUT_MS=10000
```

## Test

```bash
# 1. Complete a focus session via sync or API
curl -X POST http://localhost:3001/focus/complete \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-session-1","studentId":"demo-student-1","targetMinutes":25}'

# 2. Replay (should not double-reward)
curl -X POST http://localhost:3001/notifications/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-session-1","studentId":"demo-student-1"}'

# 3. View notification logs (after n8n workflow runs)
curl http://localhost:3001/notifications/logs
```

See [n8n/SETUP.md](../../n8n/SETUP.md) for workflow import and MongoDB credential setup.
