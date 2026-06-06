'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin + '/auth/reset-password' : '',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 32, background: '#181c27', borderRadius: 12, border: '1px solid #232840' }}>
        <Link href="/auth/login" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          ← Back to login
        </Link>
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Reset Password</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Enter your email and we will send you a reset link.</p>
        {sent ? (
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: 16, color: '#4ade80', fontSize: 14, textAlign: 'center' }}>
            Reset link sent! Check your email inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                style={{ width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #232840', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            {error && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: 11, background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
