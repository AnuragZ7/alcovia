import { NotificationOutbox } from '../models/NotificationOutbox';
import { triggerFocusSuccessWorkflow } from '../integrations/n8n/focusSuccessWebhook';

let workerRunning = false;

/** Enqueue once per successful session. Unique sessionId is the idempotency key. */
export async function enqueueFocusSuccessNotification(input: {
  sessionId: string;
  studentId: string;
  coins: number;
  streak: number;
}): Promise<void> {
  const payload = {
    sessionId: input.sessionId,
    studentId: input.studentId,
    coins: input.coins,
    streak: input.streak,
  };
  await NotificationOutbox.updateOne(
    { sessionId: input.sessionId },
    {
      $setOnInsert: {
        sessionId: input.sessionId,
        studentId: input.studentId,
        payload,
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: new Date(),
      },
      $set: { payload, studentId: input.studentId },
    },
    { upsert: true }
  );
}

/**
 * At-least-once delivery with bounded exponential backoff. The receiving n8n
 * workflow must deduplicate by sessionId because a process can crash after
 * n8n accepts a request but before this worker records SENT.
 */
export async function processNotificationOutboxBatch(): Promise<number> {
  if (workerRunning) return 0;
  workerRunning = true;
  let sent = 0;
  try {
    const due = await NotificationOutbox.find({
      status: { $ne: 'SENT' },
      nextAttemptAt: { $lte: new Date() },
    }).sort({ createdAt: 1 }).limit(20);

    for (const item of due) {
      const claim = await NotificationOutbox.findOneAndUpdate(
        { _id: item._id, status: { $ne: 'SENT' }, nextAttemptAt: { $lte: new Date() } },
        { $set: { status: 'SENDING' }, $inc: { attempts: 1 } },
        { new: true }
      );
      if (!claim) continue;

      try {
        await triggerFocusSuccessWorkflow(claim.payload);
        await NotificationOutbox.updateOne(
          { _id: claim._id, status: 'SENDING' },
          { $set: { status: 'SENT', sentAt: new Date(), lastError: null } }
        );
        sent += 1;
      } catch (error) {
        const attempts = claim.attempts;
        const delayMs = Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 12));
        await NotificationOutbox.updateOne(
          { _id: claim._id, status: 'SENDING' },
          {
            $set: {
              status: 'PENDING',
              nextAttemptAt: new Date(Date.now() + delayMs),
              lastError: error instanceof Error ? error.message : String(error),
            },
          }
        );
      }
    }
  } finally {
    workerRunning = false;
  }
  return sent;
}
