import { Router, Request, Response, NextFunction } from 'express';
import { startFocusSession, updateSessionStatus, getStudentState } from '../services/focusService';
import { env } from '../config/env';

const router = Router();

router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, studentId, targetMinutes } = req.body;
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      res.status(400).json({ error: 'sessionId is required' }); return;
    }
    const minutes = Number(targetMinutes);
    if (!Number.isInteger(minutes) || minutes < 25 || minutes > 120) {
      res.status(400).json({ error: 'targetMinutes must be an integer between 25 and 120' }); return;
    }
    const session = await startFocusSession(sessionId, studentId || env.defaultStudentId, minutes);
    res.json(session);
  } catch (error) { next(error); }
});

router.post('/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, studentId } = req.body;
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      res.status(400).json({ error: 'sessionId is required' }); return;
    }
    const sid = studentId || env.defaultStudentId;
    const session = await updateSessionStatus(sessionId, sid, 'SUCCESS');
    const state = await getStudentState(sid);
    res.json({ session, studentState: state });
  } catch (error) { next(error); }
});

router.post('/fail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, studentId, failureReason } = req.body;
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      res.status(400).json({ error: 'sessionId is required' }); return;
    }
    if (failureReason !== undefined && !['give_up', 'app_switch'].includes(failureReason)) {
      res.status(400).json({ error: 'failureReason must be give_up or app_switch' }); return;
    }
    const session = await updateSessionStatus(
      sessionId, studentId || env.defaultStudentId, 'FAILED', undefined, failureReason
    );
    res.json(session);
  } catch (error) { next(error); }
});

export default router;
