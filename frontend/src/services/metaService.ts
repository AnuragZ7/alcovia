import { getDb, getDeviceLabel, setDeviceLabel } from '../db/indexedDb';
import { AppMeta, VersionVector } from '../types';

const META_KEY = 'app-meta';
const VECTOR_KEY = 'version-vector';
const DEFAULT_STUDENT = 'demo-student-1';

export async function getMeta(): Promise<AppMeta> {
  const db = await getDb();
  const label = getDeviceLabel();
  const stored = (await db.get('meta', META_KEY)) as AppMeta | undefined;
  if (stored) return { ...stored, deviceLabel: label };

  const meta: AppMeta = {
    key: META_KEY,
    deviceId: `device-${label.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
    deviceLabel: label,
    studentId: DEFAULT_STUDENT,
    isOnline: true,
    lastSyncTime: null,
  };
  await db.put('meta', meta);
  return meta;
}

export async function setMeta(partial: Partial<AppMeta>): Promise<AppMeta> {
  const db = await getDb();
  const current = await getMeta();
  const updated: AppMeta = { ...current, ...partial, key: META_KEY };
  await db.put('meta', updated);
  return updated;
}

export async function switchDevice(label: 'A' | 'B'): Promise<void> {
  setDeviceLabel(label);
  window.location.reload();
}

export async function getVersionVector(): Promise<VersionVector> {
  const db = await getDb();
  const stored = (await db.get('meta', VECTOR_KEY)) as
    | { key: string; vector: VersionVector }
    | undefined;
  return stored?.vector ?? {};
}

export async function incrementVersionVector(deviceId: string): Promise<VersionVector> {
  const db = await getDb();
  const current = await getVersionVector();
  const next = { ...current, [deviceId]: (current[deviceId] ?? 0) + 1 };
  await db.put('meta', { key: VECTOR_KEY, vector: next });
  return next;
}
