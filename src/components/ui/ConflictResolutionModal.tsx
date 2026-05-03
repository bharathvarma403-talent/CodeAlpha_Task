'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConflictField {
  client_value: unknown
  server_value: unknown
}

export interface ConflictData {
  taskId: string
  taskTitle: string
  server_updated_at: string
  conflicting_fields: Record<string, ConflictField>
  /** The update payload the user originally intended to apply */
  pendingUpdates: Record<string, unknown>
}

export type ConflictResolution = 'keep_mine' | 'keep_theirs' | 'merge'
export type FieldResolution = 'mine' | 'theirs'

interface Props {
  conflict: ConflictData
  onResolve: (resolvedUpdates: Record<string, unknown>) => void
  onDismiss: () => void
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  status_id: 'Status',
  priority: 'Priority',
  assignee_id: 'Assignee',
  due_date: 'Due Date',
  description: 'Description',
  is_archived: 'Archived',
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (field === 'is_archived') return value ? 'Yes' : 'No'
  if (field === 'due_date' && typeof value === 'string') {
    return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' })
  }
  return String(value)
}

// ---------------------------------------------------------------------------
// Conflict Resolution Modal
// ---------------------------------------------------------------------------

export function ConflictResolutionModal({ conflict, onResolve, onDismiss }: Props) {
  const fields = Object.entries(conflict.conflicting_fields)
  const [fieldResolutions, setFieldResolutions] = useState<Record<string, FieldResolution>>(
    () => Object.fromEntries(fields.map(([f]) => [f, 'mine']))
  )
  const [mode, setMode] = useState<ConflictResolution>('merge')

  const setField = useCallback((field: string, choice: FieldResolution) => {
    setFieldResolutions(prev => ({ ...prev, [field]: choice }))
  }, [])

  const handleResolve = () => {
    let resolvedUpdates: Record<string, unknown> = {}

    if (mode === 'keep_mine') {
      // Apply all client values exactly as intended
      resolvedUpdates = { ...conflict.pendingUpdates }
    } else if (mode === 'keep_theirs') {
      // Discard all client changes — no-op update (still needs to clear expected_updated_at)
      resolvedUpdates = {}
    } else {
      // Merge: user chose per-field
      for (const [field, choice] of Object.entries(fieldResolutions)) {
        const cf = conflict.conflicting_fields[field]
        resolvedUpdates[field] = choice === 'mine' ? cf.client_value : cf.server_value
      }
      // Include non-conflicting pending updates
      for (const [field, val] of Object.entries(conflict.pendingUpdates)) {
        if (!(field in resolvedUpdates)) resolvedUpdates[field] = val
      }
    }

    onResolve(resolvedUpdates)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onDismiss() }}
    >
      <div className="bg-surface-container border border-outline-variant rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-yellow-400 text-[18px]">merge</span>
          </div>
          <div>
            <h2 id="conflict-title" className="font-semibold text-on-surface text-base">
              Edit Conflict Detected
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              <span className="font-medium text-on-surface">&ldquo;{conflict.taskTitle}&rdquo;</span> was modified by another user while you were editing it.
            </p>
          </div>
        </div>

        {/* Mode selector */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Resolution strategy</p>
          <div className="flex gap-2">
            {([
              { key: 'merge', label: 'Merge changes', icon: 'merge' },
              { key: 'keep_mine', label: 'Keep mine', icon: 'person' },
              { key: 'keep_theirs', label: 'Keep theirs', icon: 'group' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => setMode(opt.key)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all',
                  mode === opt.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant text-on-surface-variant hover:border-outline'
                )}
              >
                <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Field-level merge table */}
        {mode === 'merge' && (
          <div className="px-6 py-3 space-y-2 max-h-64 overflow-y-auto">
            <p className="text-xs text-on-surface-variant mb-2">
              Choose which value to keep for each conflicting field:
            </p>
            {fields.map(([field, cf]) => (
              <div key={field} className="rounded-lg border border-outline-variant/40 overflow-hidden">
                <div className="bg-surface-container-high px-3 py-1.5">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                    {FIELD_LABELS[field] ?? field}
                  </span>
                </div>
                <div className="flex divide-x divide-outline-variant/30">
                  {/* Mine */}
                  <button
                    onClick={() => setField(field, 'mine')}
                    className={cn(
                      'flex-1 px-3 py-2.5 text-left transition-colors',
                      fieldResolutions[field] === 'mine'
                        ? 'bg-primary/10'
                        : 'hover:bg-surface-container'
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-on-surface-variant font-medium">Your version</span>
                      {fieldResolutions[field] === 'mine' && (
                        <span className="material-symbols-outlined text-primary text-[14px]">check_circle</span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface font-medium truncate">
                      {formatValue(field, cf.client_value)}
                    </p>
                  </button>
                  {/* Theirs */}
                  <button
                    onClick={() => setField(field, 'theirs')}
                    className={cn(
                      'flex-1 px-3 py-2.5 text-left transition-colors',
                      fieldResolutions[field] === 'theirs'
                        ? 'bg-primary/10'
                        : 'hover:bg-surface-container'
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-on-surface-variant font-medium">Their version</span>
                      {fieldResolutions[field] === 'theirs' && (
                        <span className="material-symbols-outlined text-primary text-[14px]">check_circle</span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface font-medium truncate">
                      {formatValue(field, cf.server_value)}
                    </p>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Keep-mine / Keep-theirs summary */}
        {mode !== 'merge' && (
          <div className="px-6 py-3">
            <div className="bg-surface-container-high rounded-lg p-3 text-sm text-on-surface-variant">
              {mode === 'keep_mine'
                ? '✓ Your changes will overwrite the server version.'
                : '✓ Server version will be kept. Your changes will be discarded.'}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-outline-variant/30 flex gap-3 justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface border border-outline-variant rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="px-5 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Apply resolution
          </button>
        </div>
      </div>
    </div>
  )
}
