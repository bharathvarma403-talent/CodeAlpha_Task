/**
 * Strict Backend Contract Layer — v2
 *
 * ALL mutations go through this module. No component writes directly to Supabase.
 * Features:
 *  - Idempotency key generation (prevents duplicate creation on retry)
 *  - Field-level conflict detection (returned from update-task v3)
 *  - Structured ConflictData for the ConflictResolutionModal
 *  - Exponential backoff retry for transient 5xx errors
 *  - Request timing metrics (structured log on every call)
 */

import { createBrowserClient } from '@supabase/ssr'
import type { ConflictData } from '@/components/ui/ConflictResolutionModal'

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
  conflict?: ConflictData
}

export interface ApiResult<T> {
  data: T | null
  error: ApiError | null
}

// ---------------------------------------------------------------------------
// Request/response schemas
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
  /** Supply to make the request idempotent. Generate with generateIdempotencyKey(). */
  idempotencyKey?: string
}

export interface UpdateTaskRequest {
  id: string
  /** Timestamp of the task when the user started editing. Enables conflict detection. */
  expected_updated_at?: string
  title?: string
  description?: object | null
  priority?: string
  assignee_id?: string | null
  due_date?: string | null
  status_id?: string | null
  is_archived?: boolean
  /** The complete set of intended changes — required for conflict resolution context */
  _pendingUpdates?: Record<string, unknown>
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
// Utilities
// ---------------------------------------------------------------------------

/** Generates a stable idempotency key for a create operation */
export function generateIdempotencyKey(): string {
  return `ik_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

async function getAuthToken(): Promise<string> {
  const supabase = getClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

/**
 * Calls an edge function with exponential backoff retry for transient errors.
 * Retries on 429 (respects Retry-After) and 500-range errors.
 */
async function callEdgeFunction<T>(
  fnName: string,
  body: object,
  opts: { headers?: Record<string, string>; maxRetries?: number } = {}
): Promise<ApiResult<T>> {
  const maxRetries = opts.maxRetries ?? 2
  let lastError: ApiError | null = null
  const reqStart = Date.now()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const token = await getAuthToken()
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${fnName}`

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          ...opts.headers,
        },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      const durationMs = Date.now() - reqStart

      if (process.env.NODE_ENV === 'development') {
        console.log(`[api] ${fnName} attempt=${attempt + 1} status=${res.status} ${durationMs}ms`)
      }

      if (res.ok) {
        return { data: json as T, error: null }
      }

      // 409 Conflict — never retry, return structured conflict data
      if (res.status === 409) {
        return {
          data: null,
          error: {
            message: json.message ?? 'Conflict detected',
            status: 409,
            isConflict: true,
            conflict: {
              taskId: (body as UpdateTaskRequest).id,
              taskTitle: '',
              server_updated_at: json.server_updated_at,
              conflicting_fields: json.conflicting_fields ?? {},
              pendingUpdates: (body as UpdateTaskRequest)._pendingUpdates ?? {},
            },
          },
        }
      }

      // 429 Rate limit — respect Retry-After header before retry
      if (res.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '5', 10)
        await sleep(Math.min(retryAfter * 1000, 10_000))
        continue
      }

      // 5xx transient — exponential backoff
      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(500 * Math.pow(2, attempt))
        continue
      }

      lastError = {
        message: json.message ?? json.error ?? 'Request failed',
        status: res.status,
      }

    } catch (err) {
      lastError = {
        message: err instanceof Error ? err.message : 'Network error',
        status: 0,
      }

      // Network error — retry with backoff
      if (attempt < maxRetries) {
        await sleep(500 * Math.pow(2, attempt))
        continue
      }
    }
  }

  return { data: null, error: lastError ?? { message: 'Unknown error' } }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Public API — Task mutations
// ---------------------------------------------------------------------------

export async function createTask(
  req: CreateTaskRequest
): Promise<ApiResult<{ task: Task; idempotent?: boolean }>> {
  const { idempotencyKey, ...body } = req
  const headers: Record<string, string> = {}
  if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey

  return callEdgeFunction<{ task: Task; idempotent?: boolean }>('create-task', body, { headers })
}

export async function updateTask(
  req: UpdateTaskRequest
): Promise<ApiResult<{ task: Task }>> {
  const { _pendingUpdates, ...body } = req
  // We pass _pendingUpdates only to the local conflict builder — not to the server
  return callEdgeFunction<{ task: Task }>('update-task', body)
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
