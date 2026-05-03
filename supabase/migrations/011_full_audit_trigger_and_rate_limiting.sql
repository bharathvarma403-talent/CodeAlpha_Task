-- Migration 011: Production Hardening
-- Full-field audit trigger, performance indexes, and updated_at enforcement
-- Applied: 2026-05-03

-- See: supabase/migrations/011_full_audit_trigger_and_rate_limiting.sql
-- (Applied directly via Supabase MCP - matches the SQL in this file)

CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actor_uuid UUID;
BEGIN
  actor_uuid := COALESCE(auth.uid(), NEW.created_by);

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO activity_log (
      task_id, actor_id, action, workspace_id,
      entity_type, entity_id, action_type, performed_by, metadata
    ) VALUES (
      NEW.id, actor_uuid, 'create', NEW.workspace_id,
      'task', NEW.id, 'created', actor_uuid,
      jsonb_build_object('title', NEW.title, 'priority', NEW.priority, 'project_id', NEW.project_id, 'assignee_id', NEW.assignee_id)
    );

  ELSIF (TG_OP = 'UPDATE') THEN

    IF OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO activity_log (task_id, actor_id, action, field, old_value, new_value, workspace_id, entity_type, entity_id, action_type, performed_by)
      VALUES (NEW.id, actor_uuid, 'update', 'title', to_jsonb(OLD.title), to_jsonb(NEW.title), NEW.workspace_id, 'task', NEW.id, 'updated', actor_uuid);
    END IF;

    IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
      INSERT INTO activity_log (task_id, actor_id, action, field, old_value, new_value, workspace_id, entity_type, entity_id, action_type, performed_by)
      VALUES (NEW.id, actor_uuid, 'update', 'status_id', to_jsonb(OLD.status_id), to_jsonb(NEW.status_id), NEW.workspace_id, 'task', NEW.id, 'updated', actor_uuid);
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO activity_log (task_id, actor_id, action, field, old_value, new_value, workspace_id, entity_type, entity_id, action_type, performed_by)
      VALUES (NEW.id, actor_uuid, 'update', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status), NEW.workspace_id, 'task', NEW.id, 'updated', actor_uuid);
    END IF;

    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO activity_log (task_id, actor_id, action, field, old_value, new_value, workspace_id, entity_type, entity_id, action_type, performed_by)
      VALUES (NEW.id, actor_uuid, 'update', 'priority', to_jsonb(OLD.priority), to_jsonb(NEW.priority), NEW.workspace_id, 'task', NEW.id, 'updated', actor_uuid);
    END IF;

    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO activity_log (task_id, actor_id, action, field, old_value, new_value, workspace_id, entity_type, entity_id, action_type, performed_by)
      VALUES (NEW.id, actor_uuid, 'update', 'assignee_id', to_jsonb(OLD.assignee_id), to_jsonb(NEW.assignee_id), NEW.workspace_id, 'task', NEW.id, 'updated', actor_uuid);
    END IF;

    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO activity_log (task_id, actor_id, action, field, old_value, new_value, workspace_id, entity_type, entity_id, action_type, performed_by)
      VALUES (NEW.id, actor_uuid, 'update', 'due_date', to_jsonb(OLD.due_date), to_jsonb(NEW.due_date), NEW.workspace_id, 'task', NEW.id, 'updated', actor_uuid);
    END IF;

    IF OLD.is_archived IS DISTINCT FROM NEW.is_archived THEN
      INSERT INTO activity_log (task_id, actor_id, action, field, old_value, new_value, workspace_id, entity_type, entity_id, action_type, performed_by)
      VALUES (NEW.id, actor_uuid, 'update', 'is_archived', to_jsonb(OLD.is_archived), to_jsonb(NEW.is_archived), NEW.workspace_id, 'task', NEW.id, 'updated', actor_uuid);
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_activity_trigger ON public.tasks;
CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON public.tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON public.tasks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON public.activity_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_task ON public.activity_log(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_statuses_project ON public.project_statuses(project_id, position);
