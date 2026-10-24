# Alcovia — Engineering Decisions

## Scope and stack

This is an offline-first study-tracking demo built with React, TypeScript, Vite, IndexedDB, Express, MongoDB/Mongoose, and n8n. Separate browser sessions can use separate local IndexedDB databases to simulate devices A and B.

## Event sync

- Client actions are persisted locally as events with a UUID eventId and per-device version vector.
- The server stores events with a unique eventId index.
- The server re-applies stored event payloads idempotently during sync. This is intentional recovery behavior: an earlier process could have stored an event but crashed before applying its domain changes.
- Clients receive server events whose IDs are not in their known-event set.

## Task conflict policy

Task updates use version vectors instead of wall-clock last-write-wins. A causally newer version wins. Concurrent status changes use deterministic priority: DONE > IN_PROGRESS > NOT_STARTED. The version vectors are merged after the decision so replaying the other concurrent event does not reverse the winner. Deleted tasks already present on a client use tombstones to prevent local resurrection.

**Limit:** This is not a complete CRDT. Delete-before-create on a client and all multi-event permutations still require additional coverage. The priority rule favors progress over the user's most recent intent.

## Rewards

StudentState now records appliedRewardSessions alongside the reward counters. A conditional atomic update increments coins/focus minutes and records the session ID in the same database write. A replay sees the ledger entry and cannot award that session twice. ProcessedSession is an audit marker; the StudentState per-session ledger is the idempotency source of truth.

The current streak calculation uses UTC calendar dates. The session ledger grows with the number of successful sessions and should eventually be normalized into a separate reward ledger collection.

## Notification delivery

A durable NotificationOutbox row is created once per successful session. A background worker retries failed deliveries with exponential backoff and recovers stale SENDING jobs after a restart. n8n is expected to deduplicate by sessionId. Delivery is **at least once**, not mathematically exactly once end-to-end: if n8n accepts a request and the backend crashes before recording SENT, the request may be delivered again. Receiver-side idempotency and a unique MongoDB index on notificationssents.sessionId are required.

## Focus-session rules

The frontend allows target durations from 25 to 120 minutes. The API validates the same range and rejects completion before the server's recorded start time plus the target duration. Give-up and app-switch failures record a reason. A browser visibility timer fails the session when it remains hidden for more than five seconds; browser throttling/termination means this should be manually verified in the target browsers.

## Tests and CI

GitHub Actions runs backend TypeScript compilation, focused version-vector unit tests, and the frontend production build. These automated checks do not replace end-to-end tests against MongoDB and n8n.

## Remaining risks

1. Event application and EventStore persistence are not in a single transaction, so the sync path relies on safe replay.
2. Task delete-before-create convergence needs a server tombstone registry and local tombstone persistence.
3. Reward calculation is atomic per student state document but does not use a transaction spanning StudentState, ProcessedSession, and NotificationOutbox.
4. The n8n workflow's check-then-insert requires a unique sessionId index; without it concurrent executions may duplicate notifications.
5. The app is a take-home demonstration, not a production sync engine. Do not claim untested scenarios as passing.
