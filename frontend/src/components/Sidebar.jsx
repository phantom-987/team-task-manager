import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Task<span>Flow</span></div>

      <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span style={{ fontSize: 16 }}>◈</span>
        <span>Dashboard</span>
      </NavLink>

      <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span style={{ fontSize: 16 }}>⊞</span>
        <span>Projects</span>
      </NavLink>

      <div className="sidebar-bottom">
        {user && (
          <div className="user-chip">
            <div className="avatar">{user.username[0].toUpperCase()}</div>
            <div className="user-info" style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.username}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          </div>
        )}
        <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--red)' }}>
          <span style={{ fontSize: 16 }}>⎋</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}