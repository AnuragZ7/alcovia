import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/study-app',
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/focus-success',
  n8nWebhookTimeoutMs: parseInt(process.env.N8N_WEBHOOK_TIMEOUT_MS || '10000', 10),
  defaultStudentId: process.env.STUDENT_ID || 'demo-student-1',
};
