'use client'

import { useInboxTasks, type InboxTask } from '@/hooks/useInboxTasks'
import { cn } from '@/lib/utils'

const PRIORITY_STYLES = {
  urgent: { dot: 'bg-red-500', label: 'Urgent', text: 'text-red-400' },
  high: { dot: 'bg-orange-500', label: 'High', text: 'text-orange-400' },
  medium: { dot: 'bg-yellow-500', label: 'Medium', text: 'text-yellow-400' },
  low: { dot: 'bg-blue-500', label: 'Low', text: 'text-blue-400' },
  none: { dot: 'bg-gray-500', label: 'None', text: 'text-gray-400' },
} as const

type Priority = keyof typeof PRIORITY_STYLES

function TaskRow({ task }: { task: InboxTask }) {
  const prio = PRIORITY_STYLES[(task.priority as Priority) ?? 'none'] ?? PRIORITY_STYLES.none
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const statusType = (task.project_statuses as unknown as { type: string } | null)?.type
  const isDone = statusType === 'done'

  return (
    <div className={cn(
      'flex items-center gap-4 px-4 py-3 border-b border-outline-variant/20 hover:bg-surface-container/50 transition-colors group',
      isDone && 'opacity-50'
    )}>
      {/* Completion indicator */}
      <button className="shrink-0">
        <span
          className={cn(
            'material-symbols-outlined text-[20px] transition-colors',
            isDone ? 'text-primary' : 'text-outline hover:text-primary'
          )}
          style={isDone ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          {isDone ? 'check_circle' : 'radio_button_unchecked'}
        </span>
      </button>

      {/* Priority dot */}
      <div className={cn('w-2 h-2 rounded-full shrink-0', prio.dot)} title={prio.label} />

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm text-on-surface font-medium truncate', isDone && 'line-through')}>
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {task.identifier && (
            <span className="text-[10px] font-mono text-on-surface-variant">{task.identifier}</span>
          )}
          {task.project && (
            <span
              className="text-[10px] text-on-surface-variant flex items-center gap-1"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: task.project.color ?? '#6366F1' }}
              />
              {task.project.name}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      {task.project_statuses && (
        <div
          className="hidden md:flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-full shrink-0"
        >
          {(task.project_statuses as unknown as { name: string }).name}
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <div className={cn(
          'text-xs shrink-0 flex items-center gap-1',
          isOverdue && !isDone ? 'text-red-400' : 'text-on-surface-variant'
        )}>
          <span className="material-symbols-outlined text-[14px]">
            {isOverdue && !isDone ? 'schedule' : 'calendar_today'}
          </span>
          {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  )
}

export default function InboxPage() {
  const { data: tasks, isLoading, error } = useInboxTasks()

  const todoTasks = tasks?.filter(t => {
    const statusType = (t.project_statuses as unknown as { type: string } | null)?.type
    return statusType !== 'done' && statusType !== 'cancelled'
  }) ?? []

  const doneTasks = tasks?.filter(t => {
    const statusType = (t.project_statuses as unknown as { type: string } | null)?.type
    return statusType === 'done'
  }) ?? []

  if (isLoading) {
    return (
      <div className="p-container-padding space-y-4 max-w-[900px] mx-auto">
        <div className="h-8 w-36 bg-surface-container-high rounded-lg animate-pulse" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
            <div className="w-5 h-5 rounded-full bg-surface-container-high shrink-0" />
            <div className="w-2 h-2 rounded-full bg-surface-container-high shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-2/3 bg-surface-container-high rounded mb-1" />
              <div className="h-3 w-24 bg-surface-container-high rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-container-padding">
        <span className="material-symbols-outlined text-error text-4xl">error_outline</span>
        <p className="text-on-surface-variant text-sm">{(error as Error).message}</p>
      </div>
    )
  }

  return (
    <div className="p-container-padding pb-12 max-w-[900px] mx-auto">
      <header className="mb-6">
        <h1 className="font-h1 text-h1 text-on-surface mb-1">My Tasks</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          All tasks assigned to you across your workspace.
          <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
            {todoTasks.length} open
          </span>
        </p>
      </header>

      <div className="bg-surface-container rounded-xl border border-outline-variant/30 overflow-hidden">
        {/* Active tasks */}
        {todoTasks.length === 0 && doneTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-3xl">inbox</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-on-surface mb-1">All caught up!</p>
              <p className="text-sm text-on-surface-variant">No tasks assigned to you right now.</p>
            </div>
          </div>
        )}

        {todoTasks.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-surface-container-high border-b border-outline-variant/20">
              <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Open — {todoTasks.length}
              </span>
            </div>
            {todoTasks.map(task => <TaskRow key={task.id} task={task} />)}
          </div>
        )}

        {doneTasks.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-surface-container-high border-b border-outline-variant/20 border-t border-outline-variant/20">
              <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Completed — {doneTasks.length}
              </span>
            </div>
            {doneTasks.map(task => <TaskRow key={task.id} task={task} />)}
          </div>
        )}
      </div>
    </div>
  )
}
