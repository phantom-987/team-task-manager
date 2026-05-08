import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  const fetchProjects = () => {
    api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchProjects() }, [])

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📁</div>
          <div className="empty-text">No projects yet</div>
          <div className="empty-sub">Create your first project to start organizing tasks</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>Create Project</button>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map(p => (
            <div
              key={p.id}
              className="card"
              style={{ cursor: 'pointer', transition: 'border-color 0.15s, transform 0.1s' }}
              onClick={() => navigate(`/projects/${p.id}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = '' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</h3>
                <span className={`badge badge-${p.my_role}`}>{p.my_role}</span>
              </div>
              {p.description && (
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>{p.description}</p>
              )}
              <div style={{ display: 'flex', gap: 14, color: 'var(--muted)', fontSize: 12, marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <span>👥 {p.member_count}</span>
                <span>✓ {p.task_count} tasks</span>
                <span style={{ marginLeft: 'auto' }}>{format(new Date(p.created_at), 'MMM d')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={(p) => { setProjects(prev => [p, ...prev]); setShowModal(false); navigate(`/projects/${p.id}`) }}
        />
      )}
    </div>
  )
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await api.post('/projects', form)
      toast.success('Project created!')
      onCreated(r.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Project</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Project Name *</label>
            <input className="input" placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required minLength={2} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" placeholder="What is this project about?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}