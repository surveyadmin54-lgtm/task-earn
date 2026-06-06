'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

export default function WithdrawalActions({ withdrawalId }: { withdrawalId: string }) {
  const router = useRouter()
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [error, setError]     = useState('')

  const handle = async (action: 'approve' | 'reject') => {
    setLoading(action)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('withdrawals').update({
      status: action === 'approve' ? 'approved' : 'rejected',
      admin_note: note || null,
    }).eq('id', withdrawalId)

    if (err) {
      // The DB trigger raises an exception if the user has insufficient points
      setError(err.message.includes('insufficient') ? 'User has insufficient points!' : err.message)
      setLoading(null)
      return
    }
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Admin note (optional)"
        className="text-sm"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => handle('approve')}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500/10 hover:bg-brand-500/20
                     text-brand-400 text-sm py-2 rounded-lg transition-colors border border-brand-500/20"
        >
          {loading === 'approve'
            ? <span className="w-3.5 h-3.5 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
            : <><CheckCircle size={15} /> Approve</>
          }
        </button>
        <button
          onClick={() => handle('reject')}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20
                     text-red-400 text-sm py-2 rounded-lg transition-colors border border-red-500/20"
        >
          {loading === 'reject'
            ? <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
            : <><XCircle size={15} /> Reject</>
          }
        </button>
      </div>
    </div>
  )
}
