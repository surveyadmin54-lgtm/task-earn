'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import SignOutButton from '@/components/user/SignOutButton'
import { createClient } from '@/lib/supabase/client'

export default function PendingPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Poll every 20s — redirect as soon as approved
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('approved, role, status').eq('id', user.id).single()
      if (!profile) { router.push('/auth/login'); return }
      if (profile.approved && profile.status === 'active') {
        router.push(profile.role === 'admin' ? '/admin/dashboard' : '/dashboard')
      }
    }, 20000)

    return () => clearInterval(interval)
  }, [router])

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800 }}>
            Task<span style={{ color: '#22c55e' }}>Earn</span>
          </h1>
        </div>

        <div style={{ background: '#181c27', border: '1px solid #232840', borderRadius: 16, padding: 40, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, background: 'rgba(251,191,36,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Clock size={32} color="#fbbf24" />
          </div>
          <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Awaiting Approval
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, margin: '0 0 8px' }}>
            Your account has been created successfully.
          </p>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px' }}>
            An admin will approve your account shortly. This page will update automatically once you are approved.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fbbf24', fontSize: 13 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
            Checking for approval…
          </div>
        </div>

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        <SignOutButton />
      </div>
    </main>
  )
}