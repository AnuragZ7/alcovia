import { NotificationOutbox } from '../models/NotificationOutbox';
import { triggerFocusSuccessWorkflow } from '../integrations/n8n/focusSuccessWebhook';

let workerRunning = false;
const STALE_SENDING_MS = 2 * 60 * 1000;

export async function enqueueFocusSuccessNotification(input: {
  sessionId: string; studentId: string; coins: number; streak: number;
}): Promise<void> {
  const payload = { sessionId: input.sessionId, studentId: input.studentId, coins: input.coins, streak: input.streak };
  await NotificationOutbox.updateOne(
    { sessionId: input.sessionId },
    { $setOnInsert: {
      sessionId: input.sessionId, studentId: input.studentId, payload,
      status: 'PENDING', attempts: 0, nextAttemptAt: new Date(),
    } },
    { upsert: true }
  );
}

/** At-least-once delivery; n8n must deduplicate by sessionId. */
export async function processNotificationOutboxBatch(): Promise<number> {
  if (workerRunning) return 0;
  workerRunning = true;
  let sent = 0;
  try {
    // Recover jobs abandoned by a crashed worker. Duplicate delivery is safe
    // only because the receiver has its own sessionId idempotency key.
    const staleBefore = new Date(Date.now() - STALE_SENDING_MS);
    await NotificationOutbox.updateMany(
      { status: 'SENDING', updatedAt: { $lte: staleBefore } },
      { $set: { status: 'PENDING', nextAttemptAt: new Date() } }
    );

    const due = await NotificationOutbox.find({
      status: 'PENDING', nextAttemptAt: { $lte: new Date() },
    }).sort({ createdAt: 1 }).limit(20);

    for (const item of due) {
      const claim = await NotificationOutbox.findOneAndUpdate(
        { _id: item._id, status: 'PENDING', nextAttemptAt: { $lte: new Date() } },
        { $set: { status: 'SENDING' }, $inc: { attempts: 1 } },
        { new: true }
      );
      if (!claim) continue;
      try {
        await triggerFocusSuccessWorkflow(claim.payload);
        await NotificationOutbox.updateOne(
          { _id: claim._id, status: 'SENDING' },
          { $set: { status: 'SENT', sentAt: new Date() }, $unset: { lastError: 1 } }
        );
        sent += 1;
      } catch (error) {
        const delayMs = Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(claim.attempts, 12));
        await NotificationOutbox.updateOne(
          { _id: claim._id, status: 'SENDING' },
          { $set: {
            status: 'PENDING',
            nextAttemptAt: new Date(Date.now() + delayMs),
            lastError: error instanceof Error ? error.message : String(error),
          } }
        );
      }
    }
  } finally {
    workerRunning = false;
  }
  return sent;
}
