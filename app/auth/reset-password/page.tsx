'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/auth/login')
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 32, background: '#181c27', borderRadius: 12, border: '1px solid #232840' }}>
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Set New Password</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Choose a strong new password for your account.</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', marginBottom: 6 }}>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters"
              style={{ width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #232840', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', marginBottom: 6 }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password"
              style={{ width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #232840', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 11, background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </main>
  )
}
