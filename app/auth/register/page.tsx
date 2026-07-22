'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COUNTRIES = [
  'Kenya',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Nigeria',
  'South Africa',
  'Ghana',
  'United States',
  'United Kingdom',
  'Other',
]

function RegisterForm() {
  const searchParams = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('Kenya')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref.toUpperCase())
  }, [searchParams])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
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
            country,
          },
        },
      })

      if (authError) throw authError
      if (!data.user) throw new Error('Failed to create account.')

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        country,
        payment_level: 0,
        payment_amount: 0,
        referral_code: referralCode || null,
        approved: false,
        status: 'pending',
        role: 'user',
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
    } finally {
      setLoading(false)
    }
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
            Your account has been created. Wait for admin approval before full access.
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
          Create your account. Registration is free.
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

          <select
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-[#232840] bg-[#0f1117] px-4 py-3 text-white"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-[#232840] bg-[#0f1117] px-4 py-3 pr-24 text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-500"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full rounded-lg border border-[#232840] bg-[#0f1117] px-4 py-3 pr-24 text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-500"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

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
            {loading ? 'Creating Account...' : 'Create Free Account'}
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