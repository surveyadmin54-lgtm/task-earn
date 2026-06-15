import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Users, ClipboardList, ArrowDownCircle, Star, UserCheck } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { count: totalUsers },
    { count: totalSurveys },
    { count: pendingWithdrawals },
    { count: pendingApprovals },
    { data: recentWithdrawals },
    { data: pointsData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user').eq('approved', true),
    supabase.from('surveys').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user').eq('approved', false),
    supabase.from('withdrawals')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('profiles').select('points').eq('role', 'user').eq('approved', true),
  ])

  const totalPoints = (pointsData ?? []).reduce((sum: number, p: any) => sum + (p.points ?? 0), 0)

  const stats = [
    { label: 'Active Users',        value: totalUsers ?? 0,        icon: Users,           color: 'text-blue-400' },
    { label: 'Active Surveys',      value: totalSurveys ?? 0,      icon: ClipboardList,   color: 'text-purple-400' },
    { label: 'Pending Withdrawals', value: pendingWithdrawals ?? 0, icon: ArrowDownCircle, color: 'text-yellow-400' },
    { label: 'Awaiting Approval',   value: pendingApprovals ?? 0,  icon: UserCheck,       color: 'text-orange-400' },
    { label: 'Total Pts in Circ.', value: `${totalPoints.toLocaleString()} = $${(totalPoints / 100).toFixed(2)} USD`, icon: Star, color: 'text-brand-400' },
  ]

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <AdminNav />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700">Overview</h1>
          <p className="text-slate-400 mt-1">TaskEarn platform at a glance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={`${color} p-3 bg-white/5 rounded-xl shrink-0`}>
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-slate-400 text-xs">{label}</p>
                <p className="font-display text-xl font-700 mt-0.5 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent withdrawals */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <ArrowDownCircle size={18} className="text-brand-400" />
            <h2 className="font-display text-lg font-700">Recent Withdrawal Requests</h2>
          </div>
          {recentWithdrawals && recentWithdrawals.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-surface-border">
                  <th className="pb-3 font-500">User</th>
                  <th className="pb-3 font-500">Points</th>
                  <th className="pb-3 font-500">Method</th>
                  <th className="pb-3 font-500">Date</th>
                  <th className="pb-3 font-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentWithdrawals.map((w: any) => (
                  <tr key={w.id} className="border-b border-surface-border last:border-0">
                    <td className="py-3">
                      <p>{w.profiles?.full_name}</p>
                      <p className="text-xs text-slate-500">{w.profiles?.email}</p>
                    </td>
                    <td className="py-3">
                      <span className="flex items-center gap-1 text-brand-400">
                        <Star size={12} /> {w.amount_points} pts
                      </span>
                      <span className="text-xs text-slate-500">= ${(w.amount_points / 100).toFixed(2)} USD</span>
                    </td>
                    <td className="py-3 text-slate-300">{w.payment_method}</td>
                    <td className="py-3 text-slate-400">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="py-3"><span className={`badge-${w.status}`}>{w.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-500 text-sm">No withdrawal requests yet.</p>
          )}
        </div>
      </main>
    </div>
  )
}
