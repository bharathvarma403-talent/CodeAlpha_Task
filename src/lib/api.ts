/**
 * Strict Backend Contract Layer
 *
 * ALL mutations in the application MUST go through this module.
 * No component or hook should write directly to Supabase tables.
 * This enforces backend validation, rate limiting, and audit logging.
 */

import { createBrowserClient } from '@supabase/ssr'

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface ApiError {
  message: string
  code?: string
  status?: number
  isConflict?: boolean
  serverUpdatedAt?: string
}

export interface ApiResult<T> {
  data: T | null
  error: ApiError | null
}

// ---------------------------------------------------------------------------
// Request/response schemas (contract definitions)
// ---------------------------------------------------------------------------

export interface CreateTaskRequest {
  workspace_id: string
  project_id: string
  title: string
  description?: object | null
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none'
  assignee_id?: string | null
  due_date?: string | null
  start_date?: string | null
  parent_task_id?: string | null
  label_ids?: string[]
  status_id?: string | null
}

export interface UpdateTaskRequest {
  id: string
  expected_updated_at?: string // optimistic locking
  title?: string
  description?: object | null
  priority?: string
  assignee_id?: string | null
  due_date?: string | null
  status_id?: string | null
  is_archived?: boolean
}

export interface Task {
  id: string
  workspace_id: string
  project_id: string
  title: string
  status: string
  status_id: string | null
  priority: string
  assignee_id: string | null
  created_by: string
  due_date: string | null
  sort_order: number
  created_at: string
  updated_at: string
  identifier: string | null
  is_archived: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string> {
  const supabase = getClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

async function callEdgeFunction<T>(
  fnName: string,
  body: object
): Promise<ApiResult<T>> {
  try {
    const token = await getAuthToken()
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${fnName}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(body),
    })

    const json = await res.json()

    if (!res.ok) {
      const isConflict = res.status === 409
      return {
        data: null,
        error: {
          message: json.message ?? json.error ?? 'Request failed',
          status: res.status,
          isConflict,
          serverUpdatedAt: json.server_updated_at,
        },
      }
    }

    return { data: json as T, error: null }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Network error',
        status: 0,
      },
    }
  }
}

// ---------------------------------------------------------------------------
// Task mutations (all go through Edge Functions)
// ---------------------------------------------------------------------------

export async function createTask(
  req: CreateTaskRequest
): Promise<ApiResult<{ task: Task }>> {
  return callEdgeFunction<{ task: Task }>('create-task', req)
}

export async function updateTask(
  req: UpdateTaskRequest
): Promise<ApiResult<{ task: Task }>> {
  return callEdgeFunction<{ task: Task }>('update-task', req)
}

export async function reorderTasks(payload: {
  workspace_id: string
  project_id: string
  status_id: string
  task_id: string
  new_sort_order: number
}): Promise<ApiResult<unknown>> {
  return callEdgeFunction('reorder-tasks', payload)
}
