import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { useWorkspaces } from './useWorkspaces'

export function useDashboardData() {
  const { data: workspaces } = useWorkspaces()
  const workspaceId = workspaces?.[0]?.id

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return useQuery({
    queryKey: ['dashboard', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      // Fetch tasks for the workspace
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id, title, status_id, priority, created_at, completed_at, assignee_id,
          project_statuses ( type, name )
        `)
        .eq('workspace_id', workspaceId)

      if (tasksError) throw tasksError

      // Fetch activity logs
      const { data: activities, error: actError } = await supabase
        .from('activity_log')
        .select(`
          id, action, created_at, task_id, field, new_value,
          profiles:actor_id ( full_name, avatar_url )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (actError) throw actError

      // Process metrics
      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter(t => (t.project_statuses as any)?.type === 'done').length || 0
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      // Active tasks (todo + in progress)
      const activeTasks = tasks?.filter(t => ['todo', 'in_progress'].includes((t.project_statuses as any)?.type)).length || 0

      // Upcoming deadlines (mocking due date since we might not have it populated)
      const overdueTasks = 0

      return {
        metrics: {
          totalTasks,
          completedTasks,
          completionRate,
          activeTasks,
          overdueTasks,
        },
        activities,
        tasks
      }
    }
  })
}
