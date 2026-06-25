'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LEVELS = [
  { level: 1, amount: 800 },
  { level: 2, amount: 2000 },
  { level: 3, amount: 5000 },
  { level: 4, amount: 10000 },
  { level: 5, amount: 15000 },
  { level: 6, amount: 30000 },
]

function RegisterForm() {
  const searchParams = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [mpesaCode, setMpesaCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref.toUpperCase())
  }, [searchParams])

  const selectedAmount =
    LEVELS.find(l => l.level === selectedLevel)?.amount || 0

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (!mpesaCode.trim()) {
      setError('Enter M-Pesa transaction code.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      /** 🔁 GET ROTATING TILL */
      const { data: tillNumber, error: tillError } =
        await supabase.rpc('get_next_till')

      if (tillError || !tillNumber) {
        throw new Error('Failed to assign till.')
      }

      const { data, error: authError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        })

      if (authError) throw authError
      if (!data.user) throw new Error('Failed to create account.')

      await supabase
        .from('profiles')
        .update({
          payment_level: selectedLevel,
          payment_amount: selectedAmount,
          assigned_till: tillNumber,
          mpesa_code: mpesaCode,
        })
        .eq('id', data.user.id)

      if (referralCode) {
        await supabase.rpc('apply_referral', {
          p_new_user_id: data.user.id,
          p_referral_code: referralCode,
        })
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Registration failed.')
    }

    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="w-full max-w-md rounded-xl border border-[#232840] bg-[#181c27] p-8 text-center">
          <div className="mb-4 text-5xl">✅</div>
          <h2 className="mb-2 text-2xl font-bold text-white">
            Registration Submitted
          </h2>
          <p className="text-slate-400">
            Check your email and wait for payment approval.
          </p>
          <a href="/auth/login" className="mt-5 inline-block text-green-500">
            Go to Login →
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f1117] p-4">
      <div className="w-full max-w-md rounded-xl border border-[#232840] bg-[#181c27] p-8">
        <h1 className="text-center text-3xl font-bold text-white">
          Task<span className="text-green-500">Earn</span>
        </h1>

        <form onSubmit={handleRegister} className="space-y-4 mt-6">
          <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" className="w-full rounded-lg bg-[#0f1117] px-4 py-3 text-white" />
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg bg-[#0f1117] px-4 py-3 text-white" />
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg bg-[#0f1117] px-4 py-3 text-white" />

          <select value={selectedLevel} onChange={e => setSelectedLevel(Number(e.target.value))} className="w-full rounded-lg bg-[#0f1117] px-4 py-3 text-white">
            {LEVELS.map(l => (
              <option key={l.level} value={l.level}>
                Level {l.level} - KES {l.amount.toLocaleString()}
              </option>
            ))}
          </select>

          <input required value={mpesaCode} onChange={e => setMpesaCode(e.target.value.toUpperCase())} placeholder="M-Pesa Code" className="w-full rounded-lg bg-[#0f1117] px-4 py-3 text-white" />

          {error && <div className="text-red-400">{error}</div>}

          <button disabled={loading} className="w-full bg-green-500 py-3 rounded-lg text-white">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  )
}