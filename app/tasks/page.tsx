import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserNav from '@/components/user/UserNav'
import SurveyCard from '@/components/user/SurveyCard'
import { ClipboardList, Clock, Lock } from 'lucide-react'

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

  // Midnight EAT in UTC (EAT = UTC+3)
  const nowEAT = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const midnightEAT = new Date(nowEAT)
  midnightEAT.setHours(24, 0, 0, 0)
  const lastMidnightEAT = new Date(midnightEAT.getTime() - 24 * 60 * 60 * 1000)
  // Convert last midnight back to UTC ISO for DB comparison
  const lastMidnightUTC = new Date(lastMidnightEAT.getTime() - 3 * 60 * 60 * 1000).toISOString()

  // Time left until reset
  const hoursLeft = Math.floor((midnightEAT.getTime() - nowEAT.getTime()) / (1000 * 60 * 60))
  const minsLeft  = Math.floor(((midnightEAT.getTime() - nowEAT.getTime()) % (1000 * 60 * 60)) / (1000 * 60))

  // Get all active non-expired surveys
  const { data: allSurveys } = await supabase
    .from('surveys')
    .select('*, questions(*)')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })

  // Filter by level targeting or specific user targeting
  const surveys = (allSurveys ?? []).filter(s => {
    const targetIds: string[] = s.target_user_ids ?? []
    if (targetIds.length > 0) return targetIds.includes(user.id)
    const min = s.min_level ?? 1
    const max = s.max_level ?? 7
    return userLevel >= min && userLevel <= max
  })

  // Get all completions by this user for visible surveys
  const surveyIds = surveys.map(s => s.id)
  const { data: allCompleted } = await supabase
    .from('survey_responses')
    .select('survey_id, completed_at')
    .eq('user_id', user.id)
    .in('survey_id', surveyIds.length > 0 ? surveyIds : ['none'])

  // For each survey, determine if it's "done" for today:
  // - resets_daily=true  → only count completions since last midnight EAT
  // - resets_daily=false → any completion counts forever
  const completedMap = new Map<string, boolean>()
  for (const survey of surveys) {
    const responses = (allCompleted ?? []).filter(r => r.survey_id === survey.id)
    if (responses.length === 0) { completedMap.set(survey.id, false); continue }
    if (survey.resets_daily) {
      // Completed after last midnight EAT → done for today
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
      <main className="flex-1 p-6 md:p-8">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-700 flex items-center gap-3">
              <ClipboardList className="text-brand-400" size={28} /> Tasks
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-400 text-sm">Your surveys for</p>
              <span className="bg-brand-500/10 text-brand-400 text-xs font-700 px-2 py-0.5 rounded-full border border-brand-500/20">
                Level {userLevel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-yellow-400 text-sm">
            <Clock size={14} />
            Daily tasks reset in {hoursLeft}h {minsLeft}m
          </div>
        </div>

        <h2 className="font-display text-lg font-700 mb-4">
          Available <span className="text-brand-400">({available.length})</span>
        </h2>
        {available.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-5 mb-10">
            {available.map(survey => (
              <SurveyCard key={survey.id} survey={survey} completed={false} userId={user.id} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12 mb-10">
            <Lock size={24} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No tasks available right now.</p>
            <p className="text-slate-500 text-sm mt-1">
              {done.length > 0
                ? `Daily tasks reset in ${hoursLeft}h ${minsLeft}m. Check back then!`
                : 'Check back soon or reach a higher level for more tasks.'}
            </p>
          </div>
        )}

        {done.length > 0 && (
          <>
            <h2 className="font-display text-lg font-700 mb-4 text-slate-400">
              Completed today ({done.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-5 opacity-60">
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
