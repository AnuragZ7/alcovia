import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/indexedDb';
import { createEvent } from './eventService';
import { addLog } from './logger';
import { requestAutoSync } from './autoSyncService';
import { FocusSession, StudentState, FOCUS_REWARD_COINS } from '../types';

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getFocusSessions(): Promise<FocusSession[]> {
  const db = await getDb();
  const sessions = await db.getAll('focusSessions');
  return sessions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

export async function getStudentState(studentId: string): Promise<StudentState> {
  const db = await getDb();
  const state = await db.get('studentState', studentId);
  return (
    state ?? {
      studentId,
      coins: 0,
      streak: 0,
      todayFocusMinutes: 0,
      lastFocusDate: null,
    }
  );
}

async function processLocalReward(
  sessionId: string,
  studentId: string,
  targetMinutes: number
): Promise<void> {
  const db = await getDb();
  const already = await db.get('processedSessions', sessionId);
  if (already) return;

  const state = await getStudentState(studentId);
  const today = todayDateString();

  if (state.lastFocusDate === today) {
    state.todayFocusMinutes += targetMinutes;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (state.lastFocusDate === yesterdayStr) {
      state.streak += 1;
    } else if (state.lastFocusDate !== today) {
      state.streak = 1;
    }
    state.todayFocusMinutes = targetMinutes;
    state.lastFocusDate = today;
  }

  state.coins += FOCUS_REWARD_COINS;
  await db.put('studentState', state);
  await db.put('processedSessions', {
    sessionId,
    processedAt: new Date().toISOString(),
    coinsAwarded: FOCUS_REWARD_COINS,
  });
  await addLog(`Reward granted: +${FOCUS_REWARD_COINS} coins, streak ${state.streak}`, 'info');
}

export async function startFocusSession(
  deviceId: string,
  studentId: string,
  targetMinutes: number
): Promise<FocusSession> {
  const sessionId = uuidv4();
  const session: FocusSession = {
    sessionId,
    studentId,
    targetMinutes,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
  };

  const db = await getDb();
  await db.put('focusSessions', session);

  await createEvent(deviceId, studentId, sessionId, 'FOCUS_SESSION_START', {
    sessionId,
    studentId,
    targetMinutes,
    status: 'RUNNING',
    startedAt: session.startedAt,
  });

  await addLog(`Focus session started (${targetMinutes} min)`, 'info');
  requestAutoSync();
  return session;
}

export async function completeFocusSession(
  deviceId: string,
  sessionId: string,
  studentId: string,
  failureReason: 'give_up' | 'app_switch' = 'give_up'
): Promise<FocusSession> {
  const db = await getDb();
  const session = await db.get('focusSessions', sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'RUNNING') return session;

  const elapsed = Date.now() - new Date(session.startedAt).getTime();
  const required = session.targetMinutes * 60 * 1000;
  if (elapsed < required) {
    throw new Error(
      `Session not finished yet. Wait ${session.targetMinutes} minute(s) before completing.`
    );
  }

  session.status = 'SUCCESS';
  session.completedAt = new Date().toISOString();
  await db.put('focusSessions', session);

  await createEvent(deviceId, studentId, sessionId, 'FOCUS_SESSION_COMPLETE', {
    sessionId,
    studentId,
    targetMinutes: session.targetMinutes,
    status: 'SUCCESS',
    completedAt: session.completedAt,
  });

  await processLocalReward(sessionId, studentId, session.targetMinutes);
  await addLog(`Focus session completed (${session.targetMinutes} min)`, 'info');
  requestAutoSync();
  return session;
}

export async function failFocusSession(
  deviceId: string,
  sessionId: string,
  studentId: string
): Promise<FocusSession> {
  const db = await getDb();
  const session = await db.get('focusSessions', sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'RUNNING') return session;

  session.status = 'FAILED';
  session.failureReason = failureReason;
  session.completedAt = new Date().toISOString();
  await db.put('focusSessions', session);

  await createEvent(deviceId, studentId, sessionId, 'FOCUS_SESSION_FAIL', {
    sessionId,
    studentId,
    targetMinutes: session.targetMinutes,
    status: 'FAILED',
    failureReason,
    completedAt: session.completedAt,
  });

  await addLog(`Focus session failed (${session.targetMinutes} min)`, 'warn');
  requestAutoSync();
  return session;
}

export async function applyFocusEventFromSync(
  eventType: 'FOCUS_SESSION_START' | 'FOCUS_SESSION_COMPLETE' | 'FOCUS_SESSION_FAIL',
  payload: Record<string, unknown>,
  studentId: string
): Promise<void> {
  const sessionId = payload.sessionId as string;
  const db = await getDb();
  let session = await db.get('focusSessions', sessionId);

  if (eventType === 'FOCUS_SESSION_START') {
    if (!session) {
      session = {
        sessionId,
        studentId,
        targetMinutes: payload.targetMinutes as number,
        status: 'RUNNING',
        startedAt: (payload.startedAt as string) || new Date().toISOString(),
      };
      await db.put('focusSessions', session);
    }
    return;
  }

  const status = eventType === 'FOCUS_SESSION_COMPLETE' ? 'SUCCESS' : 'FAILED';
  if (!session) {
    session = {
      sessionId,
      studentId,
      targetMinutes: payload.targetMinutes as number,
      status,
      startedAt: new Date().toISOString(),
      completedAt: (payload.completedAt as string) || new Date().toISOString(),
    };
  } else if (session.status === 'RUNNING') {
    session.status = status;
    if (status === 'FAILED') session.failureReason = payload.failureReason as 'give_up' | 'app_switch' | undefined;
    session.completedAt = (payload.completedAt as string) || new Date().toISOString();
  }

  await db.put('focusSessions', session);

  if (status === 'SUCCESS') {
    await processLocalReward(sessionId, studentId, session.targetMinutes);
  }
}
