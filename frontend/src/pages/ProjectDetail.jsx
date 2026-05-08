import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tasks')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editTask, setEditTask] = useState(null)

  const fetchAll = async () => {
    const [pRes, tRes] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/tasks`),
    ])
    setProject(pRes.data)
    setTasks(tRes.data)
  }

  useEffect(() => {
    fetchAll().finally(() => setLoading(false))
  }, [id])

  const isAdmin = project?.my_role === 'admin'

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    try {
      await api.delete(`/projects/${id}`)
      toast.success('Project deleted')
      navigate('/projects')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    }
  }

  const handleTaskStatusUpdate = async (taskId, newStatus) => {
    try {
      const r = await api.put(`/tasks/${taskId}`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === taskId ? r.data : t))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed')
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${taskId}`)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success('Task deleted')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!project) return <div className="empty"><div>Project not found</div></div>

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ color: 'var(--muted)', marginBottom: 4 }}>
            ← Back
          </button>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p style={{ color: 'var(--muted)', marginTop: 4, maxWidth: 600 }}>{project.description}</p>}
          <div style={{ display: 'flex', gap: 14, marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>
            <span>👥 {project.member_count} members</span>
            <span>✓ {project.task_count} tasks</span>
            <span className={`badge badge-${project.my_role}`}>{project.my_role}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowSettingsModal(true)}>⚙ Settings</button>
              <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>+ Task</button>
            </>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>Tasks ({tasks.length})</button>
        <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>Members ({project.member_count})</button>
      </div>

      {tab === 'tasks' && (
        tasks.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-text">No tasks yet</div>
            <div className="empty-sub">{isAdmin ? 'Click "+ Task" to create your first task' : 'Admins can add tasks to this project'}</div>
          </div>
        ) : (
          <div className="kanban">
            {COLUMNS.map(col => (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-header">
                  <span>{col.label}</span>
                  <span style={{ background: 'var(--bg2)', padding: '1px 7px', borderRadius: 12, fontWeight: 700 }}>
                    {tasksByStatus[col.key].length}
                  </span>
                </div>
                <div className="kanban-tasks">
                  {tasksByStatus[col.key].map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isAdmin={isAdmin}
                      currentUserId={user.id}
                      onStatusChange={handleTaskStatusUpdate}
                      onEdit={() => setEditTask(task)}
                      onDelete={() => handleDeleteTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'members' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700 }}>Team Members</h3>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowMemberModal(true)}>+ Add Member</button>
            )}
          </div>
          {project.members.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              projectId={id}
              isAdmin={isAdmin}
              isOwner={project.owner_id === m.user_id}
              currentUserId={user.id}
              onUpdate={fetchAll}
            />
          ))}
        </div>
      )}

      {showTaskModal && (
        <TaskModal
          projectId={id}
          members={project.members}
          onClose={() => setShowTaskModal(false)}
          onSaved={(t) => { setTasks(prev => [t, ...prev]); setShowTaskModal(false) }}
        />
      )}

      {editTask && (
        <TaskModal
          projectId={id}
          members={project.members}
          task={editTask}
          isAdmin={isAdmin}
          onClose={() => setEditTask(null)}
          onSaved={(t) => { setTasks(prev => prev.map(x => x.id === t.id ? t : x)); setEditTask(null) }}
        />
      )}

      {showMemberModal && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowMemberModal(false)}
          onAdded={() => { fetchAll(); setShowMemberModal(false) }}
        />
      )}

      {showSettingsModal && (
        <ProjectSettingsModal
          project={project}
          onClose={() => setShowSettingsModal(false)}
          onUpdated={(p) => { setProject(prev => ({ ...prev, ...p })); setShowSettingsModal(false) }}
          onDelete={handleDeleteProject}
        />
      )}
    </div>
  )
}

