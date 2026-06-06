import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import ApprovalActions from '@/components/admin/ApprovalActions'
import { UserCheck } from 'lucide-react'

const PAGE_SIZE = 25

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // All pending — no pagination needed (usually small)
  const { data: pending } = await supabase
    .from('profiles')
    .select('*')
    .eq('approved', false)
    .eq('role', 'user')
    .order('created_at', { ascending: true })

  // Approved users — paginated
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const { data: approved, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('approved', true)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 flex items-center gap-3">
            <UserCheck className="text-brand-400" size={28} /> Approvals & Levels
          </h1>
          <p className="text-slate-400 mt-1">
            Approve new users and assign their level (1–7).
            Level 5+ users automatically receive a <span className="text-brand-400">40-point bonus</span> on approval.
            Referral rewards are credited to the referrer <span className="text-brand-400">only after you approve</span> the referred user.
          </p>
        </div>

        {/* Pending approvals */}
        <h2 className="font-display text-lg font-700 mb-4">
          Pending Approval <span className="text-yellow-400">({pending?.length ?? 0})</span>
        </h2>

        {pending && pending.length > 0 ? (
          <div className="space-y-3 mb-10">
            {pending.map(u => (
              <div key={u.id} className="card flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-600">{u.full_name || '—'}</p>
                  <p className="text-sm text-slate-400">{u.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                    {u.referred_by && <span className="ml-2 text-brand-400">· via referral (reward credited on approval)</span>}
                  </p>
                </div>
                <ApprovalActions userId={u.id} currentLevel={u.level ?? 1} approved={false} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-10 text-slate-500 text-sm mb-10">
            No pending approvals.
          </div>
        )}

        {/* Approved users - manage levels */}
        <h2 className="font-display text-lg font-700 mb-4 text-slate-300">
          Approved Users — Manage Levels ({count ?? 0})
        </h2>
        <div className="card">
          {approved && approved.length > 0 ? (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-surface-border">
                    <th className="pb-3 font-500">User</th>
                    <th className="pb-3 font-500">Points</th>
                    <th className="pb-3 font-500">Joined</th>
                    <th className="pb-3 font-500">Level</th>
                    <th className="pb-3 font-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approved.map(u => (
                    <tr key={u.id} className="border-b border-surface-border last:border-0">
                      <td className="py-3">
                        <p className="font-500">{u.full_name || '—'}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3 text-brand-400 font-700">{u.points}</td>
                      <td className="py-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        <span className="bg-brand-500/10 text-brand-400 text-xs px-2 py-1 rounded-full font-700">
                          Level {u.level}
                        </span>
                      </td>
                      <td className="py-3">
                        <ApprovalActions userId={u.id} currentLevel={u.level ?? 1} approved={true} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-5 pt-5 border-t border-surface-border">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages} ({count} total)
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <a href={`/admin/approvals?page=${page - 1}`}
                        className="px-3 py-1.5 text-sm border border-surface-border rounded-lg text-slate-400 hover:text-white transition-colors">
                        ← Prev
                      </a>
                    )}
                    {page < totalPages && (
                      <a href={`/admin/approvals?page=${page + 1}`}
                        className="px-3 py-1.5 text-sm border border-surface-border rounded-lg text-slate-400 hover:text-white transition-colors">
                        Next →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No approved users yet.</p>
          )}
        </div>
      </main>
    </div>
  )
}
