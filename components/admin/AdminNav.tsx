'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, ArrowDownCircle, Users, LogOut, ShieldCheck, Menu, X, UserCheck, Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const links = [
  { href: '/admin/dashboard',   label: 'Overview',    icon: LayoutDashboard },
  { href: '/admin/approvals',   label: 'Approvals',   icon: UserCheck },
  { href: '/admin/surveys',     label: 'Surveys',     icon: ClipboardList },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowDownCircle },
  { href: '/admin/giftcards',   label: 'Gift Cards',  icon: Gift },
  { href: '/admin/users',       label: 'Users',       icon: Users },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const NavLinks = () => (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
              ${pathname === href ? 'bg-brand-500/10 text-brand-400 font-600' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Icon size={18} />{label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-surface-border">
        <button onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 w-full transition-colors">
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="hidden md:flex w-56 min-h-screen bg-surface-card border-r border-surface-border flex-col">
        <div className="px-5 py-5 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-400" />
            <span className="font-display text-lg font-800">Admin Panel</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">TaskEarn</p>
        </div>
        <NavLinks />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface-card border-b border-surface-border flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand-400" />
          <span className="font-display text-base font-800">Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-white p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)}>
          <div className="absolute top-0 left-0 w-64 h-full bg-surface-card border-r border-surface-border flex flex-col pt-14"
            onClick={e => e.stopPropagation()}>
            <NavLinks />
          </div>
        </div>
      )}
      <div className="md:hidden h-14 w-full" />
    </>
  )
}
