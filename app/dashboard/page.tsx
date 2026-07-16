import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserNav from '@/components/user/UserNav'
import CheckInButton from '@/components/user/CheckInButton'
import ReferralCard from '@/components/user/ReferralCard'
import Link from 'next/link'
import { Star, ClipboardList, ArrowDownCircle, TrendingUp, Users, ChevronRight, Lock } from 'lucide-react'

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.status === 'suspended') redirect('/auth/login')
  if (!profile?.approved) redirect('/pending')
  if (profile?.role === 'admin') redirect('/admin/dashboard')

  const { data: completedSurveys } = await supabase
    .from('survey_responses').select('id').eq('user_id', user.id)

  const { data: transactions } = await supabase
    .from('point_transactions').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(5)

  const { data: withdrawals } = await supabase
    .from('withdrawals').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(3)

  const { data: referrals } = await supabase
    .from('profiles').select('id').eq('referred_by', user.id)

  const todayEAT = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]
  const alreadyCheckedIn = profile?.last_checkin === todayEAT

  const userLevel = profile?.level ?? 1
  const canCheckIn = userLevel >= 2  // Level 1 users cannot claim daily check-in

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yourdomain.com'
  const referralLink = `${siteUrl}/auth/register?ref=${profile?.referral_code ?? ''}`
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '254700000000'
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi%20TaskEarn%20Support%2C%20I%20need%20help%20with%20my%20account.`

  const stats = [
    { label: 'Points Balance',      value: profile?.points ?? 0,                                                   icon: Star,           color: 'text-brand-400',  bg: 'bg-brand-500/10',  sub: `KSh ${profile?.points ?? 0}` },
    { label: 'Tasks Completed',     value: completedSurveys?.length ?? 0,                                          icon: ClipboardList,  color: 'text-blue-400',   bg: 'bg-blue-500/10',   sub: 'All time' },
    { label: 'Referrals',           value: referrals?.length ?? 0,                                                 icon: Users,          color: 'text-purple-400', bg: 'bg-purple-500/10', sub: `+${(referrals?.length ?? 0) * 100} pts earned` },
    { label: 'Pending Withdrawals', value: withdrawals?.filter((w: any) => w.status === 'pending').length ?? 0,    icon: ArrowDownCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', sub: 'Awaiting review' },
  ]

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <UserNav />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-x-hidden">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-700">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Here is your activity overview.</p>
          </div>

          {/* Daily check-in — Level 2+ only */}
          {canCheckIn ? (
            <CheckInButton userId={user.id} alreadyCheckedIn={alreadyCheckedIn} />
          ) : (
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-500 text-xs">
              <Lock size={13} />
              Daily check-in unlocks at Level 2
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {stats.map(({ label, value, icon: Icon, color, bg, sub }) => (
            <div key={label} className="card p-4 flex flex-col gap-2">
              <div className={`${bg} ${color} w-9 h-9 rounded-lg flex items-center justify-center`}>
                <Icon size={18} />
              </div>
              <p className={`font-display text-2xl font-700 ${color}`}>{value}</p>
              <div>
                <p className="text-slate-300 text-xs font-600">{label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 2-col row: Referral + WhatsApp */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <ReferralCard referralCode={profile?.referral_code ?? ''} referralLink={referralLink} />

          <div className="card flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 flex items-center justify-center text-[#25D366]">
                  <WhatsAppIcon size={22} />
                </div>
                <div>
                  <h2 className="font-display text-base font-700">Need Help?</h2>
                  <p className="text-slate-500 text-xs">We reply within a few hours</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Contact our support team directly on WhatsApp for account issues, withdrawal queries, or anything else.
              </p>
            </div>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl px-4 py-3 text-sm font-700 transition-colors w-full"
            >
              <WhatsAppIcon size={18} />
              Chat on WhatsApp
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-400" />
              <h2 className="font-display text-base font-700">Recent Activity</h2>
            </div>
            <Link href="/earnings" className="text-xs text-brand-400 flex items-center gap-1 hover:text-brand-300">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-surface-border last:border-0">
                  <div>
                    <p className="text-sm text-slate-200">{tx.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-display font-700 text-sm ${tx.type === 'earn' ? 'text-brand-400' : 'text-red-400'}`}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.amount} pts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No activity yet. Complete your first task to earn points!</p>
          )}
        </div>

      </main>
    </div>
  )
}
