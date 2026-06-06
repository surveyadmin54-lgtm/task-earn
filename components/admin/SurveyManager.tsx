'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ToggleLeft, ToggleRight, Star, Trash2, Pencil, X, Plus, RefreshCw, Save,
} from 'lucide-react'
import type { Survey } from '@/types'

interface QuestionDraft { id?: string; text: string; options: string[]; order: number }
type SurveyWithQs = Survey & { questions: any[] }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#0f1117',
  border: '1px solid #232840', borderRadius: 6, color: 'white',
  fontSize: 13, boxSizing: 'border-box', outline: 'none',
}

export default function SurveyManager({ surveys }: { surveys: SurveyWithQs[] }) {
  const router = useRouter()
  const [toggling, setToggling]     = useState<string | null>(null)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [editId, setEditId]         = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [editMsg, setEditMsg]       = useState('')

  // Edit form state
  const [eTitle, setETitle]         = useState('')
  const [eDesc, setEDesc]           = useState('')
  const [ePoints, setEPoints]       = useState('')
  const [eResetsDaily, setEResetsDaily] = useState(false)
  const [eQuestions, setEQuestions] = useState<QuestionDraft[]>([])

  const openEdit = (s: SurveyWithQs) => {
    setEditId(s.id)
    setETitle(s.title)
    setEDesc(s.description ?? '')
    setEPoints(String(s.points_reward))
    setEResetsDaily((s as any).resets_daily ?? false)
    setEQuestions(
      [...(s.questions ?? [])]
        .sort((a, b) => a.order - b.order)
        .map(q => ({
          id: q.id,
          text: q.text,
          options: Array.isArray(q.options) ? q.options : [],
          order: q.order,
        }))
    )
    setEditMsg('')
  }

  const closeEdit = () => { setEditId(null); setEditMsg('') }

  const toggleActive = async (id: string, current: boolean) => {
    setToggling(id)
    await createClient().from('surveys').update({ is_active: !current }).eq('id', id)
    router.refresh()
    setToggling(null)
  }

  const deleteSurvey = async (id: string) => {
    if (!confirm('Delete this survey and all its responses? This cannot be undone.')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('questions').delete().eq('survey_id', id)
    await supabase.from('survey_responses').delete().eq('survey_id', id)
    await supabase.from('surveys').delete().eq('id', id)
    router.refresh()
    setDeleting(null)
  }

  const saveEdit = async () => {
    if (!eTitle.trim()) { setEditMsg('Title is required.'); return }
    for (const q of eQuestions) {
      if (!q.text.trim()) { setEditMsg('All questions need text.'); return }
      const isOpen = q.options.length === 0 || q.options[0] === '__open__'
      if (!isOpen && q.options.filter(o => o.trim()).length < 2) {
        setEditMsg('Each multiple-choice question needs at least 2 options.'); return
      }
    }
    setSaving(true); setEditMsg('')
    const supabase = createClient()

    await supabase.from('surveys').update({
      title: eTitle,
      description: eDesc,
      points_reward: parseInt(ePoints) || 10,
      resets_daily: eResetsDaily,
    }).eq('id', editId!)

    // Delete old questions and re-insert
    await supabase.from('questions').delete().eq('survey_id', editId!)
    const toInsert = eQuestions.map((q, idx) => ({
      survey_id: editId!,
      text: q.text,
      options: q.options[0] === '__open__' ? ['__open__'] : q.options.filter(o => o.trim()),
      order: idx,
    }))
    if (toInsert.length > 0) {
      await supabase.from('questions').insert(toInsert)
    }

    setSaving(false)
    setEditMsg('Saved!')
    setTimeout(() => { router.refresh(); closeEdit() }, 800)
  }

  // Question helpers
  const addQ = () => setEQuestions(p => [...p, { text: '', options: ['', ''], order: p.length }])
  const removeQ = (i: number) => setEQuestions(p => p.filter((_, j) => j !== i))
  const updateQText = (i: number, v: string) => setEQuestions(p => p.map((q, j) => j === i ? { ...q, text: v } : q))
  const toggleOpenEnded = (i: number) => setEQuestions(p => p.map((q, j) => {
    if (j !== i) return q
    const isAlreadyOpen = q.options.length === 0 || q.options[0] === '__open__'
    return { ...q, options: isAlreadyOpen ? ['', ''] : ['__open__'] }
  }))
  const addOpt = (i: number) => setEQuestions(p => p.map((q, j) => j === i ? { ...q, options: [...q.options, ''] } : q))
  const removeOpt = (i: number, oi: number) => setEQuestions(p => p.map((q, j) => j === i ? { ...q, options: q.options.filter((_, k) => k !== oi) } : q))
  const updateOpt = (i: number, oi: number, v: string) => setEQuestions(p => p.map((q, j) => j === i ? { ...q, options: q.options.map((o, k) => k === oi ? v : o) } : q))

  if (surveys.length === 0) {
    return <div className="card text-center py-10 text-slate-500 text-sm">No surveys yet. Create one!</div>
  }

  return (
    <div className="space-y-3">
      {surveys.map(s => (
        <div key={s.id}>
          {/* Survey row */}
          <div className="card flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-display font-700 text-sm truncate">{s.title}</h3>
                <span className={s.is_active ? 'badge-active' : 'badge-suspended'}>
                  {s.is_active ? 'active' : 'inactive'}
                </span>
                {(s as any).resets_daily && (
                  <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full">
                    daily reset
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><Star size={11} /> {s.points_reward} pts</span>
                <span>{s.questions?.length ?? 0} questions</span>
                <span>{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Edit */}
              <button
                onClick={() => editId === s.id ? closeEdit() : openEdit(s)}
                className="p-2 text-slate-400 hover:text-brand-400 transition-colors"
                title="Edit survey"
              >
                {editId === s.id ? <X size={16} /> : <Pencil size={16} />}
              </button>
              {/* Delete */}
              <button
                onClick={() => deleteSurvey(s.id)}
                disabled={deleting === s.id}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Delete survey"
              >
                {deleting === s.id
                  ? <span className="w-4 h-4 border border-slate-400/30 border-t-slate-400 rounded-full animate-spin inline-block" />
                  : <Trash2 size={16} />
                }
              </button>
              {/* Toggle active */}
              <button
                onClick={() => toggleActive(s.id, s.is_active)}
                disabled={toggling === s.id}
                className={`transition-colors ${s.is_active ? 'text-brand-400 hover:text-slate-400' : 'text-slate-500 hover:text-brand-400'}`}
                title={s.is_active ? 'Deactivate' : 'Activate'}
              >
                {s.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          </div>

          {/* Inline edit panel */}
          {editId === s.id && (
            <div className="border border-brand-500/30 rounded-xl bg-surface-card p-5 mt-1 space-y-4">
              <h4 className="font-display font-700 text-sm text-brand-400">Editing: {s.title}</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Title</label>
                  <input value={eTitle} onChange={e => setETitle(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Points Reward</label>
                  <input type="number" min="1" value={ePoints} onChange={e => setEPoints(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea value={eDesc} onChange={e => setEDesc(e.target.value)} rows={2}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={eResetsDaily} onChange={e => setEResetsDaily(e.target.checked)} />
                <span className="text-sm text-slate-300">Resets daily (users can redo this survey each day)</span>
              </label>

              {/* Questions editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-600">Questions</span>
                  <button type="button" onClick={addQ}
                    className="flex items-center gap-1 text-brand-400 hover:text-brand-300 text-xs">
                    <Plus size={13} /> Add Question
                  </button>
                </div>
                {eQuestions.map((q, qi) => {
                  const isOpen = q.options.length === 0 || q.options[0] === '__open__'
                  return (
                    <div key={qi} className="bg-surface rounded-lg p-3 border border-surface-border space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-600 shrink-0">Q{qi + 1}</span>
                        <input value={q.text} onChange={e => updateQText(qi, e.target.value)}
                          placeholder="Question text…" style={{ ...inputStyle, flex: 1 }} />
                        {eQuestions.length > 1 && (
                          <button type="button" onClick={() => removeQ(qi)}
                            className="text-red-400 hover:text-red-300 shrink-0"><Trash2 size={14} /></button>
                        )}
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer pl-4">
                        <input type="checkbox" checked={isOpen} onChange={() => toggleOpenEnded(qi)} />
                        <span className="text-xs text-slate-400">Open-ended (text answer)</span>
                      </label>
                      {!isOpen && (
                        <div className="space-y-1.5 pl-4">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span className="text-xs text-slate-600">{String.fromCharCode(65 + oi)}.</span>
                              <input value={opt} onChange={e => updateOpt(qi, oi, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                style={{ ...inputStyle, flex: 1 }} />
                              {q.options.length > 2 && (
                                <button type="button" onClick={() => removeOpt(qi, oi)}
                                  className="text-slate-600 hover:text-red-400"><Trash2 size={12} /></button>
                              )}
                            </div>
                          ))}
                          {q.options.length < 6 && (
                            <button type="button" onClick={() => addOpt(qi)}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
                              <Plus size={11} /> Add option
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {editMsg && (
                <p className={`text-sm ${editMsg === 'Saved!' ? 'text-brand-400' : 'text-red-400'}`}>{editMsg}</p>
              )}

              <div className="flex items-center gap-3">
                <button onClick={saveEdit} disabled={saving}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-600 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Save size={14} /> Save Changes</>
                  }
                </button>
                <button onClick={closeEdit}
                  className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
