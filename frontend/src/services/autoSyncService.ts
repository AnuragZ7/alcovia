import { syncNow } from './syncService';
import { getMeta } from './metaService';

const AUTO_SYNC_INTERVAL_MS = 12_000;
const DEBOUNCE_MS = 800;

let syncInProgress = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let onSyncComplete: (() => void) | null = null;

export function setAutoSyncCallback(callback: () => void): void {
  onSyncComplete = callback;
}

export async function runSyncIfOnline(): Promise<{ success: boolean; message: string }> {
  if (syncInProgress) {
    return { success: false, message: 'Sync already in progress' };
  }

  const meta = await getMeta();
  if (!meta.isOnline) {
    return { success: false, message: 'Device is offline — set ONLINE to sync' };
  }

  if (!navigator.onLine) {
    return { success: false, message: 'No network connection' };
  }

  syncInProgress = true;
  try {
    const result = await syncNow();
    if (result.success) {
      onSyncComplete?.();
    }
    return result;
  } finally {
    syncInProgress = false;
  }
}

/** Debounced sync after local changes (tasks, focus sessions). */
export function requestAutoSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void runSyncIfOnline();
  }, DEBOUNCE_MS);
}

export function startAutoSyncEngine(): void {
  stopAutoSyncEngine();

  intervalId = setInterval(() => {
    void runSyncIfOnline();
  }, AUTO_SYNC_INTERVAL_MS);

  window.addEventListener('online', handleConnectivityChange);
  window.addEventListener('focus', handleConnectivityChange);
}

export function stopAutoSyncEngine(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  window.removeEventListener('online', handleConnectivityChange);
  window.removeEventListener('focus', handleConnectivityChange);
}

function handleConnectivityChange(): void {
  requestAutoSync();
}
