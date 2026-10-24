# Alcovia — Engineering Decisions

## Scope and stack

This repository is an offline-first study-tracking demo built with React, TypeScript, Vite, IndexedDB (`idb`), Express, MongoDB/Mongoose, and n8n. The web client is used to make two-client testing easy. Separate browser sessions can use separate IndexedDB databases (device A and device B).

## Data and sync model

- Local actions are persisted as events with a UUID eventId, deviceId, entityId, payload, and per-device version vector.
- The client sends unsynced events and the event IDs it already knows to POST /api/sync.
- The backend stores events in EventStore and applies newly stored events to domain models. Clients receive server events whose IDs are not in their known-event set.
- EventStore has a unique eventId index. Insertion now treats duplicate-key errors as already-stored events, avoiding a concurrent find-then-insert race.
- Local events are marked synced after the sync HTTP request succeeds.

## Task conflict policy

Task edits carry version vectors instead of relying only on device wall-clock timestamps. A causally newer version can replace the current status. For concurrent versions, the implementation uses a deterministic status priority (DONE > IN_PROGRESS > NOT_STARTED). Deleted tasks use tombstones (deleted=true) so late status updates do not resurrect them.

This policy is a deliberate simple demo tradeoff: it prioritizes progress over preserving the latest user intent. A production application should retain conflict metadata and expose genuinely concurrent edits to the user.

## Focus rewards and notification idempotency

- A focus attempt has a stable sessionId shared by its start/completion/failure events.
- ProcessedSession has a unique sessionId index intended to prevent duplicate rewards for one session.
- The n8n workflow uses sessionId as a notification idempotency key and writes to notificationssents. That collection must have a unique index on sessionId for concurrency-safe deduplication.
- The backend calls the webhook after applying the reward. A failed webhook is logged, but a durable retry/outbox is not yet implemented.

## Known limitations — do not present these as solved

1. The server sorts incoming events by createdAt, which is supplied by device clocks.
2. Task conflict behavior still needs automated permutation tests for causal updates, concurrent updates, delete-vs-edit, and out-of-order delivery.
3. Reward totals/streaks use read-modify-save rather than a transaction; a crash after claiming a ProcessedSession but before updating StudentState can leave a reward unapplied.
4. Reward dates are calculated using the server's UTC date.
5. The n8n check-then-insert flow needs a unique database index and can still have a race if concurrent workflow executions both pass the check.
6. The client and server must be tested together for every required scenario before claiming full convergence or exactly-once notification delivery.

## Next production improvements

Use a transactional reward ledger, a durable notification outbox with retry/backoff, server-side event validation, authenticated student/device identity, and property-based tests that replay the same event set in different orders. Replace full known-event ID exchange with cursor/delta sync as event history grows.
