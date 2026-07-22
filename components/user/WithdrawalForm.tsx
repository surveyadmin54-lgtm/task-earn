'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

const METHODS = ['International Transfer', 'Bank Transfer', 'PayPal', 'M-Pesa', 'Airtel Money']
const POINTS_PER_USD = 100

function pointsToUsd(points: number) {
  return (points / POINTS_PER_USD).toFixed(2)
}

export default function WithdrawalForm({ userId, points }: { userId: string; points: number }) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(METHODS[0])
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const pts = parseInt(amount)

    if (isNaN(pts) || pts <= 0) {
      setIsError(true)
      setMsg('Enter a valid amount.')
      return
    }

    if (pts > points) {
      setIsError(true)
      setMsg('Insufficient points balance.')
      return
    }

    if (pts < 100) {
      setIsError(true)
      setMsg('Minimum withdrawal is 100 points (= $1 USD).')
      return
    }

    if (!details.trim()) {
      setIsError(true)
      setMsg('Enter your payment details.')
      return
    }

    setLoading(true)
    setMsg('')
    setIsError(false)

    const supabase = createClient()
    const { error } = await supabase.from('withdrawals').insert({
      user_id: userId,
      amount_points: pts,
      payment_method: method,
      payment_details: details,
    })

    setLoading(false)

    if (error) {
      setIsError(true)
      if (error.message.includes('pending')) {
        setMsg('You already have pending withdrawals that cover your balance. Wait for them to be processed first.')
      } else {
        setMsg('Error: ' + error.message)
      }
      return
    }

    setIsError(false)
    setMsg(`Withdrawal request submitted for $${pointsToUsd(pts)} USD. Admin will review within 24–48 hrs.`)
    setAmount('')
    setDetails('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">
            Points to Withdraw
            <span className="text-slate-500 ml-1">
              (min 100 pts = $1 USD, you have {points} pts = ${pointsToUsd(points)} USD)
            </span>
          </label>
          <input
            type="number"
            min="100"
            max={points}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500"
          />
          {amount && !isNaN(parseInt(amount)) && parseInt(amount) > 0 && (
            <p className="text-xs text-brand-400 mt-1">
              = ${pointsToUsd(parseInt(amount))} USD
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Withdrawal Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1.5">Payment Details</label>
        <input
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="e.g. account number, PayPal email, phone number"
        />
      </div>

      {msg && (
        <p className={`text-sm ${isError ? 'text-red-400' : 'text-brand-400'}`}>{msg}</p>
      )}

      <button
        type="submit"
        disabled={loading || points < 100}
        className="btn-primary flex items-center gap-2"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Send size={15} /> Submit Request
          </>
        )}
      </button>

      {points < 100 && (
        <p className="text-slate-500 text-sm">
          You need at least 100 points ($1 USD) to request a withdrawal.
        </p>
      )}
    </form>
  )
}