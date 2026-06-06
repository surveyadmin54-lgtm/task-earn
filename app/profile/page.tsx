import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserNav from '@/components/user/UserNav'
import ProfileForm from '@/components/user/ProfileForm'
import WithdrawalForm from '@/components/user/WithdrawalForm'
import GiftCardRedeem from '@/components/user/GiftCardRedeem'
import { User, ArrowDownCircle, Gift } from 'lucide-react'

export default async function ProfilePage() {
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
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen">
      <UserNav />
      <main className="flex-1 p-6 md:p-8 max-w-3xl">
        <h1 className="font-display text-3xl font-700 mb-8 flex items-center gap-3">
          <User className="text-brand-400" size={28} /> Profile
        </h1>

        {/* Level badge */}
        <div className="card mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-slate-400 text-sm">Points Balance</p>
            <p className="font-display text-4xl font-800 text-brand-400 mt-1">{profile?.points ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">= KSh {profile?.points ?? 0}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs mb-1">MEMBER LEVEL</p>
            <span className="bg-brand-500/10 border border-brand-500/20 text-brand-400 font-display font-800 text-2xl px-4 py-1.5 rounded-xl">
              Level {profile?.level ?? 1}
            </span>
          </div>
        </div>

        {/* Profile form */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-700">Personal Information</h2>
            <a href="/auth/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">
              Change Password
            </a>
          </div>
          <ProfileForm profile={profile} />
        </div>

        {/* Gift card */}
        <div className="card mb-6">
          <h2 className="font-display text-lg font-700 mb-1 flex items-center gap-2">
            <Gift size={20} className="text-brand-400" /> Redeem Gift Card
          </h2>
          <p className="text-slate-400 text-sm mb-5">Have a gift card code? Enter it here to add points instantly.</p>
          <GiftCardRedeem userId={user.id} />
        </div>

        {/* Withdrawal request */}
        <div className="card mb-6">
          <h2 className="font-display text-lg font-700 mb-1 flex items-center gap-2">
            <ArrowDownCircle size={20} className="text-brand-400" /> Request Withdrawal
          </h2>
          <p className="text-slate-400 text-sm mb-5">Reviewed by admins and processed within 24–48 hours.</p>
          <WithdrawalForm userId={user.id} points={profile?.points ?? 0} />
        </div>

        {/* Withdrawal history */}
        {withdrawals && withdrawals.length > 0 && (
          <div className="card">
            <h2 className="font-display text-lg font-700 mb-5">Withdrawal History</h2>
            <div className="space-y-3">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between py-2.5 border-b border-surface-border last:border-0">
                  <div>
                    <p className="text-sm">{w.amount_points} pts → {w.payment_method}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(w.created_at).toLocaleDateString()} · {w.payment_details}
                    </p>
                    {w.admin_note && <p className="text-xs text-slate-400 mt-0.5 italic">Note: {w.admin_note}</p>}
                  </div>
                  <span className={`badge-${w.status}`}>{w.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
