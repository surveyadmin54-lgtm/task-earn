import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import WithdrawalActions from '@/components/admin/WithdrawalActions'
import { Star } from 'lucide-react'

export default async function AdminWithdrawalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('*, profiles(full_name, email, phone)')
    .order('created_at', { ascending: false })

  const pending  = withdrawals?.filter(w => w.status === 'pending')  ?? []
  const resolved = withdrawals?.filter(w => w.status !== 'pending') ?? []

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700">Withdrawals</h1>
          <p className="text-slate-400 mt-1">Review and approve user withdrawal requests.</p>
        </div>

        {/* Pending */}
        <h2 className="font-display text-lg font-700 mb-4">
          Pending <span className="text-yellow-400">({pending.length})</span>
        </h2>
        {pending.length > 0 ? (
          <div className="space-y-3 mb-10">
            {pending.map((w: any) => (
              <div key={w.id} className="card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-500">{w.profiles?.full_name}</p>
                    <p className="text-sm text-slate-400">{w.profiles?.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-brand-400 font-700">
                        <Star size={13} /> {w.amount_points} pts
                      </span>
                      <span className="text-slate-400">{w.payment_method}: {w.payment_details}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Requested {new Date(w.created_at).toLocaleString()}
                    </p>
                  </div>
                  <WithdrawalActions withdrawalId={w.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-10 text-slate-500 text-sm mb-10">
            No pending withdrawals.
          </div>
        )}

        {/* History */}
        {resolved.length > 0 && (
          <>
            <h2 className="font-display text-lg font-700 mb-4 text-slate-400">History</h2>
            <div className="card">
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
                  {resolved.map((w: any) => (
                    <tr key={w.id} className="border-b border-surface-border last:border-0">
                      <td className="py-3">
                        <p>{w.profiles?.full_name}</p>
                        <p className="text-xs text-slate-500">{w.profiles?.email}</p>
                      </td>
                      <td className="py-3 text-brand-400 font-700">{w.amount_points}</td>
                      <td className="py-3 text-slate-300">{w.payment_method}</td>
                      <td className="py-3 text-slate-400">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="py-3"><span className={`badge-${w.status}`}>{w.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
