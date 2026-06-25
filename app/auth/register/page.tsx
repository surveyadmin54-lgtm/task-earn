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
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [assignedTill, setAssignedTill] = useState('')
  const [mpesaCode, setMpesaCode] = useState('')
  const [loadingTill, setLoadingTill] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const selectedAmount =
    LEVELS.find((l) => l.level === selectedLevel)?.amount || 0

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref.toUpperCase())
  }, [searchParams])

  /* 🔥 FETCH TILL AS SOON AS LEVEL CHANGES */
  useEffect(() => {
    const fetchTill = async () => {
      setLoadingTill(true)
      setAssignedTill('')
      setError('')

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/assign-till`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ level: selectedLevel }),
          }
        )

        const data = await res.json()

        if (!data.till) throw new Error('Failed to assign till')

        setAssignedTill(data.till)
      } catch (err: any) {
        setError(err.message)
      }

      setLoadingTill(false)
    }

    fetchTill()
  }, [selectedLevel])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!assignedTill) {
      setError('Till not assigned yet.')
      return
    }

    if (!mpesaCode.trim()) {
      setError('Enter M-Pesa transaction code.')
      return
    }

    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (authError || !data.user) throw authError

      await supabase.from('profiles').update({
        payment_level: selectedLevel,
        payment_amount: selectedAmount,
        assigned_till: assignedTill,
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
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="p-8 border rounded">
          <h2 className="text-2xl font-bold mb-2">✅ Registered</h2>
          <p>Paid Till: <span className="text-green-500">{assignedTill}</span></p>
          <a href="/auth/login" className="text-green-500 mt-4 inline-block">
            Go to Login →
          </a>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black p-4">
      <form onSubmit={handleRegister} className="w-full max-w-md space-y-4 text-white">
        <input required placeholder="Full Name" onChange={e => setFullName(e.target.value)} />
        <input required type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input required type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />

        <select value={selectedLevel} onChange={e => setSelectedLevel(Number(e.target.value))}>
          {LEVELS.map(l => (
            <option key={l.level} value={l.level}>
              Level {l.level} — KES {l.amount}
            </option>
          ))}
        </select>

        <div className="border p-4 rounded">
          <p>Amount: <b>KES {selectedAmount}</b></p>
          <p>
            Till:{' '}
            {loadingTill ? (
              <span className="text-yellow-400">Assigning…</span>
            ) : (
              <span className="text-green-500 font-bold">{assignedTill}</span>
            )}
          </p>
        </div>

        <input
          required
          placeholder="M-Pesa Transaction Code"
          value={mpesaCode}
          onChange={e => setMpesaCode(e.target.value.toUpperCase())}
        />

        {error && <p className="text-red-500">{error}</p>}

        <button
          disabled={loading || loadingTill}
          className="bg-green-500 text-black w-full py-2"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <RegisterForm />
    </Suspense>
  )
}