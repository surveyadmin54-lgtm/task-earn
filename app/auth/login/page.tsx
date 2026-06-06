'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }
    if (!data.user) { setError('Login failed. Please try again.'); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', data.user.id).single()
    if (!profile) { window.location.href = '/dashboard'; return }
    if (profile.status === 'suspended') {
      await supabase.auth.signOut()
      setError('Account suspended. Contact support.')
      setLoading(false)
      return
    }
    window.location.href = profile.role === 'admin' ? '/admin/dashboard' : '/dashboard'
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 32, background: '#181c27', borderRadius: 12, border: '1px solid #232840' }}>
        <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
          Task<span style={{ color: '#22c55e' }}>Earn</span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>Sign in to your account</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
              style={{ width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #232840', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #232840', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <a href="/auth/forgot-password" style={{ color: '#22c55e', fontSize: 13, textDecoration: 'none' }}>Forgot password?</a>
          </div>
          {error && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 11, background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
          No account? <a href="/auth/register" style={{ color: '#22c55e', textDecoration: 'none' }}>Create one free</a>
        </p>
      </div>
    </main>
  )
}
