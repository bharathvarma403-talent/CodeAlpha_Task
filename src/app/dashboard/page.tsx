'use client'

import { useDashboardData } from '@/hooks/useDashboardData'

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardData()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-container-padding text-error">
        Error loading dashboard: {(error as Error).message}
      </div>
    )
  }

  const { metrics, activities } = data || {}

  return (
    <div className="p-container-padding pb-12">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        <header className="mb-8">
          <h1 className="font-h1 text-h1 text-on-surface mb-2">Good morning</h1>
          <p className="font-body-base text-body-base text-on-surface-variant">
            Here's what's happening in your workspace today.
          </p>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-outline-variant transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">task_alt</span>
            </div>
            <div>
              <div className="text-[28px] font-bold text-on-surface mb-1 font-inter tracking-tight">
                {metrics?.completionRate}%
              </div>
              <div className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Completion Rate
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-outline-variant transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-tertiary bg-tertiary/10 p-2 rounded-lg">incomplete_circle</span>
            </div>
            <div>
              <div className="text-[28px] font-bold text-on-surface mb-1 font-inter tracking-tight">
                {metrics?.activeTasks}
              </div>
              <div className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Active Tasks
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-outline-variant transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-error bg-error/10 p-2 rounded-lg">assignment_late</span>
            </div>
            <div>
              <div className="text-[28px] font-bold text-on-surface mb-1 font-inter tracking-tight">
                {metrics?.overdueTasks}
              </div>
              <div className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Overdue
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-outline-variant transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-secondary bg-secondary/10 p-2 rounded-lg">group</span>
            </div>
            <div>
              <div className="text-[28px] font-bold text-on-surface mb-1 font-inter tracking-tight">
                {metrics?.totalTasks}
              </div>
              <div className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Total Tasks
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="mt-8">
          <h2 className="font-h2 text-h2 text-on-surface mb-4">Recent Activity</h2>
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6">
            <div className="space-y-6">
              {activities?.length === 0 && (
                <p className="text-on-surface-variant font-body-sm">No recent activity.</p>
              )}
              {activities?.map((activity: any) => (
                <div key={activity.id} className="flex gap-4 relative">
                  <div className="absolute left-4 top-10 bottom-[-24px] w-px bg-outline-variant/30 last:hidden"></div>
                  <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant shrink-0 flex items-center justify-center overflow-hidden z-10">
                    {activity.profiles?.avatar_url ? (
                      <img src={activity.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-[10px] text-on-surface-variant">
                        {activity.profiles?.full_name?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="font-body-sm text-on-surface">
                      <span className="font-medium text-primary">
                        {activity.profiles?.full_name || 'Unknown User'}
                      </span>{' '}
                      {activity.action === 'create' ? 'created a new task' : `updated task ${activity.field}`}
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
