'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Gift } from 'lucide-react'

export default function GiftCardRedeem({ userId }: { userId: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true); setMsg('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('redeem_gift_card', {
      p_user_id: userId,
      p_code: code.trim(),
    })
    setLoading(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg(data.message)
    if (data.success) { setSuccess(true); setCode(''); router.refresh() }
  }

  return (
    <form onSubmit={handleRedeem} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">Gift Card Code</label>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. ABCD-EFGH-IJKL"
          style={{ fontFamily: 'monospace', letterSpacing: 3, fontWeight: 700 }}
        />
      </div>
      {msg && (
        <p className={`text-sm ${success ? 'text-brand-400' : 'text-red-400'}`}>{msg}</p>
      )}
      <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
        {loading
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><Gift size={15} /> Redeem Code</>
        }
      </button>
    </form>
  )
}
