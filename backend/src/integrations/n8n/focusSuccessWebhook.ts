import { postFocusSuccessWebhook } from './n8nClient';
import { FocusSuccessWebhookPayload } from './types';

export async function triggerFocusSuccessWorkflow(payload: FocusSuccessWebhookPayload): Promise<void> {
  const result = await postFocusSuccessWebhook(payload);
  if (result.notified === false && result.reason === 'duplicate') {
    console.info(`[n8n] Notification already sent for session ${payload.sessionId}`);
    return;
  }
  if (result.ok) {
    console.info(`[n8n] Workflow completed for session ${payload.sessionId}`);
    return;
  }
  // Throw so the outbox keeps this item pending and retries it. A missing
  // webhook URL or unexpected response must never be marked as SENT.
  throw new Error(`n8n did not confirm notification delivery for session ${payload.sessionId}: ${result.reason ?? 'unexpected response'}`);
}
