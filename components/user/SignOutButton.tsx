'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  const router = useRouter()
  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }
  return (
    <button onClick={signOut}
      style={{ width: '100%', padding: 11, background: 'transparent', color: '#64748b', border: '1px solid #232840', borderRadius: 8, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <LogOut size={15} /> Sign Out
    </button>
  )
}
