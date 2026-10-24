import { ProcessedSession } from '../models/ProcessedSession';
import { StudentState } from '../models/StudentState';
import { FOCUS_REWARD_COINS } from '../types';
import { enqueueFocusSuccessNotification } from './notificationOutboxService';

export interface RewardResult {
  processed: boolean;
  webhookTriggered: boolean;
  coins?: number;
  streak?: number;
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function ensureStudentState(studentId: string): Promise<void> {
  try {
    await StudentState.updateOne(
      { studentId },
      { $setOnInsert: { studentId, coins: 0, streak: 0, todayFocusMinutes: 0, lastFocusDate: null, appliedRewardSessions: [] } },
      { upsert: true }
    );
  } catch (error: unknown) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

export async function processSessionReward(
  sessionId: string, studentId: string, targetMinutes: number
): Promise<RewardResult> {
  if (!sessionId || !studentId || !Number.isFinite(targetMinutes) || targetMinutes <= 0) {
    throw new Error('Valid sessionId, studentId, and targetMinutes are required');
  }
  await ensureStudentState(studentId);
  const today = dateString(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = dateString(yesterdayDate);
  let appliedNow = false;

  // Atomic compare-and-set loop. The session ID is recorded in the same
  // StudentState update as the counters, so a replay cannot award twice.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const current = await StudentState.findOne({ studentId }).lean();
    if (!current) throw new Error('Student state could not be initialized');
    if ((current.appliedRewardSessions ?? []).includes(sessionId)) break;

    const lastDate = current.lastFocusDate ?? null;
    const streak = lastDate === today ? current.streak : (lastDate === yesterday ? current.streak + 1 : 1);
    const todayFocusMinutes = lastDate === today
      ? current.todayFocusMinutes + targetMinutes
      : targetMinutes;
    const result = await StudentState.updateOne(
      { studentId, lastFocusDate: lastDate, appliedRewardSessions: { $ne: sessionId } },
      { $inc: { coins: FOCUS_REWARD_COINS },
        $set: { streak, todayFocusMinutes, lastFocusDate: today },
        $addToSet: { appliedRewardSessions: sessionId } }
    );
    if (result.modifiedCount === 1) { appliedNow = true; break; }
    if (attempt === 11) throw new Error('Could not atomically apply reward after retries');
  }

  // This is an audit marker, not the idempotency source of truth. If the process
  // crashed before writing it, the state ledger still prevents a second award.
  await ProcessedSession.updateOne(
    { sessionId },
    { $setOnInsert: { sessionId, studentId, processedAt: new Date(), coinsAwarded: FOCUS_REWARD_COINS } },
    { upsert: true }
  );

  const state = await StudentState.findOne({ studentId }).lean();
  if (!state) throw new Error('Student state missing after reward processing');
  // Always reconcile the outbox, including on replay after a crash.
  await enqueueFocusSuccessNotification({ sessionId, studentId, coins: FOCUS_REWARD_COINS, streak: state.streak });
  return { processed: appliedNow, webhookTriggered: false, coins: FOCUS_REWARD_COINS, streak: state.streak };
}
