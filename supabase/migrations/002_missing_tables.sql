-- Migration: 002_missing_tables.sql
-- Description: Adds missing tables and columns for Apex Project Management Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create missing tables
CREATE TABLE IF NOT EXISTS project_statuses (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id    uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 48),
  color         text NOT NULL DEFAULT '#6B7280',
  type          text NOT NULL CHECK (type IN 
                  ('backlog','todo','in_progress','in_review','done','cancelled')),
  position      integer NOT NULL DEFAULT 0,
  wip_limit     integer CHECK (wip_limit > 0),
  created_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS sprints (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id       uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name             text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  goal             text CHECK (char_length(goal) <= 280),
  start_date       date,
  end_date         date,
  status           text NOT NULL DEFAULT 'planned'
                     CHECK (status IN ('planned','active','completed','cancelled')),
  capacity_points  integer CHECK (capacity_points > 0),
  velocity_points  integer,
  completed_at     timestamptz,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- Separate active sprint constraint to be safe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'one_active_sprint') THEN
    ALTER TABLE sprints ADD CONSTRAINT one_active_sprint EXCLUDE USING btree (project_id WITH =) WHERE (status = 'active');
  END IF;
EXCEPTION WHEN OTHERS THEN
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'one_active_sprint') THEN
    ALTER TABLE sprints ADD CONSTRAINT one_active_sprint EXCLUDE USING btree (project_id WITH =) WHERE (status = 'active');
  END IF;
END $$;

-- Handle labels
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_labels' AND table_schema = 'public') 
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'labels' AND table_schema = 'public') THEN
    ALTER TABLE task_labels RENAME TO labels;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS labels (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 32),
  color       text NOT NULL DEFAULT '#6B7280',
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, name)
);

ALTER TABLE labels ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
-- If project_id is still null because of rename, we might need a default or manual update, but for now we'll just ensure it exists.

-- Junction table for tasks and labels
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_label_map' AND table_schema = 'public') 
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_labels' AND table_schema = 'public') THEN
    ALTER TABLE task_label_map RENAME TO task_labels;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS task_labels (
  task_id   uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  label_id  uuid REFERENCES labels(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS task_watchers (
  task_id    uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (task_id, user_id)
);

-- Handle attachments
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS mime_type    text;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attachments' AND column_name = 'file_type') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attachments' AND column_name = 'mime_type') THEN
    ALTER TABLE attachments RENAME COLUMN file_type TO mime_type;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type         text NOT NULL CHECK (type IN (
                 'task_assigned','task_mentioned','task_commented',
                 'task_status_changed','task_due_soon','task_overdue',
                 'sprint_started','sprint_completed',
                 'member_joined','member_removed','invite_accepted'
               )),
  task_id      uuid REFERENCES tasks(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  data         jsonb NOT NULL DEFAULT '{}',
  read         boolean NOT NULL DEFAULT false,
  read_at      timestamptz,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id                       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id                  uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  task_assigned_inapp           boolean DEFAULT true,
  task_assigned_email           boolean DEFAULT true,
  task_mentioned_inapp          boolean DEFAULT true,
  task_mentioned_email          boolean DEFAULT true,
  task_commented_inapp          boolean DEFAULT true,
  task_commented_email          boolean DEFAULT false,
  task_status_changed_inapp     boolean DEFAULT false,
  task_status_changed_email     boolean DEFAULT false,
  task_due_soon_inapp           boolean DEFAULT true,
  task_due_soon_email           boolean DEFAULT true,
  digest_weekly_email           boolean DEFAULT true,
  PRIMARY KEY (user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  email        text NOT NULL,
  role         text NOT NULL DEFAULT 'member'
                 CHECK (role IN ('admin','member','viewer')),
  invited_by   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token        text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at  timestamptz,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS project_members (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role        text NOT NULL DEFAULT 'member'
                CHECK (role IN ('lead','member','viewer')),
  joined_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- 2. Add missing columns to existing tables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS identifier    text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id     uuid REFERENCES sprints(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id     uuid REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_id     uuid REFERENCES project_statuses(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimate      integer CHECK (estimate >= 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order    float8 DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at  timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived   boolean DEFAULT false;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS identifier  text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email         text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio           text CHECK (char_length(bio) <= 140);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone      text DEFAULT 'UTC';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme         text DEFAULT 'dark' CHECK (theme IN ('light','dark','system'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent_color  text DEFAULT 'violet';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS density       text DEFAULT 'comfortable' CHECK (density IN ('comfortable','compact','cozy'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan       text DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise'));
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. activity_log table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs' AND table_schema = 'public') 
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_log' AND table_schema = 'public') THEN
    ALTER TABLE activity_logs RENAME TO activity_log;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS activity_log (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id       uuid REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action        text NOT NULL,
  field         text,
  old_value     jsonb,
  new_value     jsonb,
  created_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS task_id   uuid REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS actor_id  uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS action    text;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS field     text;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS old_value jsonb;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS new_value jsonb;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'performed_by') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'actor_id') THEN
    ALTER TABLE activity_log RENAME COLUMN performed_by TO actor_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'action_type') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'action') THEN
    ALTER TABLE activity_log RENAME COLUMN action_type TO action;
  END IF;
END $$;
