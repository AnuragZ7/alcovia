import { NotificationLog } from '../models/NotificationLog';
import { NotificationsSent } from '../models/NotificationsSent';

export async function getNotificationLogs(limit = 50) {
  return NotificationLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function getNotificationsSentCount() {
  return NotificationsSent.countDocuments();
}
