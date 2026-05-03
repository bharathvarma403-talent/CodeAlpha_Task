'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProjects, type KanbanProject } from '@/hooks/useProjects'
import { updateTask, createTask, type UpdateTaskRequest } from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Priority config
// ---------------------------------------------------------------------------
const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-400/10', icon: 'priority_high' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: 'keyboard_arrow_up' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: 'remove' },
  low: { label: 'Low', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: 'keyboard_arrow_down' },
  none: { label: 'None', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: 'fiber_manual_record' },
} as const

type Priority = keyof typeof PRIORITY_CONFIG

// ---------------------------------------------------------------------------
// Task Card
// ---------------------------------------------------------------------------
function TaskCard({
  task,
  onMoveTask,
}: {
  task: KanbanProject['tasks'][0]
  onMoveTask: (taskId: string, newStatusId: string, taskUpdatedAt: string) => void
}) {
  const prio = PRIORITY_CONFIG[(task.priority as Priority) ?? 'none'] ?? PRIORITY_CONFIG.none
  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('task_id', task.id)}
      className="group bg-surface-container rounded-lg border border-outline-variant/30 p-3 cursor-grab active:cursor-grabbing hover:border-outline-variant hover:shadow-sm transition-all duration-150 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-on-surface font-medium leading-snug flex-1">{task.title}</p>
        <span className={cn('material-symbols-outlined text-[16px] shrink-0 mt-0.5', prio.color)}>
          {prio.icon}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {task.identifier && (
          <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">
            {task.identifier}
          </span>
        )}
        {isOverdue && (
          <span className="text-[10px] text-red-400 flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[12px]">schedule</span>
            Overdue
          </span>
        )}
        {task.due_date && !isOverdue && (
          <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
            {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status Column
// ---------------------------------------------------------------------------
function StatusColumn({
  status,
  tasks,
  onDrop,
  project,
}: {
  status: KanbanProject['statuses'][0]
  tasks: KanbanProject['tasks']
  onDrop: (taskId: string, newStatusId: string) => void
  project: KanbanProject
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const taskId = e.dataTransfer.getData('task_id')
    if (taskId) onDrop(taskId, status.id)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || creating) return
    setCreating(true)
    try {
      const result = await createTask({
        workspace_id: tasks[0]?.workspace_id ?? '',
        project_id: project.id,
        title: newTitle.trim(),
        status_id: status.id,
      })
      if (result.error) {
        console.error('Create task failed:', result.error.message)
      } else {
        setNewTitle('')
        setShowCreateForm(false)
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
    } finally {
      setCreating(false)
    }
  }

  const wipOver = status.wip_limit !== null && tasks.length >= status.wip_limit
  const statusTypeColor = {
    todo: 'bg-gray-500',
    in_progress: 'bg-blue-500',
    done: 'bg-green-500',
    cancelled: 'bg-red-500',
  }[status.type] ?? 'bg-gray-500'

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('w-2 h-2 rounded-full shrink-0', statusTypeColor)} />
        <span className="text-sm font-medium text-on-surface flex-1 truncate">{status.name}</span>
        <span className="text-xs text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-full">
          {tasks.length}
          {status.wip_limit !== null && (
            <span className={wipOver ? 'text-red-400' : ''}>/{status.wip_limit}</span>
          )}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex-1 flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors duration-150 border-2 border-dashed',
          isDragOver
            ? 'border-primary/50 bg-primary/5'
            : 'border-transparent'
        )}
      >
        {tasks.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center h-16 text-xs text-on-surface-variant/50 text-center px-2">
            No tasks
          </div>
        )}
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onMoveTask={() => {}} />
        ))}
      </div>

      {/* Create task */}
      <div className="mt-2 px-1">
        {showCreateForm ? (
          <form onSubmit={handleCreate} className="space-y-2">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title…"
              maxLength={500}
              className="w-full bg-surface border border-outline-variant text-on-surface text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newTitle.trim() || creating}
                className="flex-1 bg-primary-container text-on-primary-container text-xs font-medium py-1.5 rounded-lg hover:bg-primary-fixed transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setNewTitle('') }}
                className="px-3 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container px-2 py-1.5 rounded-lg transition-all duration-150"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add task
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Project Kanban Board
// ---------------------------------------------------------------------------
function ProjectBoard({ project }: { project: KanbanProject }) {
  const queryClient = useQueryClient()
  const [conflictError, setConflictError] = useState<string | null>(null)

  const moveMutation = useMutation({
    mutationFn: async ({ taskId, newStatusId, updatedAt }: { taskId: string; newStatusId: string; updatedAt: string }) => {
      const result = await updateTask({
        id: taskId,
        status_id: newStatusId,
        expected_updated_at: updatedAt,
      })
      if (result.error) {
        if (result.error.isConflict) {
          throw new Error('CONFLICT:' + (result.error.message ?? 'Task was modified by someone else.'))
        }
        throw new Error(result.error.message)
      }
      return result.data
    },
    onMutate: async ({ taskId, newStatusId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const prev = queryClient.getQueryData<KanbanProject[]>(['projects', project.tasks[0]?.workspace_id ?? ''])
      queryClient.setQueryData<KanbanProject[]>(
        ['projects', project.tasks[0]?.workspace_id ?? ''],
        old => old?.map(p => p.id === project.id
          ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, status_id: newStatusId } : t) }
          : p
        ) ?? []
      )
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      // Roll back optimistic update
      if (ctx?.prev) {
        queryClient.setQueryData(['projects', project.tasks[0]?.workspace_id ?? ''], ctx.prev)
      }
      const msg = (err as Error).message
      if (msg.startsWith('CONFLICT:')) {
        setConflictError(msg.replace('CONFLICT:', ''))
        setTimeout(() => setConflictError(null), 5000)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const handleDrop = useCallback((taskId: string, newStatusId: string) => {
    const task = project.tasks.find(t => t.id === taskId)
    if (!task || task.status_id === newStatusId) return
    moveMutation.mutate({ taskId, newStatusId, updatedAt: task.updated_at })
  }, [project.tasks, moveMutation])

  return (
    <div className="relative">
      {conflictError && (
        <div className="absolute top-0 inset-x-0 z-50 mx-auto max-w-md">
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg px-4 py-3 text-sm">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span>{conflictError}</span>
          </div>
        </div>
      )}

      {/* Board header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <h2 className="font-h2 text-h2 text-on-surface">{project.name}</h2>
        <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
          {project.tasks.length} tasks
        </span>
      </div>

      {/* Columns */}
      {project.statuses.length === 0 ? (
        <div className="flex items-center justify-center h-40 border-2 border-dashed border-outline-variant/30 rounded-xl text-on-surface-variant text-sm">
          No statuses configured for this project.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {project.statuses.map(status => {
            const columnTasks = project.tasks.filter(t => t.status_id === status.id)
            return (
              <StatusColumn
                key={status.id}
                status={status}
                tasks={columnTasks}
                onDrop={handleDrop}
                project={project}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Projects Page
// ---------------------------------------------------------------------------
export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="p-container-padding space-y-6 max-w-[1400px] mx-auto">
        <div className="h-8 w-40 bg-surface-container-high rounded-lg animate-pulse" />
        <div className="flex gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 w-28 bg-surface-container-high rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[260px] w-[260px] space-y-2">
              <div className="h-6 w-20 bg-surface-container-high rounded animate-pulse" />
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-16 bg-surface-container rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <span className="material-symbols-outlined text-error text-4xl">error_outline</span>
        <p className="text-on-surface-variant text-sm">{(error as Error).message}</p>
      </div>
    )
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-container-padding">
        <div className="w-16 h-16 rounded-2xl bg-surface-container border border-outline-variant/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant text-3xl">folder_open</span>
        </div>
        <div className="text-center">
          <h2 className="font-h2 text-h2 text-on-surface mb-2">No projects yet</h2>
          <p className="text-on-surface-variant text-sm max-w-xs">
            Create your first project to start organizing tasks on the Kanban board.
          </p>
        </div>
      </div>
    )
  }

  const activeProject = projects.find(p => p.id === activeProjectId) ?? projects[0]

  return (
    <div className="p-container-padding pb-12 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <h1 className="font-h1 text-h1 text-on-surface mb-1">Projects</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Drag tasks between columns to update their status instantly.
        </p>
      </header>

      {/* Project tabs */}
      <div className="flex gap-2 mb-6 border-b border-outline-variant/30 overflow-x-auto pb-0">
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveProjectId(p.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-150 -mb-px',
              activeProject.id === p.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
            )}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            {p.name}
          </button>
        ))}
      </div>

      <ProjectBoard project={activeProject} />
    </div>
  )
}
