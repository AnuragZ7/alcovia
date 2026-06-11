import { useApp } from '../context/AppContext';

export function Subjects() {
  const { subjects, loading } = useApp();

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <>
      <header className="page-header">
        <h1>Subjects</h1>
        <p>Syllabus progress by subject and chapter</p>
      </header>

      {subjects.map((subject) => (
        <div key={subject.subjectId} className="card subject-card">
          <div className="subject-header">
            <h2>{subject.name}</h2>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{subject.progress}%</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: '1.5rem' }}>
            <div className="progress-fill" style={{ width: `${subject.progress}%` }} />
          </div>

          {subject.chapters.map((chapter) => (
            <div key={chapter.chapterId} className="chapter-section">
              <div className="chapter-header">
                <h3>{chapter.name}</h3>
                <span style={{ color: 'var(--text-muted)' }}>{chapter.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${chapter.progress}%` }} />
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {chapter.tasks.filter((t) => t.status === 'DONE').length} / {chapter.tasks.length} tasks done
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
