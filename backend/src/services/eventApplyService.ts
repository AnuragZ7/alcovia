import { EventStore } from '../models/EventStore';
import { FocusSession } from '../models/FocusSession';
import { SyncEvent, FocusSessionPayload, TaskStatusPayload, SessionStatus } from '../types';
import { mergeVectors } from '../utils/versionVector';
import { applyTaskDelete, applyTaskStatusFromEvent } from './taskService';
import { processSessionReward } from './focusRewardService';

export async function storeEventIfNew(event: SyncEvent): Promise<boolean> {
  const existing = await EventStore.findOne({ eventId: event.eventId });
  if (existing) return false;

  await EventStore.create({
    eventId: event.eventId,
    deviceId: event.deviceId,
    entityId: event.entityId,
    eventType: event.eventType,
    payload: event.payload,
    versionVector: event.versionVector,
    createdAt: new Date(event.createdAt),
    studentId: event.studentId,
  });

  return true;
}

export async function applyEvent(event: SyncEvent): Promise<void> {
  switch (event.eventType) {
    case 'FOCUS_SESSION_START':
      await applyFocusStart(event);
      break;
    case 'FOCUS_SESSION_COMPLETE':
      await applyFocusComplete(event);
      break;
    case 'FOCUS_SESSION_FAIL':
      await applyFocusFail(event);
      break;
    case 'TASK_STATUS_UPDATE':
      await applyTaskUpdate(event);
      break;
    case 'TASK_DELETE':
      await applyTaskDelete(
        event.entityId,
        event.studentId,
        event.versionVector
      );
      break;
    default:
      break;
  }
}

async function applyFocusStart(event: SyncEvent): Promise<void> {
  const payload = event.payload as unknown as FocusSessionPayload;
  const existing = await FocusSession.findOne({ sessionId: payload.sessionId });
  if (existing) return;

  await FocusSession.create({
    sessionId: payload.sessionId,
    studentId: event.studentId,
    targetMinutes: payload.targetMinutes,
    status: 'RUNNING',
    startedAt: new Date(event.createdAt),
    versionVector: event.versionVector,
  });
}

async function applyFocusStatus(
  event: SyncEvent,
  status: SessionStatus
): Promise<void> {
  const payload = event.payload as unknown as FocusSessionPayload;
  let session = await FocusSession.findOne({ sessionId: payload.sessionId });

  if (!session) {
    session = await FocusSession.create({
      sessionId: payload.sessionId,
      studentId: event.studentId,
      targetMinutes: payload.targetMinutes,
      status,
      startedAt: new Date(event.createdAt),
      completedAt: new Date(event.createdAt),
      versionVector: event.versionVector,
    });
  } else if (session.status === 'RUNNING') {
    session.status = status;
    session.completedAt = new Date(event.createdAt);
    session.versionVector = mergeVectors(session.versionVector, event.versionVector);
    await session.save();
  }

  if (status === 'SUCCESS') {
    await processSessionReward(
      payload.sessionId,
      event.studentId,
      payload.targetMinutes
    );
  }
}

async function applyFocusComplete(event: SyncEvent): Promise<void> {
  await applyFocusStatus(event, 'SUCCESS');
}

async function applyFocusFail(event: SyncEvent): Promise<void> {
  await applyFocusStatus(event, 'FAILED');
}

async function applyTaskUpdate(event: SyncEvent): Promise<void> {
  const payload = event.payload as unknown as TaskStatusPayload;
  await applyTaskStatusFromEvent(
    payload.taskId,
    event.studentId,
    payload.status,
    event.versionVector,
    payload.subjectId,
    payload.chapterId
  );
}
