import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Users, Share2, Star, CheckCircle, Clock } from 'lucide-react'

const PAGE_SIZE = 40

export default async function AdminReferralsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const q    = searchParams.q?.trim() ?? ''
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  // Fetch all users who were referred (referred_by is not null)
  // joined with the referrer's profile
  let query = supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      created_at,
      approved,
      referral_rewarded,
      referred_by,
      referrer:profiles!profiles_referred_by_fkey(id, full_name, email, referral_code)
    `, { count: 'exact' })
    .eq('role', 'user')
    .not('referred_by', 'is', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data: referrals, count } = await query

  // Summary stats
  const { count: totalReferrals } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .not('referred_by', 'is', null)

  const { count: rewardedCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .eq('referral_rewarded', true)

  const { count: pendingCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .not('referred_by', 'is', null)
    .eq('referral_rewarded', false)
    .eq('approved', false)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const buildUrl = (p: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('page', String(p))
    return `/admin/referrals?${params.toString()}`
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <AdminNav />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 flex items-center gap-3">
            <Share2 size={26} className="text-brand-400" /> Referrals
          </h1>
          <p className="text-slate-400 mt-1">Every user who signed up via a referral link, and who referred them.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="card flex items-center gap-4">
            <div className="text-purple-400 p-3 bg-purple-500/10 rounded-xl shrink-0">
              <Users size={22} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total Referred Users</p>
              <p className="font-display text-2xl font-700 mt-0.5">{totalReferrals ?? 0}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="text-brand-400 p-3 bg-brand-500/10 rounded-xl shrink-0">
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Rewards Paid Out</p>
              <p className="font-display text-2xl font-700 mt-0.5">
                {rewardedCount ?? 0}
                <span className="text-sm text-slate-400 font-400 ml-2">
                  ({((rewardedCount ?? 0) * 100).toLocaleString()} pts = ${((rewardedCount ?? 0) * 100 / 100).toFixed(2)} USD)
                </span>
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="text-yellow-400 p-3 bg-yellow-500/10 rounded-xl shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Pending Reward (awaiting approval)</p>
              <p className="font-display text-2xl font-700 mt-0.5">{pendingCount ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <form method="GET" action="/admin/referrals" className="mb-5 flex gap-3 max-w-sm">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search referred user by name or email…"
            className="flex-1"
          />
          <button type="submit"
            className="px-4 py-2 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-lg text-sm hover:bg-brand-500/20 transition-colors">
            Search
          </button>
          {q && (
            <a href="/admin/referrals"
              className="px-4 py-2 text-slate-400 border border-surface-border rounded-lg text-sm hover:text-white transition-colors">
              Clear
            </a>
          )}
        </form>

        <div className="card">
          {referrals && referrals.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-surface-border">
                      <th className="pb-3 font-500">Referred User</th>
                      <th className="pb-3 font-500">Referred By</th>
                      <th className="pb-3 font-500">Joined</th>
                      <th className="pb-3 font-500">Status</th>
                      <th className="pb-3 font-500">Reward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r: any) => (
                      <tr key={r.id} className="border-b border-surface-border last:border-0">
                        {/* Referred user */}
                        <td className="py-3.5">
                          <p className="font-500">{r.full_name || '—'}</p>
                          <p className="text-xs text-slate-500">{r.email}</p>
                        </td>
                        {/* Referrer */}
                        <td className="py-3.5">
                          {r.referrer ? (
                            <>
                              <p className="font-500 text-brand-300">{r.referrer.full_name || '—'}</p>
                              <p className="text-xs text-slate-500">{r.referrer.email}</p>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Code: <span className="font-mono text-slate-400">{r.referrer.referral_code}</span>
                              </p>
                            </>
                          ) : (
                            <span className="text-slate-600 text-xs">Unknown</span>
                          )}
                        </td>
                        {/* Join date */}
                        <td className="py-3.5 text-slate-400">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        {/* Account status */}
                        <td className="py-3.5">
                          {r.approved ? (
                            <span className="badge-active">Approved</span>
                          ) : (
                            <span className="badge-pending">Pending Approval</span>
                          )}
                        </td>
                        {/* Reward status */}
                        <td className="py-3.5">
                          {r.referral_rewarded ? (
                            <span className="flex items-center gap-1 text-brand-400 text-xs font-700">
                              <Star size={12} /> 100 pts paid
                            </span>
                          ) : r.approved ? (
                            <span className="text-xs text-orange-400">Not yet credited</span>
                          ) : (
                            <span className="text-xs text-slate-500">Awaiting approval</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-5 pt-5 border-t border-surface-border">
                  <p className="text-sm text-slate-500">
                    Showing {from + 1}–{Math.min(from + PAGE_SIZE, count ?? 0)} of {count} referrals
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <a href={buildUrl(page - 1)}
                        className="px-3 py-1.5 text-sm border border-surface-border rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                        ← Prev
                      </a>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => Math.abs(p - page) <= 2)
                      .map(p => (
                        <a key={p} href={buildUrl(p)}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors
                            ${p === page
                              ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                              : 'border-surface-border text-slate-400 hover:text-white hover:border-slate-600'
                            }`}>
                          {p}
                        </a>
                      ))
                    }
                    {page < totalPages && (
                      <a href={buildUrl(page + 1)}
                        className="px-3 py-1.5 text-sm border border-surface-border rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                        Next →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">
              {q ? `No referred users found for "${q}".` : 'No referrals yet.'}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
