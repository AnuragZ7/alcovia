export interface FocusSuccessWebhookPayload {
  sessionId: string;
  studentId: string;
  coins: number;
  streak: number;
}

export interface N8nWebhookResponse {
  ok: boolean;
  notified?: boolean;
  reason?: string;
  sessionId?: string;
  message?: string;
}
