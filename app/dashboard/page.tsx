import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserNav from '@/components/user/UserNav'
import CheckInButton from '@/components/user/CheckInButton'
import ReferralCard from '@/components/user/ReferralCard'
import { Star, ClipboardList, ArrowDownCircle, TrendingUp, MessageCircle } from 'lucide-react'

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

  // Check if already checked in today (EAT)
  const todayEAT = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]
  const alreadyCheckedIn = profile?.last_checkin === todayEAT

  const stats = [
    { label: 'Points Balance', value: profile?.points ?? 0, icon: Star, color: 'text-brand-400', sub: `= KSh ${profile?.points ?? 0}` },
    { label: 'Tasks Done', value: completedSurveys?.length ?? 0, icon: ClipboardList, color: 'text-blue-400', sub: null },
    { label: 'Pending Withdrawals', value: withdrawals?.filter((w: any) => w.status === 'pending').length ?? 0, icon: ArrowDownCircle, color: 'text-yellow-400', sub: null },
  ]

  // Build referral link safely (server-side only, no window)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yourdomain.com'
  const referralLink = `${siteUrl}/auth/register?ref=${profile?.referral_code ?? ''}`

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '254700000000'
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi%20TaskEarn%20Support%2C%20I%20need%20help%20with%20my%20account.`

  return (
    <div className="flex min-h-screen">
      <UserNav />
      <main className="flex-1 p-6 md:p-8">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-700">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-slate-400 mt-1">Here is your activity overview.</p>
          </div>
          <CheckInButton userId={user.id} alreadyCheckedIn={alreadyCheckedIn} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {stats.map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="card flex items-center gap-5">
              <div className={`${color} p-3 bg-white/5 rounded-xl`}><Icon size={24} /></div>
              <div>
                <p className="text-slate-400 text-sm">{label}</p>
                <p className="font-display text-3xl font-700 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Referral card — client component for copy button */}
          <ReferralCard
            referralCode={profile?.referral_code ?? ''}
            referralLink={referralLink}
          />

          {/* WhatsApp support */}
          <div className="card flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle size={18} className="text-green-400" />
                <h2 className="font-display text-lg font-700">Need Help?</h2>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Contact our support team directly on WhatsApp. We respond within a few hours.
              </p>
            </div>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm font-600 transition-colors">
              <MessageCircle size={16} /> Chat on WhatsApp
            </a>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-brand-400" />
            <h2 className="font-display text-lg font-700">Recent Activity</h2>
          </div>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-surface-border last:border-0">
                  <div>
                    <p className="text-sm text-slate-200">{tx.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-display font-700 ${tx.type === 'earn' ? 'text-brand-400' : 'text-red-400'}`}>
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
