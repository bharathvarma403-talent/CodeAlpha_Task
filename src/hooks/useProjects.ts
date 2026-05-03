import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef } from 'react'
import { useWorkspaces } from './useWorkspaces'
import { applyTaskEvent, type TaskRecord, type RealtimeEvent } from '@/lib/realtimeReducer'

type ProjectStatus = {
  id: string
  name: string
  color: string
  type: string
  position: number
  wip_limit: number | null
}

export type KanbanProject = {
  id: string
  name: string
  color: string
  icon: string | null
  identifier: string | null
  statuses: ProjectStatus[]
  tasks: TaskRecord[]
}

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useProjects() {
  const { data: workspaces } = useWorkspaces()
  const workspaceId = workspaces?.[0]?.id
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['projects', workspaceId],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async (): Promise<KanbanProject[]> => {
      const supabase = getClient()

      const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select(`
          id, name, color, icon, identifier,
          project_statuses ( id, name, color, type, position, wip_limit )
        `)
        .eq('workspace_id', workspaceId!)
        .eq('is_archived', false)
        .order('created_at', { ascending: true })

      if (projErr) throw projErr
      if (!projects || projects.length === 0) return []

      const projectIds = projects.map(p => p.id)

      const { data: tasks, error: taskErr } = await supabase
        .from('tasks')
        .select('id, title, status_id, status, priority, assignee_id, due_date, sort_order, created_at, updated_at, identifier, is_archived, project_id, workspace_id')
        .in('project_id', projectIds)
        .eq('is_archived', false)
        .is('parent_id', null)
        .order('sort_order', { ascending: true })

      if (taskErr) throw taskErr

      const tasksByProject = (tasks ?? []).reduce<Record<string, TaskRecord[]>>((acc, task) => {
        const arr = acc[task.project_id] ?? []
        arr.push(task as TaskRecord)
        acc[task.project_id] = arr
        return acc
      }, {})

      return projects.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color ?? '#6366F1',
        icon: p.icon,
        identifier: p.identifier,
        statuses: ((p.project_statuses as unknown as ProjectStatus[]) ?? []).sort(
          (a, b) => a.position - b.position
        ),
        tasks: tasksByProject[p.id] ?? [],
      }))
    },
  })

  // Realtime: deterministic in-place cache surgery (no full refetch on update events)
  useEffect(() => {
    if (!workspaceId) return

    const supabase = getClient()

    // Pending INSERT/DELETE events queue (debounced to batch rapid creation)
    const pendingInsertDelete: RealtimeEvent[] = []
    let batchTimer: ReturnType<typeof setTimeout> | null = null

    const flushInsertDeleteBatch = () => {
      if (pendingInsertDelete.length === 0) return
      const batch = pendingInsertDelete.splice(0)
      queryClient.setQueryData<KanbanProject[]>(
        ['projects', workspaceId],
        old => {
          if (!old) return old
          return old.map(project => {
            const relevantEvents = batch.filter(e => {
              if (e.eventType === 'INSERT' || e.eventType === 'UPDATE') {
                return (e.new as TaskRecord).project_id === project.id
              }
              return true // DELETE — reducer handles not-found gracefully
            })
            if (relevantEvents.length === 0) return project
            let tasks = project.tasks
            for (const event of relevantEvents) {
              tasks = applyTaskEvent(tasks, event)
            }
            return { ...project, tasks }
          })
        }
      )
    }

    const channel = supabase
      .channel(`workspace-tasks:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
          const event = { eventType, new: payload.new, old: payload.old } as RealtimeEvent

          if (eventType === 'UPDATE') {
            // UPDATEs: apply directly to cache via deterministic reducer (no debounce, low latency)
            queryClient.setQueryData<KanbanProject[]>(
              ['projects', workspaceId],
              old => {
                if (!old) return old
                const incomingTask = payload.new as TaskRecord
                // Only update the specific project this task belongs to
                return old.map(project => {
                  if (!project.tasks.some(t => t.id === incomingTask.id) && project.id !== incomingTask.project_id) {
                    return project
                  }
                  const tasks = applyTaskEvent(project.tasks, event)
                  return { ...project, tasks }
                })
              }
            )
          } else {
            // INSERT/DELETE: batch for 200ms to coalesce rapid-fire events
            pendingInsertDelete.push(event)
            if (batchTimer) clearTimeout(batchTimer)
            batchTimer = setTimeout(flushInsertDeleteBatch, 200)
          }
        }
      )
      .subscribe()

    return () => {
      if (batchTimer) clearTimeout(batchTimer)
      supabase.removeChannel(channel)
    }
  }, [workspaceId, queryClient])

  return query
}
