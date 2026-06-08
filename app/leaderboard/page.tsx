import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserNav from '@/components/user/UserNav'
import { Trophy, Star, Medal, Crown } from 'lucide-react'

// SMART leaderboard: pulls from the DB directly, no manual updates needed.
// Ranks users by total points earned (all-time) from the profiles table.
// Uses the existing `points` column — stays accurate automatically.

export default async function LeaderboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, status, approved').eq('id', user.id).single()
  if (profile?.status === 'suspended') redirect('/auth/login')
  if (!profile?.approved) redirect('/pending')
  if (profile?.role === 'admin') redirect('/admin/dashboard')

  // Top 50 users by points — auto-updates as users earn
  const { data: topUsers } = await supabase
    .from('profiles')
    .select('id, full_name, points, level, referral_code')
    .eq('approved', true)
    .eq('status', 'active')
    .order('points', { ascending: false })
    .limit(50)

  // Current user's own rank
  const { count: myRank } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('approved', true)
    .eq('status', 'active')
    .gt('points', (await supabase.from('profiles').select('points').eq('id', user.id).single()).data?.points ?? 0)

  const { data: myProfile } = await supabase
    .from('profiles').select('points, full_name, level').eq('id', user.id).single()

  const myActualRank = (myRank ?? 0) + 1

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-400" />
    if (rank === 2) return <Medal size={18} className="text-slate-300" />
    if (rank === 3) return <Medal size={18} className="text-amber-600" />
    return null
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'border-yellow-500/30 bg-yellow-500/5'
    if (rank === 2) return 'border-slate-400/30 bg-slate-500/5'
    if (rank === 3) return 'border-amber-600/30 bg-amber-600/5'
    return 'border-surface-border'
  }

  // Mask name: "John Doe" → "J*** D**"
  const maskName = (name: string, isMe: boolean) => {
    if (isMe) return name + ' (You)'
    const parts = name.trim().split(' ')
    return parts.map(p => p[0] + '*'.repeat(Math.max(p.length - 1, 2))).join(' ')
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <UserNav />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-x-hidden">
        <div className="mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-700 flex items-center gap-3">
            <Trophy className="text-yellow-400" size={26} /> Leaderboard
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Top earners this all-time. Updates live as points are earned.</p>
        </div>

        {/* Your rank banner */}
        <div className="card mb-6 p-4 border-brand-500/30 bg-brand-500/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center font-display font-800 text-brand-400">
                #{myActualRank}
              </div>
              <div>
                <p className="font-700 text-sm">{myProfile?.full_name} (You)</p>
                <p className="text-slate-400 text-xs">Level {myProfile?.level ?? 1}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-brand-400 font-display font-700">
              <Star size={15} /> {myProfile?.points ?? 0} pts
            </div>
          </div>
        </div>

        {/* Top 3 podium on mobile */}
        {(topUsers?.length ?? 0) >= 3 && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[topUsers![1], topUsers![0], topUsers![2]].map((u, idx) => {
              const podiumRank = idx === 0 ? 2 : idx === 1 ? 1 : 3
              const isMe = u?.id === user.id
              return (
                <div key={u?.id} className={`card p-3 text-center flex flex-col items-center gap-1 ${getRankBg(podiumRank)} ${idx === 1 ? 'md:-mt-2' : ''}`}>
                  <div className={`text-2xl font-display font-800 ${podiumRank === 1 ? 'text-yellow-400' : podiumRank === 2 ? 'text-slate-300' : 'text-amber-600'}`}>
                    #{podiumRank}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-800 text-slate-300">
                    {u?.full_name?.[0] ?? '?'}
                  </div>
                  <p className="text-xs font-600 leading-tight truncate w-full">{maskName(u?.full_name ?? '', isMe)}</p>
                  <p className="text-brand-400 text-xs font-700">{u?.points} pts</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Full list */}
        <div className="card">
          <h2 className="font-display text-base font-700 mb-4">Top 50 Earners</h2>
          <div className="space-y-1">
            {(topUsers ?? []).map((u: any, idx: number) => {
              const rank = idx + 1
              const isMe = u.id === user.id
              return (
                <div key={u.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors
                  ${isMe ? 'border-brand-500/30 bg-brand-500/5' : getRankBg(rank)}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-800 shrink-0
                    ${rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                      rank === 2 ? 'bg-slate-500/20 text-slate-300' :
                      rank === 3 ? 'bg-amber-600/20 text-amber-500' :
                      'bg-surface text-slate-500'}`}>
                    {getRankIcon(rank) ?? rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-600 truncate ${isMe ? 'text-brand-300' : 'text-slate-200'}`}>
                      {maskName(u.full_name ?? 'User', isMe)}
                    </p>
                    <p className="text-xs text-slate-500">Level {u.level ?? 1}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star size={12} className="text-brand-400" />
                    <span className="font-display font-700 text-sm text-brand-400">{u.points}</span>
                  </div>
                </div>
              )
            })}
            {(topUsers?.length ?? 0) === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No users yet. Be the first to earn points!</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