function TaskCard({ task, isAdmin, currentUserId, onStatusChange, onEdit, onDelete }) {
  const canEdit = isAdmin || task.assignee_id === currentUserId
  const due = task.due_date ? new Date(task.due_date) : null
  const nextStatus = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
  const nextLabel = { todo: '▶ Start', in_progress: '✓ Done', done: '↩ Reopen' }

  return (
    <div className="task-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="task-card-title" style={{ flex: 1 }}>{task.title}</div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Edit">✎</button>
            <button className="btn btn-ghost btn-sm" onClick={onDelete} title="Delete" style={{ color: 'var(--red)' }}>✕</button>
          </div>
        )}
      </div>

      {task.description && (
        <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8, lineHeight: 1.4 }}>
          {task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}
        </p>
      )}

      <div className="task-card-meta">
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {task.assignee_username && (
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>→ {task.assignee_username}</span>
        )}
      </div>

      <div className="task-card-footer">
        {due ? (
          <span className={task.is_overdue ? 'overdue-text' : 'due-text'}>
            {task.is_overdue ? '⚠ ' : '📅 '}{format(due, 'MMM d')}
          </span>
        ) : <span />}

        {canEdit && (
          <button className="btn btn-sm btn-secondary" onClick={() => onStatusChange(task.id, nextStatus[task.status])}>
            {nextLabel[task.status]}
          </button>
        )}
      </div>
    </div>
  )
}

function TaskModal({ projectId, members, task, isAdmin = true, onClose, onSaved }) {
  const editing = !!task
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assignee_id: task?.assignee_id || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? task.due_date.slice(0, 16) : '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const body = {
      ...form,
      assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      due_date: form.due_date || null,
    }
    try {
      const r = editing
        ? await api.put(`/tasks/${task.id}`, body)
        : await api.post(`/projects/${projectId}/tasks`, body)
      toast.success(editing ? 'Task updated' : 'Task created')
      onSaved(r.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder="Task title" required minLength={2} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={set('description')} placeholder="Details…" rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={set('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="label">Assignee</label>
              <select className="input" value={form.assignee_id} onChange={set('assignee_id')}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Due Date</label>
              <input className="input" type="datetime-local" value={form.due_date} onChange={set('due_date')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : editing ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MemberRow({ member, projectId, isAdmin, isOwner, currentUserId, onUpdate }) {
  const [loading, setLoading] = useState(false)

  const handleRemove = async () => {
    if (!confirm(`Remove ${member.username}?`)) return
    setLoading(true)
    try {
      await api.delete(`/projects/${projectId}/members/${member.user_id}`)
      toast.success('Member removed')
      onUpdate()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleToggle = async () => {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    setLoading(true)
    try {
      await api.patch(`/projects/${projectId}/members/${member.user_id}/role`, { role: newRole })
      toast.success('Role updated')
      onUpdate()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="member-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{member.username[0].toUpperCase()}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {member.username}
            {isOwner && <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>(owner)</span>}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{member.email}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className={`badge badge-${member.role}`}>{member.role}</span>
        {isAdmin && !isOwner && member.user_id !== currentUserId && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={handleRoleToggle} disabled={loading} title="Toggle role">⇄</button>
            <button className="btn btn-danger btn-sm" onClick={handleRemove} disabled={loading}>Remove</button>
          </>
        )}
      </div>
    </div>
  )
}

function AddMemberModal({ projectId, onClose, onAdded }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/projects/${projectId}/members`, { email, role })
      toast.success('Member added')
      onAdded()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Add Member</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="member@example.com" required />
          </div>
          <div className="form-group">
            <label className="label">Role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectSettingsModal({ project, onClose, onUpdated, onDelete }) {
  const [form, setForm] = useState({ name: project.name, description: project.description })
  const [loading, setLoading] = useState(false)

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await api.put(`/projects/${project.id}`, form)
      toast.success('Project updated')
      onUpdated(r.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title">Project Settings</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="label">Project Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required minLength={2} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <button type="button" className="btn btn-danger" onClick={() => { onClose(); onDelete() }}>🗑 Delete Project</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}