import { Router, Request, Response, NextFunction } from 'express';
import {
  startFocusSession,
  updateSessionStatus,
  getStudentState,
} from '../services/focusService';
import { env } from '../config/env';

const router = Router();

router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, studentId, targetMinutes } = req.body;
    const session = await startFocusSession(
      sessionId,
      studentId || env.defaultStudentId,
      targetMinutes || 25
    );
    res.json(session);
  } catch (error) {
    next(error);
  }
});

router.post('/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, studentId, targetMinutes } = req.body;
    const session = await updateSessionStatus(
      sessionId,
      studentId || env.defaultStudentId,
      'SUCCESS',
      targetMinutes
    );
    const state = await getStudentState(studentId || env.defaultStudentId);
    res.json({ session, studentState: state });
  } catch (error) {
    next(error);
  }
});

router.post('/fail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, studentId, targetMinutes } = req.body;
    const session = await updateSessionStatus(
      sessionId,
      studentId || env.defaultStudentId,
      'FAILED',
      targetMinutes
    );
    res.json(session);
  } catch (error) {
    next(error);
  }
});

export default router;
