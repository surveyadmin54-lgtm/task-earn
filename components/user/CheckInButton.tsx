'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Gift } from 'lucide-react'

export default function CheckInButton({ userId, alreadyCheckedIn }: { userId: string; alreadyCheckedIn: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(alreadyCheckedIn)

  const handleCheckIn = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('daily_checkin', { p_user_id: userId })
    setLoading(false)
    if (error) { setMsg('Error. Try again.'); return }
    if (data?.success) {
      setMsg('+5 points claimed!')
      setDone(true)
      router.refresh()
    } else {
      setMsg(data?.message ?? 'Already checked in.')
      setDone(true)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleCheckIn}
        disabled={done || loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-600 border transition-colors
          ${done
            ? 'border-slate-700 text-slate-500 cursor-not-allowed bg-white/5'
            : 'border-brand-500/30 text-brand-400 hover:bg-brand-500/10 bg-brand-500/5'
          }`}
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
          : <Gift size={16} />
        }
        {done ? 'Claimed today' : 'Claim 5 pts'}
      </button>
      {msg && <p className="text-xs text-brand-400">{msg}</p>}
    </div>
  )
}
