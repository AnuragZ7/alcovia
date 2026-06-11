import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { getMeta, setMeta, switchDevice } from '../services/metaService';
import { seedLocalData } from '../services/seedService';
import {
  runSyncIfOnline,
  startAutoSyncEngine,
  stopAutoSyncEngine,
  setAutoSyncCallback,
} from '../services/autoSyncService';
import { getStudentState, getFocusSessions } from '../services/focusService';
import { getSubjectsWithProgress } from '../services/taskService';
import { getEventCount } from '../services/eventService';
import { getLogs, subscribeLogs } from '../services/logger';
import {
  AppMeta,
  StudentState,
  FocusSession,
  Subject,
  LogEntry,
} from '../types';

interface SyncResult {
  success: boolean;
  message: string;
}

interface AppContextValue {
  meta: AppMeta | null;
  studentState: StudentState | null;
  sessions: FocusSession[];
  subjects: Subject[];
  eventCounts: { total: number; unsynced: number };
  logs: LogEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  setOnline: (online: boolean) => Promise<void>;
  selectDevice: (label: 'A' | 'B') => Promise<void>;
  triggerSync: () => Promise<SyncResult>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [meta, setMetaState] = useState<AppMeta | null>(null);
  const [studentState, setStudentState] = useState<StudentState | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [eventCounts, setEventCounts] = useState({ total: 0, unsynced: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const m = await getMeta();
    setMetaState(m);
    const [state, sess, subs, counts, logEntries] = await Promise.all([
      getStudentState(m.studentId),
      getFocusSessions(),
      getSubjectsWithProgress(),
      getEventCount(),
      getLogs(50),
    ]);
    setStudentState(state);
    setSessions(sess);
    setSubjects(subs);
    setEventCounts(counts);
    setLogs(logEntries);
  }, []);

  useEffect(() => {
    async function init() {
      const m = await getMeta();
      await seedLocalData(m.studentId);
      await refresh();
      setLoading(false);

      if (m.isOnline) {
        await runSyncIfOnline();
        await refresh();
      }
    }
    init();
  }, [refresh]);

  useEffect(() => {
    setAutoSyncCallback(() => {
      void refresh();
    });
    startAutoSyncEngine();
    return () => stopAutoSyncEngine();
  }, [refresh]);

  useEffect(() => {
    return subscribeLogs(() => {
      getLogs(50).then(setLogs);
    });
  }, []);

  const setOnline = async (online: boolean) => {
    await setMeta({ isOnline: online });
    await refresh();
    if (online) {
      await runSyncIfOnline();
      await refresh();
    }
  };

  const selectDevice = async (label: 'A' | 'B') => {
    await switchDevice(label);
  };

  const triggerSync = async (): Promise<SyncResult> => {
    const m = await getMeta();
    if (!m.isOnline) {
      await setMeta({ isOnline: true });
    }
    const result = await runSyncIfOnline();
    await refresh();
    return result;
  };

  return (
    <AppContext.Provider
      value={{
        meta,
        studentState,
        sessions,
        subjects,
        eventCounts,
        logs,
        loading,
        refresh,
        setOnline,
        selectDevice,
        triggerSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
