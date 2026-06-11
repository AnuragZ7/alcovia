import { Router, Request, Response, NextFunction } from 'express';
import { getNotificationLogs, getNotificationsSentCount } from '../services/notificationService';
import { processSessionReward } from '../services/focusRewardService';
import { env } from '../config/env';

const router = Router();

/**
 * GET /notifications/logs
 * Returns notification logs written by the n8n workflow.
 */
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
    const [logs, sentCount] = await Promise.all([
      getNotificationLogs(limit),
      getNotificationsSentCount(),
    ]);
    res.json({ logs, sentCount });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /notifications/test-webhook
 * Dev-only: manually trigger reward + n8n for a session (uses same idempotent path).
 */
router.post('/test-webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, studentId, targetMinutes } = req.body as {
      sessionId?: string;
      studentId?: string;
      targetMinutes?: number;
    };

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    const result = await processSessionReward(
      sessionId,
      studentId || env.defaultStudentId,
      targetMinutes ?? 25
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
