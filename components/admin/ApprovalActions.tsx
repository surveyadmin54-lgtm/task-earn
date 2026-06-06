'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

export default function ApprovalActions({
  userId,
  currentLevel,
  approved,
}: {
  userId: string
  currentLevel: number
  approved: boolean
}) {
  const router = useRouter()
  const [level, setLevel] = useState(currentLevel)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleApprove = async () => {
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        approved: true,
        level,
        payment_level: level,
        payment_status: 'approved',
        status: 'active',
      })
      .eq('id', userId)

    setLoading(false)

    if (error) {
      setMsg('Error: ' + error.message)
      return
    }

    setMsg('Approved!')
    router.refresh()
  }

  const handleReject = async () => {
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        payment_status: 'rejected',
        approved: false,
      })
      .eq('id', userId)

    setLoading(false)

    if (error) {
      setMsg('Error: ' + error.message)
      return
    }

    setMsg('Rejected!')
    router.refresh()
  }

  const handleLevelChange = async (newLevel: number) => {
    setLevel(newLevel)

    if (!approved) return

    const supabase = createClient()

    await supabase
      .from('profiles')
      .update({
        level: newLevel,
        payment_level: newLevel,
      })
      .eq('id', userId)

    setMsg('Level updated')

    setTimeout(() => setMsg(''), 2000)

    router.refresh()
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={level}
        onChange={e => handleLevelChange(parseInt(e.target.value))}
        className="text-sm bg-surface border border-surface-border rounded-lg px-2 py-1.5 text-white"
      >
        {[1, 2, 3, 4, 5, 6, 7].map(l => (
          <option key={l} value={l}>
            Level {l}
          </option>
        ))}
      </select>

      {!approved && (
        <>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
          >
            {loading ? (
              <span className="w-3 h-3 border border-green-400/30 border-t-green-400 rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={13} />
                Approve
              </>
            )}
          </button>

          <button
            onClick={handleReject}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <XCircle size={13} />
            Reject
          </button>
        </>
      )}

      {msg && <span className="text-xs text-brand-400">{msg}</span>}
    </div>
  )
}