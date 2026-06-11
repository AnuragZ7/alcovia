import { FocusSession } from '../models/FocusSession';
import { StudentState } from '../models/StudentState';
import { SessionStatus } from '../types';
import { processSessionReward } from './focusRewardService';

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

async function getOrCreateStudentState(studentId: string) {
  let state = await StudentState.findOne({ studentId });
  if (!state) {
    state = await StudentState.create({
      studentId,
      coins: 0,
      streak: 0,
      todayFocusMinutes: 0,
      lastFocusDate: null,
    });
  }
  return state;
}

export async function startFocusSession(
  sessionId: string,
  studentId: string,
  targetMinutes: number
) {
  const existing = await FocusSession.findOne({ sessionId });
  if (existing) return existing;

  return FocusSession.create({
    sessionId,
    studentId,
    targetMinutes,
    status: 'RUNNING',
    startedAt: new Date(),
    versionVector: {},
  });
}

export async function updateSessionStatus(
  sessionId: string,
  studentId: string,
  status: SessionStatus,
  targetMinutes?: number
) {
  let session = await FocusSession.findOne({ sessionId });
  if (!session) {
    session = await FocusSession.create({
      sessionId,
      studentId,
      targetMinutes: targetMinutes ?? 25,
      status,
      startedAt: new Date(),
      versionVector: {},
    });
  } else {
    session.status = status;
    if (status !== 'RUNNING') {
      session.completedAt = new Date();
    }
    await session.save();
  }

  if (status === 'SUCCESS') {
    await processSessionReward(sessionId, studentId, session.targetMinutes);
  }

  return session;
}

export async function getStudentState(studentId: string) {
  const state = await getOrCreateStudentState(studentId);
  return {
    studentId: state.studentId,
    coins: state.coins,
    streak: state.streak,
    todayFocusMinutes: state.todayFocusMinutes,
    lastFocusDate: state.lastFocusDate,
  };
}
