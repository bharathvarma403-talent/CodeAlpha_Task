'use client'

import { useUser } from '@/hooks/useUser'

export default function Header() {
  const { data } = useUser()
  const profile = data?.profile

  return (
    <header className="md:hidden flex items-center justify-between px-4 h-14 w-full bg-surface-container-lowest border-b border-outline-variant/30 z-40 sticky top-0">
      <button className="text-on-surface-variant hover:text-on-surface transition-colors">
        <span className="material-symbols-outlined">menu</span>
      </button>
      <div className="text-lg font-semibold text-on-surface tracking-tight font-h1">
        Apex Projects
      </div>
      <button className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary text-on-primary font-bold text-xs">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
        )}
      </button>
    </header>
  )
}
