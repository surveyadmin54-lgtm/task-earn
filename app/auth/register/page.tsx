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

const TILLS = ['3500892 -mary', '3500824 -esther',]

function getRandomTill() {
  return TILLS[Math.floor(Math.random() * TILLS.length)]
}

function RegisterForm() {
  const searchParams = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [mpesaCode, setMpesaCode] = useState('')
  const [assignedTill, setAssignedTill] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const selectedAmount =
    LEVELS.find((l) => l.level === selectedLevel)?.amount || 0

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref.toUpperCase())
    setAssignedTill(getRandomTill())
  }, [searchParams])

  const handleChangeLevel = (level: number) => {
    setSelectedLevel(level)
    setAssignedTill(getRandomTill())
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (!mpesaCode.trim()) {
      setError('Enter M-Pesa transaction code.')
      return
    }

    if (!assignedTill) {
      setError('Till number not ready. Please refresh and try again.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (authError) throw authError
      if (!data.user) throw new Error('Failed to create account.')

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        payment_level: selectedLevel,
        payment_amount: selectedAmount,
        assigned_till: assignedTill,
        mpesa_code: mpesaCode,
        referral_code: referralCode || null,
      })

      if (profileError) throw profileError

      if (referralCode) {
        const { error: referralError } = await supabase.rpc('apply_referral', {
          p_new_user_id: data.user.id,
          p_referral_code: referralCode,
        })
        if (referralError) throw referralError
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
          <p className="mt-4 text-green-500 font-semibold">
            Assigned Till: {assignedTill}
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

        <p className="mb-6 mt-2 text-center text-sm text-slate-400">
          Create your account
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
            className="w-full rounded-lg border border-[#232840] bg-[#0f1117] px-4 py-3 text-white"
          />

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            className="w-full rounded-lg border border-[#232840] bg-[#0f1117] px-4 py-3 text-white"
          />

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-[#232840] bg-[#0f1117] px-4 py-3 text-white"
          />

          <select
            value={selectedLevel}
            onChange={(e) => handleChangeLevel(Number(e.target.value))}
            className="w-full rounded-lg border border-[#232840] bg-[#0f1117] px-4 py-3 text-white"
          >
            {LEVELS.map((level) => (
              <option key={level.level} value={level.level}>
                Level {level.level} - KES {level.amount.toLocaleString()}
              </option>
            ))}
          </select>

          <div className="rounded-lg border border-green-500 p-4">
            <p className="font-bold text-green-500">
              Pay KES {selectedAmount.toLocaleString()}
            </p>
            <p className="mt-2 text-white">
              Till Number: {assignedTill || 'Loading...'}
            </p>
          </div>

          <input
            type="text"
            required
            value={mpesaCode}
            onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
            placeholder="M-Pesa Transaction Code"
            className="w-full rounded-lg border border-[#232840] bg-[#0f1117] px-4 py-3 text-white"
          />

          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="Referral Code (Optional)"
            maxLength={8}
            className="w-full rounded-lg border border-[#232840] bg-[#0f1117] px-4 py-3 text-green-500"
          />

          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-500 py-3 font-semibold text-white disabled:opacity-70"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/auth/login" className="text-green-500">
            Sign In
          </a>
        </p>
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