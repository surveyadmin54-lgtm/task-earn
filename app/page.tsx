import Link from 'next/link'
import { CheckCircle, Star, Zap, Shield } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-surface bg-grid-pattern bg-grid">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="font-display text-2xl font-800 text-white">
          Task<span className="text-brand-400">Earn</span>
        </span>
        <div className="flex gap-3">
          <Link href="/auth/login" className="btn-ghost text-sm">Sign In</Link>
          <Link href="/auth/register" className="btn-primary text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 
                        rounded-full px-4 py-1.5 text-brand-400 text-sm mb-8">
          <Zap size={14} /> Earn real rewards for your opinions
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-800 leading-tight mb-6">
          Complete Tasks.<br />
          <span className="text-brand-400">Earn Points.</span><br />
          Shop Freely.
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          Answer simple surveys, accumulate points, and redeem them for real cash.
          <span className="text-brand-400 font-600">1 point = KSh 1.</span> It takes minutes and pays off.
        </p>
        <Link href="/auth/register" className="btn-primary text-base px-8 py-3 inline-block">
          Create Free Account →
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: CheckCircle, title: 'Simple Surveys', desc: 'Answer multiple-choice questions on topics you care about. No complex tasks, just your honest opinions.' },
          { icon: Star,        title: 'Earn Points',    desc: 'Every completed survey adds points to your balance. Points are tracked in real-time on your dashboard.' },
          { icon: Shield,      title: 'Safe & Secure',  desc: 'Verified withdrawals, encrypted accounts, and admin oversight keep the platform clean and trustworthy.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card hover:border-brand-500/40 transition-colors">
            <Icon className="text-brand-400 mb-4" size={28} />
            <h3 className="font-display text-lg font-700 mb-2">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
