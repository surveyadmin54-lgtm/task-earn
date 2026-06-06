'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldOff, ShieldCheck } from 'lucide-react'

export default function UserStatusToggle({
  userId, currentStatus,
}: { userId: string; currentStatus: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isSuspended = currentStatus === 'suspended'

  const toggle = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('profiles')
      .update({ status: isSuspended ? 'active' : 'suspended' })
      .eq('id', userId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors
        ${isSuspended
          ? 'border-brand-500/30 text-brand-400 hover:bg-brand-500/10'
          : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
        }`}
    >
      {loading
        ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
        : isSuspended
          ? <><ShieldCheck size={13} /> Reactivate</>
          : <><ShieldOff size={13} /> Suspend</>
      }
    </button>
  )
}
