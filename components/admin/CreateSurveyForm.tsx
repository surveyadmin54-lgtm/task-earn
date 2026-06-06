'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, PlusCircle } from 'lucide-react'

interface QuestionDraft { text: string; options: string[]; isOpen: boolean }
interface UserOption { id: string; full_name: string; email: string; level: number }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: '#0f1117',
  border: '1px solid #232840', borderRadius: 8, color: 'white',
  fontSize: 14, boxSizing: 'border-box', outline: 'none',
}

export default function CreateSurveyForm() {
  const router = useRouter()
  const [title, setTitle]               = useState('')
  const [desc, setDesc]                 = useState('')
  const [points, setPoints]             = useState('10')
  const [expires, setExpires]           = useState('midnight')
  const [resetsDaily, setResetsDaily]   = useState(false)
  const [targeting, setTargeting]       = useState<'level' | 'users'>('level')
  const [minLevel, setMinLevel]         = useState(1)
  const [maxLevel, setMaxLevel]         = useState(7)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers]               = useState<UserOption[]>([])
  const [questions, setQuestions]       = useState<QuestionDraft[]>([{ text: '', options: ['', ''], isOpen: false }])
  const [saving, setSaving]             = useState(false)
  const [msg, setMsg]                   = useState('')

  useEffect(() => {
    if (targeting === 'users') {
      createClient()
        .from('profiles').select('id, full_name, email, level')
        .eq('role', 'user').eq('approved', true)
        .order('level', { ascending: false })
        .then(({ data }) => setUsers(data ?? []))
    }
  }, [targeting])

  const toggleUser = (id: string) =>
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id])

  const addQuestion    = () => setQuestions(p => [...p, { text: '', options: ['', ''], isOpen: false }])
  const removeQuestion = (i: number) => setQuestions(p => p.filter((_, j) => j !== i))
  const updateQuestion = (i: number, text: string) => setQuestions(p => p.map((q, j) => j === i ? { ...q, text } : q))
  const toggleOpenQ    = (i: number) => setQuestions(p => p.map((q, j) => j === i ? { ...q, isOpen: !q.isOpen, options: q.isOpen ? ['', ''] : ['__open__'] } : q))
  const addOption      = (i: number) => setQuestions(p => p.map((q, j) => j === i ? { ...q, options: [...q.options, ''] } : q))
  const removeOption   = (i: number, oi: number) => setQuestions(p => p.map((q, j) => j === i ? { ...q, options: q.options.filter((_, k) => k !== oi) } : q))
  const updateOption   = (i: number, oi: number, val: string) => setQuestions(p => p.map((q, j) => j === i ? { ...q, options: q.options.map((o, k) => k === oi ? val : o) } : q))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setMsg('Survey title is required.'); return }
    for (const q of questions) {
      if (!q.text.trim()) { setMsg('All questions need text.'); return }
      if (!q.isOpen && q.options.filter(o => o.trim()).length < 2) {
        setMsg('Each multiple-choice question needs at least 2 options.'); return
      }
    }
    if (targeting === 'users' && selectedUsers.length === 0) {
      setMsg('Select at least one user for targeted survey.'); return
    }
    setSaving(true); setMsg('')
    const supabase = createClient()

    let expiresAt: string | null = null
    if (expires === 'midnight') {
      const nowEAT = new Date(Date.now() + 3 * 60 * 60 * 1000)
      const midnight = new Date(nowEAT)
      midnight.setHours(24, 0, 0, 0)
      expiresAt = new Date(midnight.getTime() - 3 * 60 * 60 * 1000).toISOString()
    }

    const { data: survey, error: surveyErr } = await supabase
      .from('surveys')
      .insert({
        title, description: desc,
        points_reward: parseInt(points) || 10,
        expires_at: expiresAt,
        resets_daily: resetsDaily,
        min_level:   targeting === 'level' ? minLevel : 1,
        max_level:   targeting === 'level' ? maxLevel : 7,
        target_user_ids: targeting === 'users' ? selectedUsers : [],
      })
      .select().single()

    if (surveyErr || !survey) { setMsg('Error: ' + surveyErr?.message); setSaving(false); return }

    const questionsToInsert = questions.map((q, idx) => ({
      survey_id: survey.id,
      text: q.text,
      options: q.isOpen ? ['__open__'] : q.options.filter(o => o.trim()),
      order: idx,
    }))
    const { error: qErr } = await supabase.from('questions').insert(questionsToInsert)
    if (qErr) { setMsg('Error saving questions: ' + qErr.message); setSaving(false); return }

    setMsg('Survey created!')
    setTitle(''); setDesc(''); setPoints('10'); setExpires('midnight')
    setResetsDaily(false); setMinLevel(1); setMaxLevel(7); setSelectedUsers([])
    setQuestions([{ text: '', options: ['', ''], isOpen: false }])
    router.refresh(); setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">Survey Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Shopping Habits Survey" style={inputStyle} />
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">Description (optional)</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description…" rows={2}
          style={{ ...inputStyle, resize: 'none' }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Points Reward</label>
          <input type="number" min="1" value={points} onChange={e => setPoints(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Expires</label>
          <select value={expires} onChange={e => setExpires(e.target.value)} style={{ ...inputStyle, background: '#0f1117' }}>
            <option value="midnight">Tonight at midnight (EAT)</option>
            <option value="never">Never</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={resetsDaily} onChange={e => setResetsDaily(e.target.checked)} />
        <span className="text-sm text-slate-300">Resets daily — users can complete this survey every day</span>
      </label>

      {/* Targeting */}
      <div>
        <label className="block text-sm text-slate-300 mb-2">Who can see this survey?</label>
        <div className="flex gap-2 mb-3">
          {(['level', 'users'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTargeting(t)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${targeting === t ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-border text-slate-400 hover:border-slate-600'}`}>
              {t === 'level' ? 'By Level' : 'Specific Users'}
            </button>
          ))}
        </div>

        {targeting === 'level' && (
          <div className="bg-surface rounded-lg p-4 border border-surface-border space-y-3">
            <p className="text-xs text-slate-500">Users between these levels will see this survey.</p>
            <div className="grid grid-cols-2 gap-3">
              {[['Min Level', minLevel, setMinLevel], ['Max Level', maxLevel, setMaxLevel]].map(([label, val, setter]: any) => (
                <div key={label}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <select value={val} onChange={e => setter(parseInt(e.target.value))}
                    style={{ ...inputStyle, background: '#0f1117' }}>
                    {[1,2,3,4,5,6,7].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="text-xs text-brand-400 bg-brand-500/10 rounded px-3 py-2">
              {minLevel === maxLevel ? `Only Level ${minLevel} users` : `Level ${minLevel}–${maxLevel} users`} will see this
            </div>
          </div>
        )}

        {targeting === 'users' && (
          <div className="bg-surface rounded-lg p-4 border border-surface-border">
            <p className="text-xs text-slate-500 mb-3">Select specific users who will see this survey.</p>
            {users.length === 0 ? (
              <p className="text-slate-500 text-sm">Loading users…</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {users.map(u => (
                  <label key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border
                    ${selectedUsers.includes(u.id) ? 'border-brand-500/40 bg-brand-500/10' : 'border-surface-border hover:border-slate-600'}`}>
                    <input type="checkbox" checked={selectedUsers.includes(u.id)}
                      onChange={() => toggleUser(u.id)} className="hidden" />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                      ${selectedUsers.includes(u.id) ? 'border-brand-400 bg-brand-400' : 'border-slate-600'}`}>
                      {selectedUsers.includes(u.id) && <span style={{ color: 'black', fontSize: 10, fontWeight: 800 }}>✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{u.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs text-brand-400 shrink-0">Lv.{u.level}</span>
                  </label>
                ))}
              </div>
            )}
            {selectedUsers.length > 0 && (
              <p className="text-xs text-brand-400 mt-2">{selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected</p>
            )}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-300">Questions</label>
          <button type="button" onClick={addQuestion}
            className="flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-sm">
            <PlusCircle size={15} /> Add Question
          </button>
        </div>
        {questions.map((q, qi) => (
          <div key={qi} className="bg-surface rounded-lg p-4 border border-surface-border space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-600">Q{qi + 1}</span>
              <input value={q.text} onChange={e => updateQuestion(qi, e.target.value)}
                placeholder="Question text…" style={inputStyle} />
              {questions.length > 1 && (
                <button type="button" onClick={() => removeQuestion(qi)}
                  className="text-red-400 hover:text-red-300 shrink-0"><Trash2 size={16} /></button>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={q.isOpen} onChange={() => toggleOpenQ(qi)} />
              <span className="text-xs text-slate-400">Open-ended (text answer)</span>
            </label>
            {!q.isOpen && (
              <div className="space-y-2 pl-4">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">{String.fromCharCode(65 + oi)}.</span>
                    <input value={opt} onChange={e => updateOption(qi, oi, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`} style={inputStyle} />
                    {q.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(qi, oi)}
                        className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
                {q.options.length < 6 && (
                  <button type="button" onClick={() => addOption(qi)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mt-1">
                    <Plus size={12} /> Add Option
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {msg && <p className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-brand-400'}`}>{msg}</p>}
      <button type="submit" disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2">
        {saving
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><Plus size={16} /> Create Survey</>
        }
      </button>
    </form>
  )
}
