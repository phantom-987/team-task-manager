import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard').then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  const statCards = [
    { label: 'Projects', value: stats.total_projects, color: 'var(--accent)' },
    { label: 'Total Tasks', value: stats.total_tasks, color: 'var(--blue)' },
    { label: 'To Do', value: stats.todo, color: 'var(--muted)' },
    { label: 'In Progress', value: stats.in_progress, color: 'var(--blue)' },
    { label: 'Done', value: stats.done, color: 'var(--green)' },
    { label: 'Overdue', value: stats.overdue, color: 'var(--red)' },
  ]

  function greeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {greeting()}, {user.username} 👋</h1>
          <p className="page-subtitle">Here's what's going on across your projects.</p>
        </div>
        <Link to="/projects">
          <button className="btn btn-primary">+ New Project</button>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} className="card stat-card" style={{ padding: '18px 10px' }}>
            <div className="stat-num" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {stats.total_tasks > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 600 }}>Overall Progress</span>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              {stats.done} / {stats.total_tasks} done ({Math.round(stats.done / stats.total_tasks * 100)}%)
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, background: 'var(--green)',
              width: `${(stats.done / stats.total_tasks) * 100}%`,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Recent Tasks</h2>
        {stats.recent_tasks.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-text">No tasks yet</div>
            <div className="empty-sub">Create a project and add tasks to get started</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.recent_tasks.map(task => {
              const due = task.due_date ? new Date(task.due_date) : null
              return (
                <div key={task.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{task.title}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      {task.assignee_username && (
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>→ {task.assignee_username}</span>
                      )}
                    </div>
                  </div>
                  {due && (
                    <div className={task.is_overdue ? 'overdue-text' : 'due-text'}>
                      {task.is_overdue ? '⚠ Overdue · ' : '📅 '}{format(due, 'MMM d')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}