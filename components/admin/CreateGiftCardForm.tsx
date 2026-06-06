'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Gift, RefreshCw } from 'lucide-react'

const inputStyle = { width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #232840', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' as const }

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function CreateGiftCardForm() {
  const router = useRouter()
  const [code, setCode]     = useState(generateCode())
  const [points, setPoints] = useState('100')
  const [note, setNote]     = useState('')
  const [count, setCount]   = useState('1')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')
  const [created, setCreated] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseInt(count) || 1
    if (qty < 1 || qty > 50) { setMsg('Generate between 1 and 50 at a time.'); return }
    setSaving(true); setMsg('')
    const supabase = createClient()

    const cards = Array.from({ length: qty }, (_, i) => ({
      code: qty === 1 ? code : generateCode(),
      points_value: parseInt(points) || 100,
      note: note || null,
    }))

    const { error } = await supabase.from('gift_cards').insert(cards)
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }

    setCreated(cards.map(c => c.code))
    setMsg(`${qty} gift card${qty > 1 ? 's' : ''} created!`)
    setCode(generateCode()); setNote('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">Gift Card Code</label>
        <div className="flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700 }} />
          <button type="button" onClick={() => setCode(generateCode())}
            className="px-3 py-2 border border-surface-border rounded-lg text-slate-400 hover:text-white transition-colors shrink-0">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Points Value</label>
          <input type="number" min="1" value={points} onChange={e => setPoints(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">How Many to Generate</label>
          <input type="number" min="1" max="50" value={count} onChange={e => setCount(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1.5">Note (optional)</label>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Promo for October campaign"
          style={inputStyle} />
      </div>

      {msg && <p className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-brand-400'}`}>{msg}</p>}

      {created.length > 0 && (
        <div className="bg-surface rounded-lg p-3 border border-surface-border">
          <p className="text-xs text-slate-500 mb-2">Generated codes:</p>
          {created.map(c => (
            <p key={c} className="font-display font-800 text-brand-400 tracking-widest text-sm">{c}</p>
          ))}
        </div>
      )}

      <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
        {saving
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><Gift size={16} /> Generate Gift Card{parseInt(count) > 1 ? 's' : ''}</>
        }
      </button>
    </form>
  )
}
