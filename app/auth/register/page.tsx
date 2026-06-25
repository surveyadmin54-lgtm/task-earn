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
  const supabase = createClient()

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

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref.toUpperCase())
  }, [searchParams])

  const selectedAmount =
    LEVELS.find((l) => l.level === selectedLevel)?.amount || 0

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1️⃣ Signup
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })

      if (authError || !data.user) throw authError

      // 2️⃣ Assign till immediately
      const { data: till, error: tillError } = await supabase.rpc(
        'get_next_till',
        { p_level: selectedLevel }
      )

      if (tillError || !till) {
        throw new Error('Could not assign till')
      }

      setAssignedTill(till)

      // 3️⃣ Save profile
      await supabase.from('profiles').update({
        payment_level: selectedLevel,
        payment_amount: selectedAmount,
        assigned_till: till,
        mpesa_code: mpesaCode,
      }).eq('id', data.user.id)

      if (referralCode) {
        await supabase.rpc('apply_referral', {
          p_new_user_id: data.user.id,
          p_referral_code: referralCode,
        })
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    }

    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="bg-[#181c27] p-8 rounded text-center">
          <h2 className="text-2xl font-bold text-white">✅ Registered</h2>
          <p className="text-white mt-3">
            Pay to till <span className="text-green-500">{assignedTill}</span>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f1117] p-4">
      <div className="bg-[#181c27] p-8 rounded w-full max-w-md">
        <form onSubmit={handleRegister} className="space-y-4">

          <input required placeholder="Full Name" onChange={(e) => setFullName(e.target.value)} />
          <input required type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <input required type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />

          <select value={selectedLevel} onChange={(e) => setSelectedLevel(Number(e.target.value))}>
            {LEVELS.map(l => (
              <option key={l.level} value={l.level}>
                Level {l.level} — KES {l.amount}
              </option>
            ))}
          </select>

          <input required placeholder="M-Pesa Code" onChange={(e) => setMpesaCode(e.target.value)} />

          {error && <p className="text-red-500">{error}</p>}

          <button disabled={loading} className="bg-green-500 w-full p-3 text-white">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

        </form>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  )
}