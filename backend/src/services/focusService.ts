import { FocusSession } from '../models/FocusSession';
import { StudentState } from '../models/StudentState';
import { SessionStatus } from '../types';
import { processSessionReward } from './focusRewardService';

async function getOrCreateStudentState(studentId: string) {
  let state = await StudentState.findOne({ studentId });
  if (!state) {
    try {
      state = await StudentState.create({
        studentId, coins: 0, streak: 0, todayFocusMinutes: 0,
        lastFocusDate: null, appliedRewardSessions: [],
      });
    } catch (error: unknown) {
      if ((error as { code?: number }).code !== 11000) throw error;
      state = await StudentState.findOne({ studentId });
    }
  }
  if (!state) throw new Error('Could not initialize student state');
  return state;
}

export async function startFocusSession(sessionId: string, studentId: string, targetMinutes: number) {
  if (!sessionId || !studentId) throw new Error('sessionId and studentId are required');
  if (!Number.isInteger(targetMinutes) || targetMinutes < 25 || targetMinutes > 120) {
    throw new Error('targetMinutes must be an integer between 25 and 120');
  }
  const existing = await FocusSession.findOne({ sessionId });
  if (existing) return existing;
  try {
    return await FocusSession.create({
      sessionId, studentId, targetMinutes, status: 'RUNNING',
      startedAt: new Date(), versionVector: {},
    });
  } catch (error: unknown) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const raced = await FocusSession.findOne({ sessionId });
    if (!raced) throw error;
    return raced;
  }
}

export async function updateSessionStatus(
  sessionId: string,
  studentId: string,
  status: SessionStatus,
  targetMinutes?: number,
  failureReason?: 'give_up' | 'app_switch'
) {
  const session = await FocusSession.findOne({ sessionId, studentId });
  if (!session) throw new Error(`Session ${sessionId} not found`);
  // Terminal sessions cannot be changed by a delayed/replayed request.
  if (session.status !== 'RUNNING') return session;

  if (status === 'SUCCESS') {
    const elapsed = Date.now() - new Date(session.startedAt ?? Date.now()).getTime();
    if (elapsed < session.targetMinutes * 60_000) {
      throw new Error('Focus target duration has not been reached');
    }
  }

  session.status = status;
  if (status !== 'RUNNING') session.completedAt = new Date();
  if (status === 'FAILED') session.failureReason = failureReason ?? 'give_up';
  await session.save();

  if (status === 'SUCCESS') {
    await processSessionReward(sessionId, studentId, session.targetMinutes);
  }
  return session;
}

export async function getStudentState(studentId: string) {
  const state = await getOrCreateStudentState(studentId);
  return {
    studentId: state.studentId, coins: state.coins, streak: state.streak,
    todayFocusMinutes: state.todayFocusMinutes, lastFocusDate: state.lastFocusDate,
  };
}
