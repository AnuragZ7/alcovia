import { VersionVector } from '../types';

export function isNewerOrEqual(
  incoming: VersionVector,
  existing: VersionVector
): boolean {
  const allDevices = new Set([...Object.keys(incoming), ...Object.keys(existing)]);

  for (const device of allDevices) {
    const incomingVal = incoming[device] ?? 0;
    const existingVal = existing[device] ?? 0;
    if (incomingVal < existingVal) return false;
  }
  return true;
}

export function isStrictlyNewer(
  incoming: VersionVector,
  existing: VersionVector
): boolean {
  if (!isNewerOrEqual(incoming, existing)) return false;
  return JSON.stringify(incoming) !== JSON.stringify(existing);
}

export function mergeVectors(a: VersionVector, b: VersionVector): VersionVector {
  const merged: VersionVector = { ...a };
  for (const [device, count] of Object.entries(b)) {
    merged[device] = Math.max(merged[device] ?? 0, count);
  }
  return merged;
}
