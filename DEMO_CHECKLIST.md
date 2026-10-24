# Alcovia demo and verification checklist

Run the frontend and backend using the root README instructions, configure MongoDB, and import n8n/focus-success-workflow.json into n8n.

## Two-client setup

1. Open two isolated browser sessions (for example, a normal window and an incognito window).
2. In each session, choose a different device label in the developer panel. Confirm the clients use separate local state.
3. Toggle both clients offline before making edits. Verify local changes remain visible after a reload.

## Required scenarios

- **Offline focus on both devices:** complete one successful focus session on each client, reconnect, sync repeatedly, and verify one reward per unique successful session.
- **Give up / app switch:** fail a running session and verify it earns no reward and records the correct failure reason.
- **Conflicting task edits:** set the same task to DONE on A and IN_PROGRESS on B while offline; reconnect in both orders and compare the final status.
- **Delete versus edit:** delete a task on one device and edit it on the other; verify the tombstone prevents resurrection.
- **Replay:** sync the same event IDs twice and verify there are no duplicate event, reward, or notification records.
- **Out-of-order delivery:** deliver a later task event before an earlier one and compare both clients after another sync.
- **n8n idempotency:** inspect n8n executions and notificationssents. Replay a successful session and check whether a second notification record appears.

## Suggested five-minute video

1. 0:00–0:40 — Show the architecture and two isolated clients.
2. 0:40–1:40 — Take both clients offline and complete a focus session on each.
3. 1:40–2:30 — Make conflicting edits to the same task.
4. 2:30–3:30 — Reconnect and sync; compare task status, streak, coins, and today's minutes.
5. 3:30–4:20 — Replay sync and inspect reward / notification records.
6. 4:20–5:00 — Explain event IDs, version vectors, tombstones, and one known limitation.

Do not claim a scenario passes until it has been run against the current code and the result has been observed.
