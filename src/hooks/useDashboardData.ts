import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef } from 'react'
import { useWorkspaces } from './useWorkspaces'

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export type Activity = {
  id: string
  action: string | null
  action_type: string
  field: string | null
  old_value: unknown
  new_value: unknown
  created_at: string
  task_id: string | null
  workspace_id: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

export function useDashboardData() {
  const { data: workspaces } = useWorkspaces()
  const workspaceId = workspaces?.[0]?.id
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<ReturnType<typeof getClient>['channel']> | null>(null)

  const query = useQuery({
    queryKey: ['dashboard', workspaceId],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = getClient()

      // Parallel fetch: tasks + activity (not sequential — no waterfall)
      const [tasksResult, activitiesResult] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, status, status_id, due_date, is_archived, project_statuses!tasks_status_id_fkey(type)')
          .eq('workspace_id', workspaceId!)
          .eq('is_archived', false),
        supabase
          .from('activity_log')
          .select(`
            id, action, action_type, field, old_value, new_value, created_at, task_id, workspace_id,
            profiles:actor_id ( full_name, avatar_url )
          `)
          .eq('workspace_id', workspaceId!)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      if (tasksResult.error) throw tasksResult.error
      if (activitiesResult.error) throw activitiesResult.error

      const tasks = tasksResult.data ?? []
      const activities = activitiesResult.data ?? []

      const totalTasks = tasks.length
      const now = new Date()

      const completedTasks = tasks.filter(t => {
        const statusType = (t.project_statuses as unknown as { type: string } | null)?.type
        return statusType === 'done'
      }).length

      const activeTasks = tasks.filter(t => {
        const statusType = (t.project_statuses as unknown as { type: string } | null)?.type
        return statusType === 'in_progress' || statusType === 'todo'
      }).length

      const overdueTasks = tasks.filter(t => {
        if (!t.due_date) return false
        const statusType = (t.project_statuses as unknown as { type: string } | null)?.type
        return statusType !== 'done' && new Date(t.due_date) < now
      }).length

      const completionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0

      return {
        metrics: {
          totalTasks,
          completedTasks,
          activeTasks,
          overdueTasks,
          completionRate,
        },
        activities: activities as unknown as Activity[],
      }
    },
  })

  // Realtime: refresh dashboard when tasks or activity changes
  useEffect(() => {
    if (!workspaceId) return
    const supabase = getClient()

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard', workspaceId] })
      }, 400)
    }

    const channel = supabase
      .channel(`dashboard:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspaceId}` }, scheduleRefetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `workspace_id=eq.${workspaceId}` }, scheduleRefetch)
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
