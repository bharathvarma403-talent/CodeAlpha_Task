-- Migration: 003_rls_extensions.sql
-- Description: Enables RLS on new tables and sets up core access policies

-- 1. Enable RLS on all new tables
ALTER TABLE project_statuses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels              ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_watchers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log             ENABLE ROW LEVEL SECURITY;

-- 2. Helper Functions
-- Using ws_id for is_workspace_member to match existing parameter name and avoid policy drops
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_project_accessible(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = p_project_id AND wm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION my_workspace_role(p_workspace_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role::text FROM workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- 3. Policies

-- PROJECT STATUSES
DROP POLICY IF EXISTS "project_statuses_select" ON project_statuses;
CREATE POLICY "project_statuses_select" ON project_statuses FOR SELECT
  USING (is_project_accessible(project_id));

DROP POLICY IF EXISTS "project_statuses_insert" ON project_statuses;
CREATE POLICY "project_statuses_insert" ON project_statuses FOR INSERT
  WITH CHECK (is_project_accessible(project_id));

DROP POLICY IF EXISTS "project_statuses_update" ON project_statuses;
CREATE POLICY "project_statuses_update" ON project_statuses FOR UPDATE
  USING (is_project_accessible(project_id));

DROP POLICY IF EXISTS "project_statuses_delete" ON project_statuses;
CREATE POLICY "project_statuses_delete" ON project_statuses FOR DELETE
  USING (is_project_accessible(project_id));

-- SPRINTS
DROP POLICY IF EXISTS "sprints_select" ON sprints;
CREATE POLICY "sprints_select" ON sprints FOR SELECT
  USING (is_project_accessible(project_id));

DROP POLICY IF EXISTS "sprints_insert" ON sprints;
CREATE POLICY "sprints_insert" ON sprints FOR INSERT
  WITH CHECK (is_project_accessible(project_id));

DROP POLICY IF EXISTS "sprints_update" ON sprints;
CREATE POLICY "sprints_update" ON sprints FOR UPDATE
  USING (is_project_accessible(project_id));

-- LABELS
DROP POLICY IF EXISTS "labels_select" ON labels;
CREATE POLICY "labels_select" ON labels FOR SELECT
  USING (is_project_accessible(project_id));

DROP POLICY IF EXISTS "labels_all" ON labels;
CREATE POLICY "labels_all" ON labels FOR ALL
  USING (is_project_accessible(project_id));

-- TASK LABELS
DROP POLICY IF EXISTS "task_labels_select" ON task_labels;
CREATE POLICY "task_labels_select" ON task_labels FOR SELECT
  USING (is_project_accessible((SELECT project_id FROM tasks WHERE id = task_id)));

DROP POLICY IF EXISTS "task_labels_all" ON task_labels;
CREATE POLICY "task_labels_all" ON task_labels FOR ALL
  USING (is_project_accessible((SELECT project_id FROM tasks WHERE id = task_id)));

-- TASK WATCHERS
DROP POLICY IF EXISTS "watchers_select" ON task_watchers;
CREATE POLICY "watchers_select" ON task_watchers FOR SELECT
  USING (is_project_accessible((SELECT project_id FROM tasks WHERE id = task_id)));

DROP POLICY IF EXISTS "watchers_manage" ON task_watchers;
CREATE POLICY "watchers_manage" ON task_watchers FOR ALL
  USING (user_id = auth.uid());

-- ATTACHMENTS
DROP POLICY IF EXISTS "attachments_select" ON attachments;
CREATE POLICY "attachments_select" ON attachments FOR SELECT
  USING (is_project_accessible((SELECT project_id FROM tasks WHERE id = task_id)));

DROP POLICY IF EXISTS "attachments_insert" ON attachments;
CREATE POLICY "attachments_insert" ON attachments FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "attachments_delete" ON attachments;
CREATE POLICY "attachments_delete" ON attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- NOTIFICATION PREFERENCES
DROP POLICY IF EXISTS "notif_prefs_all" ON notification_preferences;
CREATE POLICY "notif_prefs_all" ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- WORKSPACE INVITES
DROP POLICY IF EXISTS "invites_select" ON workspace_invites;
CREATE POLICY "invites_select" ON workspace_invites FOR SELECT
  USING (is_workspace_member(workspace_id) OR email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "invites_insert" ON workspace_invites;
CREATE POLICY "invites_insert" ON workspace_invites FOR INSERT
  WITH CHECK (my_workspace_role(workspace_id) IN ('owner','admin'));

DROP POLICY IF EXISTS "invites_delete" ON workspace_invites;
CREATE POLICY "invites_delete" ON workspace_invites FOR DELETE
  USING (my_workspace_role(workspace_id) IN ('owner','admin'));

-- PROJECT MEMBERS
DROP POLICY IF EXISTS "project_members_select" ON project_members;
CREATE POLICY "project_members_select" ON project_members FOR SELECT
  USING (is_project_accessible(project_id));

DROP POLICY IF EXISTS "project_members_all" ON project_members;
CREATE POLICY "project_members_all" ON project_members FOR ALL
  USING (my_workspace_role(
    (SELECT workspace_id FROM projects WHERE id = project_id)
  ) IN ('owner','admin'));

-- ACTIVITY LOG
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT
  USING (is_project_accessible((SELECT project_id FROM tasks WHERE id = task_id)));
