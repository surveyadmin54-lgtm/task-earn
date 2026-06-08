import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserNav from '@/components/user/UserNav'
import { Zap, TrendingUp, ArrowDownCircle, Star, Calendar } from 'lucide-react'

export default async function EarningsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.status === 'suspended') redirect('/auth/login')
  if (!profile?.approved) redirect('/pending')
  if (profile?.role === 'admin') redirect('/admin/dashboard')

  const { data: transactions } = await supabase
    .from('point_transactions').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: withdrawals } = await supabase
    .from('withdrawals').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const totalEarned = (transactions ?? []).filter((t: any) => t.type === 'earn').reduce((s: number, t: any) => s + t.amount, 0)
  const totalRedeemed = (transactions ?? []).filter((t: any) => t.type === 'redeem').reduce((s: number, t: any) => s + t.amount, 0)
  const approvedWithdrawals = (withdrawals ?? []).filter((w: any) => w.status === 'approved').reduce((s: number, w: any) => s + w.amount_points, 0)

  // Group transactions by month
  const byMonth: Record<string, any[]> = {}
  for (const tx of transactions ?? []) {
    const key = new Date(tx.created_at).toLocaleString('default', { month: 'long', year: 'numeric' })
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(tx)
  }

  const levelThresholds = [0, 200, 500, 1000, 2000, 3500, 5000]
  const currentLevel = profile?.level ?? 1
  const currentPts = profile?.points ?? 0
  const nextThreshold = levelThresholds[currentLevel] ?? levelThresholds[levelThresholds.length - 1]
  const prevThreshold = levelThresholds[currentLevel - 1] ?? 0
  const progress = nextThreshold > prevThreshold
    ? Math.min(((currentPts - prevThreshold) / (nextThreshold - prevThreshold)) * 100, 100)
    : 100

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <UserNav />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-x-hidden">
        <div className="mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-700 flex items-center gap-3">
            <Zap className="text-brand-400" size={26} /> Earnings
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Your complete earnings history and progress.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Current Balance', value: `${currentPts} pts`, sub: `KSh ${currentPts}`, color: 'text-brand-400', icon: Star },
            { label: 'Total Earned', value: `${totalEarned} pts`, sub: `KSh ${totalEarned}`, color: 'text-blue-400', icon: TrendingUp },
            { label: 'Total Withdrawn', value: `${approvedWithdrawals} pts`, sub: `KSh ${approvedWithdrawals}`, color: 'text-purple-400', icon: ArrowDownCircle },
            { label: 'Pending Payout', value: `${(withdrawals ?? []).filter((w: any) => w.status === 'pending').reduce((s: number, w: any) => s + w.amount_points, 0)} pts`, sub: 'Under review', color: 'text-yellow-400', icon: Calendar },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} className="card p-4">
              <Icon size={16} className={`${color} mb-2`} />
              <p className={`font-display text-xl font-700 ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{label}</p>
              <p className="text-slate-500 text-xs">{sub}</p>
            </div>
          ))}
        </div>

        {/* Level Progress */}
        <div className="card mb-6 p-5">
          <h2 className="font-display text-base font-700 mb-4 flex items-center gap-2">
            <Zap size={16} className="text-brand-400" /> Level Progress
          </h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-600 text-brand-400">Level {currentLevel}</span>
            <span className="text-sm text-slate-400">Level {Math.min(currentLevel + 1, 7)}</span>
          </div>
          <div className="w-full bg-surface rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-brand-600 to-brand-400 h-3 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{prevThreshold} pts</span>
            <span className="text-brand-400">{currentPts} pts</span>
            <span>{nextThreshold} pts</span>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {[1,2,3,4,5,6,7].map(lvl => (
              <div key={lvl} className={`text-center py-2 rounded-lg text-xs font-700 transition-colors
                ${lvl < currentLevel ? 'bg-brand-500/20 text-brand-400' :
                  lvl === currentLevel ? 'bg-brand-500 text-white' :
                  'bg-surface border border-surface-border text-slate-600'}`}>
                L{lvl}
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history grouped by month */}
        <div className="card">
          <h2 className="font-display text-base font-700 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-400" /> Transaction History
          </h2>
          {Object.keys(byMonth).length === 0 ? (
            <p className="text-slate-500 text-sm">No transactions yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(byMonth).map(([month, txs]) => (
                <div key={month}>
                  <p className="text-xs font-700 text-slate-500 uppercase tracking-wider mb-3">{month}</p>
                  <div className="space-y-2">
                    {txs.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-surface-border last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 truncate">{tx.description}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`font-display font-700 text-sm ml-3 shrink-0 ${tx.type === 'earn' ? 'text-brand-400' : 'text-red-400'}`}>
                          {tx.type === 'earn' ? '+' : '-'}{tx.amount} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
