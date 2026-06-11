import axios, { AxiosError, AxiosInstance } from 'axios';
import { env } from '../../config/env';
import { FocusSuccessWebhookPayload, N8nWebhookResponse } from './types';

let client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      timeout: env.n8nWebhookTimeoutMs,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return client;
}

export async function postFocusSuccessWebhook(
  payload: FocusSuccessWebhookPayload
): Promise<N8nWebhookResponse> {
  if (!env.n8nWebhookUrl) {
    console.warn('[n8n] N8N_WEBHOOK_URL not configured — skipping webhook');
    return { ok: false, reason: 'webhook_not_configured' };
  }

  try {
    const response = await getClient().post<N8nWebhookResponse>(
      env.n8nWebhookUrl,
      payload
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const body = axiosError.response?.data;
    console.error('[n8n] Webhook failed', { status, body, sessionId: payload.sessionId });
    throw new Error(
      `n8n webhook failed${status ? ` (${status})` : ''}: ${axiosError.message}`
    );
  }
}
