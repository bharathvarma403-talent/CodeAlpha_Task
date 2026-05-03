/**
 * Deterministic Realtime Reducer
 *
 * Rules that make realtime safe under concurrent usage:
 * 1. IDEMPOTENT   — applying the same event twice produces the same state
 * 2. ORDERED      — events are only applied if they are strictly newer (updated_at)
 * 3. DUPLICATE-SAFE — events with identical (id, updated_at) are no-ops
 * 4. PURE         — given the same inputs, always produces the same output
 */

export type TaskRecord = {
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

export type RealtimeEvent =
  | { eventType: 'INSERT'; new: TaskRecord; old?: never }
  | { eventType: 'UPDATE'; new: TaskRecord; old: Partial<TaskRecord> }
  | { eventType: 'DELETE'; new?: never; old: { id: string } }

/**
 * Applies a single realtime event to a list of tasks.
 * Returns a new array (never mutates input).
 */
export function applyTaskEvent(tasks: TaskRecord[], event: RealtimeEvent): TaskRecord[] {
  switch (event.eventType) {
    case 'INSERT': {
      const incoming = event.new
      // Idempotent: skip if already exists with same or newer timestamp
      const existing = tasks.find(t => t.id === incoming.id)
      if (existing) {
        // Duplicate INSERT — apply only if incoming is newer
        if (new Date(existing.updated_at) >= new Date(incoming.updated_at)) return tasks
        return tasks.map(t => t.id === incoming.id ? incoming : t)
      }
      // New task — insert in sort_order position
      return [...tasks, incoming].sort((a, b) => a.sort_order - b.sort_order)
    }

    case 'UPDATE': {
      const incoming = event.new
      const existing = tasks.find(t => t.id === incoming.id)

      if (!existing) {
        // Task not in cache — treat as INSERT
        return [...tasks, incoming].sort((a, b) => a.sort_order - b.sort_order)
      }

      // Stale check: only apply if incoming is strictly newer
      if (new Date(existing.updated_at) >= new Date(incoming.updated_at)) {
        // Duplicate or out-of-order event — no-op
        return tasks
      }

      return tasks.map(t => t.id === incoming.id ? incoming : t)
    }

    case 'DELETE': {
      const id = event.old.id
      // Idempotent: if not found, return unchanged
      if (!tasks.find(t => t.id === id)) return tasks
      return tasks.filter(t => t.id !== id)
    }
  }
}

/**
 * Applies multiple events in sequence.
 * Events are sorted by updated_at before application to handle out-of-order delivery.
 */
export function applyTaskEvents(tasks: TaskRecord[], events: RealtimeEvent[]): TaskRecord[] {
  // Sort events by updated_at to guarantee deterministic ordering regardless of arrival order
  const sorted = [...events].sort((a, b) => {
    const tsA = a.eventType !== 'DELETE' ? new Date(a.new.updated_at).getTime() : 0
    const tsB = b.eventType !== 'DELETE' ? new Date(b.new.updated_at).getTime() : 0
    return tsA - tsB
  })

  return sorted.reduce(applyTaskEvent, tasks)
}
