'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import type { Profile } from '@/types'

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [fullName, setFullName]       = useState(profile.full_name ?? '')
  const [phone, setPhone]             = useState(profile.phone ?? '')
  const [paymentInfo, setPaymentInfo] = useState(profile.payment_info ?? '')
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, payment_info: paymentInfo })
      .eq('id', profile.id)

    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Profile updated!')
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">Full Name</label>
        <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Mwangi" />
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">Email</label>
        <input value={profile.email} disabled className="opacity-50 cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">Phone Number</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">
          Payment Info <span className="text-slate-500">(M-Pesa / Bank / PayPal)</span>
        </label>
        <input
          value={paymentInfo}
          onChange={e => setPaymentInfo(e.target.value)}
          placeholder="e.g. M-Pesa: 0712345678"
        />
      </div>
      {msg && (
        <p className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-brand-400'}`}>{msg}</p>
      )}
      <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
        {saving
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><Save size={15} /> Save Changes</>
        }
      </button>
    </form>
  )
}
