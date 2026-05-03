-- Migration: 004_triggers_and_functions.sql
-- Description: Sets up automation for timestamps, identifiers, and activity logs

-- 1. Updated At Trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
DO $$ 
BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Task Identifier Generation (e.g., APEX-1)
CREATE OR REPLACE FUNCTION generate_task_identifier()
RETURNS TRIGGER AS $$
DECLARE
  p_identifier text;
  t_count integer;
BEGIN
  IF NEW.identifier IS NULL THEN
    SELECT identifier INTO p_identifier FROM projects WHERE id = NEW.project_id;
    IF p_identifier IS NULL THEN
      p_identifier := 'TASK';
    END IF;
    
    SELECT count(*) + 1 INTO t_count FROM tasks WHERE project_id = NEW.project_id;
    NEW.identifier := p_identifier || '-' || t_count;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  CREATE TRIGGER set_task_identifier BEFORE INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION generate_task_identifier();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. Activity Logging Trigger
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.status_id IS DISTINCT FROM NEW.status_id) THEN
      INSERT INTO activity_log (task_id, actor_id, action, field, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'update', 'status', to_jsonb(OLD.status_id), to_jsonb(NEW.status_id));
    END IF;
    IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
      INSERT INTO activity_log (task_id, actor_id, action, field, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'update', 'assignee', to_jsonb(OLD.assignee_id), to_jsonb(NEW.assignee_id));
    END IF;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO activity_log (task_id, actor_id, action)
    VALUES (NEW.id, auth.uid(), 'create');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  CREATE TRIGGER task_activity_trigger AFTER INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION log_task_activity();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Default Project Statuses on Project Creation
CREATE OR REPLACE FUNCTION seed_project_statuses()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_statuses (project_id, name, type, color, position) VALUES
    (NEW.id, 'Backlog', 'backlog', '#94A3B8', 0),
    (NEW.id, 'Todo', 'todo', '#64748B', 1),
    (NEW.id, 'In Progress', 'in_progress', '#3B82F6', 2),
    (NEW.id, 'Done', 'done', '#10B981', 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  CREATE TRIGGER seed_statuses_trigger AFTER INSERT ON projects FOR EACH ROW EXECUTE FUNCTION seed_project_statuses();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. Sprint Completion Logic
CREATE OR REPLACE FUNCTION handle_sprint_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
    -- Move incomplete tasks to next sprint or backlog
    UPDATE tasks SET sprint_id = NULL 
    WHERE sprint_id = NEW.id AND status_id NOT IN (
      SELECT id FROM project_statuses WHERE project_id = NEW.project_id AND type = 'done'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  CREATE TRIGGER sprint_completion_trigger BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION handle_sprint_completion();
EXCEPTION WHEN OTHERS THEN NULL; END $$;
