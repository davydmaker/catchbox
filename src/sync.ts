import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, type Unsubscribe, type Timestamp } from 'firebase/firestore';
import { db } from './firebase.ts';
import { getCurrentUser } from './auth.ts';
import { STORAGE_KEYS } from './constants.ts';
import { on } from './events.ts';

export type SyncStatus = 'idle' | 'syncing' | 'pending' | 'error' | 'offline';

interface CloudData {
  progress: Record<string, string[]>;
  settings: Record<string, string>;
  lastModified: Timestamp | null;
}

export interface MergeChoice {
  local: { games: number; total: number };
  cloud: { games: number; total: number };
}

const SYNC_INTERVAL_MS = 30_000;
const SYNC_META_KEY = 'catchbox-sync-meta';

let isDirty = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let unsubSnapshot: Unsubscribe | null = null;
let ignoringSnapshot = false;
let status: SyncStatus = 'idle';
let statusListeners: ((s: SyncStatus) => void)[] = [];
let onDataPulled: (() => void) | null = null;

function setStatus(s: SyncStatus): void {
  status = s;
  statusListeners.forEach(fn => fn(s));
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function onSyncStatusChange(fn: (s: SyncStatus) => void): void {
  statusListeners.push(fn);
}

export function offSyncStatusChange(fn: (s: SyncStatus) => void): void {
  statusListeners = statusListeners.filter(f => f !== fn);
}

export function setOnDataPulled(fn: (() => void) | null): void {
  onDataPulled = fn;
}

export function markDirty(): void {
  isDirty = true;
  if (getCurrentUser() && status !== 'syncing') {
    setStatus('pending');
  }
}

export function isDirtyNow(): boolean {
  return isDirty;
}

function getLocalProgress(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.progress) || '{}');
  } catch {
    return {};
  }
}

function getLocalSettings(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
  } catch {
    return {};
  }
}

function setLocalProgress(data: Record<string, string[]>): void {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(data));
}

function setLocalSettings(data: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(data));
}

function getLastSyncTime(): number {
  try {
    return parseInt(localStorage.getItem(SYNC_META_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function setLastSyncTime(): void {
  localStorage.setItem(SYNC_META_KEY, String(Date.now()));
}

export async function pullFromCloud(): Promise<CloudData | null> {
  const user = getCurrentUser();
  if (!user) return null;

  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    progress: data.progress || {},
    settings: data.settings || {},
    lastModified: data.lastModified || null,
  };
}

export async function pushToCloud(): Promise<void> {
  const user = getCurrentUser();
  if (!user) return;

  // Ignore the snapshot triggered by our own write
  ignoringSnapshot = true;

  await setDoc(doc(db, 'users', user.uid), {
    progress: getLocalProgress(),
    settings: getLocalSettings(),
    lastModified: serverTimestamp(),
  });

  setLastSyncTime();

  // Re-enable snapshot listening after a short delay
  // (Firestore may fire the snapshot synchronously or within ms)
  setTimeout(() => { ignoringSnapshot = false; }, 2000);
}

export function countProgress(progress: Record<string, string[]>): { games: number; total: number } {
  const entries = Object.entries(progress).filter(([, v]) => v.length > 0);
  return {
    games: entries.length,
    total: entries.reduce((sum, [, v]) => sum + v.length, 0),
  };
}

export function mergeUnion(
  local: Record<string, string[]>,
  cloud: Record<string, string[]>,
): Record<string, string[]> {
  const allKeys = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  const merged: Record<string, string[]> = {};
  for (const key of allKeys) {
    const set = new Set([...(local[key] || []), ...(cloud[key] || [])]);
    merged[key] = [...set];
  }
  return merged;
}

export type MergeOption = 'local' | 'cloud' | 'union';

export async function resolveFirstSync(
  cloudData: CloudData,
  choice: MergeOption,
): Promise<void> {
  const localProgress = getLocalProgress();
  const localSettings = getLocalSettings();

  if (choice === 'local') {
    await pushToCloud();
  } else if (choice === 'cloud') {
    setLocalProgress(cloudData.progress);
    setLocalSettings(cloudData.settings);
    setLastSyncTime();
  } else {
    const merged = mergeUnion(localProgress, cloudData.progress);
    setLocalProgress(merged);
    setLocalSettings(cloudData.settings);

    ignoringSnapshot = true;
    await setDoc(doc(db, 'users', getCurrentUser()!.uid), {
      progress: merged,
      settings: cloudData.settings,
      lastModified: serverTimestamp(),
    });
    setLastSyncTime();
    setTimeout(() => { ignoringSnapshot = false; }, 2000);
  }

  isDirty = false;
  setStatus('idle');
  onDataPulled?.();
}

async function doSync(): Promise<void> {
  if (!isDirty || !getCurrentUser()) return;
  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }

  setStatus('syncing');
  try {
    await pushToCloud();
    isDirty = false;
    setStatus('idle');
  } catch (err) {
    console.error('[CatchBox Sync] doSync failed:', err);
    setStatus('error');
  }
}

function startSyncTimer(): void {
  stopSyncTimer();
  syncTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      doSync();
    }
  }, SYNC_INTERVAL_MS);
}

function stopSyncTimer(): void {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

function startSnapshotListener(): void {
  stopSnapshotListener();

  const user = getCurrentUser();
  if (!user) return;

  unsubSnapshot = onSnapshot(
    doc(db, 'users', user.uid),
    (snap) => {
      if (ignoringSnapshot) return;
      if (!snap.exists()) return;

      const data = snap.data();
      const cloudProgress = data.progress || {};
      const cloudModified = data.lastModified as Timestamp | null;
      if (!cloudModified) return;

      const cloudTime = cloudModified.toMillis();
      const lastSync = getLastSyncTime();

      if (cloudTime > lastSync) {
        const localProgress = getLocalProgress();
        const merged = mergeUnion(localProgress, cloudProgress);
        setLocalProgress(merged);
        setLastSyncTime();
        onDataPulled?.();
      }
    },
    () => {
      // Snapshot error — not critical, sync timer still handles pushes
    },
  );
}

function stopSnapshotListener(): void {
  if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
}

export async function syncNow(): Promise<void> {
  if (!getCurrentUser()) return;
  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }

  setStatus('syncing');
  try {
    await pushToCloud();
    isDirty = false;
    setStatus('idle');
  } catch (err) {
    console.error('[CatchBox Sync] syncNow failed:', err);
    setStatus('error');
  }
}

export function initSync(): void {
  on('data-changed', markDirty);

  document.addEventListener('visibilitychange', () => {
    if (!getCurrentUser()) return;

    if (document.visibilityState === 'visible') {
      if (isDirty) doSync();
    } else {
      if (isDirty) doSync();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (isDirty && getCurrentUser()) {
      e.preventDefault();
    }
  });
}

export function startSyncForUser(): void {
  startSyncTimer();
  startSnapshotListener();

  if (!navigator.onLine) {
    setStatus('offline');
  } else {
    setStatus('idle');
  }

  window.addEventListener('online', () => {
    if (getCurrentUser() && status === 'offline') {
      setStatus(isDirty ? 'pending' : 'idle');
      startSnapshotListener();
    }
  });
  window.addEventListener('offline', () => {
    if (getCurrentUser()) setStatus('offline');
  });
}

export function stopSync(): void {
  stopSyncTimer();
  stopSnapshotListener();
  isDirty = false;
  setStatus('idle');
  statusListeners = [];
}
