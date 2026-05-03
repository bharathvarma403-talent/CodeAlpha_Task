import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'

export function useUser() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      return { authUser: user, profile }
    },
    staleTime: Infinity, // User rarely changes
  })
}
