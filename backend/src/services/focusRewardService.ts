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

/**
 * Apply one reward using a per-session ledger in StudentState. A retry after a
 * crash sees appliedRewardSessions and will not increment the counters twice.
 * The outbox is durable and retried independently of the incoming sync event.
 */
export async function processSessionReward(
  sessionId: string,
  studentId: string,
  targetMinutes: number
): Promise<RewardResult> {
  if (!sessionId || !studentId || !Number.isFinite(targetMinutes) || targetMinutes <= 0) {
    throw new Error('Valid sessionId, studentId, and targetMinutes are required');
  }

  const existingProcessed = await ProcessedSession.findOne({ sessionId }).lean();
  if (existingProcessed) {
    const state = await StudentState.findOne({ studentId }).lean();
    if (state) {
      await enqueueFocusSuccessNotification({
        sessionId, studentId, coins: FOCUS_REWARD_COINS, streak: state.streak,
      });
      return { processed: false, webhookTriggered: false, coins: FOCUS_REWARD_COINS, streak: state.streak };
    }
  }

  await ensureStudentState(studentId);
  const today = dateString(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = dateString(yesterdayDate);

  // CAS loop: if another session updates the student's day/streak first, read
  // the new state and retry with its current lastFocusDate and ledger.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const current = await StudentState.findOne({ studentId }).lean();
    if (!current) throw new Error('Student state could not be initialized');

    if ((current.appliedRewardSessions ?? []).includes(sessionId)) break;

    const lastDate = current.lastFocusDate ?? null;
    let streak = current.streak;
    let todayFocusMinutes: number;
    let lastFocusDate = today;

    if (lastDate === today) {
      todayFocusMinutes = current.todayFocusMinutes + targetMinutes;
    } else {
      streak = lastDate === yesterday ? current.streak + 1 : 1;
      todayFocusMinutes = targetMinutes;
    }

    const update = await StudentState.updateOne(
      { studentId, lastFocusDate: lastDate, appliedRewardSessions: { $ne: sessionId } },
      {
        $inc: { coins: FOCUS_REWARD_COINS },
        $set: { streak, todayFocusMinutes, lastFocusDate },
        $addToSet: { appliedRewardSessions: sessionId },
      }
    );
    if (update.modifiedCount === 1) break;
    if (attempt === 11) throw new Error('Could not atomically apply reward after retries');
  }

  // The ledger above is the source of truth. This marker is useful for auditing,
  // but a crash before this insert is safe: a retry will observe the ledger.
  try {
    await ProcessedSession.updateOne(
      { sessionId },
      { $setOnInsert: { sessionId, studentId, processedAt: new Date(), coinsAwarded: FOCUS_REWARD_COINS } },
      { upsert: true }
    );
  } catch (error: unknown) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }

  const state = await StudentState.findOne({ studentId }).lean();
  if (!state) throw new Error('Student state missing after reward processing');

  await enqueueFocusSuccessNotification({
    sessionId,
    studentId,
    coins: FOCUS_REWARD_COINS,
    streak: state.streak,
  });

  return {
    processed: true,
    webhookTriggered: false,
    coins: FOCUS_REWARD_COINS,
    streak: state.streak,
  };
}
