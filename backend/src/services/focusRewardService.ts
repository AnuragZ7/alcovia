import { ProcessedSession } from '../models/ProcessedSession';
import { StudentState } from '../models/StudentState';
import { triggerFocusSuccessWorkflow } from '../integrations/n8n/focusSuccessWebhook';
import { FOCUS_REWARD_COINS } from '../types';

export interface RewardResult {
  processed: boolean;
  webhookTriggered: boolean;
  coins?: number;
  streak?: number;
}

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

/**
 * Idempotent reward + n8n trigger for a successful focus session.
 *
 * Exactly-once rewards: atomic claim via ProcessedSessions unique sessionId.
 * Exactly-once notifications: n8n workflow checks NotificationsSent collection.
 */
export async function processSessionReward(
  sessionId: string,
  studentId: string,
  targetMinutes: number
): Promise<RewardResult> {
  const existing = await ProcessedSession.findOne({ sessionId }).lean();
  if (existing) {
    return { processed: false, webhookTriggered: false };
  }

  let claimed = false;
  try {
    await ProcessedSession.create({
      sessionId,
      studentId,
      processedAt: new Date(),
      coinsAwarded: FOCUS_REWARD_COINS,
    });
    claimed = true;
  } catch (error: unknown) {
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      return { processed: false, webhookTriggered: false };
    }
    throw error;
  }

  if (!claimed) {
    return { processed: false, webhookTriggered: false };
  }

  const state = await getOrCreateStudentState(studentId);
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
  await state.save();

  let webhookTriggered = false;
  try {
    await triggerFocusSuccessWorkflow({
      sessionId,
      studentId,
      coins: FOCUS_REWARD_COINS,
      streak: state.streak,
    });
    webhookTriggered = true;
  } catch (error) {
    console.error(
      `[focusReward] Rewards granted but n8n webhook failed for ${sessionId}. ` +
        'Retry sync will not re-award (ProcessedSessions). Webhook is safe to retry.',
      error
    );
  }

  return {
    processed: true,
    webhookTriggered,
    coins: FOCUS_REWARD_COINS,
    streak: state.streak,
  };
}
