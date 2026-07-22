import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserNav from '@/components/user/UserNav'
import ProfileForm from '@/components/user/ProfileForm'
import WithdrawalForm from '@/components/user/WithdrawalForm'
import GiftCardRedeem from '@/components/user/GiftCardRedeem'
import { User, ArrowDownCircle, Gift, Star, Shield } from 'lucide-react'

const POINTS_PER_USD = 100

function pointsToUsd(points: number) {
  return (points / POINTS_PER_USD).toFixed(2)
}

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.status === 'suspended') redirect('/auth/login')
  if (!profile?.approved) redirect('/pending')
  if (profile?.role === 'admin') redirect('/admin/dashboard')

  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const points = profile?.points ?? 0
  const usdBalance = pointsToUsd(points)

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <UserNav />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-x-hidden">
        <h1 className="font-display text-2xl md:text-3xl font-700 mb-5 flex items-center gap-3">
          <User className="text-brand-400" size={26} /> Profile
        </h1>

        <div className="card mb-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <Star size={22} className="text-brand-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Balance</p>
                <p className="font-display text-3xl font-800 text-brand-400 leading-none">
                  ${usdBalance}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {points} points = ${usdBalance} USD
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs mb-1">MEMBER LEVEL</p>
              <span className="bg-brand-500/10 border border-brand-500/20 text-brand-400 font-display font-800 text-xl px-3 py-1 rounded-lg inline-block">
                Level {profile?.level ?? 1}
              </span>
              <p className="text-xs text-slate-500 mt-1">{profile?.email}</p>
            </div>
          </div>
        </div>

        <div className="card mb-4 p-4 flex items-center gap-3">
          <Shield size={18} className={profile?.status === 'active' ? 'text-brand-400' : 'text-red-400'} />
          <div>
            <p className="text-sm font-600">
              Account Status:{' '}
              <span className={profile?.status === 'active' ? 'text-brand-400' : 'text-red-400'}>
                {profile?.status}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              Member since {new Date(profile?.created_at ?? '').toLocaleDateString()}
            </p>
          </div>
          <div className="ml-auto">
            <a href="/auth/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">
              Change Password
            </a>
          </div>
        </div>

        <div className="card mb-4 p-4 md:p-6">
          <h2 className="font-display text-base font-700 mb-4">Personal Information</h2>
          <ProfileForm profile={profile} />
        </div>

        <div className="card mb-4 p-4 md:p-6">
          <h2 className="font-display text-base font-700 mb-1 flex items-center gap-2">
            <Gift size={18} className="text-brand-400" /> Redeem Gift Card
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Have a gift card code? Enter it here to add USD value instantly.
          </p>
          <GiftCardRedeem userId={user.id} />
        </div>

        <div className="card mb-4 p-4 md:p-6">
          <h2 className="font-display text-base font-700 mb-1 flex items-center gap-2">
            <ArrowDownCircle size={18} className="text-brand-400" /> Request Withdrawal
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Reviewed by admins and processed within 24–48 hours.
          </p>
          <WithdrawalForm userId={user.id} points={points} />
        </div>

        {withdrawals && withdrawals.length > 0 && (
          <div className="card p-4 md:p-6">
            <h2 className="font-display text-base font-700 mb-4">Withdrawal History</h2>
            <div className="space-y-2">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="flex items-start justify-between py-2.5 border-b border-surface-border last:border-0 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      ${pointsToUsd(w.amount_points)} USD → {w.payment_method}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {new Date(w.created_at).toLocaleDateString()} · {w.payment_details}
                    </p>
                    {w.admin_note && <p className="text-xs text-slate-400 mt-0.5 italic">Note: {w.admin_note}</p>}
                  </div>
                  <span className={`badge-${w.status} shrink-0 mt-0.5`}>{w.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}