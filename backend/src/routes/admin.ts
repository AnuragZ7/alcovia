import { Router, Request, Response, NextFunction } from 'express';
import { EventStore } from '../models/EventStore';
import { FocusSession } from '../models/FocusSession';
import { Task } from '../models/Task';
import { ProcessedSession } from '../models/ProcessedSession';
import { NotificationsSent } from '../models/NotificationsSent';
import { NotificationLog } from '../models/NotificationLog';
import { StudentState } from '../models/StudentState';
import { env } from '../config/env';
import { seedDatabase } from '../scripts/seed';

const router = Router();

router.post('/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req.body.studentId as string) || env.defaultStudentId;
    await EventStore.deleteMany({ studentId });
    await FocusSession.deleteMany({ studentId });
    await Task.deleteMany({ studentId });
    await ProcessedSession.deleteMany({ studentId });
    await NotificationsSent.deleteMany({});
    await NotificationLog.deleteMany({});
    await StudentState.deleteMany({ studentId });
    await seedDatabase(studentId);
    res.json({ ok: true, message: 'Data reset and reseeded' });
  } catch (error) {
    next(error);
  }
});

export default router;
