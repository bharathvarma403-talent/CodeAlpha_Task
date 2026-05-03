import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef } from 'react'
import { useWorkspaces } from './useWorkspaces'

type ProjectStatus = {
  id: string
  name: string
  color: string
  type: string
  position: number
  wip_limit: number | null
}

type Task = {
  id: string
  title: string
  status_id: string | null
  status: string
  priority: string
  assignee_id: string | null
  due_date: string | null
  sort_order: number
  created_at: string
  updated_at: string
  identifier: string | null
  is_archived: boolean
  project_id: string
  workspace_id: string
}

export type KanbanProject = {
  id: string
  name: string
  color: string
  icon: string | null
  identifier: string | null
  statuses: ProjectStatus[]
  tasks: Task[]
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
  const channelRef = useRef<ReturnType<ReturnType<typeof getClient>['channel']> | null>(null)

  const query = useQuery({
    queryKey: ['projects', workspaceId],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async (): Promise<KanbanProject[]> => {
      const supabase = getClient()

      // Fetch projects with statuses
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

      // Fetch all non-archived tasks for these projects (single batched query, no N+1)
      const { data: tasks, error: taskErr } = await supabase
        .from('tasks')
        .select('id, title, status_id, status, priority, assignee_id, due_date, sort_order, created_at, updated_at, identifier, is_archived, project_id, workspace_id')
        .in('project_id', projectIds)
        .eq('is_archived', false)
        .is('parent_id', null) // top-level tasks only on kanban
        .order('sort_order', { ascending: true })

      if (taskErr) throw taskErr

      // Group tasks by project
      const tasksByProject = (tasks ?? []).reduce<Record<string, Task[]>>((acc, task) => {
        const arr = acc[task.project_id] ?? []
        arr.push(task)
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

  // Realtime subscription: task INSERT/UPDATE/DELETE
  useEffect(() => {
    if (!workspaceId) return

    const supabase = getClient()

    // Debounce rapid events to prevent flickering
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
      }, 300)
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
          // ID-based deduplication via React Query cache
          const existingData = queryClient.getQueryData<KanbanProject[]>(['projects', workspaceId])
          
          if (payload.eventType === 'UPDATE' && payload.new && existingData) {
            const newTask = payload.new as Task
            // Stale-check: only apply if the event is newer than cached data
            let isStale = false
            for (const project of existingData) {
              const cached = project.tasks.find(t => t.id === newTask.id)
              if (cached && new Date(cached.updated_at) >= new Date(newTask.updated_at)) {
                isStale = true
                break
              }
            }
            if (isStale) return
          }

          scheduleRefetch()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [workspaceId, queryClient])

  return query
}
