-- Migration: 007_realtime_setup.sql
-- Description: Enables realtime publications for collaborative features

BEGIN;
  -- Remove existing if any (to avoid duplicates or clean state)
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create publication for all relevant tables
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    workspaces,
    projects,
    tasks,
    comments,
    labels,
    task_labels,
    project_statuses,
    sprints,
    activity_log,
    notifications;
COMMIT;
