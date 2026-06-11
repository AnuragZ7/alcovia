import { Router, Request, Response, NextFunction } from 'express';
import { getTasksGrouped, updateTaskStatus } from '../services/taskService';
import { env } from '../config/env';
import { TaskStatus } from '../types';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req.query.studentId as string) || env.defaultStudentId;
    const subjects = await getTasksGrouped(studentId);
    res.json(subjects);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = String(req.params.id);
    const { status, studentId, versionVector } = req.body as {
      status: TaskStatus;
      studentId?: string;
      versionVector?: Record<string, number>;
    };

    const task = await updateTaskStatus(
      taskId,
      studentId || env.defaultStudentId,
      status,
      versionVector || {}
    );
    res.json(task);
  } catch (error) {
    next(error);
  }
});

export default router;
