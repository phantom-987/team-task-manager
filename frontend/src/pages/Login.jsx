import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)

    try {
      await login(form.email, form.password)

      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--accent)',
              marginBottom: 4,
            }}
          >
            TaskFlow
          </div>

          <h1 className="auth-title">Welcome back</h1>

          <p className="auth-sub">
            Sign in to manage your projects and tasks
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Email</label>

            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>

            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: 6,
              padding: '10px',
            }}
            disabled={loading}
          >
            {loading ? (
              <span
                className="spinner"
                style={{ width: 16, height: 16 }}
              />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            color: 'var(--muted)',
            fontSize: 13,
          }}
        >
          No account?{' '}
          <Link
            to="/signup"
            style={{ color: 'var(--accent)', fontWeight: 600 }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}