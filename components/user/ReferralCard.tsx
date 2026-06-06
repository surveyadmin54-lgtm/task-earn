'use client'
import { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'

export default function ReferralCard({
  referralCode,
  referralLink,
}: {
  referralCode: string
  referralLink: string
}) {
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const copy = async (text: string, which: 'code' | 'link') => {
    await navigator.clipboard.writeText(text)
    if (which === 'code') {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } else {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Share2 size={18} className="text-brand-400" />
        <h2 className="font-display text-lg font-700">Refer & Earn</h2>
      </div>
      <p className="text-slate-400 text-sm mb-4">
        Share your referral code. Earn{' '}
        <span className="text-brand-400 font-700">100 points (= KSh 100)</span> for every
        friend who joins and gets approved!
      </p>

      {/* Code row */}
      <div className="bg-surface rounded-lg px-4 py-3 border border-surface-border flex items-center justify-between gap-3 mb-3">
        <span className="font-display text-xl font-800 text-brand-400 tracking-widest">
          {referralCode || '...'}
        </span>
        <button
          onClick={() => copy(referralCode, 'code')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors shrink-0"
        >
          {codeCopied ? <Check size={14} className="text-brand-400" /> : <Copy size={14} />}
          {codeCopied ? 'Copied!' : 'Copy code'}
        </button>
      </div>

      {/* Link row */}
      <div className="bg-surface rounded-lg px-4 py-3 border border-surface-border flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 truncate">{referralLink}</span>
        <button
          onClick={() => copy(referralLink, 'link')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors shrink-0 ml-2"
        >
          {linkCopied ? <Check size={14} className="text-brand-400" /> : <Copy size={14} />}
          {linkCopied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}
