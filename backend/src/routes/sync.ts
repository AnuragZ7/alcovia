import { Router, Request, Response, NextFunction } from 'express';
import { processSync } from '../services/syncService';
import { SyncRequest } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as SyncRequest;
    if (!body.deviceId || !body.studentId) {
      res.status(400).json({ error: 'deviceId and studentId are required' });
      return;
    }
    const result = await processSync({
      deviceId: body.deviceId,
      studentId: body.studentId,
      events: Array.isArray(body.events) ? body.events : [],
      knownEventIds: Array.isArray(body.knownEventIds) ? body.knownEventIds : [],
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
