import { postFocusSuccessWebhook } from './n8nClient';
import { FocusSuccessWebhookPayload } from './types';

/**
 * Fires the n8n focus-success webhook.
 * Idempotency is enforced inside the n8n workflow via NotificationsSent.
 * Safe to retry — duplicate sessionIds are ignored by n8n.
 */
export async function triggerFocusSuccessWorkflow(
  payload: FocusSuccessWebhookPayload
): Promise<void> {
  const result = await postFocusSuccessWebhook(payload);

  if (result.notified === false && result.reason === 'duplicate') {
    console.info(`[n8n] Notification already sent for session ${payload.sessionId}`);
    return;
  }

  if (result.ok) {
    console.info(`[n8n] Workflow completed for session ${payload.sessionId}`);
    return;
  }

  console.warn(`[n8n] Unexpected workflow response for ${payload.sessionId}`, result);
}
