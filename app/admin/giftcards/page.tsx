import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import CreateGiftCardForm from '@/components/admin/CreateGiftCardForm'
import { Gift } from 'lucide-react'

export default async function AdminGiftCardsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: cards } = await supabase
    .from('gift_cards')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <AdminNav />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 flex items-center gap-3">
            <Gift className="text-brand-400" size={28} /> Gift Cards
          </h1>
          <p className="text-slate-400 mt-1">Generate unique codes worth points. Give them to users to redeem.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Create form */}
          <div className="card">
            <h2 className="font-display text-lg font-700 mb-5">Generate New Gift Card</h2>
            <CreateGiftCardForm />
          </div>

          {/* Cards list */}
          <div>
            <h2 className="font-display text-lg font-700 mb-4">
              All Cards <span className="text-slate-500 font-400 text-base">({cards?.length ?? 0})</span>
            </h2>
            <div className="space-y-3">
              {cards && cards.length > 0 ? cards.map((c: any) => (
                <div key={c.id} className="card flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-display font-800 text-lg tracking-widest text-brand-400">
                        {c.code}
                      </span>
                      <span className={c.is_redeemed ? 'badge-suspended' : 'badge-active'}>
                        {c.is_redeemed ? 'redeemed' : 'active'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      Worth <span className="text-brand-400 font-700">{c.points_value} pts</span>
                      {c.note && <span className="ml-2 text-slate-500">· {c.note}</span>}
                    </p>
                    {c.is_redeemed && c.profiles && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Redeemed by {c.profiles.full_name} · {new Date(c.redeemed_at).toLocaleDateString()}
                      </p>
                    )}
                    {!c.is_redeemed && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Created {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )) : (
                <div className="card text-center py-10 text-slate-500 text-sm">
                  No gift cards yet. Generate one above.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
