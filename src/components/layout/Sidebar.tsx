'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useWorkspaces } from '@/hooks/useWorkspaces'

export default function Sidebar() {
  const pathname = usePathname()
  const { data: userData } = useUser()
  const { data: workspaces } = useWorkspaces()

  const activeWorkspace = workspaces?.[0]

  const navItems = [
    { name: 'Search', href: '/dashboard/search', icon: 'search' },
    { name: 'My Tasks', href: '/tasks/inbox', icon: 'check_circle' },
    { name: 'Inbox', href: '/tasks/inbox', icon: 'inbox' },
    { name: 'Favorites', href: '/dashboard/favorites', icon: 'star' },
    { name: 'Projects', href: '/projects', icon: 'format_list_bulleted' },
    { name: 'Teams', href: '/team', icon: 'group' },
  ]

  return (
    <nav className="fixed left-0 top-0 h-full w-[240px] border-r border-outline-variant/30 bg-surface-container-low hidden md:flex flex-col p-4 gap-2 z-50">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0 uppercase">
          {activeWorkspace?.name?.substring(0, 2) || 'AW'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-h2 text-[14px] font-semibold text-on-surface truncate">
            {activeWorkspace?.name || 'Loading...'}
          </div>
          <div className="text-[11px] text-on-surface-variant truncate">Workspace Switcher</div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-lg">unfold_more</span>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && item.href !== '/dashboard'
          // handle exact match for dashboard home later if needed

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg font-body-sm transition-all duration-200",
                isActive 
                  ? "bg-surface-container-highest text-primary font-semibold" 
                  : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface font-medium"
              )}
            >
              <span 
                className="material-symbols-outlined text-[18px]" 
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {item.name}
            </Link>
          )
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-outline-variant/30 px-2 flex justify-between items-center text-on-surface-variant text-[11px]">
        <span>Cmd+K</span>
      </div>
    </nav>
  )
}
