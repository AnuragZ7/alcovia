import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { updateTaskStatus } from '../services/taskService';
import { TaskStatusBadge } from '../components/StatusBadge';
import { TaskStatus } from '../types';

const STATUSES: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'DONE'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

function getUndoStatus(status: TaskStatus): TaskStatus | null {
  if (status === 'DONE') return 'IN_PROGRESS';
  if (status === 'IN_PROGRESS') return 'NOT_STARTED';
  return null;
}

export function Tasks() {
  const { meta, subjects, refresh, loading } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    if (!meta || busy) return;
    setBusy(taskId);
    await updateTaskStatus(meta.deviceId, meta.studentId, taskId, status);
    await refresh();
    setBusy(null);
  };

  const handleUndo = async (taskId: string, currentStatus: TaskStatus) => {
    const prev = getUndoStatus(currentStatus);
    if (!prev) return;
    await handleStatusChange(taskId, prev);
  };

  if (loading) return <div className="empty-state">Loading...</div>;

  const allTasks = subjects.flatMap((s) =>
    s.chapters.flatMap((c) =>
      c.tasks.map((t) => ({ ...t, subjectName: s.name, chapterName: c.name }))
    )
  );

  return (
    <>
      <header className="page-header">
        <h1>Tasks</h1>
        <p>Switch status in any direction — use Undo to step back</p>
      </header>

      <div className="card">
        <div className="task-list">
          {allTasks.map((task) => {
            const undoTarget = getUndoStatus(task.status);

            return (
              <div key={task.taskId} className="task-item">
                <div>
                  <div className="task-item-title">{task.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {task.subjectName} · {task.chapterName}
                  </div>
                </div>
                <TaskStatusBadge status={task.status} />
                <div className="btn-group">
                  {undoTarget && (
                    <button
                      className="btn btn-outline btn-sm task-undo-btn"
                      onClick={() => handleUndo(task.taskId, task.status)}
                      disabled={busy === task.taskId}
                      title={`Undo to ${STATUS_LABELS[undoTarget]}`}
                    >
                      ↩ Undo
                    </button>
                  )}
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      className={`btn btn-sm ${task.status === s ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handleStatusChange(task.taskId, s)}
                      disabled={busy === task.taskId || task.status === s}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
