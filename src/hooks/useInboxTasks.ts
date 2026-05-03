import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef } from 'react'

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export type InboxTask = {
  id: string
  title: string
  status: string
  status_id: string | null
  priority: string
  due_date: string | null
  updated_at: string
  created_at: string
  identifier: string | null
  project_id: string
  workspace_id: string
  is_archived: boolean
  project: {
    name: string
    color: string
  } | null
  project_statuses: {
    name: string
    color: string
    type: string
  } | null
}

export function useInboxTasks() {
  const supabase = getClient()
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const query = useQuery({
    queryKey: ['inbox-tasks'],
    staleTime: 20_000,
    queryFn: async (): Promise<InboxTask[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, title, status, status_id, priority, due_date, updated_at, created_at, identifier,
          project_id, workspace_id, is_archived,
          project:projects!tasks_project_id_fkey ( name, color ),
          project_statuses!tasks_status_id_fkey ( name, color, type )
        `)
        .eq('assignee_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return (data ?? []) as unknown as InboxTask[]
    },
  })

  // Realtime: refresh inbox when tasks assigned to user change
  useEffect(() => {
    const supabase = getClient()
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['inbox-tasks'] })
      }, 300)
    }

    // We use a broader workspace filter since we can't filter by assignee_id in postgres_changes easily
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel(`inbox:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `assignee_id=eq.${user.id}`,
          },
          scheduleRefetch
        )
        .subscribe()

      channelRef.current = channel
    })()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [queryClient])

  return query
}
