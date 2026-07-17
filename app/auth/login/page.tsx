'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
      if (!data.user) throw new Error('Login failed. Please try again.')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status, approved')
        .eq('id', data.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      if (!profile) {
        router.push('/dashboard')
        return
      }

      if (profile.status === 'suspended') {
        await supabase.auth.signOut()
        setError('Account suspended. Contact support.')
        return
      }

      if (!profile.approved) {
        await supabase.auth.signOut()
        setError('Your account is pending admin approval.')
        return
      }

      router.push(profile.role === 'admin' ? '/admin/dashboard' : '/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 32, background: '#181c27', borderRadius: 12, border: '1px solid #232840' }}>
        <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
          Task<span style={{ color: '#22c55e' }}>Earn</span>
        </h1>

        <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>
          Sign in to your account
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{ width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #232840', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '10px 14px', paddingRight: 70, background: '#0f1117', border: '1px solid #232840', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#22c55e', fontSize: 13, cursor: 'pointer' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <a href="/auth/forgot-password" style={{ color: '#22c55e', fontSize: 13, textDecoration: 'none' }}>
              Forgot password?
            </a>
          </div>

          {error && (
            <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 11, background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
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