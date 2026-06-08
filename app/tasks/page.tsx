import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserNav from '@/components/user/UserNav'
import SurveyCard from '@/components/user/SurveyCard'
import { ClipboardList, Clock, Lock, CheckCircle2 } from 'lucide-react'

export default async function TasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, status, approved, level').eq('id', user.id).single()
  if (profile?.status === 'suspended') redirect('/auth/login')
  if (!profile?.approved) redirect('/pending')
  if (profile?.role === 'admin') redirect('/admin/dashboard')

  const userLevel = profile?.level ?? 1
  const now = new Date().toISOString()

  const nowEAT = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const midnightEAT = new Date(nowEAT)
  midnightEAT.setHours(24, 0, 0, 0)
  const lastMidnightEAT = new Date(midnightEAT.getTime() - 24 * 60 * 60 * 1000)
  const lastMidnightUTC = new Date(lastMidnightEAT.getTime() - 3 * 60 * 60 * 1000).toISOString()

  const hoursLeft = Math.floor((midnightEAT.getTime() - nowEAT.getTime()) / (1000 * 60 * 60))
  const minsLeft  = Math.floor(((midnightEAT.getTime() - nowEAT.getTime()) % (1000 * 60 * 60)) / (1000 * 60))

  const { data: allSurveys } = await supabase
    .from('surveys')
    .select('*, questions(*)')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })

  const surveys = (allSurveys ?? []).filter(s => {
    const targetIds: string[] = s.target_user_ids ?? []
    if (targetIds.length > 0) return targetIds.includes(user.id)
    const min = s.min_level ?? 1
    const max = s.max_level ?? 7
    return userLevel >= min && userLevel <= max
  })

  const surveyIds = surveys.map(s => s.id)
  const { data: allCompleted } = await supabase
    .from('survey_responses')
    .select('survey_id, completed_at')
    .eq('user_id', user.id)
    .in('survey_id', surveyIds.length > 0 ? surveyIds : ['none'])

  const completedMap = new Map<string, boolean>()
  for (const survey of surveys) {
    const responses = (allCompleted ?? []).filter(r => r.survey_id === survey.id)
    if (responses.length === 0) { completedMap.set(survey.id, false); continue }
    if (survey.resets_daily) {
      const doneToday = responses.some(r => r.completed_at >= lastMidnightUTC)
      completedMap.set(survey.id, doneToday)
    } else {
      completedMap.set(survey.id, true)
    }
  }

  const available = surveys.filter(s => !completedMap.get(s.id))
  const done      = surveys.filter(s =>  completedMap.get(s.id))

  return (
    <div className="flex min-h-screen">
      <UserNav />
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-700 flex items-center gap-2">
                <ClipboardList className="text-brand-400" size={24} /> Tasks
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-400 text-sm">Your surveys for</p>
                <span className="bg-brand-500/10 text-brand-400 text-xs font-700 px-2 py-0.5 rounded-full border border-brand-500/20">
                  Level {userLevel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-yellow-400 text-xs">
              <Clock size={13} />
              Reset in {hoursLeft}h {minsLeft}m
            </div>
          </div>

          {/* Quick summary pills */}
          <div className="flex gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-700 px-3 py-1.5 rounded-full">
              <ClipboardList size={12} /> {available.length} available
            </span>
            {done.length > 0 && (
              <span className="flex items-center gap-1.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs font-700 px-3 py-1.5 rounded-full">
                <CheckCircle2 size={12} /> {done.length} done today
              </span>
            )}
          </div>
        </div>

        {available.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {available.map(survey => (
              <SurveyCard key={survey.id} survey={survey} completed={false} userId={user.id} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-10 mb-8">
            <Lock size={24} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-600">No tasks available right now.</p>
            <p className="text-slate-500 text-sm mt-1">
              {done.length > 0
                ? `Daily tasks reset in ${hoursLeft}h ${minsLeft}m. Check back then!`
                : 'Check back soon or reach a higher level for more tasks.'}
            </p>
          </div>
        )}

        {done.length > 0 && (
          <>
            <h2 className="font-display text-base font-700 mb-3 text-slate-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> Completed today ({done.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4 opacity-60">
              {done.map(survey => (
                <SurveyCard key={survey.id} survey={survey} completed userId={user.id} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
