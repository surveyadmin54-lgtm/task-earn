import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserNav from '@/components/user/UserNav'
import { Bell, CheckCircle, AlertCircle, Info, Gift, TrendingUp, Star } from 'lucide-react'

// Notifications generated from real platform activity — no extra DB table needed.
// Pulls from withdrawals, survey_responses, point_transactions, and profile data.

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.status === 'suspended') redirect('/auth/login')
  if (!profile?.approved) redirect('/pending')
  if (profile?.role === 'admin') redirect('/admin/dashboard')

  const { data: withdrawals } = await supabase
    .from('withdrawals').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(20)

  const { data: transactions } = await supabase
    .from('point_transactions').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(20)

  const { data: referredUsers } = await supabase
    .from('profiles').select('full_name, created_at').eq('referred_by', profile?.referral_code ?? '')
    .order('created_at', { ascending: false }).limit(10)

  // Build notifications from real data
  const notifications: Array<{ id: string; type: string; title: string; body: string; date: string; icon: any; color: string }> = []

  // Withdrawal status updates
  for (const w of withdrawals ?? []) {
    if (w.status === 'approved') {
      notifications.push({
        id: `w-${w.id}`,
        type: 'success',
        title: 'Withdrawal Approved ✓',
        body: `Your withdrawal of ${w.amount_points} pts (KSh ${w.amount_points}) via ${w.payment_method} has been approved.${w.admin_note ? ` Note: ${w.admin_note}` : ''}`,
        date: w.created_at,
        icon: CheckCircle,
        color: 'text-brand-400',
      })
    } else if (w.status === 'rejected') {
      notifications.push({
        id: `w-${w.id}`,
        type: 'error',
        title: 'Withdrawal Rejected',
        body: `Your withdrawal of ${w.amount_points} pts was rejected.${w.admin_note ? ` Reason: ${w.admin_note}` : ' Please contact support for details.'}`,
        date: w.created_at,
        icon: AlertCircle,
        color: 'text-red-400',
      })
    } else if (w.status === 'pending') {
      notifications.push({
        id: `w-${w.id}`,
        type: 'info',
        title: 'Withdrawal Under Review',
        body: `Your request to withdraw ${w.amount_points} pts via ${w.payment_method} is being reviewed. Usually 24–48 hours.`,
        date: w.created_at,
        icon: Info,
        color: 'text-blue-400',
      })
    }
  }

  // Referral rewards
  for (const ref of referredUsers ?? []) {
    notifications.push({
      id: `ref-${ref.created_at}`,
      type: 'reward',
      title: 'Referral Bonus Earned! 🎉',
      body: `${ref.full_name?.split(' ')[0] ?? 'Someone'} joined using your referral code. You earned 100 pts (KSh 100)!`,
      date: ref.created_at,
      icon: Gift,
      color: 'text-purple-400',
    })
  }

  // Level-up detection from transactions
  const earnTxs = (transactions ?? []).filter((t: any) => t.type === 'earn')
  let runningTotal = profile?.points ?? 0
  const levelThresholds = [200, 500, 1000, 2000, 3500, 5000]
  for (const tx of earnTxs) {
    const before = runningTotal - tx.amount
    for (let lvl = 0; lvl < levelThresholds.length; lvl++) {
      if (before < levelThresholds[lvl] && runningTotal >= levelThresholds[lvl]) {
        notifications.push({
          id: `lvl-${lvl}-${tx.id}`,
          type: 'achievement',
          title: `Level ${lvl + 2} Unlocked! 🚀`,
          body: `You've reached Level ${lvl + 2}! New tasks and higher rewards are now available for you.`,
          date: tx.created_at,
          icon: Star,
          color: 'text-yellow-400',
        })
      }
    }
  }

  // Recent big earn transactions
  for (const tx of (transactions ?? []).filter((t: any) => t.type === 'earn' && t.amount >= 50).slice(0, 5)) {
    notifications.push({
      id: `tx-${tx.id}`,
      type: 'earn',
      title: `+${tx.amount} Points Earned`,
      body: tx.description,
      date: tx.created_at,
      icon: TrendingUp,
      color: 'text-brand-400',
    })
  }

  // Sort by date descending
  notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(d).toLocaleDateString()
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <UserNav />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-x-hidden">
        <div className="mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-700 flex items-center gap-3">
            <Bell className="text-brand-400" size={26} /> Updates
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Your latest account activity and platform updates.</p>
        </div>

        {notifications.length === 0 ? (
          <div className="card text-center py-16">
            <Bell size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-600">No notifications yet</p>
            <p className="text-slate-500 text-sm mt-1">Complete tasks and refer friends to see updates here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const Icon = n.icon
              return (
                <div key={n.id} className="card p-4 flex gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0 ${n.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="font-display font-700 text-sm">{n.title}</p>
                      <span className="text-xs text-slate-500 shrink-0">{formatDate(n.date)}</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">{n.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
