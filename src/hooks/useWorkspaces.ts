import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'

export function useWorkspaces() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      // First get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Fetch workspaces where user is a member or owner
      const { data: members, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      if (!members || members.length === 0) return []

      const workspaceIds = members.map(m => m.workspace_id)

      const { data: workspaces, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds)

      if (wsError) throw wsError

      return workspaces
    },
    staleTime: 5 * 60 * 1000,
  })
}
