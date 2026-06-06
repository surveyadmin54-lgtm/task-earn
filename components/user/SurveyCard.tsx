'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Star, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { Survey, Question } from '@/types'

interface Props {
  survey: Survey & { questions: Question[] }
  completed: boolean
  userId: string
}

export default function SurveyCard({ survey, completed, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(completed)

  const allAnswered = survey.questions.every(q => answers[q.id])

  const handleSubmit = async () => {
    if (!allAnswered) { setError('Please answer all questions.'); return }
    setSubmitting(true)
    setError('')
    const supabase = createClient()

    // Insert response and award points atomically via RPC
    const { data, error: rpcError } = await supabase.rpc('submit_survey', {
      p_user_id:   userId,
      p_survey_id: survey.id,
      p_answers:   answers,
    })

    if (rpcError) {
      setError(rpcError.message)
      setSubmitting(false)
      return
    }

    if (data?.success === false) {
      setError(data.message ?? 'Submission failed.')
      setSubmitting(false)
      return
    }

    setDone(true)
    router.refresh()
  }

  if (done) {
    return (
      <div className="card flex flex-col gap-4 border-brand-500/20 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-display text-base font-700">{survey.title}</h3>
            {survey.description && (
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">{survey.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-brand-500/10 text-brand-400 text-sm font-700 px-3 py-1 rounded-full shrink-0">
            <Star size={13} /> {survey.points_reward} pts
          </div>
        </div>
        <div className="flex items-center gap-2 text-brand-400 text-sm font-500">
          <CheckCircle size={16} /> Completed
        </div>
      </div>
    )
  }

  return (
    <div className="card flex flex-col gap-4 hover:border-brand-500/40 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-display text-base font-700">{survey.title}</h3>
          {survey.description && (
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">{survey.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-brand-500/10 text-brand-400 text-sm font-700 px-3 py-1 rounded-full shrink-0">
          <Star size={13} /> {survey.points_reward} pts
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
      >
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {open ? 'Hide questions' : `Start survey (${survey.questions?.length ?? 0} questions)`}
      </button>

      {open && (
        <div className="space-y-5 border-t border-surface-border pt-4">
          {survey.questions
            .sort((a, b) => a.order - b.order)
            .map((q, idx) => {
              // Open-ended question: options array is empty or contains a single marker "__open__"
              const isOpen = !q.options || (q.options as string[]).length === 0 ||
                             (q.options as string[])[0] === '__open__'
              return (
                <div key={q.id}>
                  <p className="text-sm text-slate-200 mb-2.5 font-500">
                    {idx + 1}. {q.text}
                  </p>

                  {isOpen ? (
                    <textarea
                      rows={3}
                      value={answers[q.id] ?? ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Type your answer here…"
                      className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-500 outline-none resize-none"
                    />
                  ) : (
                    <div className="space-y-2">
                      {(q.options as string[]).map(opt => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors
                            ${answers[q.id] === opt
                              ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                              : 'border-surface-border hover:border-slate-600 text-slate-300'
                            }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className="hidden"
                          />
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                            ${answers[q.id] === opt ? 'border-brand-400' : 'border-slate-600'}`}>
                            {answers[q.id] === opt && (
                              <span className="w-2 h-2 bg-brand-400 rounded-full" />
                            )}
                          </span>
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !allAnswered}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : `Submit & Earn ${survey.points_reward} Points (= KSh ${survey.points_reward})`
            }
          </button>
        </div>
      )}
    </div>
  )
}
